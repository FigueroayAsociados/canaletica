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
  // Los super_admin siempre tienen acceso sin verificaciones adicionales
  if (userRole === UserRole.SUPER_ADMIN || userRole === 'super_admin') {
    return { success: true };
  }

  // Permitir acceso público para seguimiento de denuncias
  if (userRole === 'public') {
    return { success: true };
  }

  // Si no hay userId o userRole, denegar acceso
  if (!userId || !userRole) {
    return { 
      success: false,
      error: 'No se pudo verificar la identidad del usuario'
    };
  }
  
  // Para todos los usuarios que no son super_admin, verificar que pertenezcan a esta compañía
  try {
    // Primero buscar el usuario en la colección de usuarios global
    const globalUserRef = doc(db, `users/${userId}`);
    const globalUserSnap = await getDoc(globalUserRef);
    
    if (globalUserSnap.exists()) {
      const globalUserData = globalUserSnap.data();
      
      // Si el usuario es super_admin globalmente, permitir acceso
      if (globalUserData.role === 'super_admin' || globalUserData.role === UserRole.SUPER_ADMIN) {
        return { success: true };
      }
      
      // Si el usuario tiene una compañía asignada y es diferente, bloquear acceso
      if (globalUserData.companyId && globalUserData.companyId !== companyId) {
        const errorMsg = `⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} con rol ${userRole} intentó acceder a compañía ${companyId} pero pertenece a ${globalUserData.companyId}`;
        logger.error(errorMsg);
        
        // Registrar la violación de seguridad
        logSecurityViolation(userId, 'acceder a datos', 'compañía', companyId, globalUserData.companyId);
        
        return {
          success: false,
          error: 'No tiene permiso para acceder a los datos de esta compañía'
        };
      }
    }
    
    // Verificar en la colección de usuarios de la compañía específica
    const companyUserRef = doc(db, `companies/${companyId}/users/${userId}`);
    const companyUserSnap = await getDoc(companyUserRef);
    
    // Si el usuario no existe en la colección de esta compañía, denegar acceso
    if (!companyUserSnap.exists()) {
      const errorMsg = `⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} con rol ${userRole} intentó acceder a compañía ${companyId} pero no está registrado en esta compañía`;
      logger.error(errorMsg);
      
      return {
        success: false,
        error: 'No tiene permiso para acceder a los datos de esta compañía'
      };
    }
  } catch (error) {
    logger.error('Error al verificar el perfil del usuario:', error);
    // No permitir acceso en caso de error - es más seguro denegar por defecto
    return {
      success: false,
      error: 'No se pudo verificar su acceso a esta compañía'
    };
  }

  // Si pasó todas las verificaciones, permitir acceso
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