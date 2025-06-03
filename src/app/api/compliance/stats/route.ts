// src/app/api/compliance/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { obtenerEstadisticasCompliance, obtenerCatalogoDelitos } from '@/lib/services/complianceService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 }
      );
    }

    const [stats, catalogo] = await Promise.all([
      obtenerEstadisticasCompliance(companyId),
      obtenerCatalogoDelitos()
    ]);

    return NextResponse.json({
      success: true,
      stats,
      catalogo
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}