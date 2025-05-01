// src/lib/hooks/useAI.ts

import { useState, useCallback } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import aiService, {
  RiskAnalysisParams,
  RiskAnalysisResult,
  PredictedCategory,
  LegalDocumentParams,
  GeneratedLegalDocument,
  LegalDocumentType
} from '@/lib/services/aiService';

/**
 * Hook personalizado para usar funcionalidades de IA
 * 
 * Este hook facilita el uso de las funcionalidades de IA en componentes
 * React, gestionando estados de carga, errores y resultados.
 */
export function useAI() {
  const { companyId } = useCompany();
  const { isEnabled } = useFeatureFlags();
  
  // Estado para análisis de riesgo
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysisResult | null>(null);
  const [predictedCategories, setPredictedCategories] = useState<PredictedCategory[]>([]);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedLegalDocument | null>(null);
  
  // Estado compartido
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Obtiene predicción de categorías basada en contenido
   */
  const getPredictedCategories = useCallback(async (content: string) => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return [];
    }
    
    // Verificar si la funcionalidad está habilitada
    const aiFeatureEnabled = isEnabled('aiEnabled');
    if (!aiFeatureEnabled) {
      setError('Funcionalidad de IA no habilitada');
      return [];
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await aiService.predictCategories(companyId, content);
      
      if (result.success && result.categories) {
        setPredictedCategories(result.categories);
        return result.categories;
      } else {
        setError(result.error || 'Error al predecir categorías');
        return [];
      }
    } catch (err) {
      console.error('Error en predicción de categorías:', err);
      setError('Error al procesar la predicción de categorías');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId, isEnabled]);
  
  /**
   * Analiza el riesgo de una denuncia
   */
  const analyzeRisk = useCallback(async (params: RiskAnalysisParams) => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return null;
    }
    
    // Verificar si la funcionalidad está habilitada
    const aiFeatureEnabled = isEnabled('aiEnabled');
    if (!aiFeatureEnabled) {
      setError('Funcionalidad de IA no habilitada');
      return null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await aiService.analyzeRisk(companyId, params);
      
      if (result.success && result.analysis) {
        setRiskAnalysis(result.analysis);
        return result.analysis;
      } else {
        setError(result.error || 'Error en análisis de riesgo');
        return null;
      }
    } catch (err) {
      console.error('Error en análisis de riesgo:', err);
      setError('Error al procesar análisis de riesgo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, isEnabled]);
  
  /**
   * Verifica si la IA está habilitada para esta empresa
   */
  const isAIEnabled = useCallback(() => {
    return isEnabled('aiEnabled');
  }, [isEnabled]);
  
  /**
   * Genera un documento legal basado en los parámetros proporcionados
   */
  const generateLegalDocument = useCallback(async (params: LegalDocumentParams) => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return null;
    }
    
    // Verificar si la funcionalidad está habilitada
    const aiFeatureEnabled = isEnabled('aiEnabled');
    if (!aiFeatureEnabled) {
      setError('Funcionalidad de IA no habilitada');
      return null;
    }
    
    try {
      setIsGeneratingDocument(true);
      setError(null);
      
      const result = await aiService.generateLegalDocument(companyId, params);
      
      if (result.success && result.document) {
        setGeneratedDocument(result.document);
        return result.document;
      } else {
        setError(result.error || 'Error en generación de documento legal');
        return null;
      }
    } catch (err) {
      console.error('Error en generación de documento:', err);
      setError('Error al procesar la generación del documento');
      return null;
    } finally {
      setIsGeneratingDocument(false);
    }
  }, [companyId, isEnabled]);
  
  return {
    // Estado
    riskAnalysis,
    predictedCategories,
    generatedDocument,
    isLoading,
    isGeneratingDocument,
    error,
    
    // Funcionalidades
    analyzeRisk,
    getPredictedCategories,
    generateLegalDocument,
    isAIEnabled
  };
}

export default useAI;