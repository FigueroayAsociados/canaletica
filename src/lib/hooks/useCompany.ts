import { useContext } from 'react';
import { CompanyContext } from '@/lib/contexts/CompanyContext';

// Este hook es un adaptador para mantener compatibilidad
// mientras los componentes se migran a usar directamente el contexto
export function useCompany() {
  const context = useContext(CompanyContext);
  return context;
}