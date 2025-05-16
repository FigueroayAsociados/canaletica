'use client';

// src/components/ui/environment-indicator-client.tsx
import { useEffect, useState } from 'react';
import { useCompany } from '@/lib/hooks';
import { getEnvironmentConfig } from '@/lib/services/environmentService';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SafeRender } from './safe-render';

export default function EnvironmentIndicatorClient() {
  const { companyId } = useCompany();
  const { isSuperAdmin } = useAuth();
  const [environment, setEnvironment] = useState<'development' | 'demo' | 'production' | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadEnvironmentConfig = async () => {
      if (!companyId) return;
      
      try {
        setLoading(true);
        const result = await getEnvironmentConfig(companyId);
        
        if (result.success && result.config) {
          setEnvironment(result.config.type);
        }
      } catch (error) {
        console.error('Error al cargar configuración de entorno:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadEnvironmentConfig();
  }, [companyId]);
  
  // Si es producción y no es super admin, no mostrar nada
  // Verificar si isSuperAdmin es una función antes de llamarla
  const isSuperAdminUser = typeof isSuperAdmin === 'function' ? isSuperAdmin() : false;
  
  if ((environment === 'production' && !isSuperAdminUser) || loading || !environment) {
    return null;
  }
  
  // Definir clase de color según el entorno
  const getEnvironmentClass = () => {
    switch (environment) {
      case 'development':
        return 'bg-purple-600 text-white';
      case 'demo':
        return 'bg-yellow-500 text-black';
      case 'production':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  
  // Texto a mostrar
  const getEnvironmentText = () => {
    switch (environment) {
      case 'development':
        return 'DESARROLLO';
      case 'demo':
        return 'DEMO';
      case 'production':
        return 'PROD';
      default:
        return 'ENTORNO';
    }
  };
  
  return (
    <div 
      className={`fixed bottom-0 right-0 z-50 px-3 py-1 text-xs font-bold ${getEnvironmentClass()}`}
      title={`Entorno: ${environment} - Empresa: ${companyId}`}
    >
      {getEnvironmentText()}
      <SafeRender condition={!!isSuperAdminUser}>
        <span className="ml-2 px-1 py-0.5 bg-white bg-opacity-30 rounded text-[10px]">
          SUPERADMIN
        </span>
      </SafeRender>
    </div>
  );
}