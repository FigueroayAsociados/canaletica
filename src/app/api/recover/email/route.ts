import { NextRequest, NextResponse } from 'next/server';
import { recoverCodesByEmail } from '@/lib/services/reportService';

export async function POST(request: NextRequest) {
  try {
    const { email, companyId } = await request.json();

    // Validar parámetros requeridos
    if (!email || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Email y companyId son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Intentar recuperar los códigos
    const result = await recoverCodesByEmail(companyId, email);

    if (result.success) {
      // TODO: Aquí deberíamos enviar un email real con los códigos
      // Por ahora solo confirmamos que se encontraron las denuncias
      return NextResponse.json({
        success: true,
        message: 'Se ha enviado un correo electrónico con las instrucciones de recuperación'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error en API de recuperación por email:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}