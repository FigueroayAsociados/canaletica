// src/pages/api/ai/analyze-risk.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reportContent, category } = req.body;

    if (!reportContent || !category) {
      return res.status(400).json({ 
        error: 'reportContent y category son requeridos' 
      });
    }

    const system = `Eres un experto en análisis de riesgo corporativo especializado en denuncias éticas y Ley Karin de Chile. Analiza el contenido y devuelve SOLO un JSON válido con esta estructura exacta:
{
  "riskScore": number (0-100),
  "riskLevel": "bajo" | "medio" | "alto" | "crítico", 
  "factors": ["factor1", "factor2"],
  "urgency": "baja" | "media" | "alta",
  "recommendations": ["rec1", "rec2"]
}`;

    const prompt = `Analiza esta denuncia y evalúa el riesgo:
Categoría: ${category}
Contenido: ${reportContent}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0]?.text;
    
    try {
      const analysis = JSON.parse(content);
      res.status(200).json({
        success: true,
        analysis
      });
    } catch (parseError) {
      // Si no se puede parsear, devolver análisis básico
      res.status(200).json({
        success: true,
        analysis: {
          riskScore: 50,
          riskLevel: "medio",
          factors: ["Análisis automático no disponible"],
          urgency: "media",
          recommendations: ["Revisar manualmente el caso"]
        }
      });
    }

  } catch (error) {
    console.error('Error en análisis de riesgo:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}