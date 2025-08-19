// src/pages/api/ai/generate-judicial-report.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      reportData, 
      testimonies = [], 
      evidences = [], 
      investigationFindings = [],
      reportType = 'final' 
    } = req.body;

    if (!reportData) {
      return res.status(400).json({ 
        error: 'reportData es requerido' 
      });
    }

    const system = `Eres un abogado laboralista senior especializado en Ley Karin de Chile. Redactas informes finales con estructura de sentencia judicial: hechos probados, análisis jurídico, valoración de pruebas y conclusiones fundadas. Tu redacción es formal, técnica y cumple con estándares judiciales chilenos.`;

    const prompt = `Genera un informe final tipo sentencia judicial para este caso de Ley Karin:

**DATOS DEL CASO:**
- Categoría: ${reportData.category}
- Descripción: ${reportData.detailedDescription}
- Fecha de los hechos: ${reportData.eventDate}
- Impacto reportado: ${reportData.impact}
- Denunciante: ${reportData.isAnonymous ? 'Anónimo' : 'Identificado'}
- Denunciado: ${reportData.accusedPersons?.map(p => p.name).join(', ') || 'No especificado'}

**TESTIMONIOS:**
${testimonies.map((t, i) => `
${i + 1}. ${t.personType} - ${t.personName}:
   Fecha: ${t.date}
   Resumen: ${t.summary}
`).join('\n')}

**EVIDENCIAS:**
${evidences.map((e, i) => `
${i + 1}. ${e.type}: ${e.description}
`).join('\n')}

**HALLAZGOS DE INVESTIGACIÓN:**
${investigationFindings.join('\n')}

**ESTRUCTURA REQUERIDA:**

I. IDENTIFICACIÓN DEL CASO
II. HECHOS RELATADOS
III. DILIGENCIAS REALIZADAS
IV. VALORACIÓN DE LA PRUEBA
   A. Testimonios
   B. Documentos
   C. Otras evidencias
V. ANÁLISIS JURÍDICO
   A. Marco normativo aplicable
   B. Tipificación de conductas
   C. Evaluación de cumplimiento Ley Karin
VI. CONCLUSIONES
   A. Determinación de hechos
   B. Calificación jurídica
   C. Responsabilidades determinadas
VII. PROPUESTAS
   A. Medidas correctivas
   B. Sanciones recomendadas
   C. Medidas preventivas

**CONSIDERACIONES:**
- Usa lenguaje jurídico formal pero comprensible
- Fundamenta cada conclusión con base en la prueba
- Cita artículos específicos de la Ley Karin cuando aplique
- Incluye análisis de credibilidad de testimonios
- Evalúa la fuerza probatoria de cada evidencia
- Propón medidas proporcionales y justificadas

Redacta el informe completo:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: prompt }]
    });

    const report = response.content[0]?.text || 'No se pudo generar el informe';

    res.status(200).json({
      success: true,
      report: {
        type: reportType,
        title: `Informe Final de Investigación - Caso ${reportData.category}`,
        content: report,
        generatedAt: new Date().toISOString(),
        recommendedActions: extractRecommendedActions(report),
        legalReferences: extractLegalReferences(report)
      }
    });

  } catch (error) {
    console.error('Error generando informe judicial:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}

/**
 * Extrae acciones recomendadas del informe generado
 */
function extractRecommendedActions(reportContent) {
  const actions = [];
  
  // Buscar sección de propuestas/recomendaciones
  const proposalsMatch = reportContent.match(/VII\.\s*PROPUESTAS([\s\S]*?)(?=VIII\.|$)/i);
  if (proposalsMatch) {
    const proposalsText = proposalsMatch[1];
    
    // Extraer elementos que parecen acciones
    const actionMatches = proposalsText.match(/[-•]\s*([^.\n]+)/g);
    if (actionMatches) {
      actions.push(...actionMatches.map(match => 
        match.replace(/^[-•]\s*/, '').trim()
      ));
    }
  }
  
  return actions;
}

/**
 * Extrae referencias legales del informe generado
 */
function extractLegalReferences(reportContent) {
  const references = [];
  
  // Buscar menciones de artículos, leyes, etc.
  const legalMatches = reportContent.match(/(artículo\s+\d+[a-z]?|ley\s+n?°?\s*\d+[\d.-]*|código\s+del\s+trabajo)/gi);
  if (legalMatches) {
    references.push(...[...new Set(legalMatches)]); // Eliminar duplicados
  }
  
  return references;
}