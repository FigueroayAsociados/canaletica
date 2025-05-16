// src/lib/contexts/CompanyContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants/index';
import { normalizeCompanyId } from '@/lib/utils/helpers';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();
  const auth = getAuth();

  // Verificar estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    // Solo intentar cargar datos de la empresa si conocemos el estado de autenticación
    if (isAuthenticated === null) return;

    const extractCompanyId = () => {
      // Implementación para multi-tenant
      let extractedId = DEFAULT_COMPANY_ID;
      let detectionMethod = 'default';
      
      // Primero verificar rutas (/empresa/[companyId]/...)
      const pathParts = pathname.split('/');
      if (pathParts.length > 2 && pathParts[1] === 'empresa' && pathParts[2]) {
        extractedId = pathParts[2];
        detectionMethod = 'route';
      }
      // Luego verificar subdominios y dominios personalizados
      else if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        // Verificar si es un dominio personalizado
        if (domainMapping[hostname]) {
          extractedId = domainMapping[hostname];
          detectionMethod = 'custom-domain';
        }
        // Verificar si es un subdominio
        else {
          const hostParts = hostname.split('.');
          const subdomain = hostParts[0];

          console.log(`CompanyContext: Detectando subdominio. Hostname: "${hostname}", Partes: [${hostParts.join(', ')}], Subdomain: "${subdomain}"`);

          // Es un subdominio que no es www ni localhost
          if (hostname !== 'localhost' &&
              subdomain !== 'www' &&
              subdomain !== 'canaletic' &&
              subdomain !== 'canaletica' &&
              hostParts.length > 1) {
            extractedId = subdomain;
            detectionMethod = 'subdomain';
            console.log(`CompanyContext: Subdominio válido detectado: "${subdomain}" - FIJANDO COMPANY ID = ${subdomain}`);

            // Guardar en localStorage para debug y recuperación
            if (typeof window !== 'undefined') {
              localStorage.setItem('lastDetectedSubdomain', subdomain);
              localStorage.setItem('lastDetectedTimestamp', new Date().toISOString());
            }
          }
          // Verificar parámetros de URL como última opción
          else {
            const urlParams = new URLSearchParams(window.location.search);
            const companyParam = urlParams.get('company');
            if (companyParam) {
              extractedId = companyParam;
              detectionMethod = 'query-param';
            }
          }
        }
      }
      
      console.log(`CompanyContext: ID detectado "${extractedId}" mediante ${detectionMethod}`);
      
      // Guardar el ID original antes de normalizar
      const originalId = extractedId;
      
      // Normalizar el ID para entorno de desarrollo/pruebas
      const normalizedId = normalizeCompanyId(extractedId);
      if (normalizedId !== extractedId) {
        console.log(`CompanyContext: ID normalizado de "${extractedId}" a "${normalizedId}"`);
      }
      
      return { normalizedId, originalId };
    };

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

    const { normalizedId, originalId } = extractCompanyId();
    console.log(`CompanyContext: Cargando datos para compañía. ID normalizado: "${normalizedId}", ID original: "${originalId}"`);
    loadCompanyData(normalizedId, originalId);
  }, [pathname, isAuthenticated]);

  return (
    <CompanyContext.Provider value={companyData}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  return context;
}