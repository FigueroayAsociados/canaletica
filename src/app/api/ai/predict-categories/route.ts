// src/app/api/ai/predict-categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { predictCategoriesWithClaude, isClaudeAvailable } from '@/lib/services/claudeService';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    // Validar parámetros requeridos
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Contenido es requerido y debe ser texto' },
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

    // Predecir categorías con Claude
    const predictions = await predictCategoriesWithClaude(content);

    return NextResponse.json({
      success: true,
      predictions
    });

  } catch (error) {
    console.error('Error prediciendo categorías con Claude:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}