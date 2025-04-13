'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * Proveedor de React Query para la aplicación
 * Esto permite utilizar React Query en toda la aplicación
 * con configuración centralizada
 */
export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Crear una instancia de QueryClient por cada sesión de usuario
  // para evitar compartir estado entre usuarios diferentes
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Configuración predeterminada para todas las consultas
        staleTime: 1000 * 60 * 5, // Datos considerados frescos por 5 minutos
        cacheTime: 1000 * 60 * 60, // Datos en caché por 1 hora
        retry: 1, // Reintentar consultas fallidas una vez
        refetchOnWindowFocus: true, // Recargar datos cuando la ventana obtiene el foco
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}