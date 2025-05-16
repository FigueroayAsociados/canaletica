// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { ADMIN_UIDS, UserRole } from '@/lib/utils/constants/index';
import { cookies } from 'next/headers';

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
      // Resetear companyId para esta sección
      companyId = '';

      // SOLUCIÓN ESPECÍFICA PARA MVC USER
      if (decodedToken.email?.toLowerCase() === 'mvc@canaletica.cl') {
        console.log(`🚨 API LOGIN: Detección de usuario mvc@canaletica.cl, forzando companyId=mvc`);
        companyId = 'mvc';
      } else {
        // Extracción de companyId basado en HTTP HOST (similar a la lógica de frontend)
        const host = request.headers.get('host') || '';

        // Verificar si estamos en un subdominio
        if (host && host !== 'localhost' && !host.startsWith('www.')) {
          const hostParts = host.split('.');
          if (hostParts.length > 1) {
            const subdomain = hostParts[0];

            // Verificar si el subdominio no es www, canaletic o canaletica
            if (subdomain !== 'www' &&
                subdomain !== 'canaletic' &&
                subdomain !== 'canaletica') {
              companyId = subdomain;
              console.log(`🔍 API LOGIN: Detectado companyId=${companyId} del subdominio`);
            }
          }
        }
      }

      // DIAGNÓSTICO DE USUARIO
      console.log(`
      📊📊📊 DIAGNÓSTICO API LOGIN 📊📊📊
      UID: ${decodedToken.uid}
      Email: ${decodedToken.email}
      CompanyId detectado: ${companyId}
      Host: ${request.headers.get('host')}
      📊📊📊 FIN DIAGNÓSTICO 📊📊📊
      `);

      // Asegurarse de que tenemos un companyId válido
      if (!companyId) {
        console.log(`⚠️ API LOGIN: No se pudo detectar un companyId. Usando 'default' como último recurso`);
        companyId = 'default';
      }

      // SIEMPRE intentar primero en la compañía detectada
      let userRef = db.doc(`companies/${companyId}/users/${decodedToken.uid}`);
      let userDoc = await userRef.get();

      // Si no existe en la compañía detectada y no es mvc, intentar en mvc como respaldo
      if (!userDoc.exists && companyId !== 'mvc' && decodedToken.email?.toLowerCase() === 'mvc@canaletica.cl') {
        console.log(`🔎 API LOGIN: Usuario no encontrado en ${companyId}, intentando en mvc como respaldo`);
        companyId = 'mvc';
        userRef = db.doc(`companies/mvc/users/${decodedToken.uid}`);
        userDoc = await userRef.get();
      }

      if (userDoc.exists) {
        console.log(`✅ API LOGIN: Usuario encontrado en compañía ${companyId}`);
        const userData = userDoc.data();
        userRole = userData.role;
        isActive = userData.isActive === true;

        // Si el usuario no está activo, rechazar el inicio de sesión
        if (!isActive) {
          return NextResponse.json(
            { error: 'Su cuenta ha sido desactivada. Contacte al administrador.' },
            { status: 403 }
          );
        }
      } else {
        console.log(`❌ API LOGIN: Usuario no encontrado en ninguna compañía`);
        // Si no existe el perfil en Firestore, pero está autenticado,
        // podemos crear un perfil básico o rechazar el inicio de sesión
        return NextResponse.json(
          { error: 'Usuario no tiene perfil en el sistema. Contacte al administrador.' },
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
        // Usar el companyId detectado para actualizar lastLogin
        await db.doc(`companies/${companyId}/users/${decodedToken.uid}`).update({
          lastLogin: new Date()
        });
        console.log(`✍️ API LOGIN: Actualizado lastLogin para usuario en compañía ${companyId}`);
      } catch (updateError) {
        console.warn(`Error al actualizar último login en compañía ${companyId}:`, updateError);
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