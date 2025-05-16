// src/lib/utils/companyDetection.ts

import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants/index';
import { normalizeCompanyId } from '@/lib/utils/helpers';
import { logger } from '@/lib/utils/logger';

// Mapeo de dominios personalizados a IDs de empresa (para clientes premium)
const domainMapping: Record<string, string> = {
  'denuncias.empresa1.com': 'empresa1',
  'canal.acme.com': 'acme'
  // Añadir más mapeos según sea necesario
};

/**
 * Detecta el ID de la empresa desde varias fuentes
 * Esta función funciona tanto en el cliente como en el servidor
 * @param hostname Opcional - Hostname actual (window.location.hostname en cliente)
 * @param pathname Opcional - Ruta actual (window.location.pathname en cliente)
 * @returns Objeto con ID normalizado y original
 */
export function detectCompanyId(hostname?: string, pathname?: string) {
  // Implementación para multi-tenant
  let extractedId = DEFAULT_COMPANY_ID;
  let originalId = DEFAULT_COMPANY_ID;
  let detectionMethod = 'default';

  try {
    // 1. Verificar rutas (/empresa/[companyId]/...)
    if (pathname) {
      const pathParts = pathname.split('/');
      if (pathParts.length > 2 && pathParts[1] === 'empresa' && pathParts[2]) {
        extractedId = pathParts[2];
        detectionMethod = 'route';
        logger.info(`🛣️ ID detectado en ruta: ${extractedId}`, null, { prefix: 'companyDetection' });
      }
    }

    // 2. Verificar subdominios y dominios personalizados
    if (hostname && detectionMethod === 'default') {
      logger.info(`🔍 Analizando hostname: ${hostname}`, null, { prefix: 'companyDetection' });

      // Verificar si es un dominio personalizado
      if (domainMapping[hostname]) {
        extractedId = domainMapping[hostname];
        detectionMethod = 'custom-domain';
        logger.info(`🏢 Dominio personalizado detectado: ${hostname} -> ${extractedId}`, null, { prefix: 'companyDetection' });
      }
      // Verificar si es un subdominio
      else {
        const hostParts = hostname.split('.');
        const subdomain = hostParts[0]?.toLowerCase();

        // Es un subdominio que no es www ni localhost ni el dominio principal
        if (subdomain &&
            hostname !== 'localhost' &&
            subdomain !== 'www' &&
            subdomain !== 'canaletic' &&
            subdomain !== 'canaletica' &&
            hostParts.length > 1) {

          logger.info(`✅ Subdominio válido detectado: ${subdomain}`, null, { prefix: 'companyDetection' });

          // Solo sobrescribir el ID si no lo obtuvimos de una fuente más confiable
          if (detectionMethod === 'default') {
            extractedId = subdomain;
            detectionMethod = 'subdomain';
          }
        }
      }
    }

    // 3. Usar localStorage como último recurso (solo cliente)
    if (typeof window !== 'undefined' && detectionMethod === 'default') {
      try {
        const cachedId = localStorage.getItem('detectedCompanyId');
        const timestamp = localStorage.getItem('detectionTimestamp');

        if (cachedId && timestamp) {
          // Verificar si el cache es reciente (menos de 1 hora)
          const cacheTime = new Date(timestamp).getTime();
          const now = new Date().getTime();
          const cacheAgeMs = now - cacheTime;

          if (cacheAgeMs < 3600000) { // 1 hora en ms
            logger.info(`🔄 Usando companyId en caché: ${cachedId} (${Math.round(cacheAgeMs/1000)}s)`, null, { prefix: 'companyDetection' });
            extractedId = cachedId;
            detectionMethod = 'cached';
          }
        }
      } catch (e) {
        // Ignorar errores de localStorage
        logger.warn(`Error al leer caché: ${e}`, null, { prefix: 'companyDetection' });
      }
    }

    // Guardar el ID original antes de normalizar
    originalId = extractedId;
    
    // Normalizar el ID para consistencia
    const normalizedId = normalizeCompanyId(extractedId);

    if (normalizedId !== originalId) {
      logger.info(`🔄 ID normalizado: ${originalId} -> ${normalizedId}`, null, { prefix: 'companyDetection' });
    }

    logger.info(`🏢 Company ID final: ${normalizedId} (original: ${originalId}, método: ${detectionMethod})`, null, { prefix: 'companyDetection' });
    
    return { 
      normalizedId, 
      originalId 
    };
  } catch (error) {
    logger.error(`❌ Error en detección de compañía: ${error}`, null, { prefix: 'companyDetection' });
    return { 
      normalizedId: DEFAULT_COMPANY_ID, 
      originalId: DEFAULT_COMPANY_ID 
    };
  }
}

/**
 * Hook para obtener el ID de la empresa de forma segura
 * Esta función solo se puede usar en componentes del cliente
 */
export function useCompanyDetection() {
  // Detectar el ID de la empresa utilizando información del cliente
  const getCompanyId = () => {
    if (typeof window !== 'undefined') {
      const { normalizedId, originalId } = detectCompanyId(
        window.location.hostname,
        window.location.pathname
      );
      
      // Persistir detección para debug
      try {
        localStorage.setItem('detectedCompanyId', normalizedId);
        localStorage.setItem('detectionTimestamp', new Date().toISOString());
      } catch (e) {
        logger.warn(`Error al guardar en localStorage: ${e}`, null, { prefix: 'companyDetection' });
      }
      
      return { normalizedId, originalId };
    }
    return { 
      normalizedId: DEFAULT_COMPANY_ID, 
      originalId: DEFAULT_COMPANY_ID 
    };
  };

  return getCompanyId();
}

/**
 * Función para obtener el ID de la empresa en el servidor
 * @param request - El objeto Request
 * @returns El ID de la empresa normalizado
 */
export function getCompanyIdFromRequest(request: Request): string {
  try {
    const url = new URL(request.url);
    const { normalizedId } = detectCompanyId(url.hostname, url.pathname);
    return normalizedId;
  } catch (error) {
    logger.error(`Error al obtener companyId de request: ${error}`, null, { prefix: 'companyDetection' });
    return DEFAULT_COMPANY_ID;
  }
}