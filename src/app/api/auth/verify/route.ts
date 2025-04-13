// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { ADMIN_UIDS } from '@/lib/utils/constants/index';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      );
    }
    
    // Verificar el ID token
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Verificar si el usuario es un administrador
    const isAdmin = ADMIN_UIDS.includes(decodedToken.uid);
    
    return NextResponse.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin,
      verified: true
    });
  } catch (error) {
    console.error('Error verificando token de autenticación:', error);
    
    return NextResponse.json(
      { error: 'Error al verificar el token', verified: false },
      { status: 401 }
    );
  }
}
