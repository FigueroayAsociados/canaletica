// src/app/api/ai/conversational-assistance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConversationalAssistanceWithClaude, isClaudeAvailable } from '@/lib/services/claudeService';

export async function POST(request: NextRequest) {
  try {
    const { userMessage, context, reportId, previousMessages } = await request.json();
    
    // Validar parámetros requeridos
    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Mensaje del usuario es requerido' },
        { status: 400 }
      );
    }

    // Verificar si Claude está disponible
    if (!isClaudeAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Claude API no está configurado' },
        { status: 503 }
      );
    }

    // Obtener asistencia conversacional de Claude
    const assistance = await getConversationalAssistanceWithClaude({
      userMessage,
      context,
      reportId,
      previousMessages
    });

    return NextResponse.json({
      success: true,
      assistance
    });

  } catch (error) {
    console.error('Error en asistencia conversacional con Claude:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}