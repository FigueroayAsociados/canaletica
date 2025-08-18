// src/lib/services/claudeClient.ts
// Cliente seguro que usa API routes del servidor

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Función helper para hacer llamadas a las API routes
async function apiCall(endpoint: string, data: any) {
  const response = await fetch(`/api/ai/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function analyzeRiskWithClaude(reportContent: string, category: string) {
  try {
    const result = await apiCall('analyze-risk', {
      reportContent,
      category
    });
    
    if (result.success) {
      return result.analysis;
    } else {
      throw new Error(result.error);
    }
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
  try {
    const result = await apiCall('generate-document', {
      type,
      reportData,
      tone
    });
    
    if (result.success) {
      return result.document.content;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en generación de documento:', error);
    throw error;
  }
}

export async function chatWithClaude(
  userMessage: string,
  context: any,
  role: string
) {
  try {
    const result = await apiCall('chat', {
      userMessage,
      context,
      role
    });
    
    if (result.success) {
      return result.response.content;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en chat:', error);
    throw error;
  }
}