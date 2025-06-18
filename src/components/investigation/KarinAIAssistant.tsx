'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { formatChileanDate } from '@/lib/utils/dateUtils';

interface KarinAIAssistantProps {
  investigation: any;
  onSuggestionApplied: () => Promise<void>;
}

interface AISuggestion {
  id: string;
  type: 'stage_guidance' | 'deadline_alert' | 'document_template' | 'compliance_check' | 'risk_assessment';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestion: string;
  deadline?: Date;
}

interface ConversationMessage {
  id: string;
  sender: 'user' | 'assistant';
  message: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
}

export const KarinAIAssistant: React.FC<KarinAIAssistantProps> = ({
  investigation,
  onSuggestionApplied
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'chat'>('suggestions');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingCase, setAnalyzingCase] = useState(false);

  const currentStage = investigation.karinProcess?.stage || 'complaint_filed';

  useEffect(() => {
    generateContextualSuggestions();
  }, [investigation]);

  const generateContextualSuggestions = () => {
    const newSuggestions: AISuggestion[] = [];
    const now = new Date();

    // Sugerencias basadas en la etapa actual
    switch (currentStage) {
      case 'reception':
        newSuggestions.push({
          id: 'inform_rights',
          type: 'stage_guidance',
          title: 'Informar Derechos al Denunciante',
          description: 'Es obligatorio informar al denunciante sobre sus derechos en el proceso Ley Karin',
          priority: 'high',
          actionable: true,
          suggestion: 'Genere y envíe la notificación de derechos automáticamente usando la plantilla legal.'
        });

        newSuggestions.push({
          id: 'dt_notification_reminder',
          type: 'deadline_alert',
          title: 'Notificar a Dirección del Trabajo',
          description: 'Tiene 3 días hábiles para notificar a la DT desde la recepción',
          priority: 'high',
          actionable: true,
          suggestion: 'Prepare la notificación inicial a la DT con los datos de la denuncia.',
          deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        });
        break;

      case 'investigation':
        if (!investigation.plan) {
          newSuggestions.push({
            id: 'create_investigation_plan',
            type: 'document_template',
            title: 'Plan de Investigación Requerido',
            description: 'No se ha creado el plan de investigación obligatorio',
            priority: 'high',
            actionable: true,
            suggestion: 'Genere un plan de investigación estructurado basado en el tipo de denuncia y evidencias disponibles.'
          });
        }

        if ((investigation.interviews?.length || 0) === 0) {
          newSuggestions.push({
            id: 'schedule_interviews',
            type: 'stage_guidance',
            title: 'Programar Entrevistas',
            description: 'Identifique y programe entrevistas con personas relevantes',
            priority: 'high',
            actionable: true,
            suggestion: 'Basándose en la denuncia, se recomienda entrevistar al denunciante, denunciado y testigos mencionados.'
          });
        }
        break;

      case 'report_creation':
        if (!investigation.preliminaryReport) {
          newSuggestions.push({
            id: 'preliminary_report',
            type: 'document_template',
            title: 'Crear Informe Preliminar',
            description: 'El informe preliminar es obligatorio para casos Ley Karin',
            priority: 'high',
            actionable: true,
            suggestion: 'Genere un informe preliminar con los hallazgos de la investigación y recomendaciones iniciales.'
          });
        }
        break;

      case 'measures_adoption':
        newSuggestions.push({
          id: 'implement_measures',
          type: 'deadline_alert',
          title: 'Implementar Medidas',
          description: 'Tiene 15 días corridos para implementar las medidas ordenadas por la DT',
          priority: 'high',
          actionable: true,
          suggestion: 'Elabore un plan de implementación de medidas con cronograma y responsables.',
          deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
        });
        break;
    }

    // Verificaciones de cumplimiento general
    const createdAt = investigation.createdAt?.toDate ? 
      new Date(investigation.createdAt.toDate()) : 
      new Date(investigation.createdAt);
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));

    if (daysSinceCreation > 30 && currentStage === 'investigation') {
      newSuggestions.push({
        id: 'investigation_extension',
        type: 'compliance_check',
        title: 'Prórroga de Investigación',
        description: 'La investigación lleva más de 30 días. Considere solicitar prórroga.',
        priority: 'medium',
        actionable: true,
        suggestion: 'Evalúe si necesita solicitar prórroga de 30 días adicionales para la investigación.'
      });
    }

    // Análisis de riesgo basado en contenido
    if (investigation.category?.toLowerCase().includes('acoso') || 
        investigation.description?.toLowerCase().includes('acoso')) {
      newSuggestions.push({
        id: 'harassment_protocol',
        type: 'risk_assessment',
        title: 'Protocolo de Acoso',
        description: 'Se detectó contenido relacionado con acoso. Aplicar protocolo específico.',
        priority: 'high',
        actionable: true,
        suggestion: 'Active el protocolo especial para casos de acoso, incluyendo medidas de protección inmediatas.'
      });
    }

    setSuggestions(newSuggestions);
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || loading) return;

    setLoading(true);
    const newMessage: ConversationMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: userMessage,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, newMessage]);
    setUserMessage('');

    // Simular respuesta de IA (en implementación real, aquí se llamaría al servicio de IA)
    setTimeout(() => {
      const assistantResponse: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        message: generateAIResponse(userMessage),
        timestamp: new Date()
      };

      setConversation(prev => [...prev, assistantResponse]);
      setLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('plazo') || message.includes('tiempo')) {
      return `Para la etapa actual (${getStageName(currentStage)}), los plazos principales son:
      
      • Notificación a DT: 3 días hábiles desde recepción
      • Investigación: 30 días hábiles (prorrogable a 60)
      • Envío a DT: 2 días hábiles desde aprobación del informe
      • Implementación de medidas: 15 días corridos desde resolución DT
      
      ¿Necesita ayuda con algún plazo específico?`;
    }
    
    if (message.includes('entrevista') || message.includes('testimonio')) {
      return `Para las entrevistas en casos Ley Karin, recomiendo:
      
      • Entrevistar primero al denunciante para obtener detalles
      • Luego a testigos mencionados
      • Finalmente al denunciado
      • Documentar todo en testimonios firmados
      • Mantener confidencialidad en todo momento
      
      ¿Necesita una plantilla de entrevista específica?`;
    }
    
    if (message.includes('informe') || message.includes('reporte')) {
      return `El informe preliminar debe incluir:
      
      • Resumen ejecutivo de la denuncia
      • Metodología de investigación utilizada
      • Hallazgos principales y evidencias
      • Análisis legal bajo Ley Karin
      • Recomendaciones preliminares
      • Cronograma de implementación
      
      ¿Quiere que genere una plantilla específica?`;
    }
    
    return `Entiendo su consulta sobre "${userMessage}". Como especialista en Ley Karin, puedo ayudarle con:

    • Orientación sobre plazos y procedimientos
    • Plantillas de documentos legales
    • Análisis de cumplimiento normativo
    • Recomendaciones de mejores prácticas
    
    ¿Podría ser más específico sobre qué aspecto necesita ayuda?`;
  };

  const getStageName = (stage: string): string => {
    const stages: {[key: string]: string} = {
      'complaint_filed': 'Denuncia Interpuesta',
      'reception': 'Recepción de Denuncia',
      'investigation': 'Investigación',
      'report_creation': 'Creación de Informe',
      'measures_adoption': 'Adopción de Medidas'
    };
    return stages[stage] || stage;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'stage_guidance': return '🎯';
      case 'deadline_alert': return '⏰';
      case 'document_template': return '📄';
      case 'compliance_check': return '✅';
      case 'risk_assessment': return '⚠️';
      default: return '💡';
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado del asistente */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center">
            🤖 Asistente IA Ley Karin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-purple-700">
            Asistencia inteligente especializada en procesos Ley Karin. 
            Obtén sugerencias contextuales y orientación legal.
          </p>
        </CardContent>
      </Card>

      {/* Pestañas */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'suggestions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('suggestions')}
          className="flex-1"
        >
          Sugerencias
        </Button>
        <Button
          variant={activeTab === 'chat' ? 'default' : 'outline'}
          onClick={() => setActiveTab('chat')}
          className="flex-1"
        >
          Chat IA
        </Button>
      </div>

      {/* Contenido de sugerencias */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No hay sugerencias específicas para la etapa actual. 
                El proceso va por buen camino.
              </AlertDescription>
            </Alert>
          ) : (
            suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-2 border-dashed">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                        <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                      </div>
                      <Badge className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority === 'high' ? 'Alta' : 
                         suggestion.priority === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                    
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Sugerencia:</strong> {suggestion.suggestion}
                      </p>
                    </div>

                    {suggestion.deadline && (
                      <div className="text-xs text-red-600">
                        <strong>Plazo:</strong> {formatChileanDate(suggestion.deadline)}
                      </div>
                    )}

                    {suggestion.actionable && (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            // Aquí se implementaría la acción sugerida
                            onSuggestionApplied();
                          }}
                        >
                          Aplicar Sugerencia
                        </Button>
                        <Button size="sm" variant="outline">
                          Ver Más Detalles
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Contenido del chat */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {/* Mensajes del chat */}
          <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-md">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>¡Hola! Soy tu asistente especializado en Ley Karin.</p>
                <p className="text-sm mt-2">Pregúntame sobre plazos, procedimientos, documentos o cualquier duda legal.</p>
              </div>
            ) : (
              conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString('es-CL', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <Spinner text="Asistente escribiendo..." />
                </div>
              </div>
            )}
          </div>

          {/* Input del chat */}
          <div className="flex space-x-2">
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Pregunta sobre Ley Karin, plazos, procedimientos..."
              rows={2}
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!userMessage.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};