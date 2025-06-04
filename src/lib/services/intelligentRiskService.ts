// src/lib/services/intelligentRiskService.ts
// Servicio híbrido que fusiona IA + Compliance para análisis inteligente de riesgo

import { ReportFormValues } from '@/types/report';
import { DelitoCatalogo, DelitoIdentificado, EvaluacionRiesgo } from '@/types/compliance';
import { MotorEvaluacionRiesgos } from './complianceService';
import delitosData from '@/lib/data/delitos-aplicables.json';

/**
 * Resultado del análisis inteligente híbrido
 */
export interface AnalisisInteligente {
  // Análisis de IA
  ai_analysis: {
    sentiment: 'positive' | 'negative' | 'neutral';
    severity_score: number; // 0-100
    key_phrases: string[];
    risk_indicators: string[];
    similar_cases_count: number;
    confidence: number; // 0-100
  };
  
  // Análisis de Compliance
  compliance_analysis: EvaluacionRiesgo;
  
  // Puntuación híbrida unificada
  unified_risk: {
    score: number; // 0-100 (combinando IA + Compliance)
    level: 'Muy Bajo' | 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
    urgency: 'Baja' | 'Media' | 'Alta' | 'Crítica';
    confidence: number; // 0-100
  };
  
  // Recomendaciones inteligentes
  intelligent_recommendations: {
    immediate_actions: string[];
    investigation_strategy: string[];
    risk_mitigation: string[];
    legal_considerations: string[];
  };
  
  // Metadata
  analysis_timestamp: string;
  processing_time_ms: number;
}

/**
 * Motor de análisis inteligente híbrido
 */
class MotorAnalisisInteligente {
  private complianceMotor: MotorEvaluacionRiesgos;

  constructor() {
    this.complianceMotor = new MotorEvaluacionRiesgos();
  }

  /**
   * Realiza análisis híbrido completo de una denuncia
   */
  async analizarDenuncia(
    reportData: ReportFormValues & { id: string },
    companyId: string
  ): Promise<AnalisisInteligente> {
    const startTime = Date.now();

    // 1. Análisis de IA (simulado por ahora - aquí iría la integración real con OpenAI/Claude)
    const aiAnalysis = await this.realizarAnalisisIA(reportData);
    
    // 2. Análisis de Compliance
    const complianceAnalysis = this.complianceMotor.evaluarDenuncia(reportData, companyId);
    
    // 3. Fusión inteligente de ambos análisis
    const unifiedRisk = this.calcularRiesgoUnificado(aiAnalysis, complianceAnalysis);
    
    // 4. Generar recomendaciones inteligentes
    const recommendations = this.generarRecomendacionesInteligentes(
      aiAnalysis, 
      complianceAnalysis, 
      unifiedRisk
    );

    const processingTime = Date.now() - startTime;

    return {
      ai_analysis: aiAnalysis,
      compliance_analysis: complianceAnalysis,
      unified_risk: unifiedRisk,
      intelligent_recommendations: recommendations,
      analysis_timestamp: new Date().toISOString(),
      processing_time_ms: processingTime
    };
  }

  /**
   * Análisis de IA simulado (aquí se integraría con OpenAI/Claude real)
   */
  private async realizarAnalisisIA(reportData: ReportFormValues): Promise<AnalisisInteligente['ai_analysis']> {
    const texto = `${reportData.detailedDescription} ${reportData.previousActions || ''} ${reportData.expectation || ''}`;
    
    // Simulación de análisis de IA (en producción sería llamada real a OpenAI/Claude)
    const palabrasClave = this.extraerPalabrasClaveIA(texto);
    const indicadoresRiesgo = this.detectarIndicadoresRiesgo(texto);
    const severidad = this.calcularSeveridadIA(texto, indicadoresRiesgo);
    const sentimiento = this.analizarSentimiento(texto);
    
    return {
      sentiment: sentimiento,
      severity_score: severidad,
      key_phrases: palabrasClave,
      risk_indicators: indicadoresRiesgo,
      similar_cases_count: Math.floor(Math.random() * 10), // Simulado
      confidence: Math.min(95, 60 + indicadoresRiesgo.length * 8)
    };
  }

  /**
   * Extrae palabras clave usando técnicas de IA
   */
  private extraerPalabrasClaveIA(texto: string): string[] {
    const palabrasRiesgo = [
      'dinero', 'pago', 'soborno', 'coima', 'favor', 'regalo',
      'amenaza', 'chantaje', 'presión', 'intimidación',
      'discriminación', 'acoso', 'maltrato', 'abuso',
      'fraude', 'estafa', 'engaño', 'falsificación',
      'contrato', 'licitación', 'adjudicación', 'empresa',
      'familiar', 'amigo', 'conocido', 'relación',
      'secreto', 'confidencial', 'privado', 'oculto'
    ];

    return palabrasRiesgo.filter(palabra => 
      texto.toLowerCase().includes(palabra)
    ).slice(0, 10);
  }

  /**
   * Detecta indicadores específicos de riesgo
   */
  private detectarIndicadoresRiesgo(texto: string): string[] {
    const indicadores: string[] = [];
    const textoLower = texto.toLowerCase();

    // Indicadores financieros
    if (textoLower.match(/dinero|pago|plata|efectivo|transferencia/)) {
      indicadores.push('Transacciones financieras sospechosas');
    }

    // Indicadores de relaciones
    if (textoLower.match(/tío|primo|hermano|familiar|amigo|conocido/)) {
      indicadores.push('Posible conflicto de intereses familiar');
    }

    // Indicadores de procedimientos
    if (textoLower.match(/contrato|licitación|adjudicación|proceso/)) {
      indicadores.push('Irregularidades en procesos contractuales');
    }

    // Indicadores de presión
    if (textoLower.match(/amenaza|presión|obligar|forzar/)) {
      indicadores.push('Coerción o presión indebida');
    }

    // Indicadores de secretismo
    if (textoLower.match(/secreto|oculto|confidencial|no decir/)) {
      indicadores.push('Comportamiento secreto o encubrimiento');
    }

    return indicadores;
  }

  /**
   * Calcula severidad basada en análisis de IA
   */
  private calcularSeveridadIA(texto: string, indicadores: string[]): number {
    let severidad = 30; // Base

    // Incrementar por indicadores detectados
    severidad += indicadores.length * 15;

    // Incrementar por palabras de alta gravedad
    const palabrasGraves = ['soborno', 'coima', 'amenaza', 'chantaje', 'fraude'];
    const palabrasDetectadas = palabrasGraves.filter(palabra => 
      texto.toLowerCase().includes(palabra)
    );
    severidad += palabrasDetectadas.length * 20;

    // Incrementar por longitud y detalle
    if (texto.length > 500) severidad += 10;
    if (texto.length > 1000) severidad += 10;

    return Math.min(100, severidad);
  }

  /**
   * Analiza sentimiento del texto
   */
  private analizarSentimiento(texto: string): 'positive' | 'negative' | 'neutral' {
    const palabrasNegativas = ['malo', 'terrible', 'horrible', 'injusto', 'ilegal', 'corrupto'];
    const palabrasPositivas = ['bueno', 'correcto', 'justo', 'legal', 'transparente'];

    const negativas = palabrasNegativas.filter(p => texto.toLowerCase().includes(p)).length;
    const positivas = palabrasPositivas.filter(p => texto.toLowerCase().includes(p)).length;

    if (negativas > positivas) return 'negative';
    if (positivas > negativas) return 'positive';
    return 'neutral';
  }

  /**
   * Calcula riesgo unificado combinando IA + Compliance
   */
  private calcularRiesgoUnificado(
    aiAnalysis: AnalisisInteligente['ai_analysis'],
    complianceAnalysis: EvaluacionRiesgo
  ): AnalisisInteligente['unified_risk'] {
    // Normalizar puntuaciones a escala 0-100
    const aiScore = aiAnalysis.severity_score;
    const complianceScore = (complianceAnalysis.valor_riesgo / 25) * 100; // 25 es el máximo de compliance
    
    // Combinar con pesos: 60% compliance (más objetivo) + 40% IA (más contextual)
    const unifiedScore = Math.round((complianceScore * 0.6) + (aiScore * 0.4));
    
    // Determinar nivel
    let level: AnalisisInteligente['unified_risk']['level'];
    if (unifiedScore >= 85) level = 'Crítico';
    else if (unifiedScore >= 70) level = 'Alto';
    else if (unifiedScore >= 50) level = 'Medio';
    else if (unifiedScore >= 30) level = 'Bajo';
    else level = 'Muy Bajo';

    // Determinar urgencia
    let urgency: AnalisisInteligente['unified_risk']['urgency'];
    if (unifiedScore >= 85 || complianceAnalysis.urgencia === 'Crítica') urgency = 'Crítica';
    else if (unifiedScore >= 70 || complianceAnalysis.urgencia === 'Alta') urgency = 'Alta';
    else if (unifiedScore >= 50 || complianceAnalysis.urgencia === 'Media') urgency = 'Media';
    else urgency = 'Baja';

    // Calcular confianza (promedio de confianzas)
    const confidence = Math.round((aiAnalysis.confidence + 85) / 2); // 85 es confianza fija de compliance

    return {
      score: unifiedScore,
      level,
      urgency,
      confidence
    };
  }

  /**
   * Genera recomendaciones inteligentes basadas en ambos análisis
   */
  private generarRecomendacionesInteligentes(
    aiAnalysis: AnalisisInteligente['ai_analysis'],
    complianceAnalysis: EvaluacionRiesgo,
    unifiedRisk: AnalisisInteligente['unified_risk']
  ): AnalisisInteligente['intelligent_recommendations'] {
    const recommendations: AnalisisInteligente['intelligent_recommendations'] = {
      immediate_actions: [],
      investigation_strategy: [],
      risk_mitigation: [],
      legal_considerations: []
    };

    // Acciones inmediatas basadas en urgencia
    if (unifiedRisk.urgency === 'Crítica') {
      recommendations.immediate_actions.push(
        'Notificar inmediatamente a CEO y Comité de Ética',
        'Activar protocolo de crisis organizacional',
        'Considerar suspensión preventiva de involucrados'
      );
    } else if (unifiedRisk.urgency === 'Alta') {
      recommendations.immediate_actions.push(
        'Asignar investigador senior experimentado',
        'Reunión urgente del Comité de Ética en 24 horas',
        'Implementar medidas precautorias'
      );
    }

    // Estrategia de investigación basada en indicadores de IA
    if (aiAnalysis.risk_indicators.includes('Transacciones financieras sospechosas')) {
      recommendations.investigation_strategy.push(
        'Revisar registros financieros y transacciones',
        'Solicitar información bancaria relevante',
        'Analizar flujos de dinero sospechosos'
      );
    }

    if (aiAnalysis.risk_indicators.includes('Posible conflicto de intereses familiar')) {
      recommendations.investigation_strategy.push(
        'Investigar relaciones familiares/personales',
        'Revisar declaraciones de conflicto de interés',
        'Mapear estructura organizacional'
      );
    }

    // Mitigación de riesgos usando controles de compliance
    recommendations.risk_mitigation = complianceAnalysis.controles_sugeridos.slice(0, 4);

    // Consideraciones legales basadas en delitos identificados
    if (complianceAnalysis.delitos_identificados.length > 0) {
      const delitosGraves = complianceAnalysis.delitos_identificados.filter(d => 
        d.nivel_riesgo === 'Crítico' || d.nivel_riesgo === 'Alto'
      );

      if (delitosGraves.length > 0) {
        recommendations.legal_considerations.push(
          'Evaluar reporte inmediato a autoridades competentes',
          'Contactar asesoría legal externa especializada',
          'Preparar documentación para posible investigación oficial'
        );
      }

      recommendations.legal_considerations.push(
        `Considerar aplicabilidad de ${complianceAnalysis.delitos_identificados[0].ley}`,
        'Revisar obligaciones de reporte según normativa vigente'
      );
    }

    return recommendations;
  }
}

// Instancia singleton
const motorAnalisisInteligente = new MotorAnalisisInteligente();

/**
 * Función principal para realizar análisis inteligente
 */
export async function realizarAnalisisInteligente(
  reportData: ReportFormValues & { id: string },
  companyId: string
): Promise<AnalisisInteligente> {
  return await motorAnalisisInteligente.analizarDenuncia(reportData, companyId);
}

/**
 * Exportar motor para testing
 */
export { MotorAnalisisInteligente };