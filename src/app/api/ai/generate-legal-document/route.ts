// src/app/api/ai/generate-legal-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateLegalDocumentWithClaude, isClaudeAvailable } from '@/lib/services/claudeService';

export async function POST(request: NextRequest) {
  try {
    const { type, reportData, additionalContext } = await request.json();
    
    // Validar parámetros requeridos
    if (!type || !reportData) {
      return NextResponse.json(
        { success: false, error: 'Tipo de documento y datos del reporte son requeridos' },
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

    // Generar documento legal con Claude
    const document = await generateLegalDocumentWithClaude({
      type,
      reportData,
      additionalContext
    });

    return NextResponse.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('Error generando documento legal con Claude:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}