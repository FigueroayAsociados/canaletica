// src/lib/utils/serverSubdomainDetector.ts
import { NextRequest } from 'next/server';
import { DEFAULT_COMPANY_ID } from './constants/index';
import { normalizeCompanyId } from './helpers';

/**
 * Utilidad para detectar companyId desde el backend (API routes/middleware)
 * basado en subdominios o headers.
 */

/**
 * Obtiene el ID de compañía a partir del host en una solicitud del servidor
 */
export function getCompanyIdFromRequest(request: NextRequest): string {
  // Intentar obtener desde headers personalizados primero
  const customCompanyId = request.headers.get('x-company-id');
  if (customCompanyId) {
    console.log(`[ServerSubdomainDetector] Usando companyId ${customCompanyId} de header x-company-id`);
    return normalizeCompanyId(customCompanyId);
  }

  // Obtener hostname desde request
  const hostname = request.headers.get('host') || '';
  
  // Si no hay hostname, usar valor por defecto
  if (!hostname) {
    console.log('[ServerSubdomainDetector] No se pudo determinar el hostname, usando valor por defecto');
    return DEFAULT_COMPANY_ID;
  }

  // Verificar si es localhost o dominio de desarrollo
  if (hostname.includes('localhost') || 
      hostname === 'canaletic.app' || 
      hostname === 'canaletica.app' ||
      hostname === 'canaletic.com' || 
      hostname === 'canaletica.com' || 
      hostname.startsWith('vercel.app')) {
    // Intentar obtener company ID desde referer como último recurso
    const referer = request.headers.get('referer') || '';
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererHostname = refererUrl.hostname;
        const hostParts = refererHostname.split('.');
        
        // Verificar si el referer tiene un subdominio válido
        if (hostParts.length > 1 && 
            hostParts[0] !== 'www' && 
            hostParts[0] !== 'canaletic' && 
            hostParts[0] !== 'canaletica') {
          console.log(`[ServerSubdomainDetector] Usando companyId ${hostParts[0]} desde referer`);
          return normalizeCompanyId(hostParts[0]);
        }
      } catch (e) {
        console.warn('[ServerSubdomainDetector] Error al parsear referer:', e);
      }
    }
    
    // Si no se puede determinar desde referer, usar default
    return DEFAULT_COMPANY_ID;
  }

  // Extraer subdominio
  const hostParts = hostname.split('.');
  
  // Hostname sin subdominio o con www (ej: www.example.com)
  if (hostParts.length <= 1 || hostParts[0] === 'www') {
    console.log('[ServerSubdomainDetector] Hostname sin subdominio válido, usando valor por defecto');
    return DEFAULT_COMPANY_ID;
  }
  
  // Verificar subdominios del sistema (no son companyIds)
  if (hostParts[0] === 'api' || 
      hostParts[0] === 'admin' || 
      hostParts[0] === 'app' || 
      hostParts[0] === 'canaletic' || 
      hostParts[0] === 'canaletica') {
    console.log(`[ServerSubdomainDetector] Subdominio del sistema ${hostParts[0]}, usando valor por defecto`);
    return DEFAULT_COMPANY_ID;
  }
  
  // Usar el subdominio como companyId
  const companyId = normalizeCompanyId(hostParts[0]);
  console.log(`[ServerSubdomainDetector] Companyid detectado: ${companyId} (original: ${hostParts[0]})`);
  return companyId;
}

/**
 * Caso especial: obtener el ID de compañía para un email específico
 * Esto es útil para casos como mvc@canaletica.cl
 */
export function getCompanyIdForEmail(email: string, defaultCompanyId: string): string {
  if (!email) return defaultCompanyId;
  
  // Manejar caso especial para mvc@canaletica.cl
  if (email.toLowerCase() === 'mvc@canaletica.cl') {
    console.log(`[ServerSubdomainDetector] Caso especial: email ${email} mapeado a companyId 'mvc'`);
    return 'mvc';
  }
  
  // Otros mapeos especiales podrían agregarse aquí
  
  return defaultCompanyId;
}