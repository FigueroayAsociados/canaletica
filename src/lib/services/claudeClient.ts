// src/lib/services/claudeClient.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callClaude({
  system,
  messages,
  maxTokens = 1000
}: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: maxTokens,
      system,
      messages
    });
    
    return response.content[0].text;
  } catch (error) {
    console.error('Error llamando a Claude:', error);
    throw error;
  }
}

export async function analyzeRiskWithClaude(reportContent: string, category: string) {
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

  try {
    const result = await callClaude({
      system,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1000
    });
    
    return JSON.parse(result);
  } catch (error) {
    console.error('Error en análisis de riesgo:', error);
    throw error;
  }
}

export async function generateDocumentWithClaude(
  type: string, 
  reportData: any, 
  tone: string = 'formal'
) {
  const system = `Eres un abogado especialista en derecho laboral chileno y Ley Karin. Genera documentos legales profesionales y formales.`;

  const prompt = `Genera un ${type} con tono ${tone} para este caso:
${JSON.stringify(reportData, null, 2)}

Debe ser profesional, cumplir con normativa chilena, y estar bien estructurado.`;

  return await callClaude({
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 2000
  });
}

export async function chatWithClaude(
  userMessage: string,
  context: any,
  role: string
) {
  const system = `Eres un asistente especializado en CanalEtica para ${role}. Ayudas con investigaciones, Ley Karin, plazos legales. Responde en español, de forma clara y profesional.`;

  const prompt = `Contexto: ${JSON.stringify(context)}
Pregunta del usuario: ${userMessage}`;

  return await callClaude({
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1500
  });
}