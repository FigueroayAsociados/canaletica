import { NextRequest, NextResponse } from 'next/server';
import { recoverCodesBySecurityQuestions } from '@/lib/services/reportService';

export async function POST(request: NextRequest) {
  try {
    const { reportCode, companyId, securityAnswers } = await request.json();

    // Validar parámetros requeridos
    if (!reportCode || !companyId || !securityAnswers) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Validar que las respuestas de seguridad estén completas
    const { question1Id, answer1, question2Id, answer2 } = securityAnswers;
    if (!question1Id || !answer1 || !question2Id || !answer2) {
      return NextResponse.json(
        { success: false, error: 'Debe responder ambas preguntas de seguridad' },
        { status: 400 }
      );
    }

    // Validar que las preguntas sean diferentes
    if (question1Id === question2Id) {
      return NextResponse.json(
        { success: false, error: 'Debe seleccionar preguntas de seguridad diferentes' },
        { status: 400 }
      );
    }

    // Intentar recuperar el código de acceso
    const result = await recoverCodesBySecurityQuestions(
      companyId,
      reportCode,
      securityAnswers
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        accessCode: result.accessCode,
        message: 'Código de acceso recuperado exitosamente'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error en API de recuperación por preguntas de seguridad:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}