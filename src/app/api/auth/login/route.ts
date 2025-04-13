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
      // Verificar en la colección de companies/default/users
      const userRef = db.doc(`companies/default/users/${decodedToken.uid}`);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
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
        await db.doc(`companies/default/users/${decodedToken.uid}`).update({
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
    console.error('Error durante el inicio de sesión:', error);
    
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
    
    return NextResponse.json(
      { error: 'Error al iniciar sesión. Por favor, inténtelo de nuevo.' },
      { status: 500 }
    );
  }
}