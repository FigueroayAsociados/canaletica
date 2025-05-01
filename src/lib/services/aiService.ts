// src/lib/services/aiService.ts

import { getFeatureFlags } from '@/lib/services/featureFlagService';
import { normalizeCompanyId } from '@/lib/utils/helpers';

/**
 * Tipo para los niveles de riesgo
 */
export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'crítico';

/**
 * Tipo para las categorías predictivas
 */
export type PredictedCategory = {
  category: string;
  subcategory?: string;
  confidence: number;
};

/**
 * Tipo para resultados de análisis de riesgo
 */
export interface RiskAnalysisResult {
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: string[];
  recommendedActions: string[];
  timelinessScore: number;
  legalImplicationScore: number;
  organizationalImpactScore: number;
  reputationalRiskScore: number;
}

/**
 * Interfaz para parámetros de análisis de riesgo
 */
export interface RiskAnalysisParams {
  reportContent: string;
  category?: string;
  subcategory?: string;
  isAnonymous?: boolean;
  hasEvidence?: boolean;
  isKarinLaw?: boolean;
  involvedPositions?: string[];
}

/**
 * Servicio para funcionalidades de IA
 * 
 * Este servicio centraliza todas las operaciones relacionadas con
 * inteligencia artificial, verificando siempre si la funcionalidad
 * está habilitada para la empresa específica.
 */
export const aiService = {
  /**
   * Verifica si las funcionalidades de IA están habilitadas para una empresa
   */
  async isAiEnabled(companyId: string): Promise<boolean> {
    try {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      const { success, features } = await getFeatureFlags(normalizedCompanyId);
      
      return success && features ? features.aiEnabled : false;
    } catch (error) {
      console.error('Error al verificar habilitación de IA:', error);
      return false;
    }
  },

  /**
   * Análisis predictivo de riesgo para una denuncia
   */
  async analyzeRisk(
    companyId: string,
    params: RiskAnalysisParams
  ): Promise<{ success: boolean; analysis?: RiskAnalysisResult; error?: string }> {
    try {
      // Verificar si la IA está habilitada para esta empresa
      const aiEnabled = await this.isAiEnabled(companyId);
      if (!aiEnabled) {
        return {
          success: false,
          error: 'Las funcionalidades de IA no están habilitadas para esta empresa'
        };
      }

      // En una implementación real, aquí se conectaría con un servicio de IA externo
      // Para esta demostración, simulamos un análisis basado en palabras clave
      
      // Convertir el contenido a minúsculas para análisis
      const content = params.reportContent.toLowerCase();
      
      // Criterios básicos para detección de riesgo
      let riskScore = 50; // Punto de partida neutral
      const riskFactors: string[] = [];
      
      // Análisis de texto - palabras clave de alto riesgo
      const highRiskTerms = [
        'amenaza', 'violencia', 'acoso', 'agresión', 'suicidio', 
        'maltrato', 'intimidación', 'discriminación', 'hostigamiento',
        'abuso', 'sexual', 'físico', 'verbal', 'humillación', 'salud mental'
      ];
      
      // Análisis de texto - palabras clave de riesgo medio
      const mediumRiskTerms = [
        'conflicto', 'tensión', 'molestias', 'incómodo', 'desagradable',
        'insatisfacción', 'clima laboral', 'presión', 'malestar', 'queja'
      ];
      
      // Analizar contenido para términos de alto riesgo
      for (const term of highRiskTerms) {
        if (content.includes(term)) {
          riskScore += 5;
          if (!riskFactors.includes('Lenguaje de alto riesgo detectado')) {
            riskFactors.push('Lenguaje de alto riesgo detectado');
          }
        }
      }
      
      // Analizar contenido para términos de riesgo medio
      for (const term of mediumRiskTerms) {
        if (content.includes(term)) {
          riskScore += 2;
          if (!riskFactors.includes('Lenguaje de riesgo moderado detectado')) {
            riskFactors.push('Lenguaje de riesgo moderado detectado');
          }
        }
      }
      
      // Ajustar por categoría
      if (params.isKarinLaw) {
        riskScore += 10;
        riskFactors.push('Caso de Ley Karin (acoso laboral/sexual)');
      }
      
      // Ajustar por anonimato
      if (params.isAnonymous) {
        riskScore -= 5; // Reduce la urgencia, pero no necesariamente el riesgo real
        riskFactors.push('Reporte anónimo (posible dificultad para investigación)');
      }
      
      // Ajustar por evidencia
      if (params.hasEvidence) {
        riskScore += 5;
        riskFactors.push('Incluye evidencia adjunta');
      }
      
      // Ajustar por posiciones involucradas
      if (params.involvedPositions && params.involvedPositions.length > 0) {
        const highRiskPositions = ['gerente', 'director', 'jefe', 'supervisor', 'ejecutivo'];
        const positionsLower = params.involvedPositions.map(p => p.toLowerCase());
        
        const hasHighRiskPosition = positionsLower.some(pos => 
          highRiskPositions.some(riskPos => pos.includes(riskPos))
        );
        
        if (hasHighRiskPosition) {
          riskScore += 15;
          riskFactors.push('Involucra a personas en posiciones de poder');
        }
      }
      
      // Determinar nivel de riesgo
      let riskLevel: RiskLevel = 'bajo';
      if (riskScore >= 90) {
        riskLevel = 'crítico';
      } else if (riskScore >= 70) {
        riskLevel = 'alto';
      } else if (riskScore >= 40) {
        riskLevel = 'medio';
      }
      
      // Generar acciones recomendadas
      const recommendedActions: string[] = [];
      
      if (riskLevel === 'crítico' || riskLevel === 'alto') {
        recommendedActions.push('Asignar investigador inmediatamente');
        recommendedActions.push('Considerar medidas precautorias de separación');
        recommendedActions.push('Notificar a dirección de RRHH');
        
        if (params.isKarinLaw) {
          recommendedActions.push('Aplicar protocolo Ley Karin con plazos estrictos');
          recommendedActions.push('Preparar notificaciones para Dirección del Trabajo');
          recommendedActions.push('Notificar a SUSESO dentro de 5 días hábiles');
        }
      }
      
      if (riskLevel === 'medio') {
        recommendedActions.push('Asignar investigador dentro de 48 horas');
        recommendedActions.push('Revisar historial de denuncias similares');
        
        if (params.isKarinLaw) {
          recommendedActions.push('Aplicar protocolo Ley Karin');
        }
      }
      
      if (riskLevel === 'bajo') {
        recommendedActions.push('Asignar investigador según disponibilidad');
        recommendedActions.push('Documentar para análisis de tendencias');
      }
      
      // Análisis de componentes individuales
      const timelinessScore = riskLevel === 'crítico' || riskLevel === 'alto' ? 90 : riskLevel === 'medio' ? 70 : 40;
      
      const legalImplicationScore = params.isKarinLaw ? 85 : 
        content.includes('legal') || content.includes('denuncia') || content.includes('demanda') ? 75 : 50;
      
      const organizationalImpactScore = 
        (params.involvedPositions && params.involvedPositions.length > 2) ? 80 : 
        (params.involvedPositions && params.involvedPositions.length > 0) ? 60 : 40;
      
      const reputationalRiskScore = riskLevel === 'crítico' ? 85 : 
        riskLevel === 'alto' ? 70 : 
        riskLevel === 'medio' ? 50 : 30;
      
      return {
        success: true,
        analysis: {
          riskLevel,
          riskScore: Math.min(100, Math.max(0, riskScore)), // Asegurar que esté entre 0-100
          riskFactors,
          recommendedActions,
          timelinessScore,
          legalImplicationScore,
          organizationalImpactScore,
          reputationalRiskScore
        }
      };
    } catch (error) {
      console.error('Error en análisis de riesgo:', error);
      return {
        success: false,
        error: 'Error al realizar análisis de riesgo'
      };
    }
  },
  
  /**
   * Predice categorías para una denuncia basado en su contenido
   */
  async predictCategories(
    companyId: string,
    reportContent: string
  ): Promise<{ success: boolean; categories?: PredictedCategory[]; error?: string }> {
    try {
      // Verificar si la IA está habilitada
      const aiEnabled = await this.isAiEnabled(companyId);
      if (!aiEnabled) {
        return {
          success: false,
          error: 'Las funcionalidades de IA no están habilitadas para esta empresa'
        };
      }
      
      // Implementación simulada - aquí conectaríamos con un servicio real de IA
      // basado en modelos de clasificación de texto
      
      const content = reportContent.toLowerCase();
      const predictions: PredictedCategory[] = [];
      
      // Reglas simples para simular la categorización
      if (content.includes('acoso') && (content.includes('laboral') || content.includes('trabajo'))) {
        predictions.push({
          category: 'ley_karin',
          confidence: 0.85
        });
      }
      
      if (content.includes('fraude') || content.includes('corrupción') || content.includes('soborno')) {
        predictions.push({
          category: 'modelo_prevencion',
          subcategory: 'fraude_corrupcion',
          confidence: 0.78
        });
      }
      
      if (content.includes('datos') || content.includes('información') || content.includes('privacidad')) {
        predictions.push({
          category: 'ciberseguridad',
          subcategory: 'proteccion_datos',
          confidence: 0.65
        });
      }
      
      if (content.includes('discriminación') || content.includes('trato') || content.includes('injusto')) {
        predictions.push({
          category: 'clima_laboral',
          subcategory: 'discriminacion',
          confidence: 0.72
        });
      }
      
      // Asegurar que tengamos al menos una predicción, incluso si es de baja confianza
      if (predictions.length === 0) {
        predictions.push({
          category: 'otros',
          confidence: 0.45
        });
      }
      
      // Ordenar por confianza descendente
      predictions.sort((a, b) => b.confidence - a.confidence);
      
      return {
        success: true,
        categories: predictions
      };
    } catch (error) {
      console.error('Error en predicción de categorías:', error);
      return {
        success: false,
        error: 'Error al predecir categorías'
      };
    }
  }
};

export default aiService;