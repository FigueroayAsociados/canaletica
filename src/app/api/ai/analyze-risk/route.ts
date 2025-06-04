// src/app/api/ai/analyze-risk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analyzeRiskWithClaude, isClaudeAvailable } from '@/lib/services/claudeService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar parámetros requeridos
    const { reportContent } = body;
    if (!reportContent?.description) {
      return NextResponse.json(
        { success: false, error: 'Descripción del reporte es requerida' },
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

    // Realizar análisis con Claude
    const analysis = await analyzeRiskWithClaude(reportContent);

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error en análisis de riesgo con Claude:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}