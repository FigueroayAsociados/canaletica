// src/app/api/ai/generate-insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateInsightsWithClaude, isClaudeAvailable } from '@/lib/services/claudeService';

export async function POST(request: NextRequest) {
  try {
    const { context } = await request.json();
    
    // Validar parámetros requeridos
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Contexto es requerido' },
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

    // Generar insights con Claude
    const insights = await generateInsightsWithClaude(context);

    return NextResponse.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Error generando insights con Claude:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}