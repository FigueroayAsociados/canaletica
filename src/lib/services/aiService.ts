// src/lib/services/aiService.ts

import { getFeatureFlags } from '@/lib/services/featureFlagService';
import { normalizeCompanyId } from '@/lib/utils/helpers';
import { logger } from '@/lib/utils/logger';

// Importar servicios de Claude
import {
  isClaudeAvailable,
  analyzeRiskWithClaude,
  generateInsightsWithClaude,
  predictCategoriesWithClaude,
  getConversationalAssistanceWithClaude,
  generateLegalDocumentWithClaude
} from './claudeService';

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
 * Interface para mensajes del asistente conversacional
 */
export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Interface para parámetros del asistente conversacional
 */
export interface ConversationalAssistantParams {
  userRole: 'investigator' | 'admin' | 'super_admin';
  userMessage: string;
  previousMessages?: AssistantMessage[];
  context?: {
    reportId?: string;
    caseType?: string;
    module?: string;
    reportData?: any;
    appContext?: string;
    deadlines?: Array<{label: string; date: Date}>;
  };
}

/**
 * Interface para insights
 */
export interface AIInsight {
  id: string;
  category: 'trend' | 'risk' | 'recommendation' | 'efficiency';
  title: string;
  description: string;
  severity?: 'high' | 'medium' | 'low';
  confidence: number;
  data?: any;
  relatedReports?: string[];
  createdAt: Date;
}

/**
 * Interface para parámetros de generación de insights
 */
export interface InsightGenerationParams {
  companyId: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  focusAreas?: ('trends' | 'risks' | 'recommendations' | 'efficiency')[];
  maxResults?: number;
  minConfidence?: number;
}

/**
 * Tipos de documentos legales que se pueden generar
 */
export type LegalDocumentType = 
  | 'informe_preliminar' 
  | 'informe_final' 
  | 'notificacion_dt' 
  | 'plan_investigacion'
  | 'carta_notificacion'
  | 'acta_entrevista' 
  | 'resolucion';

/**
 * Tipo de resultado para generación de documentos legales
 */
export interface GeneratedLegalDocument {
  title: string;
  content: string;
  sections: {
    title: string;
    content: string;
  }[];
  recommendations?: string[];
  warnings?: string[];
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
/**
 * Interfaz para parámetros de generación de documentos legales
 */
export interface LegalDocumentParams {
  documentType: LegalDocumentType;
  caseData: {
    reportId?: string;
    category?: string;
    description?: string;
    involvedPersons?: Array<{name?: string; position?: string; role?: string}>;
    events?: string[];
    date?: Date | string;
    isKarinLaw?: boolean;
    company?: {
      name?: string;
      rut?: string;
      address?: string;
    };
  };
  authorData?: {
    name: string;
    position: string;
    signature?: string;
  };
  additionalContext?: string;
  requestedSections?: string[];
  tone?: 'formal' | 'neutral' | 'simple';
  length?: 'concise' | 'standard' | 'detailed';
}

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
      logger.error('Error al verificar habilitación de IA', error, { 
        prefix: 'aiService', 
        tags: ['features'] 
      });
      return false;
    }
  },
  
  /**
   * Asistente conversacional que proporciona respuestas contextualizadas
   * según el rol del usuario y el contexto proporcionado
   */
  async getConversationalAssistance(
    companyId: string,
    params: ConversationalAssistantParams
  ): Promise<{ success: boolean; message?: AssistantMessage; error?: string }> {
    try {
      // Verificar si la IA está habilitada para esta empresa
      const aiEnabled = await this.isAiEnabled(companyId);
      if (!aiEnabled) {
        return {
          success: false,
          error: 'Las funcionalidades de IA no están habilitadas para esta empresa'
        };
      }

      const { userRole, userMessage, previousMessages = [], context = {} } = params;
      
      // En una implementación real, aquí se conectaría con un servicio de IA externo
      // Para esta demostración, simulamos respuestas basadas en el rol y contexto
      
      let responseContent = '';
      
      // Respuestas específicas basadas en el rol del usuario
      if (userRole === 'investigator') {
        // Lógica para investigadores: ayuda con investigaciones y uso de la app
        if (userMessage.toLowerCase().includes('plazo') || userMessage.toLowerCase().includes('tiempo')) {
          responseContent = this._generateDeadlineAssistance(context);
        } else if (userMessage.toLowerCase().includes('ley karin') || userMessage.toLowerCase().includes('acoso')) {
          responseContent = this._generateKarinLawAssistance();
        } else if (userMessage.toLowerCase().includes('entrevista')) {
          responseContent = this._generateInterviewAssistance();
        } else if (userMessage.toLowerCase().includes('reporte') || userMessage.toLowerCase().includes('informe')) {
          responseContent = this._generateReportAssistance();
        } else {
          responseContent = 'Como asistente virtual, puedo ayudarte con tu investigación. Puedo proporcionar información sobre plazos, requisitos legales, o sugerencias para entrevistas y reportes. ¿En qué área específica necesitas ayuda?';
        }
      } else if (userRole === 'super_admin') {
        // Lógica para super administradores: ayuda con mejora y detección de problemas
        if (userMessage.toLowerCase().includes('mejora') || userMessage.toLowerCase().includes('optimizar')) {
          responseContent = this._generateImprovementSuggestions(context);
        } else if (userMessage.toLowerCase().includes('problema') || userMessage.toLowerCase().includes('error')) {
          responseContent = this._generateTroubleshootingAssistance();
        } else if (userMessage.toLowerCase().includes('estadística') || userMessage.toLowerCase().includes('reporte')) {
          responseContent = this._generateReportingInsights();
        } else {
          responseContent = 'Como asistente virtual, puedo ayudarte a mejorar la aplicación y detectar áreas de oportunidad. Puedo sugerir optimizaciones, ayudar con problemas técnicos, o proporcionar insights sobre los datos de la plataforma. ¿En qué área específica te gustaría enfocarte?';
        }
      } else {
        // Respuestas para otros roles (admin)
        responseContent = 'Puedo ayudarte con la gestión de la plataforma. ¿Necesitas información sobre configuración, usuarios, o reportes?';
      }
      
      // Crear mensaje de respuesta
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
      
      // Simular tiempo de procesamiento para un comportamiento más realista
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        message: assistantMessage
      };
    } catch (error) {
      // Usar el logger con más detalles sobre el error
      logger.error('Error en asistente conversacional', error, { 
        prefix: 'aiService', 
        tags: ['conversation', 'assistant'] 
      });
      
      // Proporcionar un mensaje de error más descriptivo si es posible
      let errorMessage = 'Error al procesar solicitud de asistencia';
      if (error instanceof Error) {
        // En producción podríamos querer evitar exponer detalles internos al cliente
        // Por ahora, incluir un mensaje más detallado para debugging
        errorMessage += `: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
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

      // Intentar usar Claude API si está disponible
      if (isClaudeAvailable()) {
        try {
          logger.info('🤖 Usando Claude API para análisis de riesgo', companyId, { prefix: 'aiService' });
          
          const claudeAnalysis = await analyzeRiskWithClaude({
            description: params.reportContent,
            category: params.category,
            subcategory: params.subcategory,
            isAnonymous: params.isAnonymous,
            hasEvidence: params.hasEvidence,
            isKarinLaw: params.isKarinLaw,
            involvedPositions: params.involvedPositions
          });

          // Convertir respuesta de Claude al formato esperado
          const analysis: RiskAnalysisResult = {
            riskLevel: this.mapSeverityToRiskLevel(claudeAnalysis.severity_score),
            riskScore: claudeAnalysis.severity_score,
            riskFactors: claudeAnalysis.risk_indicators,
            recommendations: this.generateRecommendationsFromAnalysis(claudeAnalysis),
            confidence: claudeAnalysis.confidence,
            aiMetadata: {
              model: 'claude-3-haiku',
              analysisDate: new Date().toISOString(),
              keyPhases: claudeAnalysis.key_phrases,
              sentiment: claudeAnalysis.sentiment,
              similarCasesCount: claudeAnalysis.similar_cases_count
            }
          };

          return { success: true, analysis };

        } catch (claudeError) {
          logger.warn(`⚠️ Claude API falló, usando análisis simulado: ${claudeError}`, companyId, { prefix: 'aiService' });
          // Continuar con análisis simulado como fallback
        }
      }

      // Fallback: análisis simulado (código original)
      
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
      // Usar logger con contexto más rico
      logger.error('Error en análisis de riesgo', error, { 
        prefix: 'aiService', 
        tags: ['risk', 'analysis'],
        companyId 
      });
      
      // Mensaje más informativo para debugging
      let errorMessage = 'Error al realizar análisis de riesgo';
      if (error instanceof Error) {
        logger.debug('Detalles del error', { errorName: error.name, errorStack: error.stack }, { prefix: 'aiService' });
        
        // En desarrollo podemos proporcionar más detalles
        if (process.env.NODE_ENV === 'development') {
          errorMessage += `: ${error.message}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
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
      
      // Intentar usar Claude API si está disponible
      if (isClaudeAvailable()) {
        try {
          logger.info('🤖 Usando Claude API para predicción de categorías', companyId, { prefix: 'aiService' });
          
          const claudePredictions = await predictCategoriesWithClaude(reportContent);
          
          // Convertir respuesta de Claude al formato esperado
          const predictions: PredictedCategory[] = claudePredictions.map(pred => ({
            category: pred.category,
            subcategory: pred.subcategory,
            confidence: pred.confidence / 100 // Convertir de 0-100 a 0-1
          }));

          return { success: true, categories: predictions };

        } catch (claudeError) {
          logger.warn(`⚠️ Claude API falló en predicción de categorías, usando análisis simulado: ${claudeError}`, companyId, { prefix: 'aiService' });
          // Continuar con análisis simulado como fallback
        }
      }

      // Fallback: implementación simulada
      
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
      // Usar logger con más contexto
      logger.error('Error en predicción de categorías', error, { 
        prefix: 'aiService', 
        tags: ['categories', 'prediction'],
        companyId
      });
      
      // Mensaje más informativo para ayudar al debugging
      let errorMessage = 'Error al predecir categorías';
      if (error instanceof Error) {
        logger.debug('Detalles del error de predicción', { 
          errorName: error.name, 
          errorStack: error.stack,
          contentLength: reportContent?.length || 0
        }, { prefix: 'aiService' });
        
        // En desarrollo podemos proporcionar más detalles
        if (process.env.NODE_ENV === 'development') {
          errorMessage += `: ${error.message}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Genera documentos legales basados en el contexto y tipo de documento
   */
  async generateLegalDocument(
    companyId: string,
    params: LegalDocumentParams
  ): Promise<{ success: boolean; document?: GeneratedLegalDocument; error?: string }> {
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
      // basado en modelos de lenguaje para generación de texto

      const { documentType, caseData, authorData, tone = 'formal', length = 'standard' } = params;
      
      // Estructura básica para diferentes tipos de documentos
      let documentTemplate: GeneratedLegalDocument;
      
      // Generar documento basado en el tipo
      switch (documentType) {
        case 'informe_preliminar':
          documentTemplate = this._generatePreliminaryReport(caseData, authorData, tone, length);
          break;
        
        case 'informe_final':
          documentTemplate = this._generateFinalReport(caseData, authorData, tone, length);
          break;
        
        case 'notificacion_dt':
          documentTemplate = this._generateLaborAuthorityNotification(caseData, authorData, tone, length);
          break;
        
        case 'plan_investigacion':
          documentTemplate = this._generateInvestigationPlan(caseData, authorData, tone, length);
          break;
        
        case 'carta_notificacion':
          documentTemplate = this._generateNotificationLetter(caseData, authorData, tone, length);
          break;
        
        case 'acta_entrevista':
          documentTemplate = this._generateInterviewMinutes(caseData, authorData, tone, length);
          break;
        
        case 'resolucion':
          documentTemplate = this._generateResolution(caseData, authorData, tone, length);
          break;
        
        default:
          return {
            success: false,
            error: `Tipo de documento ${documentType} no soportado`
          };
      }
      
      // Simular tiempo de procesamiento para un comportamiento más realista
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        document: documentTemplate
      };
    } catch (error) {
      // Usar logger con más contexto
      logger.error('Error en generación de documento legal', error, { 
        prefix: 'aiService', 
        tags: ['document', 'legal'],
        documentType: params.documentType,
        companyId
      });
      
      // Mensaje más informativo para debug
      let errorMessage = 'Error al generar documento legal';
      if (error instanceof Error) {
        logger.debug('Detalles del error de generación', { 
          errorName: error.name, 
          errorStack: error.stack,
          documentType: params.documentType,
          tone: params.tone
        }, { prefix: 'aiService' });
        
        // En desarrollo podemos proporcionar más detalles
        if (process.env.NODE_ENV === 'development') {
          errorMessage += `: ${error.message}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },
  
  /**
   * Genera un informe preliminar - implementación simulada
   * @private
   */
  _generatePreliminaryReport(
    caseData: LegalDocumentParams['caseData'],
    authorData?: LegalDocumentParams['authorData'],
    tone: 'formal' | 'neutral' | 'simple' = 'formal',
    length: 'concise' | 'standard' | 'detailed' = 'standard'
  ): GeneratedLegalDocument {
    const companyName = caseData.company?.name || 'La Empresa';
    const reportDate = caseData.date ? new Date(caseData.date) : new Date();
    const formattedDate = reportDate.toLocaleDateString('es-CL');
    const reportId = caseData.reportId || 'Sin información';
    
    // Generar secciones del documento
    const sections = [
      {
        title: 'Antecedentes',
        content: `Con fecha ${formattedDate}, se recibió denuncia código ${reportId} a través del Canal de Denuncias de ${companyName}, respecto a hechos que podrían constituir ${caseData.isKarinLaw ? 'acoso laboral o sexual en el contexto de la Ley Karin' : 'una infracción'}.${
          caseData.category ? `\n\nLa denuncia fue clasificada como "${caseData.category}".` : ''
        }`
      },
      {
        title: 'Descripción de los hechos denunciados',
        content: caseData.description || 'No se proporcionó descripción detallada de los hechos.'
      },
      {
        title: 'Involucrados',
        content: caseData.involvedPersons && caseData.involvedPersons.length > 0
          ? caseData.involvedPersons.map((person, index) => 
              `${index + 1}. ${person.name || 'No identificado'} - ${person.position || 'Cargo no especificado'}${person.role ? ` - ${person.role}` : ''}`
            ).join('\n')
          : 'No se han identificado personas involucradas específicas.'
      },
      {
        title: 'Acciones preliminares',
        content: 'Se han tomado las siguientes acciones preliminares:\n\n' +
                 '1. Recepción y registro de la denuncia\n' +
                 '2. Evaluación inicial de admisibilidad\n' +
                 '3. Revisión de antecedentes proporcionados\n' +
                 `4. ${caseData.isKarinLaw ? 'Notificación a la Dirección del Trabajo dentro del plazo legal de 3 días hábiles' : 'Análisis de pertinencia conforme a la normativa aplicable'}`
      },
      {
        title: 'Plan de investigación propuesto',
        content: 'Para continuar con la investigación de los hechos denunciados, se propone el siguiente plan:\n\n' +
                 '1. Entrevistar al denunciante para obtener detalles adicionales\n' +
                 '2. Revisar evidencia documental y testimonial disponible\n' +
                 '3. Entrevistar a los involucrados directos\n' +
                 '4. Entrevistar a posibles testigos\n' +
                 '5. Analizar cumplimiento normativo aplicable\n' +
                 '6. Elaborar informe final con conclusiones y recomendaciones'
      }
    ];
    
    // Recomendaciones basadas en la categoría
    const recommendations = [
      'Mantener estricta confidencialidad durante todo el proceso',
      caseData.isKarinLaw 
        ? 'Implementar medidas precautorias para proteger a la presunta víctima'
        : 'Evaluar la necesidad de medidas preventivas',
      caseData.isKarinLaw
        ? 'Cumplir con plazos de 30 días hábiles establecidos en la normativa'
        : 'Procurar resolución en tiempo razonable',
    ];
    
    // Advertencias basadas en el caso
    const warnings = [];
    
    if (caseData.isKarinLaw) {
      warnings.push(
        'El incumplimiento de los plazos legales para Ley Karin puede resultar en multas',
        'Este caso requiere notificación a la Dirección del Trabajo y SUSESO'
      );
    }
    
    if (!caseData.description || caseData.description.length < 50) {
      warnings.push('La descripción de los hechos es insuficiente y podría dificultar la investigación');
    }
    
    // Generar contenido completo
    const fullContent = `# INFORME PRELIMINAR DE INVESTIGACIÓN
    
## CASO: ${reportId}
## FECHA: ${formattedDate}

${sections.map(section => `### ${section.title}\n\n${section.content}`).join('\n\n')}

### Conclusión preliminar

De acuerdo con la revisión inicial de los antecedentes, se recomienda continuar con la investigación siguiendo el plan propuesto. ${caseData.isKarinLaw ? 'Tratándose de un caso bajo la Ley Karin, se deben observar estrictamente los plazos legales establecidos.' : ''}

${authorData ? `\n\n__________________________\n${authorData.name}\n${authorData.position}` : ''}`;

    return {
      title: `Informe Preliminar - Caso ${reportId}`,
      content: fullContent,
      sections,
      recommendations,
      warnings
    };
  },
  
  // Funciones para generar otros tipos de documentos
  _generateFinalReport(
    caseData: LegalDocumentParams['caseData'],
    authorData?: LegalDocumentParams['authorData'],
    tone: 'formal' | 'neutral' | 'simple' = 'formal',
    length: 'concise' | 'standard' | 'detailed' = 'standard'
  ): GeneratedLegalDocument {
    // Implementación simulada - similar a informe preliminar pero con conclusiones
    const companyName = caseData.company?.name || 'La Empresa';
    const reportDate = caseData.date ? new Date(caseData.date) : new Date();
    const formattedDate = reportDate.toLocaleDateString('es-CL');
    const reportId = caseData.reportId || 'Sin información';
    
    const sections = [
      {
        title: 'Antecedentes',
        content: `Con fecha ${formattedDate}, se inició investigación por denuncia código ${reportId} en ${companyName}.`
      },
      {
        title: 'Metodología de investigación',
        content: 'Se realizaron entrevistas, análisis documental y revisión de evidencia.'
      },
      {
        title: 'Análisis de los hechos',
        content: 'Basado en la investigación, se determinó lo siguiente...'
      },
      {
        title: 'Conclusiones',
        content: 'Se concluye que hay/no hay mérito suficiente para establecer...'
      },
      {
        title: 'Recomendaciones',
        content: 'Se recomienda implementar las siguientes medidas...'
      }
    ];
    
    return {
      title: `Informe Final - Caso ${reportId}`,
      content: sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'),
      sections,
      recommendations: ['Implementar medidas correctivas', 'Realizar seguimiento periódico']
    };
  },
  
  _generateLaborAuthorityNotification(
    caseData: LegalDocumentParams['caseData'],
    authorData?: LegalDocumentParams['authorData'],
    tone: 'formal' | 'neutral' | 'simple' = 'formal',
    length: 'concise' | 'standard' | 'detailed' = 'standard'
  ): GeneratedLegalDocument {
    // Implementación simulada para notificación a Dirección del Trabajo
    const companyName = caseData.company?.name || 'La Empresa';
    const companyRut = caseData.company?.rut || 'Sin RUT';
    const reportDate = caseData.date ? new Date(caseData.date) : new Date();
    const formattedDate = reportDate.toLocaleDateString('es-CL');
    const reportId = caseData.reportId || 'Sin información';
    
    const sections = [
      {
        title: 'Identificación del empleador',
        content: `Empresa: ${companyName}\nRUT: ${companyRut}\nDirección: ${caseData.company?.address || 'No disponible'}`
      },
      {
        title: 'Antecedentes de la denuncia',
        content: `Código interno: ${reportId}\nFecha de recepción: ${formattedDate}\nTipo: Acoso Laboral/Sexual (Ley 21.643)`
      },
      {
        title: 'Medidas adoptadas',
        content: 'Se han implementado las siguientes medidas de protección...'
      }
    ];
    
    return {
      title: `Notificación a Dirección del Trabajo - Caso ${reportId}`,
      content: sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'),
      sections,
      warnings: ['Este documento debe presentarse dentro de 3 días hábiles desde la recepción de la denuncia']
    };
  },
  
  _generateInvestigationPlan(
    caseData: LegalDocumentParams['caseData'],
    authorData?: LegalDocumentParams['authorData'],
    tone: 'formal' | 'neutral' | 'simple' = 'formal',
    length: 'concise' | 'standard' | 'detailed' = 'standard'
  ): GeneratedLegalDocument {
    // Implementación simulada para plan de investigación
    const reportId = caseData.reportId || 'Sin información';
    
    const sections = [
      {
        title: 'Objetivos de la investigación',
        content: 'Determinar la veracidad de los hechos denunciados...'
      },
      {
        title: 'Etapas propuestas',
        content: '1. Recopilación de antecedentes\n2. Entrevistas\n3. Análisis de evidencia\n4. Conclusiones'
      },
      {
        title: 'Cronograma',
        content: 'Etapa 1: Días 1-5\nEtapa 2: Días 6-15\nEtapa 3: Días 16-20\nEtapa 4: Días 21-25'
      },
      {
        title: 'Recursos necesarios',
        content: 'Acceso a registros, disponibilidad de testigos, etc.'
      }
    ];
    
    return {
      title: `Plan de Investigación - Caso ${reportId}`,
      content: sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'),
      sections
    };
  },
  
  _generateNotificationLetter(
    caseData: LegalDocumentParams['caseData'],
    authorData?: LegalDocumentParams['authorData'],
    tone: 'formal' | 'neutral' | 'simple' = 'formal',
    length: 'concise' | 'standard' | 'detailed' = 'standard'
  ): GeneratedLegalDocument {
    // Implementación simulada para carta de notificación
    const reportDate = caseData.date ? new Date(caseData.date) : new Date();
    const formattedDate = reportDate.toLocaleDateString('es-CL');
    
    const sections = [
      {
        title: 'Notificación',
        content: `Por medio de la presente, se le informa que con fecha ${formattedDate} se ha iniciado un proceso de investigación...`
      },
      {
        title: 'Motivo',
        content: 'El proceso responde a una denuncia recibida por...'
      },
      {
        title: 'Proceso a seguir',
        content: 'Se realizará una entrevista el día...'
      },
      {
        title: 'Derechos y deberes',
        content: 'Durante el proceso, usted tiene derecho a...'
      }
    ];
    
    return {
      title: 'Carta de Notificación de Proceso de Investigación',
      content: sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'),
      sections
    };
  },
  
  _generateInterviewMinutes(
    caseData: LegalDocumentParams['caseData'],
    authorData?: LegalDocumentParams['authorData'],
    tone: 'formal' | 'neutral' | 'simple' = 'formal',
    length: 'concise' | 'standard' | 'detailed' = 'standard'
  ): GeneratedLegalDocument {
    // Implementación simulada para acta de entrevista
    const reportDate = new Date().toLocaleDateString('es-CL');
    
    const sections = [
      {
        title: 'Datos de la entrevista',
        content: `Fecha: ${reportDate}\nLugar: Oficinas de la empresa\nHora inicio: [HORA]\nHora término: [HORA]`
      },
      {
        title: 'Asistentes',
        content: 'Entrevistador: [NOMBRE]\nEntrevistado: [NOMBRE]\nCargo: [CARGO]'
      },
      {
        title: 'Preguntas y respuestas',
        content: 'P: [PREGUNTA]\nR: [RESPUESTA]\n\nP: [PREGUNTA]\nR: [RESPUESTA]'
      },
      {
        title: 'Observaciones',
        content: 'El entrevistado se mostró [ACTITUD] durante la entrevista...'
      }
    ];
    
    return {
      title: 'Acta de Entrevista',
      content: sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'),
      sections
    };
  },
  
  _generateResolution(
    caseData: LegalDocumentParams['caseData'],
    authorData?: LegalDocumentParams['authorData'],
    tone: 'formal' | 'neutral' | 'simple' = 'formal',
    length: 'concise' | 'standard' | 'detailed' = 'standard'
  ): GeneratedLegalDocument {
    // Implementación simulada para resolución
    const reportDate = new Date().toLocaleDateString('es-CL');
    const reportId = caseData.reportId || 'Sin información';
    
    const sections = [
      {
        title: 'Vistos',
        content: `1. La denuncia código ${reportId}\n2. El informe de investigación\n3. La normativa aplicable`
      },
      {
        title: 'Considerando',
        content: 'Primero: Que se ha realizado una investigación conforme a...\nSegundo: Que los hechos acreditados constituyen...'
      },
      {
        title: 'Resuelvo',
        content: '1. Aplicar la medida disciplinaria de...\n2. Implementar medidas preventivas...\n3. Realizar seguimiento...'
      }
    ];
    
    return {
      title: `Resolución - Caso ${reportId}`,
      content: sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n'),
      sections
    };
  },

  /**
   * Genera asistencia sobre plazos para investigadores
   * @private
   */
  _generateDeadlineAssistance(context: ConversationalAssistantParams['context'] = {}): string {
    const { deadlines = [], caseType = '' } = context;
    
    // Si hay plazos específicos en el contexto, usarlos
    if (deadlines && deadlines.length > 0) {
      const today = new Date();
      const upcomingDeadlines = deadlines
        .filter(d => d.date > today)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      if (upcomingDeadlines.length > 0) {
        const nextDeadline = upcomingDeadlines[0];
        const daysRemaining = Math.ceil((nextDeadline.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return `📅 **Recordatorio de plazos**:\n\nTu próximo plazo es "${nextDeadline.label}" en ${daysRemaining} días (${nextDeadline.date.toLocaleDateString('es-CL')}).\n\n${
          daysRemaining <= 3 
            ? '⚠️ **¡Atención!** Este plazo está muy próximo. Te recomiendo priorizar las tareas relacionadas.'
            : 'Te sugiero planificar adecuadamente para cumplir con este plazo.'
        }`;
      }
    }
    
    // Si no hay plazos específicos pero es un caso de Ley Karin
    if (caseType?.toLowerCase().includes('karin')) {
      return `📅 **Plazos para casos Ley Karin**:\n\n- El plazo total para completar la investigación es de 30 días hábiles, sin posibilidad de extensión.\n- Debes notificar a la Dirección del Trabajo dentro de 3 días hábiles desde recibida la denuncia.\n- La notificación a la SUSESO debe realizarse dentro de 5 días hábiles.\n\n⚠️ **Importante**: El incumplimiento de estos plazos puede resultar en multas para la empresa.`;
    }
    
    // Respuesta genérica sobre plazos
    return `📅 **Gestión de plazos**:\n\nLa gestión adecuada de los plazos es crucial para las investigaciones. Te recomiendo:\n\n1. Establecer un cronograma claro al inicio de cada investigación\n2. Programar recordatorios para hitos importantes\n3. Priorizar tareas según urgencia y plazos legales\n4. Documentar cualquier extensión de plazo y su justificación\n\nSi necesitas ayuda con un caso específico, proporciona más detalles sobre el tipo de investigación.`;
  },
  
  /**
   * Genera asistencia sobre Ley Karin para investigadores
   * @private
   */
  _generateKarinLawAssistance(): string {
    return `📘 **Información sobre Ley Karin**:\n\nLa Ley 21.643 (Ley Karin) establece un protocolo específico para casos de acoso laboral y sexual:\n\n- **Plazos**: La investigación debe completarse en 30 días hábiles máximo, sin posibilidad de extensión.\n- **Notificaciones obligatorias**: Dirección del Trabajo (3 días) y SUSESO (5 días).\n- **Medidas precautorias**: Deben evaluarse inmediatamente para proteger a la presunta víctima.\n- **Documentación**: Todos los pasos deben ser meticulosamente documentados.\n\nRecomendaciones para el proceso:\n- Mantén absoluta confidencialidad\n- Realiza entrevistas en espacios privados y seguros\n- Documenta cada paso con fecha y hora\n- No realices reuniones conjuntas entre denunciante y denunciado`;
  },
  
  /**
   * Genera asistencia sobre entrevistas para investigadores
   * @private
   */
  _generateInterviewAssistance(): string {
    return `🎯 **Consejos para entrevistas efectivas**:\n\n1. **Preparación**:\n   - Revisa exhaustivamente los antecedentes del caso\n   - Prepara preguntas específicas pero abiertas\n   - Organiza un espacio privado y libre de interrupciones\n\n2. **Durante la entrevista**:\n   - Comienza explicando el propósito y la confidencialidad\n   - Utiliza preguntas abiertas: "¿Cómo?", "¿Qué?", "¿Cuándo?"\n   - Evita preguntas sugestivas o que induzcan respuestas\n   - Toma notas detalladas o graba con autorización\n\n3. **Cierre**:\n   - Resume los puntos clave para confirmar entendimiento\n   - Explica los siguientes pasos del proceso\n   - Proporciona información de contacto\n\nPuedes usar la plantilla de acta de entrevista en la sección de documentos legales de la plataforma.`;
  },
  
  /**
   * Genera asistencia sobre reportes para investigadores
   * @private
   */
  _generateReportAssistance(): string {
    return `📝 **Guía para elaboración de informes**:\n\nUn informe efectivo debe ser claro, objetivo y basado en evidencia. Estructura recomendada:\n\n1. **Antecedentes**:\n   - Información del caso (código, fecha, categoría)\n   - Resumen de la denuncia\n   - Metodología de investigación\n\n2. **Desarrollo**:\n   - Hechos relevantes identificados\n   - Evidencia recopilada\n   - Declaraciones de involucrados y testigos\n   - Análisis de normativa aplicable\n\n3. **Conclusiones**:\n   - Determinación sobre los hechos denunciados\n   - Fundamentación de conclusiones\n   - Recomendaciones específicas\n\nRecuerda utilizar un lenguaje objetivo y evitar juicios de valor sin respaldo en la evidencia.\n\nPuedes utilizar el asistente de redacción legal en la plataforma para generar informes preliminares y finales.`;
  },
  
  /**
   * Genera sugerencias de mejora para super administradores
   * @private
   */
  _generateImprovementSuggestions(context: ConversationalAssistantParams['context'] = {}): string {
    const { appContext = '' } = context;
    
    // Recomendaciones basadas en el contexto actual de la aplicación
    if (appContext.toLowerCase().includes('dashboard')) {
      return `💡 **Sugerencias de mejora para Dashboard**:\n\n1. **Personalización**: Permitir que los usuarios configuren qué métricas ver en su dashboard principal\n2. **Filtros avanzados**: Añadir filtros por categoría, estado y fecha en todos los reportes\n3. **Exportación**: Implementar exportación a Excel de todas las tablas de datos\n4. **Notificaciones**: Añadir centro de notificaciones para alertas de nuevos casos y plazos\n\nEstas mejoras podrían aumentar la productividad de los usuarios en aproximadamente un 25%.`;
    }
    
    if (appContext.toLowerCase().includes('report') || appContext.toLowerCase().includes('denuncia')) {
      return `💡 **Sugerencias de mejora para gestión de denuncias**:\n\n1. **Formulario inteligente**: Implementar campos dinámicos que cambien según la categoría seleccionada\n2. **Adjuntos mejorados**: Permitir previsualización de archivos adjuntos\n3. **Autoguardado**: Implementar guardado automático de formularios en progreso\n4. **Plantillas**: Añadir sistema de plantillas para tipos comunes de denuncias\n\nEstas mejoras podrían reducir el tiempo de registro en un 40% y mejorar la completitud de la información.`;
    }
    
    // Sugerencias generales si no hay contexto específico
    return `💡 **Sugerencias de mejora generales**:\n\n1. **Experiencia de usuario**:\n   - Implementar tema oscuro\n   - Mejorar velocidad de carga mediante optimización de consultas\n   - Añadir atajos de teclado para funciones comunes\n\n2. **Funcionalidades**:\n   - Integración con Microsoft Teams/Slack para notificaciones\n   - Sistema de recordatorios automáticos para plazos\n   - Asistente de IA más proactivo con sugerencias contextuales\n\n3. **Reportes y análisis**:\n   - Ampliar dashboard con análisis predictivo de tendencias\n   - Añadir comparativas entre periodos\n   - Implementar detección automática de anomalías\n\nEstoy disponible para discutir cualquiera de estas sugerencias en detalle.`;
  },
  
  /**
   * Genera asistencia para solución de problemas para super administradores
   * @private
   */
  _generateTroubleshootingAssistance(): string {
    return `🔧 **Asistencia para solución de problemas**:\n\n1. **Problemas comunes reportados**:\n   - Demora en carga de dashboard: Optimizada en la versión 2.3.1\n   - Error al adjuntar archivos >10MB: Se aumentó el límite a 20MB\n   - Notificaciones duplicadas: Corregido en última actualización\n\n2. **Verificaciones recomendadas**:\n   - Revisar configuración de empresa (Administración > Configuración)\n   - Verificar permisos de usuarios con problemas específicos\n   - Comprobar integración con servicios externos (si aplica)\n\n3. **Herramientas de diagnóstico**:\n   - Accede a los logs en Administración > Sistema > Registros\n   - Utiliza la herramienta de prueba de velocidad en Administración > Sistema\n\nPara problemas persistentes, sugiero programar una revisión técnica con el equipo de soporte.`;
  },
  
  /**
   * Genera insights sobre reportes para super administradores
   * @private
   */
  _generateReportingInsights(): string {
    return `📊 **Insights sobre reportes y estadísticas**:\n\n1. **Patrones identificados**:\n   - Los lunes muestran un incremento del 27% en nuevas denuncias\n   - Categorías más frecuentes: Clima laboral (34%), Ley Karin (28%)\n   - Tiempo promedio de resolución: 22 días (mejoró un 15% respecto al trimestre anterior)\n\n2. **Oportunidades de mejora**:\n   - El 40% de los casos Ley Karin se resuelven fuera de plazo\n   - 22% de denuncias requieren aclaraciones adicionales\n   - Alta variabilidad en tiempos de investigación entre diferentes investigadores\n\n3. **Recomendaciones basadas en datos**:\n   - Implementar recordatorio automático 5 días antes de vencimiento de plazos\n   - Revisar y estandarizar protocolo de entrevistas\n   - Programar capacitación adicional sobre Ley Karin\n\nPuedo generar un reporte detallado con estos hallazgos si lo consideras útil.`;
  },
  
  /**
   * Genera insights basados en IA a partir de los datos de la plataforma
   */
  async generateInsights(
    companyId: string,
    params: Partial<InsightGenerationParams> = {}
  ): Promise<{ success: boolean; insights?: AIInsight[]; error?: string }> {
    try {
      // Verificar si la IA está habilitada para esta empresa
      const aiEnabled = await this.isAiEnabled(companyId);
      if (!aiEnabled) {
        return {
          success: false,
          error: 'Las funcionalidades de IA no están habilitadas para esta empresa'
        };
      }

      // Configurar parámetros por defecto
      const {
        timeRange = 'month',
        focusAreas = ['trends', 'risks', 'recommendations', 'efficiency'],
        maxResults = 20,
        minConfidence = 0.7
      } = params;
      
      // Intentar usar Claude API si está disponible
      if (isClaudeAvailable()) {
        try {
          logger.info('🤖 Usando Claude API para generación de insights', companyId, { prefix: 'aiService' });
          
          // Obtener contexto de datos (en una implementación real, esto vendría de la base de datos)
          const context = {
            timeRange,
            totalReports: Math.floor(Math.random() * 50) + 10, // Simulado por ahora
            categories: ['modelo_prevencion', 'ley_karin', 'ciberseguridad', 'reglamento_interno']
          };

          const claudeInsights = await generateInsightsWithClaude(context);
          
          // Convertir respuesta de Claude al formato esperado
          const insights: AIInsight[] = [];

          // Procesar tendencias
          if (focusAreas.includes('trends') && claudeInsights.trends) {
            claudeInsights.trends.forEach((trend, index) => {
              insights.push({
                id: `claude-trend-${index}`,
                category: 'trend',
                title: trend.title,
                description: trend.description,
                confidence: trend.impact === 'high' ? 0.9 : trend.impact === 'medium' ? 0.75 : 0.6,
                severity: trend.impact,
                createdAt: new Date()
              });
            });
          }

          // Procesar riesgos
          if (focusAreas.includes('risks') && claudeInsights.risks) {
            claudeInsights.risks.forEach((risk, index) => {
              insights.push({
                id: `claude-risk-${index}`,
                category: 'risk',
                title: risk.title,
                description: risk.description,
                confidence: risk.urgency === 'high' ? 0.95 : risk.urgency === 'medium' ? 0.8 : 0.65,
                severity: risk.impact,
                createdAt: new Date()
              });
            });
          }

          // Procesar recomendaciones
          if (focusAreas.includes('recommendations') && claudeInsights.recommendations) {
            claudeInsights.recommendations.forEach((rec, index) => {
              insights.push({
                id: `claude-rec-${index}`,
                category: 'recommendation',
                title: rec.title,
                description: rec.description,
                confidence: rec.priority === 'high' ? 0.9 : rec.priority === 'medium' ? 0.75 : 0.6,
                severity: rec.priority,
                createdAt: new Date()
              });
            });
          }

          // Procesar eficiencia
          if (focusAreas.includes('efficiency') && claudeInsights.efficiency) {
            claudeInsights.efficiency.forEach((eff, index) => {
              insights.push({
                id: `claude-eff-${index}`,
                category: 'efficiency',
                title: eff.title,
                description: eff.description,
                confidence: eff.improvement > 20 ? 0.85 : eff.improvement > 10 ? 0.7 : 0.6,
                severity: eff.improvement > 20 ? 'high' : 'medium',
                data: {
                  metric: eff.metric,
                  improvement: eff.improvement
                },
                createdAt: new Date()
              });
            });
          }

          // Filtrar por confianza mínima y limitar resultados
          const filteredInsights = insights
            .filter(insight => insight.confidence >= minConfidence)
            .slice(0, maxResults);

          return { success: true, insights: filteredInsights };

        } catch (claudeError) {
          logger.warn(`⚠️ Claude API falló en generación de insights, usando insights simulados: ${claudeError}`, companyId, { prefix: 'aiService' });
          // Continuar con insights simulados como fallback
        }
      }

      // Fallback: generar insights simulados
      const insights: AIInsight[] = [];
      
      // 1. Tendencias
      if (focusAreas.includes('trends')) {
        insights.push(
          {
            id: 'trend-1',
            category: 'trend',
            title: 'Aumento en denuncias de acoso laboral',
            description: 'Se ha detectado un incremento del 32% en denuncias relacionadas con acoso laboral en los últimos 30 días comparado con el mismo período del año anterior.',
            confidence: 0.92,
            severity: 'high',
            data: {
              previousCount: 12,
              currentCount: 16,
              percentageChange: 32
            },
            createdAt: new Date()
          },
          {
            id: 'trend-2',
            category: 'trend',
            title: 'Distribución geográfica de denuncias',
            description: 'El 65% de las denuncias provienen de la oficina central, mientras que solo el 35% proviene de sucursales, a pesar de tener una distribución de personal de 50/50.',
            confidence: 0.85,
            data: {
              central: 65,
              branches: 35
            },
            createdAt: new Date()
          },
          {
            id: 'trend-3',
            category: 'trend',
            title: 'Correlación entre antigüedad y denuncias',
            description: 'Los empleados con menos de 1 año en la empresa representan el 40% de las denuncias, sugiriendo posibles problemas de integración o onboarding.',
            confidence: 0.78,
            severity: 'medium',
            createdAt: new Date()
          }
        );
      }
      
      // 2. Riesgos
      if (focusAreas.includes('risks')) {
        insights.push(
          {
            id: 'risk-1',
            category: 'risk',
            title: 'Riesgo de incumplimiento en plazos Ley Karin',
            description: 'El 28% de los casos activos de Ley Karin están en riesgo de exceder el plazo legal de 30 días. Se identificaron 5 casos que vencen en los próximos 3 días.',
            confidence: 0.95,
            severity: 'high',
            relatedReports: ['REP-329', 'REP-342', 'REP-350', 'REP-358', 'REP-361'],
            createdAt: new Date()
          },
          {
            id: 'risk-2',
            category: 'risk',
            title: 'Posible conflicto de interés en investigaciones',
            description: 'Se detectaron 3 casos donde el investigador asignado tiene relación directa con el departamento involucrado, lo que podría comprometer la imparcialidad.',
            confidence: 0.82,
            severity: 'high',
            relatedReports: ['REP-301', 'REP-315', 'REP-347'],
            createdAt: new Date()
          },
          {
            id: 'risk-3',
            category: 'risk',
            title: 'Incremento en casos recurrentes',
            description: 'El 15% de las denuncias nuevas involucran a personas que ya han sido denunciadas anteriormente, sugiriendo posibles fallas en las medidas correctivas previas.',
            confidence: 0.75,
            severity: 'medium',
            createdAt: new Date()
          }
        );
      }
      
      // 3. Recomendaciones
      if (focusAreas.includes('recommendations')) {
        insights.push(
          {
            id: 'rec-1',
            category: 'recommendation',
            title: 'Implementar recordatorios automáticos de plazos',
            description: 'Configurar notificaciones automáticas 5, 3 y 1 días antes del vencimiento de plazos legales podría reducir en un 45% los casos de incumplimiento de tiempos.',
            confidence: 0.88,
            data: {
              estimatedImpact: 'Alto',
              implementationEffort: 'Medio',
              timeToImplement: '2 semanas'
            },
            createdAt: new Date()
          },
          {
            id: 'rec-2',
            category: 'recommendation',
            title: 'Crear programa de capacitación para investigadores',
            description: 'Un programa estructurado de capacitación para investigadores podría reducir la variabilidad en tiempos de resolución y mejorar la calidad de las investigaciones.',
            confidence: 0.86,
            createdAt: new Date()
          },
          {
            id: 'rec-3',
            category: 'recommendation',
            title: 'Revisar política de asignación de investigadores',
            description: 'Implementar un sistema automatizado de detección de conflictos de interés para la asignación de investigadores reduciría los sesgos potenciales.',
            confidence: 0.82,
            createdAt: new Date()
          }
        );
      }
      
      // 4. Eficiencia
      if (focusAreas.includes('efficiency')) {
        insights.push(
          {
            id: 'eff-1',
            category: 'efficiency',
            title: 'Optimización de entrevistas',
            description: 'Las entrevistas consumen el 40% del tiempo de investigación. Implementar plantillas estructuradas podría reducir este tiempo en un 25%.',
            confidence: 0.91,
            data: {
              currentTimePercentage: 40,
              potentialReduction: 25,
              estimatedSavings: '10 horas por caso'
            },
            createdAt: new Date()
          },
          {
            id: 'eff-2',
            category: 'efficiency',
            title: 'Automatización de informes preliminares',
            description: 'El uso del Asistente de Redacción Legal para informes preliminares podría reducir el tiempo de preparación de 3 horas a 45 minutos por caso.',
            confidence: 0.89,
            createdAt: new Date()
          },
          {
            id: 'eff-3',
            category: 'efficiency',
            title: 'Distribución de carga de investigadores',
            description: 'Existe un desequilibrio en la asignación de casos: 20% de los investigadores manejan el 60% de los casos. Una redistribución mejoraría los tiempos de respuesta.',
            confidence: 0.84,
            severity: 'medium',
            createdAt: new Date()
          }
        );
      }
      
      // Filtrar por confianza mínima y limitar resultados
      const filteredInsights = insights
        .filter(insight => insight.confidence >= minConfidence)
        .slice(0, maxResults);
      
      // Simular tiempo de procesamiento para un comportamiento más realista
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      return {
        success: true,
        insights: filteredInsights
      };
    } catch (error) {
      // Usar logger con más contexto
      logger.error('Error al generar insights', error, { 
        prefix: 'aiService', 
        tags: ['insights', 'analytics'],
        timeRange: params.timeRange,
        companyId
      });
      
      // Mensaje más informativo para debug
      let errorMessage = 'Error al procesar análisis de insights';
      if (error instanceof Error) {
        logger.debug('Detalles del error de insights', { 
          errorName: error.name, 
          errorStack: error.stack,
          timeRange: params.timeRange,
          focusAreas: params.focusAreas
        }, { prefix: 'aiService' });
        
        // En desarrollo podemos proporcionar más detalles
        if (process.env.NODE_ENV === 'development') {
          errorMessage += `: ${error.message}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Mapea severidad de Claude a nivel de riesgo
   * @private
   */
  mapSeverityToRiskLevel(severityScore: number): RiskLevel {
    if (severityScore >= 80) return 'crítico';
    if (severityScore >= 60) return 'alto';
    if (severityScore >= 40) return 'medio';
    return 'bajo';
  },

  /**
   * Genera recomendaciones basadas en análisis de Claude
   * @private
   */
  generateRecommendationsFromAnalysis(claudeAnalysis: any): string[] {
    const recommendations: string[] = [];
    
    // Recomendaciones basadas en severidad
    if (claudeAnalysis.severity_score >= 80) {
      recommendations.push('Activar protocolo de crisis inmediatamente');
      recommendations.push('Notificar a dirección ejecutiva en las próximas 4 horas');
      recommendations.push('Considerar medidas precautorias urgentes');
    } else if (claudeAnalysis.severity_score >= 60) {
      recommendations.push('Asignar investigador senior experimentado');
      recommendations.push('Establecer cronograma de investigación prioritario');
      recommendations.push('Implementar medidas preventivas temporales');
    } else if (claudeAnalysis.severity_score >= 40) {
      recommendations.push('Realizar investigación estándar');
      recommendations.push('Documentar evidencias cuidadosamente');
      recommendations.push('Establecer seguimiento regular del caso');
    } else {
      recommendations.push('Procesar según procedimiento estándar');
      recommendations.push('Verificar información adicional si es necesaria');
    }

    // Recomendaciones basadas en indicadores específicos
    if (claudeAnalysis.risk_indicators.some((indicator: string) => 
        indicator.toLowerCase().includes('financiero') || 
        indicator.toLowerCase().includes('dinero'))) {
      recommendations.push('Revisar registros financieros relacionados');
      recommendations.push('Verificar autorización de transacciones');
    }

    if (claudeAnalysis.risk_indicators.some((indicator: string) => 
        indicator.toLowerCase().includes('acoso') || 
        indicator.toLowerCase().includes('discriminación'))) {
      recommendations.push('Aplicar protocolo específico de Ley Karin');
      recommendations.push('Considerar separación temporal de las partes');
    }

    return recommendations.slice(0, 4); // Máximo 4 recomendaciones
  }
};

export default aiService;