// src/app/api/compliance/report/[reportId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { obtenerEvaluacionRiesgo } from '@/lib/services/complianceService';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 }
      );
    }

    const evaluacion = await obtenerEvaluacionRiesgo(companyId, params.reportId);

    if (evaluacion) {
      return NextResponse.json({
        success: true,
        evaluacion
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'No se encontró evaluación de riesgo' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error obteniendo evaluación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}