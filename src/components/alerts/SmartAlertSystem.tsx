'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, CheckCircle, Clock, AlertCircle, Lightbulb, RefreshCw, ArrowRight, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlerts } from '@/lib/hooks/useAlerts';
import { SmartAlert, AlertType } from '@/lib/services/alertService';
import { cn } from '@/lib/utils/cn';

interface SmartAlertSystemProps {
  className?: string;
  compact?: boolean;
  sidebarMode?: boolean;
  maxAlerts?: number;
}

export default function SmartAlertSystem({ 
  className, 
  compact = false, 
  sidebarMode = false,
  maxAlerts = 10
}: SmartAlertSystemProps) {
  const router = useRouter();
  const { 
    alerts, 
    unreadCount, 
    isLoading, 
    error, 
    lastRefreshed,
    fetchAlerts, 
    markAsViewed, 
    dismissAlert, 
    markAllAsViewed,
    areAlertsEnabled,
    generateAlerts
  } = useAlerts();
  
  const [activeType, setActiveType] = useState<string>('all');
  
  // Formatear fecha
  const formatDate = (date: Date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `hace ${diffHours} h`;
    } else if (diffDays < 7) {
      return `hace ${diffDays} d`;
    } else {
      return date.toLocaleDateString('es-CL');
    }
  };
  
  // Manejar acción de la alerta
  const handleAlertAction = (alert: SmartAlert) => {
    // Marcar como accionada
    if (alert.id) {
      markAsViewed(alert.id);
    }
    
    // Navegar si hay un link
    if (alert.actionLink) {
      router.push(alert.actionLink);
    }
  };
  
  // Filtrar alertas por tipo
  const filteredAlerts = alerts.filter(alert => 
    activeType === 'all' || alert.type === activeType
  ).slice(0, maxAlerts);
  
  // Actualizar inmediatamente las alertas vistas
  useEffect(() => {
    const markAlertsAsViewed = async () => {
      // Marcar como vistas todas las alertas mostradas que están en estado 'new'
      const newAlerts = filteredAlerts.filter(alert => alert.status === 'new');
      
      for (const alert of newAlerts) {
        if (alert.id) {
          await markAsViewed(alert.id);
        }
      }
    };
    
    if (filteredAlerts.some(alert => alert.status === 'new')) {
      markAlertsAsViewed();
    }
  }, [filteredAlerts, markAsViewed]);
  
  // Si la función no está habilitada, mostrar mensaje
  if (!areAlertsEnabled()) {
    if (compact) return null;
    
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>
            <Bell className="h-5 w-5 mr-2 inline-block" />
            Alertas Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-primary/40 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Funcionalidad no disponible</h3>
            <p className="text-gray-500">
              Las alertas inteligentes no están habilitadas para esta empresa.
              Contacta con el administrador para activar esta característica.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Versión compacta para el header
  if (compact) {
    return (
      <div className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="rounded-full w-9 h-9 p-0"
          onClick={() => router.push('/dashboard/alerts')}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </div>
    );
  }
  
  // Versión para barra lateral
  if (sidebarMode) {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium flex items-center text-sm">
            <Bell className="h-4 w-4 mr-2" />
            Alertas
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => fetchAlerts()}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500">
            <CheckCircle className="h-4 w-4 mx-auto mb-1" />
            <p>No hay alertas pendientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlerts.slice(0, 5).map(alert => (
              <div 
                key={alert.id} 
                className={cn(
                  "p-2 rounded-md cursor-pointer text-sm",
                  alert.urgency === 'high' ? 'bg-red-50 border border-red-100' :
                  alert.urgency === 'medium' ? 'bg-amber-50 border border-amber-100' :
                  'bg-blue-50 border border-blue-100'
                )}
                onClick={() => handleAlertAction(alert)}
              >
                <div className="font-medium">{alert.title}</div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-5 p-0 text-xs"
                >
                  {alert.actionText || 'Ver detalle'}
                </Button>
              </div>
            ))}
            
            {alerts.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => router.push('/dashboard/alerts')}
              >
                Ver todas ({alerts.length})
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Versión completa
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Alertas Inteligentes
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchAlerts()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar
            </Button>
            
            {/* Botón para demostración - generación de alertas */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateAlerts()}
              disabled={isLoading}
            >
              <Bell className="h-4 w-4 mr-2" />
              Generar alertas
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="all" value={activeType} onValueChange={setActiveType}>
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="deadline">Plazos</TabsTrigger>
            <TabsTrigger value="risk">Riesgos</TabsTrigger>
            <TabsTrigger value="pattern">Patrones</TabsTrigger>
            <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeType} className="mt-0">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No hay alertas {activeType !== 'all' ? `de tipo ${activeType}` : ''}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAction={handleAlertAction}
                    onDismiss={dismissAlert}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {lastRefreshed && (
          <div className="text-xs text-gray-500 mt-4 text-right">
            Última actualización: {formatDate(lastRefreshed)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de tarjeta de alerta
function AlertCard({ 
  alert, 
  onAction, 
  onDismiss 
}: { 
  alert: SmartAlert; 
  onAction: (alert: SmartAlert) => void;
  onDismiss: (alertId: string) => void;
}) {
  // Configuración basada en tipo de alerta
  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'deadline':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'risk':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'pattern':
        return <Bell className="h-5 w-5 text-purple-500" />;
      case 'compliance':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Configuración de estilo basada en urgencia
  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-amber-200 bg-amber-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };
  
  return (
    <div className={`p-4 rounded-lg border ${getUrgencyStyle(alert.urgency)}`}>
      <div className="flex justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getAlertIcon(alert.type)}
          </div>
          
          <div className="flex-grow">
            <h3 className="font-medium mb-1">
              {alert.title}
              <Badge variant="outline" className="ml-2 text-xs">
                {alert.urgency === 'high' ? 'Urgente' : 
                 alert.urgency === 'medium' ? 'Media' : 'Baja'}
              </Badge>
            </h3>
            
            <p className="text-sm text-gray-600">
              {alert.description}
            </p>
            
            {alert.actionRequired && (
              <div className="mt-3">
                <Button 
                  onClick={() => onAction(alert)}
                  size="sm"
                >
                  {alert.actionText || 'Ver detalle'}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Botón de descarte */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            if (alert.id) onDismiss(alert.id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}