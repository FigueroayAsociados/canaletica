// src/lib/services/securityService.ts

import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Servicio dedicado a la seguridad y privacidad multi-tenant
 */

/**
 * Verifica si un usuario tiene acceso a los datos de una compañía específica
 * @param userId ID del usuario que intenta acceder
 * @param targetCompanyId ID de la compañía a la que se intenta acceder
 * @param userRole Rol del usuario (opcional)
 * @returns Objeto con el resultado de la verificación
 */
export async function verifyCompanyAccessStrict(
  userId: string,
  targetCompanyId: string,
  userRole?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Los super_admin siempre tienen acceso a cualquier compañía
    if (userRole === 'super_admin') {
      return { success: true };
    }

    // Verificar si estamos en un subdominio para reforzar la seguridad
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const hostParts = hostname.split('.');
      const subdomain = hostParts[0]?.toLowerCase();
      
      // Si estamos en un subdominio específico (no www, etc.) y no coincide con targetCompanyId
      if (subdomain && 
          subdomain !== 'www' && 
          subdomain !== 'localhost' && 
          subdomain !== 'canaletic' && 
          subdomain !== 'canaletica' &&
          subdomain !== 'default' &&
          subdomain !== targetCompanyId) {
        
        const errorMsg = `⚠️ ALERTA DE SEGURIDAD: El subdominio (${subdomain}) no coincide con la compañía solicitada (${targetCompanyId})`;
        logger.error(errorMsg);
        
        return {
          success: false,
          error: 'No tiene permiso para acceder a los datos de esta compañía'
        };
      }
    }

    // Buscar el perfil de usuario en la colección global de usuarios
    const globalUserRef = doc(db, `users/${userId}`);
    const globalUserSnap = await getDoc(globalUserRef);

    if (globalUserSnap.exists()) {
      const userData = globalUserSnap.data();
      
      // Si el usuario tiene una compañía asignada y es diferente a la solicitada
      if (userData.companyId && userData.companyId !== targetCompanyId) {
        const errorMsg = `⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} con rol ${userRole} intentó acceder a compañía ${targetCompanyId} pero pertenece a ${userData.companyId}`;
        logger.error(errorMsg);
        
        return {
          success: false,
          error: 'No tiene permiso para acceder a los datos de esta compañía'
        };
      }
    }

    // Verificar si el usuario existe en la compañía específica
    const companyUserRef = doc(db, `companies/${targetCompanyId}/users/${userId}`);
    const companyUserSnap = await getDoc(companyUserRef);

    // Si el usuario no existe en la compañía solicitada
    if (!companyUserSnap.exists()) {
      const errorMsg = `⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} intentó acceder a compañía ${targetCompanyId} pero no está registrado en ella`;
      logger.error(errorMsg);
      
      return {
        success: false,
        error: 'No tiene permiso para acceder a los datos de esta compañía'
      };
    }

    // El usuario existe en la compañía, tiene acceso
    return { success: true };
  } catch (error) {
    logger.error('Error al verificar acceso a compañía:', error);
    
    // Por seguridad, ante un error denegar el acceso por defecto
    return {
      success: false,
      error: 'Error al verificar su acceso a esta compañía'
    };
  }
}

/**
 * Registra una violación de seguridad
 * @param userId ID del usuario
 * @param action Acción que intentó realizar
 * @param resource Recurso al que intentó acceder
 * @param targetCompanyId ID de la compañía objetivo
 * @param userCompanyId ID de la compañía del usuario
 */
export function logSecurityViolation(
  userId: string,
  action: string,
  resource: string,
  targetCompanyId: string,
  userCompanyId: string
): void {
  const message = `VIOLACIÓN DE SEGURIDAD: Usuario ${userId} de compañía ${userCompanyId} intentó ${action} en ${resource} de compañía ${targetCompanyId}`;
  
  // Registrar en consola/logger
  logger.error(message);
  
  // Registrar en localStorage para propósitos de auditoría local
  try {
    if (typeof window !== 'undefined') {
      const violations = JSON.parse(localStorage.getItem('securityViolations') || '[]');
      violations.push({
        timestamp: new Date().toISOString(),
        userId,
        action,
        resource,
        targetCompanyId,
        userCompanyId,
        url: window.location.href
      });
      
      // Mantener solo las últimas 50 violaciones para no sobrecargar localStorage
      localStorage.setItem('securityViolations', JSON.stringify(violations.slice(-50)));
    }
  } catch (error) {
    // Ignorar errores de localStorage
  }
  
  // TODO: En implementación real, enviar a un servicio de monitoreo o registrar en Firestore
}