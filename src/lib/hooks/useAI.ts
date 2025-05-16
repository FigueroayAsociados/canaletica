// src/lib/hooks/useAI.ts

import { useState, useCallback } from 'react';
import { useCompany } from '@/lib/hooks';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import aiService, {
  RiskAnalysisParams,
  RiskAnalysisResult,
  PredictedCategory,
  LegalDocumentParams,
  GeneratedLegalDocument,
  LegalDocumentType,
  AssistantMessage,
  ConversationalAssistantParams,
  AIInsight,
  InsightGenerationParams
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
  
  // Estado para asistente conversacional
  const [conversationHistory, setConversationHistory] = useState<AssistantMessage[]>([]);
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  
  // Estado para insights
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
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
    // Los superadministradores siempre tienen acceso a IA
    const isSuperAdmin = isEnabled('superadmin_access');
    const aiFeatureEnabled = isSuperAdmin || isEnabled('aiEnabled');
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
    // Los superadministradores siempre tienen acceso a IA
    const isSuperAdmin = isEnabled('superadmin_access');
    const aiFeatureEnabled = isSuperAdmin || isEnabled('aiEnabled');
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
   * Los superadministradores siempre tienen acceso a todas las funcionalidades de IA
   * independientemente de si los feature flags están habilitados o no
   */
  const isAIEnabled = useCallback(() => {
    // Verificar que isEnabled es una función antes de llamarla
    if (typeof isEnabled !== 'function') {
      console.error('isEnabled no es una función válida');
      return false;
    }
    
    // Si el usuario es superadministrador, siempre darle acceso a IA
    if (isEnabled('superadmin_access')) {
      return true;
    }
    // Para otros usuarios, verificar el feature flag
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
    // Los superadministradores siempre tienen acceso a IA
    const isSuperAdmin = isEnabled('superadmin_access');
    const aiFeatureEnabled = isSuperAdmin || isEnabled('aiEnabled');
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
  
  /**
   * Envía un mensaje al asistente conversacional y obtiene una respuesta
   */
  const sendMessage = useCallback(async (params: ConversationalAssistantParams) => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return null;
    }
    
    // Verificar si la funcionalidad está habilitada
    // Los superadministradores siempre tienen acceso a IA
    const isSuperAdmin = isEnabled('superadmin_access');
    const aiFeatureEnabled = isSuperAdmin || isEnabled('aiEnabled');
    if (!aiFeatureEnabled) {
      setError('Funcionalidad de IA no habilitada');
      return null;
    }
    
    try {
      setIsProcessingMessage(true);
      setError(null);
      
      // Añadir el mensaje del usuario al historial
      const userMessage: AssistantMessage = {
        role: 'user',
        content: params.userMessage,
        timestamp: new Date()
      };
      
      // Actualizar el historial con el nuevo mensaje del usuario
      const updatedHistory = [...conversationHistory, userMessage];
      setConversationHistory(updatedHistory);
      
      // Preparar parámetros con historial actualizado
      const messageParams: ConversationalAssistantParams = {
        ...params,
        previousMessages: updatedHistory
      };
      
      // Obtener respuesta del asistente
      const result = await aiService.getConversationalAssistance(companyId, messageParams);
      
      if (result.success && result.message) {
        // Actualizar el historial con la respuesta del asistente
        const newHistory = [...updatedHistory, result.message];
        setConversationHistory(newHistory);
        return result.message;
      } else {
        setError(result.error || 'Error al obtener respuesta del asistente');
        return null;
      }
    } catch (err) {
      console.error('Error en asistente conversacional:', err);
      setError('Error al procesar mensaje');
      return null;
    } finally {
      setIsProcessingMessage(false);
    }
  }, [companyId, isEnabled, conversationHistory]);
  
  /**
   * Limpia el historial de conversación
   */
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
  }, []);
  
  /**
   * Genera insights a partir de los datos de la plataforma
   */
  const generateInsights = useCallback(async (params: Partial<InsightGenerationParams> = {}) => {
    if (!companyId) {
      setError('ID de empresa no disponible');
      return { success: false, error: 'ID de empresa no disponible' };
    }
    
    // Verificar si la funcionalidad está habilitada
    // Los superadministradores siempre tienen acceso a IA
    const isSuperAdmin = isEnabled('superadmin_access');
    const aiFeatureEnabled = isSuperAdmin || isEnabled('aiEnabled');
    if (!aiFeatureEnabled) {
      setError('Funcionalidad de IA no habilitada');
      return { success: false, error: 'Funcionalidad de IA no habilitada' };
    }
    
    try {
      setIsGeneratingInsights(true);
      setError(null);
      
      const result = await aiService.generateInsights(companyId, params);
      
      if (result.success && result.insights) {
        setInsights(result.insights);
        return { 
          success: true, 
          insights: result.insights 
        };
      } else {
        setError(result.error || 'Error al generar insights');
        return { 
          success: false, 
          error: result.error || 'Error al generar insights' 
        };
      }
    } catch (err) {
      console.error('Error al generar insights:', err);
      setError('Error al procesar análisis de insights');
      return { 
        success: false, 
        error: 'Error al procesar análisis de insights' 
      };
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [companyId, isEnabled]);
  
  return {
    // Estado
    riskAnalysis,
    predictedCategories,
    generatedDocument,
    conversationHistory,
    insights,
    isLoading,
    isGeneratingDocument,
    isProcessingMessage,
    isGeneratingInsights,
    error,
    
    // Funcionalidades
    analyzeRisk,
    getPredictedCategories,
    generateLegalDocument,
    sendMessage,
    clearConversation,
    generateInsights,
    isAIEnabled
  };
}

export default useAI;