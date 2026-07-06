// src/app/api/admin/create-user/route.ts

import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { ADMIN_UIDS } from '@/lib/utils/constants/index';

// Interfaz para la solicitud
interface CreateUserRequest {
  email: string;
  displayName: string;
  companyId: string;
  role: string;
}

// Verifica que quien llama sea super administrador (token Firebase válido +
// UID en la lista de administradores de la plataforma). Antes NO había
// ninguna verificación: cualquiera podía crear usuarios administradores.
async function isSuperAdmin(request: Request): Promise<boolean> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.substring(7);
    const decoded = await getAdminAuth().verifyIdToken(token);
    return ADMIN_UIDS.includes(decoded.uid);
  } catch (error) {
    console.error('Error verificando token en create-user:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Solo super administradores pueden crear usuarios.
    if (!(await isSuperAdmin(request))) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Obtener instancias de Firebase Admin
    const adminAuth = getAdminAuth();
    const db = getAdminFirestore();
    
    // Obtener datos del cuerpo
    const data = await request.json() as CreateUserRequest;
    const { email, displayName, companyId, role } = data;
    
    if (!email || !displayName || !companyId || !role) {
      return NextResponse.json({ success: false, error: 'Todos los campos son obligatorios' }, { status: 400 });
    }
    
    // Verificar si la empresa existe
    const companyRef = db.doc(`companies/${companyId}`);
    const companyDoc = await companyRef.get();
    
    if (!companyDoc.exists) {
      return NextResponse.json({ success: false, error: 'La empresa no existe' }, { status: 404 });
    }
    
    // Verificar si el usuario ya existe
    let uid;
    let userExists = false;
    
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      uid = userRecord.uid;
      userExists = true;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.error('Error al verificar usuario:', error);
        return NextResponse.json({ success: false, error: 'Error al verificar usuario' }, { status: 500 });
      }
    }
    
    // Si el usuario no existe, crearlo
    if (!uid) {
      try {
        // Generar contraseña aleatoria segura (12-16 caracteres)
        const randomPassword = Math.random().toString(36).slice(-8) + 
                             Math.random().toString(36).toUpperCase().slice(-4) + 
                             '!';
        
        // Crear usuario en Firebase Auth
        const userRecord = await adminAuth.createUser({
          email,
          displayName,
          password: randomPassword,
          emailVerified: false
        });
        
        uid = userRecord.uid;
      } catch (error) {
        console.error('Error al crear usuario:', error);
        return NextResponse.json({ success: false, error: 'Error al crear usuario en Auth' }, { status: 500 });
      }
    }
    
    // Verificar si ya existe un perfil para este usuario en esta empresa
    const userProfileRef = db.doc(`companies/${companyId}/users/${uid}`);
    const userProfileDoc = await userProfileRef.get();
    
    if (userProfileDoc.exists) {
      // Actualizar rol si es necesario
      const userData = userProfileDoc.data();
      if (userData?.role !== role) {
        await userProfileRef.update({
          role,
          updatedAt: new Date()
        });
      }
    } else {
      // Crear nuevo perfil
      await userProfileRef.set({
        uid,
        email,
        displayName,
        role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      uid,
      userCreated: !userExists,
      message: userExists 
        ? `Usuario existente añadido a la empresa ${companyId}` 
        : `Nuevo usuario creado en la empresa ${companyId}`
    });
    
  } catch (error) {
    console.error('Error en API create-user:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}