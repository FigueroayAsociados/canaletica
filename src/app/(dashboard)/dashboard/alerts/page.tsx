'use client';

import React from 'react';
import SmartAlertSystem from '@/components/alerts/SmartAlertSystem';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, InfoIcon } from 'lucide-react';

export default function AlertsPage() {
  const { profile } = useCurrentUser();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Centro de Alertas</h1>
      </div>
      
      <Alert className="bg-blue-50 border-blue-200">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          El sistema de alertas inteligentes analiza continuamente los datos de la plataforma para identificar situaciones que requieren atención, como plazos próximos a vencer, patrones emergentes o posibles riesgos.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SmartAlertSystem maxAlerts={50} />
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Bell className="h-4 w-4 mr-2" />
                Acerca de las Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="mb-4">
                Las alertas inteligentes son notificaciones generadas automáticamente por el sistema 
                para ayudarte a estar al tanto de situaciones importantes que requieren atención.
              </p>
              
              <h3 className="font-medium mb-2">Tipos de alertas:</h3>
              <ul className="list-disc list-inside space-y-1 mb-4">
                <li><span className="font-medium">Plazos:</span> Notificaciones sobre fechas límite próximas</li>
                <li><span className="font-medium">Riesgos:</span> Advertencias sobre potenciales problemas</li>
                <li><span className="font-medium">Patrones:</span> Tendencias detectadas en los datos</li>
                <li><span className="font-medium">Cumplimiento:</span> Recordatorios de obligaciones normativas</li>
              </ul>
              
              <h3 className="font-medium mb-2">Niveles de urgencia:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-medium text-red-600">Alta:</span> Requiere atención inmediata</li>
                <li><span className="font-medium text-amber-600">Media:</span> Debe ser atendida pronto</li>
                <li><span className="font-medium text-blue-600">Baja:</span> Informativa o sugerencia</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <InfoIcon className="h-4 w-4 mr-2" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>
                Las alertas son personalizadas para tu rol y responsabilidades.
                Puedes gestionarlas de las siguientes formas:
              </p>
              
              <ul className="list-disc list-inside space-y-1 mt-3">
                <li>Accionar sobre ellas siguiendo las instrucciones</li>
                <li>Descartar las que ya no son relevantes</li>
                <li>Ver todas en esta página central</li>
              </ul>
              
              <p className="mt-3">
                Las alertas urgentes también se mostrarán en tu tablero principal
                para asegurar que no pases por alto información crítica.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}