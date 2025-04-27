// src/lib/utils/helpers.ts

import { DEFAULT_COMPANY_ID } from './constants/index';

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
  // Para desarrollo, siempre usar default
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
    // Si es un ID generado por Vercel o no es un ID válido, usar default
    if (!companyId || 
        companyId.startsWith('canaletica-') || 
        companyId.includes('-ricardo-figueroas-projects-')) {
      console.log(`ID original "${companyId}" normalizado a "${DEFAULT_COMPANY_ID}" para desarrollo/pruebas`);
      return DEFAULT_COMPANY_ID;
    }
    
    // En ambiente de desarrollo, también normalizamos otros IDs a default
    // excepto si está explícitamente solicitado otro ID para probar multi-tenant
    // (La verificación de parámetros de URL se hace en el CompanyContext)
    if (companyId !== DEFAULT_COMPANY_ID) {
      console.log(`ID original "${companyId}" normalizado a "${DEFAULT_COMPANY_ID}" para desarrollo/pruebas`);
      return DEFAULT_COMPANY_ID;
    }
  }
  
  // Para producción o cuando se especifica explícitamente un ID, usar el proporcionado
  return companyId || DEFAULT_COMPANY_ID;
}