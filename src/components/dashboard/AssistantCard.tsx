'use client';

import React from 'react';
import ConversationalAssistant from '@/components/ai/ConversationalAssistant';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

interface AssistantCardProps {
  className?: string;
}

export default function AssistantCard({ className }: AssistantCardProps) {
  const { profile } = useCurrentUser();
  const { isEnabled } = useFeatureFlags();

  // Determinar el rol del usuario para el asistente
  const getUserRole = () => {
    if (profile?.role === 'super_admin') return 'super_admin';
    if (profile?.role === 'admin') return 'admin';
    return 'investigator';
  };

  // Contexto básico para el dashboard
  const assistantContext = {
    currentModule: 'dashboard',
  };

  // Manejar respuesta del asistente (opcional)
  const handleAssistantResponse = (message: string) => {
    console.log('Respuesta del asistente:', message);
  };

  // Verificar si el asistente conversacional está habilitado
  const isAssistantEnabled = () => {
    return isEnabled('aiEnabled') && isEnabled('conversationalAssistantEnabled');
  };

  // Si el asistente no está habilitado, mostrar un mensaje alternativo
  if (!isAssistantEnabled()) {
    return (
      <Card className={`${className || ''} h-full overflow-hidden`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Bot size={18} />
            <span>Asistente Virtual IA</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100%-54px)]">
          <div className="text-center p-6">
            <p className="text-gray-500 mb-2">Asistente virtual no disponible</p>
            <p className="text-sm text-gray-400">Contacta al administrador para activar esta funcionalidad.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className || ''} h-full overflow-hidden`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Bot size={18} />
          <span>Asistente Virtual IA</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-54px)]">
        <ConversationalAssistant
          userRole={getUserRole()}
          userName={profile?.displayName || undefined}
          context={assistantContext}
          onAssistantResponse={handleAssistantResponse}
          className="border-0 shadow-none"
        />
      </CardContent>
    </Card>
  );
}