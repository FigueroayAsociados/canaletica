'use client';

// src/lib/contexts/AppProviders.tsx
import React from 'react';
import { ReactQueryProvider } from './ReactQueryProvider';
import { CompanyProvider } from './CompanyContext';
import { AuthProvider } from './AuthContext';

/**
 * Componente que proporciona todos los proveedores de contexto
 * en el orden correcto para evitar dependencias circulares
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <CompanyProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </CompanyProvider>
    </ReactQueryProvider>
  );
}

export default AppProviders;