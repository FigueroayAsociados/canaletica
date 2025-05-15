// src/lib/hooks/useAlerts.ts

import { useState, useCallback, useEffect } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import alertService, { 
  SmartAlert, 
  AlertStatus, 
  AlertType, 
  AlertUrgency,
  GetAlertsParams
} from '@/lib/services/alertService';

/**
 * Hook personalizado para la gestión de alertas inteligentes
 */
export function useAlerts() {
  const { companyId } = useCompany();
  const { isEnabled } = useFeatureFlags();
  const { profile } = useCurrentUser();
  
  // Estados
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  /**
   * Verifica si las alertas inteligentes están habilitadas
   */
  const areAlertsEnabled = useCallback(() => {
    // Verificar que isEnabled es una función antes de llamarla
    if (typeof isEnabled !== 'function') {
      console.error('isEnabled no es una función válida en useAlerts');
      return false;
    }
    return isEnabled('aiEnabled') && isEnabled('smartAlertsEnabled');
  }, [isEnabled]);
  
  /**
   * Obtiene las alertas para el usuario actual
   */
  const fetchAlerts = useCallback(async (params: Partial<GetAlertsParams> = {}) => {
    if (!companyId || !profile?.uid) {
      setError('ID de empresa o usuario no disponible');
      return [];
    }
    
    // Verificar si la funcionalidad está habilitada
    if (!areAlertsEnabled()) {
      setError('Funcionalidad de alertas inteligentes no habilitada');
      return [];
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Parámetros por defecto
      const defaultParams: GetAlertsParams = {
        userId: profile.uid,
        includeExpired: false,
        ...params
      };
      
      const result = await alertService.getAlerts(companyId, defaultParams);
      
      if (result.success && result.alerts) {
        setAlerts(result.alerts);
        
        // Actualizar contador de no leídas
        const newUnreadCount = result.alerts.filter(alert => alert.status === 'new').length;
        setUnreadCount(newUnreadCount);
        
        setLastRefreshed(new Date());
        return result.alerts;
      } else {
        setError(result.error || 'Error al obtener alertas');
        return [];
      }
    } catch (error) {
      console.error('Error en obtención de alertas:', error);
      setError('Error al procesar alertas');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId, profile, areAlertsEnabled]);
  
  /**
   * Actualiza el estado de una alerta
   */
  const updateAlertStatus = useCallback(async (alertId: string, status: AlertStatus) => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return false;
    }
    
    // Verificar si la funcionalidad está habilitada
    if (!areAlertsEnabled()) {
      setError('Funcionalidad de alertas inteligentes no habilitada');
      return false;
    }
    
    try {
      setError(null);
      
      const result = await alertService.updateAlertStatus(companyId, alertId, status);
      
      if (result.success) {
        // Actualizar estado local
        setAlerts(prevAlerts => 
          prevAlerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, status } 
              : alert
          )
        );
        
        // Si se marca como vista, actualizar contador
        if (status !== 'new' && alerts.find(a => a.id === alertId)?.status === 'new') {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return true;
      } else {
        setError(result.error || 'Error al actualizar estado de alerta');
        return false;
      }
    } catch (error) {
      console.error('Error al actualizar estado de alerta:', error);
      setError('Error al procesar cambio de estado');
      return false;
    }
  }, [companyId, alerts, areAlertsEnabled]);
  
  /**
   * Marca una alerta como vista
   */
  const markAsViewed = useCallback(async (alertId: string) => {
    return updateAlertStatus(alertId, 'viewed');
  }, [updateAlertStatus]);
  
  /**
   * Descarta una alerta
   */
  const dismissAlert = useCallback(async (alertId: string) => {
    return updateAlertStatus(alertId, 'dismissed');
  }, [updateAlertStatus]);
  
  /**
   * Marca una alerta como accionada (cuando se ha tomado acción sobre ella)
   */
  const markAsActioned = useCallback(async (alertId: string) => {
    return updateAlertStatus(alertId, 'actioned');
  }, [updateAlertStatus]);
  
  /**
   * Marca todas las alertas como vistas
   */
  const markAllAsViewed = useCallback(async () => {
    if (!companyId || !profile?.uid) {
      setError('ID de empresa o usuario no disponible');
      return false;
    }
    
    // Verificar si la funcionalidad está habilitada
    if (!areAlertsEnabled()) {
      setError('Funcionalidad de alertas inteligentes no habilitada');
      return false;
    }
    
    try {
      setError(null);
      
      const result = await alertService.markAllAsViewed(companyId, profile.uid);
      
      if (result.success) {
        // Actualizar estado local
        setAlerts(prevAlerts => 
          prevAlerts.map(alert => 
            alert.status === 'new' 
              ? { ...alert, status: 'viewed' as AlertStatus } 
              : alert
          )
        );
        
        // Actualizar contador
        setUnreadCount(0);
        
        return true;
      } else {
        setError(result.error || 'Error al marcar todas las alertas como vistas');
        return false;
      }
    } catch (error) {
      console.error('Error al marcar alertas como vistas:', error);
      setError('Error al procesar cambio de estado');
      return false;
    }
  }, [companyId, profile, areAlertsEnabled]);
  
  /**
   * Genera alertas inteligentes (solo para demostración/pruebas)
   */
  const generateAlerts = useCallback(async () => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return false;
    }
    
    // Verificar si la funcionalidad está habilitada
    if (!areAlertsEnabled()) {
      setError('Funcionalidad de alertas inteligentes no habilitada');
      return false;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await alertService.generateSmartAlerts(companyId);
      
      if (result.success) {
        // Refrescar las alertas después de generar nuevas
        await fetchAlerts();
        return true;
      } else {
        setError(result.error || 'Error al generar alertas inteligentes');
        return false;
      }
    } catch (error) {
      console.error('Error al generar alertas:', error);
      setError('Error al procesar generación de alertas');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, fetchAlerts, areAlertsEnabled]);
  
  // Cargar alertas al iniciar
  useEffect(() => {
    if (companyId && profile?.uid && areAlertsEnabled()) {
      fetchAlerts();
    }
  }, [companyId, profile, fetchAlerts, areAlertsEnabled]);
  
  return {
    // Estado
    alerts,
    unreadCount,
    isLoading,
    error,
    lastRefreshed,
    
    // Acciones
    fetchAlerts,
    markAsViewed,
    dismissAlert,
    markAsActioned,
    markAllAsViewed,
    generateAlerts,
    
    // Verificación
    areAlertsEnabled
  };
}

export default useAlerts;