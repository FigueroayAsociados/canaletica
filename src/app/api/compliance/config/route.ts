// src/app/api/compliance/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isComplianceEnabled, configurarCompliance } from '@/lib/services/complianceService';

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

    const enabled = await isComplianceEnabled(companyId);

    return NextResponse.json({
      success: true,
      enabled
    });
  } catch (error) {
    console.error('Error obteniendo configuración compliance:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId, config } = await request.json();

    if (!companyId || !config) {
      return NextResponse.json(
        { success: false, error: 'companyId y config son requeridos' },
        { status: 400 }
      );
    }

    const result = await configurarCompliance(companyId, config);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error configurando compliance:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}