// src/lib/hooks/useFeatureFlags.ts

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { FeatureFlags, getFeatureFlags, updateFeatureFlag } from '@/lib/services/featureFlagService';

export function useFeatureFlags() {
  const { companyId } = useCompany();
  // Usar useAuth en lugar de useCurrentUser para evitar dependencia circular
  const { currentUser, isSuperAdmin } = useAuth();
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar feature flags
  useEffect(() => {
    const loadFeatureFlags = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const result = await getFeatureFlags(companyId);
        
        if (result.success && result.features) {
          setFeatures(result.features);
        } else {
          setError(result.error || 'Error al cargar flags');
        }
      } catch (err) {
        console.error('Error al cargar feature flags:', err);
        setError('Error al cargar la configuración de funcionalidades');
      } finally {
        setLoading(false);
      }
    };

    loadFeatureFlags();
  }, [companyId]);

  // Función para actualizar un feature flag (solo si es super admin)
  const updateFlag = useCallback(
    async (featureName: keyof FeatureFlags, enabled: boolean) => {
      if (!companyId || !currentUser) {
        return { success: false, error: 'No autenticado o sin empresa seleccionada' };
      }

      // Verificar si es super admin o tiene permisos
      if (!isSuperAdmin()) {
        return { success: false, error: 'No tiene permisos para actualizar features' };
      }

      try {
        const result = await updateFeatureFlag(companyId, featureName, enabled, currentUser.uid);
        
        if (result.success) {
          // Actualizar estado local
          setFeatures(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              [featureName]: enabled
            };
          });
        }
        
        return result;
      } catch (err) {
        console.error(`Error al actualizar feature '${featureName}':`, err);
        return { success: false, error: 'Error al actualizar configuración' };
      }
    },
    [companyId, currentUser, isSuperAdmin]
  );

  // Función auxiliar para verificar si un feature está habilitado
  const isEnabled = useCallback(
    (featureName: keyof FeatureFlags): boolean => {
      // Verificar primero si isSuperAdmin es una función antes de intentar llamarla
      const isSuperAdminUser = typeof isSuperAdmin === 'function' ? isSuperAdmin() : isSuperAdmin === true;
      
      // Super admin siempre tiene acceso a todas las características
      if (isSuperAdminUser) {
        return true;
      }
      
      // Para usuarios normales, verificar el feature flag
      if (!features) return false;
      return features[featureName] === true;
    },
    [features, isSuperAdmin]
  );

  // Verificar si el usuario puede gestionar características (es superadmin)
  const canManageFeatures = typeof isSuperAdmin === 'function' ? isSuperAdmin() : isSuperAdmin === true;
  
  return {
    features,
    loading,
    error,
    updateFlag,
    isEnabled,
    canManageFeatures
  };
}

export default useFeatureFlags;