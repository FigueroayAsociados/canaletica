// src/lib/services/claudeService.ts
// Servicio para integración con Claude API de Anthropic

import Anthropic from '@anthropic-ai/sdk';

// Configuración del cliente Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Límites de seguridad
const MAX_TOKENS_INPUT = 4000;
const MAX_TOKENS_OUTPUT = 2000;
const REQUEST_TIMEOUT = 30000; // 30 segundos

/**
 * Configuración base para requests a Claude
 */
const DEFAULT_CONFIG = {
  model: "claude-3-haiku-20240307", // Modelo económico y rápido
  max_tokens: MAX_TOKENS_OUTPUT,
  temperature: 0.3 // Respuestas más consistentes para análisis
};

/**
 * Verifica si Claude API está disponible
 */
export function isClaudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Analiza riesgo de una denuncia con Claude
 */
export async function analyzeRiskWithClaude(reportContent: {
  description: string;
  category: string;
  subcategory?: string;
  isAnonymous: boolean;
  hasEvidence: boolean;
  isKarinLaw: boolean;
  involvedPositions?: string[];
}): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  severity_score: number;
  key_phrases: string[];
  risk_indicators: string[];
  similar_cases_count: number;
  confidence: number;
}> {
  
  if (!isClaudeAvailable()) {
    throw new Error('Claude API no disponible - falta ANTHROPIC_API_KEY');
  }

  const prompt = `Como experto en análisis de riesgo corporativo, analiza esta denuncia y proporciona una evaluación estructurada.

DENUNCIA:
Descripción: "${reportContent.description}"
Categoría: ${reportContent.category}
${reportContent.subcategory ? `Subcategoría: ${reportContent.subcategory}` : ''}
Tipo: ${reportContent.isAnonymous ? 'Anónima' : 'Identificada'}
Evidencias: ${reportContent.hasEvidence ? 'Sí tiene' : 'No tiene'}
Ley Karin: ${reportContent.isKarinLaw ? 'Aplica' : 'No aplica'}
${reportContent.involvedPositions?.length ? `Cargos involucrados: ${reportContent.involvedPositions.join(', ')}` : ''}

Analiza y responde SOLO con un JSON válido con esta estructura exacta:
{
  "sentiment": "positive|negative|neutral",
  "severity_score": numero_entre_0_y_100,
  "key_phrases": ["frase1", "frase2", "frase3"],
  "risk_indicators": ["indicador1", "indicador2"],
  "similar_cases_count": numero_estimado,
  "confidence": numero_entre_0_y_100
}

Considera:
- Gravedad de los hechos relatados
- Impacto potencial en la organización
- Riesgo legal y reputacional
- Urgencia de atención requerida
- Palabras clave que indican problemas serios`;

  try {
    const response = await anthropic.messages.create({
      ...DEFAULT_CONFIG,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Respuesta de Claude no es texto');
    }

    // Extraer JSON de la respuesta
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta de Claude');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validar estructura
    if (!analysis.sentiment || typeof analysis.severity_score !== 'number') {
      throw new Error('Estructura de respuesta inválida');
    }

    return analysis;

  } catch (error) {
    console.error('Error en análisis de riesgo con Claude:', error);
    throw error;
  }
}

/**
 * Genera insights inteligentes usando Claude
 */
export async function generateInsightsWithClaude(context: {
  timeRange: string;
  totalReports: number;
  categories: string[];
  trends?: any[];
}): Promise<{
  trends: Array<{
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    type: 'trend' | 'pattern' | 'anomaly';
  }>;
  risks: Array<{
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    urgency: 'low' | 'medium' | 'high';
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  }>;
  efficiency: Array<{
    title: string;
    description: string;
    metric: string;
    improvement: number;
  }>;
}> {
  
  if (!isClaudeAvailable()) {
    throw new Error('Claude API no disponible - falta ANTHROPIC_API_KEY');
  }

  const prompt = `Como experto en análisis organizacional y compliance, genera insights inteligentes basados en estos datos:

CONTEXTO:
- Período: ${context.timeRange}
- Total denuncias: ${context.totalReports}
- Categorías: ${context.categories.join(', ')}

Genera insights específicos y responde SOLO con un JSON válido:
{
  "trends": [
    {
      "title": "Nombre de la tendencia",
      "description": "Descripción detallada",
      "impact": "low|medium|high",
      "type": "trend|pattern|anomaly"
    }
  ],
  "risks": [
    {
      "title": "Riesgo identificado",
      "description": "Descripción del riesgo",
      "impact": "low|medium|high",
      "urgency": "low|medium|high"
    }
  ],
  "recommendations": [
    {
      "title": "Recomendación",
      "description": "Descripción de la acción",
      "priority": "low|medium|high",
      "effort": "low|medium|high"
    }
  ],
  "efficiency": [
    {
      "title": "Métrica de eficiencia",
      "description": "Descripción de la mejora",
      "metric": "Porcentaje o indicador",
      "improvement": numero_porcentaje
    }
  ]
}

Genera 2-3 items por categoría máximo. Sé específico y práctico.`;

  try {
    const response = await anthropic.messages.create({
      ...DEFAULT_CONFIG,
      max_tokens: 1500, // Más tokens para insights complejos
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Respuesta de Claude no es texto');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta de Claude');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Error generando insights con Claude:', error);
    throw error;
  }
}

/**
 * Predice categorías para una denuncia usando Claude
 */
export async function predictCategoriesWithClaude(content: string): Promise<Array<{
  category: string;
  confidence: number;
  subcategory?: string;
  reasoning: string;
}>> {
  
  if (!isClaudeAvailable()) {
    throw new Error('Claude API no disponible - falta ANTHROPIC_API_KEY');
  }

  const categories = [
    'modelo_prevencion',
    'ley_karin', 
    'ciberseguridad',
    'reglamento_interno',
    'politicas_codigos',
    'represalias',
    'otros'
  ];

  const prompt = `Como experto en clasificación de denuncias corporativas, analiza este texto y predice las categorías más probables.

TEXTO: "${content}"

CATEGORÍAS DISPONIBLES:
- modelo_prevencion: Delitos según Ley 20.393 (cohecho, lavado, etc.)
- ley_karin: Acoso laboral, sexual, violencia en el trabajo
- ciberseguridad: Ataques, filtración de datos, uso indebido de sistemas
- reglamento_interno: Violaciones a normas internas de la empresa
- politicas_codigos: Incumplimiento de políticas corporativas
- represalias: Venganza por denunciar
- otros: Casos que no calzan en categorías anteriores

Responde SOLO con JSON válido:
{
  "predictions": [
    {
      "category": "nombre_categoria",
      "confidence": numero_entre_0_y_100,
      "subcategory": "subcategoria_opcional",
      "reasoning": "explicación_breve"
    }
  ]
}

Ordena por confianza descendente. Máximo 3 predicciones.`;

  try {
    const response = await anthropic.messages.create({
      ...DEFAULT_CONFIG,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content_text = response.content[0];
    if (content_text.type !== 'text') {
      throw new Error('Respuesta de Claude no es texto');
    }

    const jsonMatch = content_text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta de Claude');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.predictions || [];

  } catch (error) {
    console.error('Error prediciendo categorías con Claude:', error);
    throw error;
  }
}

/**
 * Genera asistencia conversacional usando Claude
 */
export async function getConversationalAssistanceWithClaude(params: {
  userMessage: string;
  context?: string;
  reportId?: string;
  previousMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}): Promise<{
  content: string;
  suggestions?: string[];
  confidence: number;
}> {
  
  if (!isClaudeAvailable()) {
    throw new Error('Claude API no disponible - falta ANTHROPIC_API_KEY');
  }

  // Construir contexto conversacional
  const messages: Array<{role: 'user' | 'assistant', content: string}> = [];
  
  // Agregar contexto del sistema
  const systemContext = `Eres un asistente especializado en gestión de denuncias corporativas y compliance. 
Tu objetivo es ayudar a investigadores y administradores con:
- Análisis de denuncias
- Recomendaciones de investigación
- Interpretación de normativas
- Procesos de compliance
- Gestión de casos

Sé conciso, práctico y profesional.`;

  // Agregar mensajes previos
  if (params.previousMessages && params.previousMessages.length > 0) {
    messages.push(...params.previousMessages.slice(-6)); // Últimos 6 mensajes para contexto
  }

  // Agregar contexto adicional si existe
  let contextualMessage = params.userMessage;
  if (params.context) {
    contextualMessage = `CONTEXTO: ${params.context}\n\nPREGUNTA: ${params.userMessage}`;
  }

  messages.push({
    role: 'user',
    content: contextualMessage
  });

  try {
    const response = await anthropic.messages.create({
      ...DEFAULT_CONFIG,
      max_tokens: 1000,
      system: systemContext,
      messages: messages
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Respuesta de Claude no es texto');
    }

    return {
      content: content.text,
      confidence: 85, // Claude generalmente tiene alta confianza
      suggestions: [] // Podríamos agregar sugerencias de follow-up
    };

  } catch (error) {
    console.error('Error en asistencia conversacional con Claude:', error);
    throw error;
  }
}

/**
 * Genera documentos legales usando Claude
 */
export async function generateLegalDocumentWithClaude(params: {
  type: 'investigation_plan' | 'preliminary_report' | 'final_report' | 'recommendation_letter';
  reportData: any;
  additionalContext?: string;
}): Promise<{
  title: string;
  content: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}> {
  
  if (!isClaudeAvailable()) {
    throw new Error('Claude API no disponible - falta ANTHROPIC_API_KEY');
  }

  const documentTypes = {
    investigation_plan: 'Plan de Investigación',
    preliminary_report: 'Informe Preliminar',
    final_report: 'Informe Final',
    recommendation_letter: 'Carta de Recomendaciones'
  };

  const prompt = `Como experto legal en compliance corporativo, genera un ${documentTypes[params.type]} profesional basado en estos datos:

INFORMACIÓN DE LA DENUNCIA:
${JSON.stringify(params.reportData, null, 2)}

${params.additionalContext ? `CONTEXTO ADICIONAL: ${params.additionalContext}` : ''}

Genera un documento estructurado y profesional. Responde con JSON válido:
{
  "title": "Título del documento",
  "content": "Contenido completo del documento",
  "sections": [
    {
      "title": "Título de sección",
      "content": "Contenido de la sección"
    }
  ]
}

El documento debe ser:
- Profesional y formal
- Legalmente apropiado
- Estructurado y claro
- Específico al caso presentado`;

  try {
    const response = await anthropic.messages.create({
      ...DEFAULT_CONFIG,
      max_tokens: 2000, // Más tokens para documentos
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Respuesta de Claude no es texto');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta de Claude');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Error generando documento legal con Claude:', error);
    throw error;
  }
}