// src/lib/utils/subdomainDetector.ts

/**
 * Utilidad para detectar el subdominio actual de forma segura
 * Utilizada como fallback cuando el CompanyContext falla
 */

/**
 * Detecta el subdominio a partir del hostname
 * @returns Subdominio detectado o 'default' si no hay un subdominio válido
 */
export function detectSubdomain(): string {
  if (typeof window === 'undefined') {
    return 'default'; // En SSR retornamos default
  }

  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost') {
    return 'default';
  }

  const hostParts = hostname.split('.');
  if (hostParts.length <= 1) {
    return 'default';
  }

  const subdomain = hostParts[0].toLowerCase();
  
  // Verificar si es un subdominio válido (no es www, canaletic, canaletica)
  if (subdomain === 'www' || 
      subdomain === 'canaletic' || 
      subdomain === 'canaletica') {
    return 'default';
  }

  // Si llegamos aquí, tenemos un subdominio válido
  console.log(`[subdomainDetector] Detectado subdominio: ${subdomain}`);
  return subdomain;
}

/**
 * Obtiene el ID de compañía correcto basado en el subdominio actual
 * Guarda en localStorage para referencia futura
 */
export function getCompanyIdFromSubdomain(): string {
  const subdomain = detectSubdomain();
  
  // Guardar en localStorage para debug y recuperación
  if (typeof window !== 'undefined' && subdomain !== 'default') {
    localStorage.setItem('lastDetectedSubdomain', subdomain);
    localStorage.setItem('lastDetectedTimestamp', new Date().toISOString());
  }
  
  return subdomain;
}

/**
 * Verifica si el companyId dado corresponde al subdominio actual
 * @param companyId ID de compañía a verificar
 * @returns true si coincide, false si no coincide
 */
export function validateCompanyId(companyId: string): boolean {
  const subdomain = detectSubdomain();
  
  // Si estamos en 'default', cualquier companyId es válido
  if (subdomain === 'default') {
    return true;
  }
  
  // Si estamos en un subdominio específico, el companyId debe coincidir
  return companyId === subdomain;
}