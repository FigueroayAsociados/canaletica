// src/lib/utils/accessControl.ts
import { UserRole } from './constants/index';
import { logger } from './logger';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Utilidad para controlar el acceso y el aislamiento de datos entre compañías
 */

/**
 * Determina el ID de compañía correcto a usar basado en el rol y perfil del usuario
 *
 * Reglas:
 * - Los super_admin pueden ver cualquier compañía (pasada en contextCompanyId)
 * - Los admin y otros usuarios solo pueden ver su propia compañía (en su perfil)
 * - Fallback a contextCompanyId si el perfil no tiene compañía
 *
 * @param profile Perfil del usuario actual
 * @param contextCompanyId ID de compañía del contexto actual (subdomain, etc)
 * @returns ID de compañía que el usuario está autorizado a ver
 */
export function getAuthorizedCompanyId(
  profile: any | null,
  contextCompanyId: string
): string {
  // Solo los super_admin pueden ver cualquier compañía
  if (profile?.role === UserRole.SUPER_ADMIN) {
    return contextCompanyId;
  }

  // Otros usuarios solo pueden ver su propia compañía
  return profile?.company || contextCompanyId;
}

/**
 * Verifica si un usuario tiene acceso a una compañía específica
 *
 * Reglas:
 * - Los super_admin tienen acceso a cualquier compañía
 * - Los admin y otros usuarios solo tienen acceso a su propia compañía
 *
 * @param profile Perfil del usuario
 * @param companyId ID de la compañía a verificar
 * @returns true si el usuario tiene acceso, false en caso contrario
 */
export function hasCompanyAccess(
  profile: any | null,
  companyId: string
): boolean {
  if (!profile) return false;

  // Los super_admin tienen acceso a cualquier compañía
  if (profile.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Otros usuarios solo tienen acceso a su propia compañía
  return profile.company === companyId;
}

/**
 * Verifica en la base de datos si un usuario admin tiene acceso a una compañía
 * Esta función es para verificaciones críticas de seguridad en el nivel de servicio
 *
 * @param companyId ID de compañía a la que se intenta acceder
 * @param userRole Rol del usuario
 * @param userId ID del usuario
 * @returns Promesa que se resuelve a {success: true} si tiene acceso o un objeto de error
 */
export async function verifyCompanyAccess(
  companyId: string,
  userRole?: string | null,
  userId?: string | null
) {
  // Los super_admin siempre tienen acceso
  if (userRole === UserRole.SUPER_ADMIN) {
    return { success: true };
  }

  // Si es admin, verificar que pertenezca a esta compañía
  if (userRole === UserRole.ADMIN && userId) {
    try {
      const userRef = doc(db, `companies/${companyId}/users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        // Si el usuario pertenece a otra compañía, bloquear el acceso
        if (userData.company && userData.company !== companyId) {
          const errorMsg = `⚠️ ALERTA DE SEGURIDAD: Usuario admin ${userId} intentó acceder a compañía ${companyId} pero pertenece a ${userData.company}`;
          logger.error(errorMsg);

          return {
            success: false,
            error: 'No tiene permiso para acceder a los datos de esta compañía'
          };
        }
      }
    } catch (error) {
      logger.error('Error al verificar el perfil del usuario:', error);
      logger.warn('No se pudo verificar el aislamiento multi-tenant, se permite acceso con precaución');
    }
  }

  // Si no es ni super_admin ni admin, o no hubo problemas en la verificación, permitir
  return { success: true };
}

/**
 * Verifica si un investigador tiene acceso a un reporte específico
 *
 * @param companyId ID de compañía del reporte
 * @param reportId ID del reporte
 * @param investigatorId ID del investigador
 * @returns Promesa que se resuelve a true si tiene acceso, false si no
 */
export async function canInvestigatorAccessReport(
  companyId: string,
  reportId: string,
  investigatorId: string
): Promise<boolean> {
  try {
    // Verificar si el reporte está asignado al investigador
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      return false;
    }

    const reportData = reportSnap.data();

    // Verificar si el investigador está asignado al reporte
    if (reportData.assignedTo && reportData.assignedTo === investigatorId) {
      return true;
    }

    // Si hay un equipo de investigación, verificar si el investigador está en él
    if (reportData.investigationTeam && Array.isArray(reportData.investigationTeam)) {
      return reportData.investigationTeam.includes(investigatorId);
    }

    return false;
  } catch (error) {
    logger.error('Error al verificar acceso de investigador al reporte:', error);
    return false;
  }
}

/**
 * Registra un intento de acceso no autorizado
 *
 * @param userId ID del usuario
 * @param action Acción que intentó realizar
 * @param resource Recurso al que intentó acceder
 * @param companyId ID de compañía a la que intentó acceder
 * @param userCompanyId ID de compañía del usuario
 */
export function logSecurityViolation(
  userId: string,
  action: string,
  resource: string,
  companyId: string,
  userCompanyId: string | null
): void {
  const message = `VIOLACIÓN DE SEGURIDAD: Usuario ${userId} de compañía ${userCompanyId} intentó ${action} en ${resource} de compañía ${companyId}`;

  // Registrar en consola
  logger.error(message);

  // TODO: En el futuro, aquí podríamos almacenar el evento en Firestore
  // y potencialmente enviar alertas o notificaciones
}