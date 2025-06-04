// src/lib/utils/subdomainDetector.ts
import { DEFAULT_COMPANY_ID } from './constants/index';
import { normalizeCompanyId } from './helpers';
import { logger } from './logger';

/**
 * Detector robusto de ID de compañía basado en subdominio
 * Esta utilidad funciona independientemente de React Context y autenticación
 * Es fundamental para asegurar el aislamiento multi-tenant
 */

/**
 * Detecta el subdominio a partir del hostname actual
 * @returns Subdominio detectado o 'default' si no hay un subdominio válido
 */
export function detectSubdomain(): string {
  if (typeof window === 'undefined') {
    return 'default'; // En SSR retornamos default
  }

  try {
    const hostname = window.location.hostname;

    // Si es localhost, dominio principal, o preview de Vercel, usar default
    if (!hostname ||
        hostname === 'localhost' ||
        hostname === 'canaletic.app' ||
        hostname === 'canaletica.app' ||
        hostname === 'canaletic.com' ||
        hostname === 'canaletica.com' ||
        hostname.includes('.vercel.app') ||
        hostname.includes('preview') ||
        hostname.includes('deployment')) {
      return 'default';
    }

    // Extraer el primer segmento como subdominio
    const hostParts = hostname.split('.');
    if (hostParts.length <= 1) {
      return 'default';
    }

    const subdomain = hostParts[0]?.toLowerCase();

    // Verificar si es un subdominio válido (no www)
    if (subdomain &&
        subdomain !== 'www' &&
        subdomain !== 'canaletic' &&
        subdomain !== 'canaletica') {

      logger.info(`✅ Subdominio detectado: ${subdomain}`, null, { prefix: 'SubdomainDetector' });
      return subdomain;
    }

    return 'default';
  } catch (error) {
    logger.error(`Error al detectar subdominio: ${error}`, null, { prefix: 'SubdomainDetector' });
    return 'default';
  }
}

/**
 * Obtiene el ID de compañía desde el subdominio actual
 * @returns ID de compañía normalizado
 */
export function getCompanyIdFromSubdomain(): string {
  const subdomain = detectSubdomain();
  const normalizedId = normalizeCompanyId(subdomain);

  // Si no es el default, persistir para debug y recuperación futura
  if (subdomain !== 'default' && typeof window !== 'undefined') {
    try {
      localStorage.setItem('lastDetectedSubdomain', subdomain);
      localStorage.setItem('lastDetectedCompanyId', normalizedId);
      localStorage.setItem('lastDetectionTimestamp', new Date().toISOString());
    } catch (e) {
      // Ignorar errores de localStorage
    }
  }

  return normalizedId;
}

/**
 * Verifica que el ID de compañía proporcionado coincida con el del subdominio actual
 * Es una verificación crítica de seguridad para prevenir acceso entre compañías
 *
 * @param companyId ID de compañía a validar
 * @returns true si coincide o es un caso especial, false si hay discrepancia
 */
export function validateCompanyId(companyId: string): boolean {
  // Si es DEFAULT_COMPANY_ID, desarrollo, o preview de Vercel, siempre es válido
  if (companyId === DEFAULT_COMPANY_ID ||
      process.env.NODE_ENV === 'development' ||
      companyId === 'default') {
    return true;
  }

  // Verificar si estamos en un entorno de preview de Vercel
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('.vercel.app') || 
        hostname.includes('preview') || 
        hostname.includes('deployment')) {
      return true;
    }
  }

  const subdomainCompanyId = getCompanyIdFromSubdomain();

  // Si subdomainCompanyId es 'default', permitimos cualquier companyId
  if (subdomainCompanyId === 'default' || subdomainCompanyId === DEFAULT_COMPANY_ID) {
    return true;
  }

  // Caso crítico: discrepancia entre subdominio y companyId solicitado
  const isValid = companyId === subdomainCompanyId;

  if (!isValid) {
    logger.error(
      `⚠️ ALERTA DE SEGURIDAD: Intento de acceder a compañía ${companyId} desde subdominio ${subdomainCompanyId}`,
      null,
      { prefix: 'SubdomainDetector' }
    );

    // Registrar intento para auditoría (solo en cliente)
    if (typeof window !== 'undefined') {
      try {
        const securityEvents = JSON.parse(localStorage.getItem('securityEvents') || '[]');
        securityEvents.push({
          timestamp: new Date().toISOString(),
          type: 'company_mismatch',
          requestedCompany: companyId,
          subdomainCompany: subdomainCompanyId,
          url: window.location.href
        });
        localStorage.setItem('securityEvents', JSON.stringify(securityEvents.slice(-20)));
      } catch (e) {
        // Ignorar errores de localStorage
      }
    }
  }

  return isValid;
}

/**
 * Obtiene el URL base correcto para una compañía específica
 * @param companyId ID de la compañía
 * @returns URL base (con protocolo y dominio)
 */
export function getCompanyBaseUrl(companyId: string): string {
  const normalizedId = normalizeCompanyId(companyId);

  // En desarrollo usamos localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Para la compañía por defecto usamos el dominio principal
  if (normalizedId === DEFAULT_COMPANY_ID) {
    return 'https://canaletic.app';
  }

  // Para otras compañías, usamos subdominio
  return `https://${normalizedId}.canaletic.app`;
}

/**
 * Redirige al usuario al subdominio correcto si es necesario
 * @param currentCompanyId ID de compañía actual
 * @param targetCompanyId ID de compañía a la que debería estar
 * @returns true si se realizó una redirección, false si no fue necesario
 */
export function redirectToCorrectSubdomain(currentCompanyId: string, targetCompanyId: string): boolean {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
    return false; // No redirigir en SSR o desarrollo
  }

  // No redirigir si la compañía es la misma o es la default
  if (currentCompanyId === targetCompanyId || targetCompanyId === DEFAULT_COMPANY_ID) {
    return false;
  }

  const targetUrl = getCompanyBaseUrl(targetCompanyId) + window.location.pathname + window.location.search;

  logger.info(`Redirigiendo a usuario al subdominio correcto: ${targetUrl}`, null, { prefix: 'SubdomainDetector' });
  window.location.href = targetUrl;
  return true;
}