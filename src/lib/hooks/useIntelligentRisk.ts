// src/lib/hooks/useIntelligentRisk.ts
// Hook para funcionalidad de análisis inteligente híbrido (IA + Compliance)

import { useState, useCallback, useContext } from 'react';
import { CompanyContext } from '@/lib/contexts/CompanyContext';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { realizarAnalisisInteligente, AnalisisInteligente } from '@/lib/services/intelligentRiskService';
import { ReportFormValues } from '@/types/report';

export function useIntelligentRisk() {
  const { companyId } = useContext(CompanyContext);
  const { isEnabled } = useFeatureFlags();
  
  // Estados
  const [analysis, setAnalysis] = useState<AnalisisInteligente | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verifica si el análisis inteligente está habilitado
   */
  const isIntelligentRiskEnabled = useCallback(() => {
    if (typeof isEnabled !== 'function') {
      console.error('isEnabled no es una función válida');
      return false;
    }
    
    // Los superadministradores siempre tienen acceso
    if (isEnabled('superadmin_access')) {
      return true;
    }
    
    // Para otros usuarios, verificar el feature flag específico
    return isEnabled('intelligentRiskAnalysisEnabled');
  }, [isEnabled]);

  /**
   * Realiza análisis inteligente híbrido de una denuncia
   */
  const analyzeIntelligentRisk = useCallback(async (
    reportData: ReportFormValues & { id: string }
  ): Promise<AnalisisInteligente | null> => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return null;
    }

    // Verificar si la funcionalidad está habilitada
    if (!isIntelligentRiskEnabled()) {
      setError('Análisis Inteligente no habilitado para esta empresa');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useIntelligentRisk] Iniciando análisis inteligente para reporte:', reportData.id);
      
      const resultado = await realizarAnalisisInteligente(reportData, companyId);
      
      console.log('[useIntelligentRisk] Análisis completado:', {
        unifiedScore: resultado.unified_risk.score,
        riskLevel: resultado.unified_risk.level,
        urgency: resultado.unified_risk.urgency,
        processingTime: resultado.processing_time_ms
      });

      setAnalysis(resultado);
      return resultado;
    } catch (err) {
      console.error('Error en análisis inteligente:', err);
      setError('Error al realizar análisis inteligente de riesgo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, isIntelligentRiskEnabled]);

  /**
   * Limpia el análisis actual
   */
  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  /**
   * Obtiene recomendaciones rápidas basadas en el nivel de riesgo
   */
  const getQuickRecommendations = useCallback((riskLevel: string): string[] => {
    switch (riskLevel) {
      case 'Crítico':
        return [
          'Notificación inmediata a CEO y Comité de Ética',
          'Activar protocolo de crisis organizacional',
          'Considerar suspensión preventiva de involucrados',
          'Contactar asesoría legal externa'
        ];
      case 'Alto':
        return [
          'Asignar investigador senior experimentado',
          'Reunión urgente del Comité de Ética en 24 horas',
          'Implementar medidas precautorias',
          'Revisar obligaciones de reporte legal'
        ];
      case 'Medio':
        return [
          'Asignar investigador calificado',
          'Programar revisión del Comité en 72 horas',
          'Documentar evidencias cuidadosamente',
          'Establecer plan de seguimiento'
        ];
      case 'Bajo':
        return [
          'Asignar para investigación rutinaria',
          'Documentar apropiadamente',
          'Seguimiento mensual',
          'Evaluar patrones con otros casos'
        ];
      default:
        return [
          'Registro y documentación estándar',
          'Seguimiento de rutina',
          'Revisión trimestral'
        ];
    }
  }, []);

  return {
    // Estado
    analysis,
    isLoading,
    error,
    
    // Funcionalidades
    analyzeIntelligentRisk,
    clearAnalysis,
    getQuickRecommendations,
    isIntelligentRiskEnabled
  };
}

export default useIntelligentRisk;