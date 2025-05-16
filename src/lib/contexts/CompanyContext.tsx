// src/lib/contexts/CompanyContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants/index';
import { logger } from '@/lib/utils/logger';
import { useCompanyDetection } from '@/lib/utils/companyDetection';

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

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyData, setCompanyData] = useState<CompanyContextType>(defaultContextValue);
  const pathname = usePathname();
  
  // Usar el hook de detección de compañía que extrajimos
  const { normalizedId, originalId } = useCompanyDetection();

  useEffect(() => {
    // Cargar datos de la empresa sin depender de autenticación
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

    console.log(`CompanyContext: Cargando datos para compañía. ID normalizado: "${normalizedId}", ID original: "${originalId}"`);
    loadCompanyData(normalizedId, originalId);
  }, [pathname, normalizedId, originalId]);

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

// Exportar el contexto para que pueda ser usado en AuthContext y otros componentes
export { CompanyContext };