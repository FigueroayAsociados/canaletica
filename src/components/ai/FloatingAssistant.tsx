'use client';

import React, { useState, useEffect } from 'react';
import { Bot, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConversationalAssistant from './ConversationalAssistant';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { usePathname } from 'next/navigation';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState<any>({});
  const { profile } = useCurrentUser();
  const pathname = usePathname();
  const { isEnabled } = useFeatureFlags();

  // Determinar el rol del usuario para el asistente
  const getUserRole = () => {
    if (profile?.role === 'super_admin') return 'super_admin';
    if (profile?.role === 'admin') return 'admin';
    return 'investigator';
  };

  // Actualizar el contexto basado en la ruta actual
  useEffect(() => {
    const newContext: any = {
      currentModule: getCurrentModule(pathname)
    };

    // Si estamos en una página de denuncia específica, añadir el ID
    if (pathname.includes('/reports/') || pathname.includes('/investigation/')) {
      const segments = pathname.split('/');
      const reportId = segments[segments.length - 1];
      if (reportId && reportId !== 'page' && reportId !== 'edit') {
        newContext.reportId = reportId;
      }
    }

    // Determinar si es un caso de Ley Karin basado en la ruta
    if (pathname.includes('/ley-karin')) {
      newContext.caseType = 'ley_karin';
    }

    setAssistantContext(newContext);
  }, [pathname]);

  // Obtener el módulo actual basado en la ruta
  const getCurrentModule = (path: string) => {
    if (path.includes('/investigation')) return 'investigation';
    if (path.includes('/reports')) return 'report';
    if (path.includes('/follow-up')) return 'follow-up';
    if (path.includes('/karin')) return 'karin';
    return 'dashboard';
  };

  // Manejar respuesta del asistente (por si queremos realizar acciones basadas en ella)
  const handleAssistantResponse = (message: string) => {
    // Opcional: realizar acciones basadas en la respuesta
    console.log('Respuesta del asistente:', message);
  };

  // Verificar si el asistente conversacional está habilitado
  const isAssistantEnabled = () => {
    return isEnabled('aiEnabled') && isEnabled('conversationalAssistantEnabled');
  };

  // Si el asistente no está habilitado, no mostrar nada
  if (!isAssistantEnabled()) {
    return null;
  }

  return (
    <>
      {/* Botón flotante para abrir el asistente */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 bottom-6 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Bot size={24} />
        </Button>
      )}

      {/* Panel del asistente cuando está abierto */}
      {isOpen && (
        <div className="fixed right-6 bottom-6 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden z-50">
          <div className="absolute top-2 right-2">
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
            >
              <XIcon size={16} />
            </Button>
          </div>

          <div className="flex-grow">
            <ConversationalAssistant
              userRole={getUserRole()}
              userName={profile?.displayName || undefined}
              context={assistantContext}
              onAssistantResponse={handleAssistantResponse}
            />
          </div>
        </div>
      )}
    </>
  );
}