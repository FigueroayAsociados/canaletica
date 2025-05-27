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
  // Si no hay companyId, usar default
  if (!companyId) {
    return DEFAULT_COMPANY_ID;
  }
  
  // Patrones para reconocer IDs generados por Vercel en despliegues de vista previa
  const vercelPatterns = [
    /canaletica-[a-z0-9]+-/i,                    // canaletica-123abc-usuario
    /-ricardo-figueroas-projects-/i,             // -ricardo-figueroas-projects-
    /-[a-z0-9]+-vercel\.app$/i,                  // -abc123-vercel.app
    /canaletica-[a-z0-9]+\.vercel\.app/i,        // canaletica-abc123.vercel.app
    /[a-z0-9]+\-[a-z0-9]+\-[a-z0-9]+\.vercel/i   // cualquier-nombre-hex.vercel
  ];
  
  // Verificar si es un ID generado por Vercel
  const isVercelPreview = vercelPatterns.some(pattern => pattern.test(companyId));
  
  if (isVercelPreview) {
    // Solo mostrar el mensaje de log si es la primera vez que vemos este ID
    if (!normalizedIdCache.has(companyId)) {
      logger.info(`ID de Vercel "${companyId}" normalizado a "${DEFAULT_COMPANY_ID}"`, null, { prefix: 'normalizeCompanyId' });
      normalizedIdCache.set(companyId, true);
    }
    
    return DEFAULT_COMPANY_ID;
  }
  
  // Devolver el ID original sin normalizar
  // Esta es la modificación clave para habilitar multi-tenant
  return companyId.toLowerCase().trim();
}