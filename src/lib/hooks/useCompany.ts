import { useContext } from 'react';
import { CompanyContext } from '@/lib/contexts/CompanyContext';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants/index';

// Valor predeterminado para cuando el contexto no está disponible
const fallbackValue = {
  companyId: DEFAULT_COMPANY_ID,
  companyName: 'CanalEtica',
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  isLoading: false
};

// Este hook es un adaptador para mantener compatibilidad
// mientras los componentes se migran a usar directamente el contexto
export function useCompany() {
  try {
    const context = useContext(CompanyContext);
    // Si el contexto no está disponible o está en null/undefined, usar valor predeterminado
    if (!context) {
      console.warn('CompanyContext no disponible, usando valores predeterminados');
      return fallbackValue;
    }
    return context;
  } catch (error) {
    console.error('Error al acceder a CompanyContext:', error);
    // En caso de error, devolver valores predeterminados
    return fallbackValue;
  }
}