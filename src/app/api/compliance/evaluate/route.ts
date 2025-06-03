// src/app/api/compliance/evaluate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { evaluarRiesgoDenuncia } from '@/lib/services/complianceService';
import { getReportById } from '@/lib/services/reportService';

export async function POST(request: NextRequest) {
  try {
    const { reportId, companyId } = await request.json();

    // Validar parámetros requeridos
    if (!reportId || !companyId) {
      return NextResponse.json(
        { success: false, error: 'reportId y companyId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener datos de la denuncia
    const reportResult = await getReportById(companyId, reportId);
    if (!reportResult.success || !reportResult.report) {
      return NextResponse.json(
        { success: false, error: 'Denuncia no encontrada' },
        { status: 404 }
      );
    }

    // Evaluar riesgo
    const resultado = await evaluarRiesgoDenuncia(companyId, reportId, reportResult.report);

    if (resultado.success) {
      return NextResponse.json(resultado);
    } else {
      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error en evaluación de compliance:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}