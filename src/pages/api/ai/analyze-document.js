// src/pages/api/ai/analyze-document.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentContent, documentType, analysisType = 'general' } = req.body;

    if (!documentContent || !documentType) {
      return res.status(400).json({ 
        error: 'documentContent y documentType son requeridos' 
      });
    }

    // Construir prompt especializado según tipo de análisis
    let system = '';
    let prompt = '';

    switch (analysisType) {
      case 'evidence':
        system = `Eres un experto en análisis de evidencias legales para casos de acoso laboral y sexual en Chile (Ley Karin). Analiza documentos y determina su relevancia, autenticidad y valor probatorio.`;
        prompt = `Analiza este documento como evidencia:

Tipo: ${documentType}
Contenido: ${documentContent}

Proporciona:
1. Relevancia para el caso (Alta/Media/Baja)
2. Valor probatorio (Directo/Indirecto/Circunstancial)
3. Posibles inconsistencias o elementos de interés
4. Recomendaciones para complementar esta evidencia
5. Aspectos legales a considerar`;
        break;

      case 'testimony':
        system = `Eres un experto en análisis de testimonios para investigaciones laborales. Evalúas coherencia, credibilidad y aspectos relevantes de declaraciones.`;
        prompt = `Analiza este testimonio:

Contenido: ${documentContent}

Evalúa:
1. Coherencia interna del relato
2. Nivel de detalle y especificidad
3. Posibles contradicciones
4. Credibilidad general (Alta/Media/Baja)
5. Preguntas de seguimiento recomendadas
6. Aspectos que requieren clarificación`;
        break;

      case 'protective_measures':
        system = `Eres un especialista en medidas de resguardo para casos de acoso según Ley Karin. Propones medidas específicas basadas en el riesgo y contexto.`;
        prompt = `Basándote en esta información del caso, propón medidas de resguardo:

${documentContent}

Proporciona:
1. Nivel de riesgo evaluado (Alto/Medio/Bajo)
2. Medidas inmediatas (primeras 72 horas)
3. Medidas a mediano plazo (primera semana)
4. Medidas preventivas adicionales
5. Justificación legal para cada medida
6. Consideraciones especiales (género, jerarquía, etc.)`;
        break;

      case 'compliance':
        system = `Eres un auditor legal especializado en cumplimiento de Ley Karin. Revisas procedimientos y identificas riesgos de incumplimiento.`;
        prompt = `Revisa el cumplimiento normativo de este proceso:

${documentContent}

Analiza:
1. Cumplimiento de plazos legales
2. Procedimientos correctos seguidos
3. Documentación faltante
4. Riesgos de incumplimiento identificados
5. Acciones correctivas recomendadas
6. Nivel de exposición legal (Alto/Medio/Bajo)`;
        break;

      default:
        system = `Eres un asistente legal especializado en Ley Karin de Chile. Proporciona análisis profesionales y recomendaciones prácticas.`;
        prompt = `Analiza este documento:

Tipo: ${documentType}
Contenido: ${documentContent}

Proporciona un análisis completo con observaciones y recomendaciones.`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: prompt }]
    });

    const analysis = response.content[0]?.text || 'No se pudo generar el análisis';

    res.status(200).json({
      success: true,
      analysis: {
        type: analysisType,
        documentType,
        content: analysis,
        analyzedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en análisis de documento:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}