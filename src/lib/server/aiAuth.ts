// src/lib/server/aiAuth.ts
// Verificación de autenticación para las rutas de IA.
// Antes, los endpoints /api/ai/* NO verificaban nada: cualquiera podía
// llamarlos y consumir la cuota de Claude (costo) o generar documentos
// fraudulentos. Ahora se exige un usuario autenticado (token Firebase válido).

import { getAdminAuth } from '@/lib/firebase/admin';

export async function verifyRequestAuth(req: {
  headers: { authorization?: string };
}): Promise<boolean> {
  try {
    const header = req.headers?.authorization;
    if (!header || !header.startsWith('Bearer ')) return false;
    await getAdminAuth().verifyIdToken(header.substring(7));
    return true;
  } catch (error) {
    console.error('IA: token inválido o ausente:', error);
    return false;
  }
}
