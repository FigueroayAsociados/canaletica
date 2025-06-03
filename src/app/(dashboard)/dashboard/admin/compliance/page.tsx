// src/app/(dashboard)/dashboard/admin/compliance/page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Mail,
  Clock,
  FileText
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { 
  useComplianceEnabled, 
  useEstadisticasCompliance,
  useConfigurarCompliance 
} from '@/lib/hooks/useCompliance';

export default function ComplianceAdminPage() {
  const { uid, isAdmin, profile } = useCurrentUser();
  const { companyId } = useCompany();
  const [config, setConfig] = useState({
    enabled: false,
    auto_evaluate: true,
    alert_levels: ['Crítica', 'Alta'] as ('Crítica' | 'Alta')[],
    notification_emails: ['']
  });

  // Hooks para datos
  const { data: isEnabled, isLoading: loadingEnabled } = useComplianceEnabled(companyId);
  const { data: stats, isLoading: loadingStats } = useEstadisticasCompliance(companyId);
  const configurarMutation = useConfigurarCompliance();

  React.useEffect(() => {
    if (isEnabled !== undefined) {
      setConfig(prev => ({ ...prev, enabled: isEnabled }));
    }
  }, [isEnabled]);

  const handleSaveConfig = async () => {
    try {
      await configurarMutation.mutateAsync({
        companyId,
        config: {
          ...config,
          notification_emails: config.notification_emails.filter(email => email.trim())
        }
      });
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  };

  const addEmailField = () => {
    setConfig(prev => ({
      ...prev,
      notification_emails: [...prev.notification_emails, '']
    }));
  };

  const updateEmail = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      notification_emails: prev.notification_emails.map((email, i) => 
        i === index ? value : email
      )
    }));
  };

  const removeEmail = (index: number) => {
    setConfig(prev => ({
      ...prev,
      notification_emails: prev.notification_emails.filter((_, i) => i !== index)
    }));
  };

  const toggleAlertLevel = (level: 'Crítica' | 'Alta') => {
    setConfig(prev => ({
      ...prev,
      alert_levels: prev.alert_levels.includes(level)
        ? prev.alert_levels.filter(l => l !== level)
        : [...prev.alert_levels, level]
    }));
  };

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No tiene permisos para acceder a esta página.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-blue-600" />
            Configuración de Compliance
          </h1>
          <p className="text-gray-600 mt-1">
            Configure el módulo de matriz de riesgos automática para su empresa
          </p>
        </div>
        
        <Badge 
          variant={config.enabled ? "default" : "secondary"}
          className={config.enabled ? "bg-green-100 text-green-800" : ""}
        >
          {config.enabled ? 'Habilitado' : 'Deshabilitado'}
        </Badge>
      </div>

      {/* Estado del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando estadísticas...</p>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.catalogo?.total_delitos || 15}
                </div>
                <div className="text-sm text-blue-800">Delitos en Catálogo</div>
                <div className="text-xs text-gray-600 mt-1">
                  {stats.catalogo?.categorias?.length || 8} categorías
                </div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.stats?.total_evaluaciones || 0}
                </div>
                <div className="text-sm text-green-800">Evaluaciones Realizadas</div>
                <div className="text-xs text-gray-600 mt-1">Este mes</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.stats?.por_urgencia?.Crítica || 0}
                </div>
                <div className="text-sm text-orange-800">Casos Críticos</div>
                <div className="text-xs text-gray-600 mt-1">Requieren atención</div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No se pudieron cargar las estadísticas del sistema.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuración Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Configuración del Módulo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Habilitar/Deshabilitar */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="text-base font-medium">
                Habilitar Módulo de Compliance
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Activa la evaluación automática de riesgos para todas las denuncias
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {config.enabled && (
            <>
              {/* Evaluación Automática */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_evaluate" className="text-base font-medium">
                    Evaluación Automática
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Evalúa automáticamente cada nueva denuncia al ser creada
                  </p>
                </div>
                <Switch
                  id="auto_evaluate"
                  checked={config.auto_evaluate}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_evaluate: checked }))}
                />
              </div>

              {/* Niveles de Alerta */}
              <div>
                <Label className="text-base font-medium">Niveles de Alerta Automática</Label>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                  Seleccione qué niveles de urgencia deben generar alertas automáticas
                </p>
                <div className="space-y-2">
                  {(['Crítica', 'Alta'] as const).map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`alert-${level}`}
                        checked={config.alert_levels.includes(level)}
                        onChange={() => toggleAlertLevel(level)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <Label htmlFor={`alert-${level}`} className="text-sm">
                        Urgencia {level}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emails de Notificación */}
              <div>
                <Label className="text-base font-medium flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Emails de Notificación
                </Label>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                  Emails que recibirán alertas automáticas de casos críticos
                </p>
                <div className="space-y-2">
                  {config.notification_emails.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="email@empresa.com"
                        className="flex-1"
                      />
                      {config.notification_emails.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeEmail(index)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEmailField}
                    className="mt-2"
                  >
                    Agregar Email
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Información del Catálogo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Información del Catálogo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Este sistema utiliza un catálogo de ejemplo con 15 delitos. 
              Para un sistema completo de producción, se debe implementar el catálogo completo con 
              los 269 delitos según la matriz de riesgos proporcionada.
            </AlertDescription>
          </Alert>
          
          {stats?.catalogo && (
            <div className="mt-4 space-y-2">
              <p className="text-sm">
                <strong>Delitos cargados:</strong> {stats.catalogo.total_delitos}
              </p>
              <p className="text-sm">
                <strong>Aplicables a personas jurídicas:</strong> {stats.catalogo.delitos_persona_juridica}
              </p>
              <p className="text-sm">
                <strong>Categorías disponibles:</strong> {stats.catalogo.categorias?.length || 0}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guardar Configuración */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveConfig}
          disabled={configurarMutation.isPending}
          className="flex items-center"
        >
          {configurarMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>

      {/* Errores */}
      {configurarMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {configurarMutation.error instanceof Error 
              ? configurarMutation.error.message 
              : 'Error guardando configuración'}
          </AlertDescription>
        </Alert>
      )}

      {/* Éxito */}
      {configurarMutation.isSuccess && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Configuración guardada correctamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}