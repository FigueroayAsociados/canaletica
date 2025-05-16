// src/lib/utils/accessControl.ts

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
  if (profile?.role === 'super_admin') {
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
  if (profile.role === 'super_admin') {
    return true;
  }
  
  // Otros usuarios solo tienen acceso a su propia compañía
  return profile.company === companyId;
}