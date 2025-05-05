'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Lightbulb, Send, Clock, Bot, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAI } from '@/lib/hooks/useAI';
import { AssistantMessage, ConversationalAssistantParams } from '@/lib/services/aiService';

// Extender la interfaz AssistantMessage para nuestro componente
interface Message extends AssistantMessage {
  id: string;
  type?: 'general' | 'tip' | 'warning' | 'deadline' | 'suggestion';
}

interface ConversationalAssistantProps {
  userRole: 'investigator' | 'admin' | 'super_admin';
  userName?: string;
  context?: {
    reportId?: string;
    caseType?: string;
    deadlines?: { label: string; date: Date }[];
    currentModule?: string;
    reportData?: any;
  };
  onAssistantResponse?: (message: string) => void;
  className?: string;
}

export default function ConversationalAssistant({
  userRole,
  userName,
  context,
  onAssistantResponse,
  className
}: ConversationalAssistantProps) {
  // Usar el hook de IA
  const { 
    sendMessage, 
    isProcessingMessage, 
    error, 
    conversationHistory,
    clearConversation,
    isAIEnabled
  } = useAI();
  
  // Estados
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll automático al final cuando se añaden mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Inicializar con mensaje de bienvenida
  useEffect(() => {
    // Mensaje de bienvenida basado en el rol del usuario
    const welcomeMessage = getWelcomeMessage(userRole, userName);
    
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        type: 'general'
      }
    ]);
    
    // Si hay plazos próximos, añadir un aviso
    if (context?.deadlines && context.deadlines.length > 0) {
      const upcomingDeadlines = context.deadlines.filter(
        d => new Date(d.date).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000
      );
      
      if (upcomingDeadlines.length > 0) {
        setTimeout(() => {
          addSystemMessage(
            `Tienes ${upcomingDeadlines.length} plazo${upcomingDeadlines.length > 1 ? 's' : ''} próximo${upcomingDeadlines.length > 1 ? 's' : ''}. ${
              upcomingDeadlines.map(d => `${d.label}: ${formatDate(d.date)}`).join(', ')
            }`,
            'deadline'
          );
        }, 1000);
      }
    }
    
    // Consejo inicial basado en el módulo actual
    if (context?.currentModule) {
      setTimeout(() => {
        addSystemMessage(
          getTipForModule(context.currentModule, context.caseType),
          'tip'
        );
      }, 2000);
    }
  }, [userRole, userName, context]);
  
  // Obtener mensaje de bienvenida según el rol
  const getWelcomeMessage = (role: string, name?: string): string => {
    const greeting = name ? `Hola ${name}` : 'Hola';
    
    switch (role) {
      case 'investigator':
        return `${greeting}, soy tu asistente de investigación. Puedo ayudarte con la planificación, plazos, técnicas de entrevista, recopilación de evidencias y redacción de informes. ¿En qué te puedo asistir hoy?`;
      case 'admin':
        return `${greeting}, soy tu asistente administrativo. Puedo ayudarte con la gestión de usuarios, configuraciones del sistema, reportes estadísticos y supervisión de casos. ¿Qué necesitas revisar?`;
      case 'super_admin':
        return `${greeting}, soy tu asistente de análisis avanzado. Puedo ayudarte a identificar patrones, sugerir mejoras en la plataforma, detectar cuellos de botella y analizar métricas. ¿Qué área te gustaría analizar?`;
      default:
        return `${greeting}, soy tu asistente virtual. ¿En qué puedo ayudarte?`;
    }
  };
  
  // Obtener consejo basado en el módulo actual
  const getTipForModule = (module: string, caseType?: string): string => {
    switch (module) {
      case 'plan':
        return 'Para un plan de investigación efectivo, asegúrate de identificar todas las fuentes de información relevantes y establecer un cronograma realista.';
      case 'interviews':
        return 'Al realizar entrevistas, comienza con preguntas abiertas y no sugestionables. Recuerda tomar notas detalladas o grabar la conversación con consentimiento.';
      case 'findings':
        return 'Al documentar hallazgos, relaciona cada uno con evidencia específica y evalúa su relevancia para las alegaciones iniciales.';
      case 'report':
        return 'Un buen informe final debe ser objetivo, basado en hechos, y presentar conclusiones fundamentadas en la evidencia recopilada.';
      case 'karin':
        return caseType === 'ley_karin' 
          ? 'Recuerda que los casos de Ley Karin tienen plazos estrictos. Es imprescindible notificar a la Dirección del Trabajo dentro de 3 días hábiles y completar la investigación en 30 días hábiles improrrogables.'
          : 'La sección de Ley Karin es relevante cuando la denuncia involucra acoso laboral o sexual.';
      default:
        return 'Si necesitas ayuda con cualquier aspecto de la investigación, no dudes en preguntarme.';
    }
  };
  
  // Formatear fechas
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Agregar mensaje del sistema
  const addSystemMessage = (content: string, type: Message['type'] = 'general') => {
    setMessages(prev => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        role: 'system',
        content,
        timestamp: new Date(),
        type
      }
    ]);
  };
  
  // Enviar mensaje al asistente
  const handleSendMessage = async () => {
    if (!input.trim() || isProcessingMessage) return;
    
    // Preparar el mensaje para enviar a la IA
    const userMessageContent = input;
    setInput('');
    
    // Agregar mensaje del usuario a la interfaz
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Convertir el contexto al formato esperado por la API
      const assistantContext = {
        reportId: context?.reportId,
        caseType: context?.caseType,
        module: context?.currentModule,
        reportData: context?.reportData,
        appContext: context?.currentModule,
        deadlines: context?.deadlines
      };
      
      // Enviar mensaje a la IA
      const messageParams: ConversationalAssistantParams = {
        userRole,
        userMessage: userMessageContent,
        context: assistantContext
      };
      
      const response = await sendMessage(messageParams);
      
      if (response) {
        // Agregar respuesta del asistente a la interfaz
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          timestamp: response.timestamp || new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Notificar de la respuesta si se proporciona callback
        if (onAssistantResponse) {
          onAssistantResponse(response.content);
        }
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      // Mostrar error al usuario
      addSystemMessage(
        'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
        'warning'
      );
    }
  };
  
  // Limpiar la conversación
  const handleClearConversation = () => {
    clearConversation();
    
    // Reiniciar mensajes con un nuevo mensaje de bienvenida
    const welcomeMessage = getWelcomeMessage(userRole, userName);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        type: 'general'
      }
    ]);
  };
  
  // Renderizar un mensaje individual
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    // Estilos para diferentes tipos de mensajes
    const messageStyles = {
      user: 'bg-primary/10 text-primary-foreground ml-10',
      assistant: 'bg-slate-100 text-slate-900 mr-10',
      system: message.type === 'warning' 
        ? 'bg-amber-100 text-amber-800 border border-amber-200 mx-4'
        : message.type === 'deadline'
          ? 'bg-red-100 text-red-800 border border-red-200 mx-4'
          : message.type === 'tip'
            ? 'bg-blue-100 text-blue-800 border border-blue-200 mx-4'
            : 'bg-gray-100 text-gray-800 border border-gray-200 mx-4'
    };
    
    // Iconos para diferentes tipos de mensajes del sistema
    const systemIcon = message.type === 'warning' 
      ? <AlertTriangle size={16} className="mr-2 text-amber-600" />
      : message.type === 'deadline'
        ? <Clock size={16} className="mr-2 text-red-600" />
        : message.type === 'tip'
          ? <Lightbulb size={16} className="mr-2 text-blue-600" />
          : null;
    
    return (
      <div 
        key={message.id} 
        className={`p-3 rounded-lg mb-3 ${messageStyles[message.role]} ${isSystem ? 'flex items-start' : ''}`}
      >
        {isSystem && systemIcon}
        <div>
          <p className="whitespace-pre-wrap">{message.content}</p>
          <p className="text-xs mt-1 text-gray-500 text-right">
            {message.timestamp.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <Card className={`w-full h-full flex flex-col ${className || ''}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Bot size={18} />
          <span>Asistente Virtual IA</span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearConversation}
          title="Reiniciar conversación"
          className="h-8 w-8 p-0"
        >
          <RefreshCw size={16} />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col p-3">
        {error && (
          <Alert className="mb-3 bg-red-50 border-red-200">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {typeof isAIEnabled === 'function' && !isAIEnabled() && (
          <Alert className="mb-3 bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-700">
              Las funcionalidades de IA no están habilitadas para esta empresa. Contacta con el administrador.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex-grow overflow-y-auto p-3 space-y-3">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="border-t p-3">
        <div className="w-full flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-grow resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isProcessingMessage || (typeof isAIEnabled === 'function' ? !isAIEnabled() : true)}
            rows={2}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isProcessingMessage || !input.trim() || (typeof isAIEnabled === 'function' ? !isAIEnabled() : true)}
            className="self-end"
          >
            {isProcessingMessage ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <Send size={16} className="mr-2" />
            )}
            Enviar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}