// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { ADMIN_UIDS, UserRole, DEFAULT_COMPANY_ID } from '@/lib/utils/constants/index';
import { cookies } from 'next/headers';
import { getCompanyIdFromRequest, getCompanyIdForEmail } from '@/lib/utils/serverSubdomainDetector';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      );
    }
    
    // Verificar el ID token con Firebase Admin
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Obtener el perfil de usuario desde Firestore
    const db = getAdminFirestore();
    
    // Verificar primero si es un super_admin en la colección super_admins
    let isSuperAdmin = false;
    let userRole: string | null = null;
    let isActive = false;
    let companyId = ''; // Inicializar companyId como string vacío, se determinará más adelante
    
    // Verificar en la colección super_admins
    try {
      const superAdminsRef = db.collection('super_admins');
      const superAdminSnapshot = await superAdminsRef.where('email', '==', decodedToken.email).get();
      
      // Si encontramos el email en la colección super_admins, es un superadmin
      if (!superAdminSnapshot.empty) {
        isSuperAdmin = true;
        userRole = 'super_admin';
        isActive = true;
        
        console.log(`Usuario ${decodedToken.email} autenticado como Super Admin desde colección super_admins`);
      } 
      // También verificamos si su UID está en la lista de ADMIN_UIDS por compatibilidad
      else if (ADMIN_UIDS && ADMIN_UIDS.length > 0 && ADMIN_UIDS.includes(decodedToken.uid)) {
        isSuperAdmin = true;
        userRole = 'super_admin';
        isActive = true;
        
        console.log(`Usuario ${decodedToken.email} autenticado como Super Admin desde ADMIN_UIDS`);
        
        // Asegurarse de que el usuario exista en la colección super_admins
        try {
          await superAdminsRef.doc(decodedToken.uid).set({
            email: decodedToken.email,
            displayName: decodedToken.name || 'Super Administrador',
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
          }, { merge: true });
        } catch (createError) {
          console.warn('Error al crear/actualizar registro de super_admin:', createError);
          // No bloqueamos la autenticación si esto falla
        }
      }
    } catch (err) {
      console.warn('Error al verificar super_admins:', err);
      // Si hay error al verificar super_admins, continuamos con la verificación normal
    }
    
    // Si no es superadmin, verificamos en la colección de usuarios normal
    if (!isSuperAdmin) {
      // Detectar el ID de la compañía desde el subdominio
      companyId = getCompanyIdFromRequest(request);
      console.log(`[login] Detectado companyId: ${companyId} para usuario: ${decodedToken.uid}`);
      
      // Para el caso específico de mvc@canaletica.cl, forzar companyId = 'mvc'
      if (decodedToken.email) {
        const emailSpecificCompanyId = getCompanyIdForEmail(decodedToken.email, companyId);
        if (emailSpecificCompanyId !== companyId) {
          console.log(`[login] Sobreescribiendo companyId ${companyId} con ${emailSpecificCompanyId} basado en email ${decodedToken.email}`);
          companyId = emailSpecificCompanyId;
        }
      }

      // Verificar en la colección de companies/[companyId]/users
      const userRef = db.doc(`companies/${companyId}/users/${decodedToken.uid}`);
      let userDoc = await userRef.get();
      
      // Si no existe en la compañía detectada pero el email es mvc@canaletica.cl, intentar en 'mvc'
      if (!userDoc.exists && decodedToken.email === 'mvc@canaletica.cl' && companyId !== 'mvc') {
        console.log(`[login] Usuario ${decodedToken.email} no encontrado en ${companyId}, intentando en 'mvc'`);
        const mvcUserRef = db.doc(`companies/mvc/users/${decodedToken.uid}`);
        const mvcUserDoc = await mvcUserRef.get();
        
        if (mvcUserDoc.exists) {
          console.log(`[login] Usuario ${decodedToken.email} encontrado en 'mvc'`);
          userDoc = mvcUserDoc;
          companyId = 'mvc';
        }
      }
      
      // Si aún no se encuentra, intentar en DEFAULT_COMPANY_ID como último recurso
      if (!userDoc.exists && companyId !== DEFAULT_COMPANY_ID) {
        console.log(`[login] Usuario ${decodedToken.uid} no encontrado en ${companyId}, intentando en ${DEFAULT_COMPANY_ID}`);
        const defaultUserRef = db.doc(`companies/${DEFAULT_COMPANY_ID}/users/${decodedToken.uid}`);
        const defaultUserDoc = await defaultUserRef.get();
        
        if (defaultUserDoc.exists) {
          console.log(`[login] Usuario ${decodedToken.uid} encontrado en ${DEFAULT_COMPANY_ID}`);
          userDoc = defaultUserDoc;
          companyId = DEFAULT_COMPANY_ID;
        }
      }
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData.role;
        isActive = userData.isActive === true;
        
        // Guardar companyId para uso posterior
        userData.companyId = companyId;
        
        // Si el usuario no está activo, rechazar el inicio de sesión
        if (!isActive) {
          return NextResponse.json(
            { error: 'Su cuenta ha sido desactivada. Contacte al administrador.' },
            { status: 403 }
          );
        }
        
        // Establecer cookie de companyId
        const cookieStore = await cookies();
        await cookieStore.set('company_id', companyId, {
          maxAge: 60 * 60 * 24 * 5, // 5 días
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        });
      } else {
        // Si no existe el perfil en Firestore, pero está autenticado,
        // podemos crear un perfil básico o rechazar el inicio de sesión
        console.log(`[login] No se encontró perfil para usuario ${decodedToken.uid} en compañía ${companyId}`);
        return NextResponse.json(
          { error: `Usuario no tiene perfil en esta empresa. Contacte al administrador.` },
          { status: 403 }
        );
      }
    }
    
    // Establecer cookies de sesión
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 5 * 1000 }); // 5 días
    
    // Obtener y usar cookies de forma asíncrona
    const cookieStore = await cookies();
    
    // Establecer cookie de sesión
    await cookieStore.set('session', sessionCookie, {
      maxAge: 60 * 60 * 24 * 5, // 5 días
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    
    // Establecer cookie de rol (para uso del middleware)
    await cookieStore.set('user_role', userRole || 'user', {
      maxAge: 60 * 60 * 24 * 5, // 5 días
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    
    // Actualizar último inicio de sesión (solo para usuarios regulares, no para superadmins)
    if (!isSuperAdmin && userRole && decodedToken.uid) {
      try {
        // Obtener el companyId de la cookie que establecimos anteriormente
        const cookieStore = await cookies();
        const companyId = cookieStore.get('company_id')?.value || DEFAULT_COMPANY_ID;

        console.log(`[login] Actualizando último login para usuario ${decodedToken.uid} en compañía ${companyId}`);
        await db.doc(`companies/${companyId}/users/${decodedToken.uid}`).update({
          lastLogin: new Date()
        });
      } catch (updateError) {
        console.warn('Error al actualizar último login:', updateError);
        // No bloqueamos la autenticación si esto falla
      }
    }
    
    // Debug - Información de inicio de sesión
    console.log('Inicio de sesión exitoso:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userRole,
      isSuperAdmin
    });
    
    return NextResponse.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: userRole,
        isActive,
        isSuperAdmin
      }
    });
    
  } catch (error: any) {
    // Registrar error de forma más detallada para diagnóstico
    console.error('Error durante el inicio de sesión:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      time: new Date().toISOString()
    });

    // Agregar scope del error
    let errorScope = 'unknown';
    try {
      if (error.stack) {
        if (error.stack.includes('companyId')) errorScope = 'company-detection';
        else if (error.stack.includes('verifyIdToken')) errorScope = 'token-verification';
        else if (error.stack.includes('userRef')) errorScope = 'user-profile';
        else if (error.stack.includes('createSessionCookie')) errorScope = 'cookie-creation';
      }
    } catch (e) {
      console.error('Error al analizar el scope del error:', e);
    }

    // Manejar errores específicos de Firebase Auth
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'La sesión ha expirado. Por favor, inicie sesión nuevamente.' },
        { status: 401 }
      );
    } else if (error.code === 'auth/id-token-revoked') {
      return NextResponse.json(
        { error: 'La sesión ha sido revocada. Por favor, inicie sesión nuevamente.' },
        { status: 401 }
      );
    } else if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json(
        { error: 'Token de ID inválido. Por favor, inicie sesión nuevamente.' },
        { status: 401 }
      );
    }

    // Devolver un mensaje de error más detallado en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        error: `Error al iniciar sesión: ${error.message || 'Error desconocido'}`,
        details: {
          code: error.code,
          scope: errorScope,
          message: error.message,
          // Evitar exponer stack en producción
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
      }, { status: 500 });
    }

    // Mensaje genérico en producción
    return NextResponse.json(
      { error: 'Error al iniciar sesión. Por favor, inténtelo de nuevo.' },
      { status: 500 }
    );
  }
}