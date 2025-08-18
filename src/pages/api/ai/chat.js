// src/pages/api/ai/chat.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userMessage, context, role } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage es requerido' });
    }

    const system = `Eres un asistente especializado en CanalEtica para ${role || 'usuario'}. Ayudas con investigaciones, Ley Karin, plazos legales. Responde en español, de forma clara y profesional.`;

    const prompt = context 
      ? `Contexto: ${JSON.stringify(context)}\nPregunta del usuario: ${userMessage}`
      : userMessage;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0]?.text || 'No se pudo generar respuesta';

    res.status(200).json({
      success: true,
      response: {
        role: 'assistant',
        content,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error en API chat:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}