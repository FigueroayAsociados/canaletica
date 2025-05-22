// src/lib/utils/helpers.ts

import { DEFAULT_COMPANY_ID } from './constants/index';
import { logger } from './logger';

/**
 * Normaliza el ID de la compañía
 * 
 * IMPORTANTE: Esta función ha sido actualizada para implementar
 * correctamente el soporte multi-tenant en producción.
 * 
 * Ahora devuelve el ID original de la empresa, excepto en los
 * siguientes casos:
 * 1. IDs no válidos o indefinidos
 * 2. IDs generados automáticamente por Vercel
 * 
 * @param companyId ID de la compañía proporcionado o detectado
 * @returns ID de compañía normalizado para producción
 */
// Caché para reducir mensajes de log repetitivos
const normalizedIdCache = new Map<string, boolean>();

export function normalizeCompanyId(companyId: string | null | undefined): string {
  // Si no es un ID válido, usar default
  if (!companyId) {
    
    // Solo mostrar el mensaje de log si es la primera vez que vemos este ID
    if (!normalizedIdCache.has(companyId || '')) {
      logger.info(`ID original "${companyId}" normalizado a "${DEFAULT_COMPANY_ID}"`, null, { prefix: 'normalizeCompanyId' });
      normalizedIdCache.set(companyId || '', true);
    }
    
    return DEFAULT_COMPANY_ID;
  }
  
  // Para entornos de Vercel Preview, SIEMPRE usar "default" o una empresa real existente
  // Esto garantiza que en entornos de preview siempre usemos datos reales
  if (typeof window !== 'undefined' && 
      (companyId.startsWith('canaletica-') || 
      companyId.includes('-ricardo-figueroas-projects-'))) {
    
    if (!normalizedIdCache.has(companyId)) {
      logger.info(`🔧 MODO VERCEL PREVIEW: ID "${companyId}" normalizado a "${DEFAULT_COMPANY_ID}" para garantizar datos reales`, null, { prefix: 'normalizeCompanyId' });
      normalizedIdCache.set(companyId, true);
    }
    
    // En preview de Vercel, usar default para asegurar datos reales
    return DEFAULT_COMPANY_ID;
  }
  
  // Devolver el ID original sin normalizar
  // Esta es la modificación clave para habilitar multi-tenant
  return companyId.toLowerCase().trim();
}