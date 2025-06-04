// src/lib/services/claudeClientService.ts
// Servicio del cliente que llama a las API routes de Claude

/**
 * Analiza riesgo usando API route (seguro para el cliente)
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
  
  const response = await fetch('/api/ai/analyze-risk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reportContent })
  });

  if (!response.ok) {
    throw new Error(`Error en análisis de riesgo: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Error en análisis de riesgo');
  }

  return result.analysis;
}

/**
 * Genera insights usando API route
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
  
  const response = await fetch('/api/ai/generate-insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context })
  });

  if (!response.ok) {
    throw new Error(`Error generando insights: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Error generando insights');
  }

  return result.insights;
}

/**
 * Predice categorías usando API route
 */
export async function predictCategoriesWithClaude(content: string): Promise<Array<{
  category: string;
  confidence: number;
  subcategory?: string;
  reasoning: string;
}>> {
  
  const response = await fetch('/api/ai/predict-categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error(`Error prediciendo categorías: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Error prediciendo categorías');
  }

  return result.predictions;
}

/**
 * Verifica si Claude está disponible (siempre true en cliente)
 */
export function isClaudeAvailable(): boolean {
  return true; // El backend manejará la verificación
}