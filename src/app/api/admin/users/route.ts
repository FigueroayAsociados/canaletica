// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { ADMIN_UIDS } from '@/lib/utils/constants/index';

// Verificación de administrador
async function isAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.substring(7);
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    return ADMIN_UIDS.includes(decodedToken.uid);
  } catch (error) {
    console.error('Error verificando token de administrador:', error);
    return false;
  }
}

// Obtener todos los usuarios (solo administradores)
export async function GET(request: NextRequest) {
  try {
    // Verificar si el usuario es administrador
    const adminCheck = await isAdmin(request);
    if (!adminCheck) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    // Parámetros de la consulta
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro companyId' },
        { status: 400 }
      );
    }
    
    // Obtener todos los usuarios de la compañía
    const db = getAdminFirestore();
    const usersRef = db.collection(`companies/${companyId}/users`);
    const snapshot = await usersRef.get();
    
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// Crear usuario (solo administradores)
export async function POST(request: NextRequest) {
  try {
    // Verificar si el usuario es administrador
    const adminCheck = await isAdmin(request);
    if (!adminCheck) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    const { email, password, displayName, role, companyId } = await request.json();

    // Validar datos recibidos
    if (!email || !password || !displayName || !role || !companyId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (email, password, displayName, role, companyId)' },
        { status: 400 }
      );
    }
    
    
    // Crear usuario en Firebase Auth
    const auth = getAdminAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName
    });
    
    // Crear perfil de usuario en Firestore
    const db = getAdminFirestore();
    await db.doc(`companies/${companyId}/users/${userRecord.uid}`).set({
      email,
      displayName,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });
    
    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: 'Usuario creado correctamente'
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    let statusCode = 500;
    let errorMessage = 'Error al crear usuario';
    
    // Manejar errores específicos de Firebase
    if (error.code === 'auth/email-already-exists') {
      statusCode = 400;
      errorMessage = 'El correo electrónico ya está en uso';
    } else if (error.code === 'auth/invalid-email') {
      statusCode = 400;
      errorMessage = 'Correo electrónico inválido';
    } else if (error.code === 'auth/weak-password') {
      statusCode = 400;
      errorMessage = 'La contraseña es demasiado débil';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}