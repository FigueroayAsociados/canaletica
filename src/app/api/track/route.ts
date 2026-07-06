// src/app/api/track/route.ts
//
// Endpoint de SEGUIMIENTO seguro (Capa 2).
// El seguimiento anónimo antes se hacía con una consulta directa a Firestore
// desde el navegador, lo que obligaba a dejar TODAS las denuncias legibles
// (cualquiera podía listarlas). Ahora la búsqueda ocurre en el SERVIDOR con
// el admin SDK, y solo se devuelve la denuncia si quien consulta demuestra
// conocer el secreto correcto (código de acceso, si es anónima; o el correo
// de contacto, si es identificada). Así las reglas pueden mantener las
// denuncias cerradas al público.

import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

interface TrackBody {
  companyId: string;
  reportCode: string;
  accessCode?: string;
  email?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackBody;
    const { companyId, reportCode, accessCode, email } = body || {};

    if (!companyId || !reportCode) {
      return NextResponse.json(
        { success: false, error: 'Parámetros incompletos' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Buscar la denuncia por su código visible (en el servidor).
    const snap = await db
      .collection(`companies/${companyId}/reports`)
      .where('code', '==', reportCode)
      .limit(1)
      .get();

    // Respuesta genérica para no revelar si el código existe o no.
    const notFound = { success: false, error: 'Denuncia no encontrada o datos incorrectos' };

    if (snap.empty) {
      return NextResponse.json(notFound, { status: 200 });
    }

    const reportDoc = snap.docs[0];
    const reportId = reportDoc.id;
    const data = reportDoc.data() || {};

    // Validar el secreto ANTES de devolver nada.
    const isAnonymous = !!data.reporter?.isAnonymous;
    if (isAnonymous) {
      if (!accessCode || data.reporter?.accessCode !== accessCode) {
        return NextResponse.json(notFound, { status: 200 });
      }
    } else {
      const onFile = (data.reporter?.contactInfo?.email || '').toLowerCase().trim();
      const given = (email || '').toLowerCase().trim();
      if (!given || onFile !== given) {
        return NextResponse.json(notFound, { status: 200 });
      }
    }

    // Nombre del investigador asignado (si hay).
    let assignedToName: string | undefined = undefined;
    if (data.assignedTo) {
      try {
        const userSnap = await db.doc(`companies/${companyId}/users/${data.assignedTo}`).get();
        if (userSnap.exists) assignedToName = userSnap.data()?.displayName;
      } catch { /* no bloquear por esto */ }
    }

    // Comunicaciones visibles para el denunciante (excluye internas).
    const commsSnap = await db
      .collection(`companies/${companyId}/reports/${reportId}/communications`)
      .orderBy('timestamp', 'desc')
      .get();
    const communications = commsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c: Record<string, unknown>) => !c.isInternal);

    return NextResponse.json(
      {
        success: true,
        reportId,
        report: { id: reportId, ...data, assignedToName, communications },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en /api/track:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar la denuncia' },
      { status: 500 }
    );
  }
}
