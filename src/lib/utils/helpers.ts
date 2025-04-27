// src/lib/utils/helpers.ts

import { DEFAULT_COMPANY_ID } from './constants/index';
import { logger } from './logger';

/**
 * Normaliza el ID de la compañía para entorno de desarrollo
 * 
 * NOTA: Esta función está diseñada específicamente para el entorno de desarrollo/pruebas.
 * Asegura que todos los datos se consoliden en una única colección (default)
 * en lugar de dispersarse entre múltiples colecciones generadas automáticamente.
 * 
 * Para el entorno de producción, esta lógica deberá ajustarse para mantener
 * la separación adecuada entre los datos de diferentes clientes.
 * 
 * @param companyId ID de la compañía proporcionado o detectado
 * @returns ID de compañía normalizado para entorno de desarrollo
 */
export function normalizeCompanyId(companyId: string | null | undefined): string {
  // FASE ACTUAL: Desarrollo/Consolidación - Siempre usar default para todas las operaciones
  // NOTA IMPORTANTE: Esta configuración es temporal y está diseñada para consolidar 
  // todos los datos en la colección 'default' durante la fase de desarrollo.
  
  // Si es un ID generado por Vercel o no es un ID válido, usar default
  if (!companyId || 
      companyId.startsWith('canaletica-') || 
      companyId.includes('-ricardo-figueroas-projects-')) {
    logger.info(`ID original "${companyId}" normalizado a "${DEFAULT_COMPANY_ID}"`, null, { prefix: 'normalizeCompanyId' });
    return DEFAULT_COMPANY_ID;
  }
  
  // COMENTARIO: Esta sección se ha modificado temporalmente para garantizar
  // que todas las operaciones usen la colección 'default', evitando la
  // dispersión de datos entre múltiples colecciones.
  // 
  // Cuando estemos listos para la implementación multi-tenant, descomentar
  // el código original y eliminar la línea de retorno forzado a DEFAULT_COMPANY_ID.
  
  // Forzar el uso de 'default' para todas las operaciones
  if (companyId !== DEFAULT_COMPANY_ID) {
    logger.info(`ID original "${companyId}" normalizado a "${DEFAULT_COMPANY_ID}"`, null, { prefix: 'normalizeCompanyId' });
    return DEFAULT_COMPANY_ID;
  }
  
  // Para el ID default, retornar tal cual
  return DEFAULT_COMPANY_ID;
}