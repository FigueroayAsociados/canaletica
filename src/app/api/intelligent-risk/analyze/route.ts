// src/app/api/intelligent-risk/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { realizarAnalisisInteligente } from '@/lib/services/intelligentRiskService';
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

    // Preparar datos del reporte
    const reportData = {
      id: reportId,
      detailedDescription: reportResult.report.detailedDescription,
      category: reportResult.report.category,
      subcategory: reportResult.report.subcategory,
      isAnonymous: reportResult.report.isAnonymous,
      hasEvidence: reportResult.report.hasEvidence,
      isKarinLaw: reportResult.report.isKarinLaw,
      involvedPersons: reportResult.report.involvedPersons || [],
      previousActions: reportResult.report.previousActions,
      expectation: reportResult.report.expectation,
      exactLocation: reportResult.report.exactLocation,
      eventDate: reportResult.report.eventDate,
      priority: reportResult.report.priority
    };

    // Realizar análisis inteligente
    const analisis = await realizarAnalisisInteligente(reportData, companyId);

    return NextResponse.json({
      success: true,
      analysis: analisis
    });
  } catch (error) {
    console.error('Error en análisis inteligente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}