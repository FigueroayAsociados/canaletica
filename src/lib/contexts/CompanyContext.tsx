// src/lib/contexts/CompanyContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
// Eliminada la dependencia de authentication
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants/index';
import { normalizeCompanyId } from '@/lib/utils/helpers';
import { logger } from '@/lib/utils/logger';

interface CompanyContextType {
  companyId: string;
  companyName: string;
  companyLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  isLoading: boolean;
  originalCompanyId?: string; // ID original antes de normalización
}

// Valor predeterminado del contexto
const defaultContextValue: CompanyContextType = {
  companyId: DEFAULT_COMPANY_ID,
  companyName: 'CanalEtica',
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  isLoading: true
};

const CompanyContext = createContext<CompanyContextType>(defaultContextValue);

// Mapeo de dominios personalizados a IDs de empresa (para clientes premium)
// Esto podría cargarse desde la base de datos en una implementación real
const domainMapping: Record<string, string> = {
  'denuncias.empresa1.com': 'empresa1',
  'canal.acme.com': 'acme'
  // Añadir más mapeos según sea necesario
};

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyData, setCompanyData] = useState<CompanyContextType>(defaultContextValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  // Función para detectar el ID de la compañía de forma independiente
  const detectCompanyId = () => {
    // Implementación para multi-tenant
    let extractedId = DEFAULT_COMPANY_ID;
    let detectionMethod = 'default';

    try {
      // 1. Intentar recuperar de localStorage primero (como una caché)
      if (typeof window !== 'undefined') {
        try {
          const cachedId = localStorage.getItem('detectedCompanyId');
          const timestamp = localStorage.getItem('detectionTimestamp');

          if (cachedId && timestamp) {
            // Verificar si el cache es reciente (menos de 1 hora)
            const cacheTime = new Date(timestamp).getTime();
            const now = new Date().getTime();
            const cacheAgeMs = now - cacheTime;

            if (cacheAgeMs < 3600000) { // 1 hora en ms
              logger.info(`🔄 Usando companyId en caché: ${cachedId} (${Math.round(cacheAgeMs/1000)}s)`, null, { prefix: 'CompanyContext' });
              extractedId = cachedId;
              detectionMethod = 'cached';
            }
          }
        } catch (e) {
          // Ignorar errores de localStorage
          logger.warn(`Error al leer caché: ${e}`, null, { prefix: 'CompanyContext' });
        }
      }

      // 2. Verificar rutas (/empresa/[companyId]/...)
      if (pathname) {
        const pathParts = pathname.split('/');
        if (pathParts.length > 2 && pathParts[1] === 'empresa' && pathParts[2]) {
          extractedId = pathParts[2];
          detectionMethod = 'route';
          logger.info(`🛣️ ID detectado en ruta: ${extractedId}`, null, { prefix: 'CompanyContext' });
        }
      }

      // 3. Verificar subdominios y dominios personalizados
      if (typeof window !== 'undefined' && detectionMethod === 'default' || detectionMethod === 'cached') {
        const hostname = window.location.hostname;
        logger.info(`🔍 Analizando hostname: ${hostname}`, null, { prefix: 'CompanyContext' });

        // Verificar si es un dominio personalizado
        if (domainMapping[hostname]) {
          extractedId = domainMapping[hostname];
          detectionMethod = 'custom-domain';
          logger.info(`🏢 Dominio personalizado detectado: ${hostname} -> ${extractedId}`, null, { prefix: 'CompanyContext' });
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

            logger.info(`✅ Subdominio válido detectado: ${subdomain}`, null, { prefix: 'CompanyContext' });

            // Solo sobrescribir el ID si no lo obtuvimos de una fuente más confiable
            if (detectionMethod === 'default' || detectionMethod === 'cached') {
              extractedId = subdomain;
              detectionMethod = 'subdomain';

              // Persistir para ayudar en debug y recuperación
              try {
                localStorage.setItem('detectedCompanyId', subdomain);
                localStorage.setItem('detectionTimestamp', new Date().toISOString());
                logger.info(`💾 Guardado en localStorage: ${subdomain}`, null, { prefix: 'CompanyContext' });
              } catch (e) {
                logger.warn(`Error al guardar en localStorage: ${e}`, null, { prefix: 'CompanyContext' });
              }
            }
          } else {
            // 4. Verificar parámetros de URL como última opción
            try {
              const urlParams = new URLSearchParams(window.location.search);
              const companyParam = urlParams.get('company');
              if (companyParam) {
                extractedId = companyParam;
                detectionMethod = 'query-param';
                logger.info(`🔗 ID detectado en parámetro URL: ${companyParam}`, null, { prefix: 'CompanyContext' });
              }
            } catch (e) {
              logger.warn(`Error al leer parámetros URL: ${e}`, null, { prefix: 'CompanyContext' });
            }
          }
        }
      }
    } catch (error) {
      logger.error(`❌ Error en detección de compañía: ${error}`, null, { prefix: 'CompanyContext' });
    }

    // Guardar el ID original y normalizado
    const originalId = extractedId;
    const normalizedId = normalizeCompanyId(extractedId);

    if (normalizedId !== originalId) {
      logger.info(`🔄 ID normalizado: ${originalId} -> ${normalizedId}`, null, { prefix: 'CompanyContext' });
    }

    logger.info(`🏢 Company ID final: ${normalizedId} (original: ${originalId}, método: ${detectionMethod})`, null, { prefix: 'CompanyContext' });
    return { normalizedId, originalId };
  };

  useEffect(() => {
    // Cargar inmediatamente datos de la empresa sin depender de autenticación

    // Usar la nueva función detectCompanyId que no depende de autenticación

    const loadCompanyData = async (id: string, originalId: string) => {
      try {
        // Intentar cargar la configuración de la empresa
        const configRef = doc(db, `companies/${id}/settings/general`);
        let configSnap = await getDoc(configRef);

        // Si no existe configuración pero tenemos un ID original diferente, intentar con ese
        if (!configSnap.exists() && id !== originalId) {
          console.log(`CompanyContext: Configuración no encontrada con ID normalizado, intentando con ID original: ${originalId}`);
          const originalConfigRef = doc(db, `companies/${originalId}/settings/general`);
          const originalConfigSnap = await getDoc(originalConfigRef);
          
          if (originalConfigSnap.exists()) {
            configSnap = originalConfigSnap;
            id = originalId; // Usar el ID original si funciona
            console.log(`CompanyContext: Usando ID original ${originalId} para cargar datos`);
          }
        }

        if (configSnap.exists()) {
          const configData = configSnap.data();
          setCompanyData({
            companyId: id,
            originalCompanyId: originalId !== id ? originalId : undefined,
            companyName: configData.companyName || 'CanalEtica',
            companyLogo: configData.logoUrl,
            primaryColor: configData.primaryColor || '#1976d2',
            secondaryColor: configData.secondaryColor || '#dc004e',
            isLoading: false
          });
        } else {
          // Si no encontramos configuración, verificar si la empresa existe
          const companyRef = doc(db, `companies/${id}`);
          const companySnap = await getDoc(companyRef);
          
          if (companySnap.exists()) {
            const companyData = companySnap.data();
            setCompanyData({
              companyId: id,
              originalCompanyId: originalId !== id ? originalId : undefined,
              companyName: companyData.name || 'CanalEtica',
              primaryColor: '#1976d2',
              secondaryColor: '#dc004e',
              isLoading: false
            });
          } else {
            // Empresa no encontrada, usar valores predeterminados
            console.log(`CompanyContext: No se encontró la empresa con ID ${id}, usando valores predeterminados`);
            setCompanyData({
              ...defaultContextValue,
              companyId: id,
              originalCompanyId: originalId !== id ? originalId : undefined,
              isLoading: false
            });
          }
        }
      } catch (error) {
        console.error('Error al cargar datos de la empresa:', error);
        setCompanyData({
          ...defaultContextValue,
          companyId: id,
          originalCompanyId: originalId !== id ? originalId : undefined,
          isLoading: false
        });
      }
    };

    const { normalizedId, originalId } = detectCompanyId();
    console.log(`CompanyContext: Cargando datos para compañía. ID normalizado: "${normalizedId}", ID original: "${originalId}"`);
    loadCompanyData(normalizedId, originalId);
  }, [pathname]);

  return (
    <CompanyContext.Provider value={companyData}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  try {
    const context = useContext(CompanyContext);

    // Verificar si el contexto está definido
    if (!context) {
      throw new Error('useCompany debe ser usado dentro de un CompanyProvider');
    }

    // Detección robusta de subdominios como capa adicional de seguridad
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost') {
        const hostParts = hostname.split('.');
        const subdomain = hostParts[0]?.toLowerCase();

        // Si es un subdominio válido (no es www, canaletic, canaletica)
        if (subdomain &&
            subdomain !== 'www' &&
            subdomain !== 'canaletic' &&
            subdomain !== 'canaletica' &&
            hostParts.length > 1) {

          // Si el context.companyId no coincide con el subdominio, aplicar corrección de seguridad
          if (context.companyId !== subdomain &&
              context.companyId !== normalizeCompanyId(subdomain) &&
              context.originalCompanyId !== subdomain) {

            logger.warn(`🔐 CORRECCIÓN DE SEGURIDAD: Detectado subdominio ${subdomain} pero context.companyId=${context.companyId}. ¡Aplicando restricción!`, null, { prefix: 'useCompany' });

            // Guardar el intento de acceso incorrecto para auditoría de seguridad
            try {
              const prevAccesses = JSON.parse(localStorage.getItem('securityCorrections') || '[]');
              prevAccesses.push({
                timestamp: new Date().toISOString(),
                subdomain,
                incorrectCompanyId: context.companyId,
                path: window.location.pathname
              });
              localStorage.setItem('securityCorrections', JSON.stringify(prevAccesses.slice(-10)));
            } catch (e) {
              // Ignorar errores de localStorage
            }

            // Crear una copia del contexto pero con el companyId correcto
            return {
              ...context,
              companyId: subdomain,
              originalCompanyId: context.companyId
            };
          }
        }
      }
    }

    // Última verificación: si de alguna forma el contexto tiene un companyId inválido
    if (!context.companyId || context.companyId === 'undefined' || context.companyId === 'null') {
      logger.error('🚫 CompanyId inválido en contexto', null, { prefix: 'useCompany' });

      // Intentar recuperar de localStorage como último recurso
      try {
        const savedId = localStorage.getItem('detectedCompanyId');
        if (savedId) {
          logger.info(`♻️ Recuperando companyId desde localStorage: ${savedId}`, null, { prefix: 'useCompany' });
          return {
            ...context,
            companyId: savedId,
            originalCompanyId: context.companyId
          };
        }
      } catch (e) {
        // Ignorar errores de localStorage
      }
    }

    return context;
  } catch (error) {
    // Capturar cualquier error inesperado
    logger.error(`Error en useCompany: ${error}`, null, { prefix: 'useCompany' });

    // Proporcionar un valor predeterminado seguro para evitar errores en cascada
    return defaultContextValue;
  }
}