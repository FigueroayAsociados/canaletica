// src/lib/contexts/CompanyContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
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
      
      // Primero verificar rutas (/empresa/[companyId]/...)
      const pathParts = pathname.split('/');
      if (pathParts.length > 2 && pathParts[1] === 'empresa' && pathParts[2]) {
        extractedId = pathParts[2];
        console.log('ID de compañía extraído de la ruta:', extractedId);
      }
      // Luego verificar subdominios
      else if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        if (hostname !== 'localhost' && subdomain !== 'www' && subdomain !== 'canaletica') {
          extractedId = subdomain;
          console.log('ID de compañía extraído del subdominio:', extractedId);
        }
        // Verificar parámetros de URL
        else {
          const urlParams = new URLSearchParams(window.location.search);
          const companyParam = urlParams.get('company');
          if (companyParam) {
            extractedId = companyParam;
            console.log('ID de compañía extraído de parámetros URL:', extractedId);
          } else {
            console.log('Usando ID de compañía predeterminado:', DEFAULT_COMPANY_ID);
          }
        }
      }
      
      // Normalizar el ID para entorno de desarrollo/pruebas
      const normalizedId = normalizeCompanyId(extractedId);
      if (normalizedId !== extractedId) {
        console.log(`CompanyContext: ID normalizado de "${extractedId}" a "${normalizedId}"`);
      }
      
      return normalizedId;
    };

    const loadCompanyData = async (id: string) => {
      try {
        if (isAuthenticated) {
          // Usuario autenticado, intentar obtener la configuración
          const configRef = doc(db, `companies/${id}/settings/general`);
          const configSnap = await getDoc(configRef);

          if (configSnap.exists()) {
            const configData = configSnap.data();
            setCompanyData({
              companyId: id,
              companyName: configData.companyName || 'CanalEtica',
              companyLogo: configData.logoUrl,
              primaryColor: configData.primaryColor || '#1976d2',
              secondaryColor: configData.secondaryColor || '#dc004e',
              isLoading: false
            });
          } else {
            // Configuración no existe, usar valores predeterminados
            setCompanyData({
              ...defaultContextValue,
              companyId: id,
              isLoading: false
            });
          }
        } else {
          // Usuario no autenticado, usar valores predeterminados
          setCompanyData({
            ...defaultContextValue,
            companyId: id,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error al cargar datos de la empresa:', error);
        setCompanyData({
          ...defaultContextValue,
          companyId: id,
          isLoading: false
        });
      }
    };

    const companyId = extractCompanyId();
    loadCompanyData(companyId);
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