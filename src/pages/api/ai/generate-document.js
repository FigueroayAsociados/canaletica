// src/pages/api/ai/generate-document.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, reportData, tone = 'formal' } = req.body;

    if (!type || !reportData) {
      return res.status(400).json({ 
        error: 'type y reportData son requeridos' 
      });
    }

    const system = `Eres un abogado especialista en derecho laboral chileno y Ley Karin. Genera documentos legales profesionales y formales.`;

    const prompt = `Genera un ${type} con tono ${tone} para este caso:
${JSON.stringify(reportData, null, 2)}

Debe ser profesional, cumplir con normativa chilena, y estar bien estructurado.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0]?.text || 'No se pudo generar el documento';

    res.status(200).json({
      success: true,
      document: {
        type,
        content,
        generatedAt: new Date(),
        tone
      }
    });

  } catch (error) {
    console.error('Error en generación de documento:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}