'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { SubsanationForm } from './SubsanationForm';
import { AuthorityNotificationForm } from './AuthorityNotificationForm';
import { PrecautionaryMeasures } from './PrecautionaryMeasures';
import { updateKarinStage } from '@/lib/services/investigationService';
import { formatChileanDate } from '@/lib/utils/dateUtils';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

interface KarinStageManagerProps {
  investigation: any;
  canEdit: boolean;
  onStageUpdate: () => Promise<void>;
  userCompanyId: string;
}

export const KarinStageManager: React.FC<KarinStageManagerProps> = ({
  investigation,
  canEdit,
  onStageUpdate,
  userCompanyId
}) => {
  const { uid } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showSubsanation, setShowSubsanation] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrecautionary, setShowPrecautionary] = useState(false);

  const currentStage = investigation.karinProcess?.stage || 'complaint_filed';

  // Definir flujo de etapas
  const getNextStage = (current: string): string => {
    const flow: {[key: string]: string} = {
      'complaint_filed': 'reception',
      'reception': 'precautionary_measures',
      'subsanation': 'precautionary_measures',
      'precautionary_measures': 'decision_to_investigate',
      'decision_to_investigate': 'investigation',
      'investigation': 'report_creation',
      'report_creation': 'report_approval',
      'report_approval': 'dt_notification',
      'dt_notification': 'suseso_notification',
      'suseso_notification': 'investigation_complete',
      'investigation_complete': 'final_report',
      'final_report': 'dt_submission',
      'dt_submission': 'dt_resolution',
      'dt_resolution': 'measures_adoption',
      'measures_adoption': 'closed'
    };
    return flow[current] || 'closed';
  };

  const getStageName = (stage: string): string => {
    const stages: {[key: string]: string} = {
      'complaint_filed': 'Denuncia Interpuesta',
      'reception': 'Recepción de Denuncia',
      'subsanation': 'Subsanación',
      'precautionary_measures': 'Medidas Precautorias',
      'decision_to_investigate': 'Decisión de Investigar',
      'investigation': 'Investigación',
      'report_creation': 'Informe Preliminar',
      'report_approval': 'Revisión Interna',
      'dt_notification': 'Notificación a DT',
      'suseso_notification': 'Notificación SUSESO',
      'investigation_complete': 'Investigación Completa',
      'final_report': 'Informe Final',
      'dt_submission': 'Envío a DT',
      'dt_resolution': 'Resolución DT',
      'measures_adoption': 'Adopción de Medidas',
      'closed': 'Caso Cerrado'
    };
    return stages[stage] || stage;
  };

  const getStageDescription = (stage: string): string => {
    const descriptions: {[key: string]: string} = {
      'complaint_filed': 'Denuncia ha sido interpuesta y registrada en el sistema.',
      'reception': 'Verificar completitud de la denuncia y decidir si requiere subsanación.',
      'subsanation': 'Solicitar información adicional o correcciones al denunciante.',
      'precautionary_measures': 'Evaluar y aplicar medidas de protección inmediatas si es necesario.',
      'decision_to_investigate': 'Decidir si procede la investigación y crear plan.',
      'investigation': 'Ejecutar el plan de investigación: entrevistas, análisis de evidencias.',
      'report_creation': 'Crear informe preliminar con hallazgos iniciales.',
      'report_approval': 'Revisión interna del informe preliminar.',
      'dt_notification': 'Notificar formalmente a la Dirección del Trabajo.',
      'suseso_notification': 'Notificar a SUSESO o Mutualidad según corresponda.',
      'investigation_complete': 'Investigación completada, preparar informe final.',
      'final_report': 'Crear informe final con conclusiones y recomendaciones.',
      'dt_submission': 'Envío formal del expediente a la Dirección del Trabajo.',
      'dt_resolution': 'Esperar resolución de la Dirección del Trabajo.',
      'measures_adoption': 'Implementar medidas ordenadas por la DT.',
      'closed': 'Caso cerrado y archivado.'
    };
    return descriptions[stage] || 'Etapa del proceso Ley Karin.';
  };

  const canAdvanceStage = (): boolean => {
    // Verificar requisitos según la etapa actual
    switch (currentStage) {
      case 'reception':
        return investigation.karinProcess?.informedRights === true;
      case 'subsanation':
        return investigation.karinProcess?.subsanationReceived === true;
      case 'precautionary_measures':
        return investigation.karinProcess?.precautionaryMeasures?.length > 0;
      case 'decision_to_investigate':
        return !!investigation.plan;
      case 'investigation':
        return investigation.interviews?.length > 0 && 
               investigation.karinProcess?.testimonies?.every((t: any) => t.hasSigned === true);
      case 'report_creation':
        return !!investigation.preliminaryReport;
      case 'report_approval':
        return investigation.karinProcess?.reportApproved === true;
      case 'dt_notification':
        return !!investigation.karinProcess?.dtInitialNotificationDate;
      case 'suseso_notification':
        return !!investigation.karinProcess?.susesoNotificationDate;
      case 'investigation_complete':
        return investigation.karinProcess?.investigationCompleted === true;
      case 'final_report':
        return !!investigation.finalReport;
      default:
        return true;
    }
  };

  const getRequiredTasks = () => {
    const tasks = [];
    
    switch (currentStage) {
      case 'reception':
        if (!investigation.karinProcess?.informedRights) {
          tasks.push({
            description: 'Marcar que se informó al trabajador sobre sus derechos legales',
            actionButton: {
              label: 'Marcar como Informado',
              onClick: () => markRightsInformed()
            }
          });
        }
        break;
        
      case 'precautionary_measures':
        if (!investigation.karinProcess?.precautionaryMeasures?.length) {
          tasks.push({
            description: 'Definir e implementar medidas precautorias',
            actionButton: {
              label: 'Gestionar Medidas',
              onClick: () => handleAlternativeAction('precautionary')
            }
          });
        }
        break;
        
      case 'decision_to_investigate':
        if (!investigation.plan) {
          tasks.push({
            description: 'Crear un plan de investigación detallado',
            actionButton: {
              label: 'Ir a Plan',
              onClick: () => window.open(`/dashboard/investigation/${investigation.id}?tab=plan`, '_blank')
            }
          });
        }
        break;
        
      case 'investigation':
        if (!investigation.interviews?.length) {
          tasks.push({
            description: 'Registrar al menos una entrevista',
            actionButton: {
              label: 'Ir a Entrevistas',
              onClick: () => window.open(`/dashboard/investigation/${investigation.id}?tab=interviews`, '_blank')
            }
          });
        }
        if (investigation.karinProcess?.testimonies?.some((t: any) => !t.hasSigned)) {
          tasks.push({
            description: 'Firmar todos los testimonios pendientes',
            actionButton: {
              label: 'Ver Testimonios',
              onClick: () => window.open(`/dashboard/investigation/${investigation.id}?tab=interviews`, '_blank')
            }
          });
        }
        break;
        
      case 'dt_notification':
        if (!investigation.karinProcess?.dtInitialNotificationDate) {
          tasks.push({
            description: 'Notificar formalmente a la Dirección del Trabajo',
            actionButton: {
              label: 'Gestionar Notificación',
              onClick: () => handleAlternativeAction('notifications')
            }
          });
        }
        break;
        
      case 'suseso_notification':
        if (!investigation.karinProcess?.susesoNotificationDate) {
          tasks.push({
            description: 'Notificar a SUSESO o Mutualidad',
            actionButton: {
              label: 'Gestionar Notificación',
              onClick: () => handleAlternativeAction('notifications')
            }
          });
        }
        break;
        
      case 'report_creation':
        if (!investigation.preliminaryReport) {
          tasks.push({
            description: 'Crear informe preliminar con hallazgos',
            actionButton: {
              label: 'Ir a Informe',
              onClick: () => window.open(`/dashboard/investigation/${investigation.id}?tab=report`, '_blank')
            }
          });
        }
        break;
        
      case 'final_report':
        if (!investigation.finalReport) {
          tasks.push({
            description: 'Crear informe final con conclusiones',
            actionButton: {
              label: 'Ir a Informe Final',
              onClick: () => window.open(`/dashboard/investigation/${investigation.id}?tab=report`, '_blank')
            }
          });
        }
        break;
    }
    
    return tasks;
  };

  const markRightsInformed = async () => {
    if (!canEdit) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Actualizar el campo informedRights en karinProcess
      const { updateInvestigation } = await import('@/lib/services/investigationService');
      
      await updateInvestigation(userCompanyId, investigation.id, {
        'karinProcess.informedRights': true,
        'karinProcess.rightsInformedDate': new Date().toISOString(),
        'karinProcess.rightsInformedBy': uid
      });
      
      // Recargar datos
      await onStageUpdate();
    } catch (error) {
      console.error('Error al marcar derechos:', error);
      setError('Error al marcar derechos como informados');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStage = async () => {
    if (!canEdit || !canAdvanceStage()) return;

    setLoading(true);
    setError(null);

    try {
      const nextStage = getNextStage(currentStage);
      await updateKarinStage(userCompanyId, investigation.id, uid, nextStage, notes);
      setNotes('');
      await onStageUpdate();
    } catch (error) {
      console.error('Error al avanzar etapa:', error);
      setError('Error al avanzar a la siguiente etapa');
    } finally {
      setLoading(false);
    }
  };

  const handleAlternativeAction = (action: string) => {
    switch (action) {
      case 'subsanation':
        setShowSubsanation(true);
        break;
      case 'notifications':
        setShowNotifications(true);
        break;
      case 'precautionary':
        setShowPrecautionary(true);
        break;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'No disponible';
    
    try {
      // Si es un Timestamp de Firebase
      if (date.toDate && typeof date.toDate === 'function') {
        return formatChileanDate(date.toDate());
      }
      
      // Si es un string ISO o cualquier otro formato válido
      const dateObj = new Date(date);
      
      // Verificar que la fecha sea válida
      if (isNaN(dateObj.getTime())) {
        return 'Fecha inválida';
      }
      
      return formatChileanDate(dateObj);
    } catch (error) {
      console.error('Error al formatear fecha:', error, date);
      return 'Error en fecha';
    }
  };

  // Obtener fecha de inicio de la etapa actual
  const getCurrentStageStartDate = () => {
    if (!investigation.karinProcess) return null;
    
    // Buscar la fecha específica de la etapa actual
    const stageProperty = `${currentStage}Date`;
    if (investigation.karinProcess[stageProperty]) {
      return investigation.karinProcess[stageProperty];
    }
    
    // Si no existe, buscar en el historial de etapas
    const stageHistory = investigation.karinProcess.stageHistory || [];
    const currentStageEntry = stageHistory.find(entry => entry.stage === currentStage);
    if (currentStageEntry) {
      return currentStageEntry.date;
    }
    
    // Fallback: usar la fecha de creación si es la primera etapa
    if (currentStage === 'complaint_filed' || currentStage === 'reception') {
      return investigation.createdAt;
    }
    
    return null;
  };

  // Obtener fecha de última actualización
  const getLastUpdateDate = () => {
    if (!investigation.karinProcess) return investigation.updatedAt || investigation.createdAt;
    
    // Buscar la entrada más reciente en el historial
    const stageHistory = investigation.karinProcess.stageHistory || [];
    if (stageHistory.length > 0) {
      return stageHistory[stageHistory.length - 1].date;
    }
    
    // Fallback: fecha general de actualización
    return investigation.updatedAt || investigation.createdAt;
  };

  return (
    <div className="space-y-6">
      {/* Etapa actual */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Etapa Actual</span>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              {getStageName(currentStage)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">{getStageDescription(currentStage)}</p>
            
            {/* Información de la etapa actual */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Información de la Etapa</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Fecha de inicio:</span>
                  <span className="ml-2">{formatDate(getCurrentStageStartDate())}</span>
                </div>
                <div>
                  <span className="text-gray-500">Última actualización:</span>
                  <span className="ml-2">{formatDate(getLastUpdateDate())}</span>
                </div>
              </div>
            </div>

            {/* Verificación de requisitos con guía interactiva */}
            {!canAdvanceStage() && (
              <Alert className="border-blue-300 bg-blue-50">
                <AlertDescription className="text-blue-800">
                  <strong>📋 Tareas pendientes para avanzar:</strong>
                  <div className="mt-3">
                    {getRequiredTasks().map((task, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border border-blue-200 mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">{task.description}</span>
                        </div>
                        {task.actionButton && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={task.actionButton.onClick}
                            className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                          >
                            {task.actionButton.label}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Acciones específicas por etapa */}
      {currentStage === 'reception' && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones de Recepción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => handleAlternativeAction('subsanation')}
              disabled={!canEdit}
            >
              Solicitar Subsanación
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleAlternativeAction('notifications')}
              disabled={!canEdit}
            >
              Gestionar Notificaciones
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStage === 'precautionary_measures' && (
        <Card>
          <CardHeader>
            <CardTitle>Medidas Precautorias</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => handleAlternativeAction('precautionary')}
              disabled={!canEdit}
            >
              Gestionar Medidas Precautorias
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Control de avance */}
      {canEdit && currentStage !== 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle>Avanzar Etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Notas del avance (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describa las acciones realizadas o comentarios sobre el avance..."
                rows={3}
                className="mt-1"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Siguiente etapa: <strong>{getStageName(getNextStage(currentStage))}</strong>
              </div>
              <Button
                onClick={handleAdvanceStage}
                disabled={loading || !canAdvanceStage()}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Procesando...' : 'Avanzar Etapa'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modales para acciones específicas */}
      {showSubsanation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Gestión de Subsanación</h3>
                <Button variant="outline" onClick={() => setShowSubsanation(false)}>
                  Cerrar
                </Button>
              </div>
              <SubsanationForm
                report={investigation}
                companyId={userCompanyId}
                onUpdate={async () => {
                  await onStageUpdate();
                  setShowSubsanation(false);
                }}
                readOnly={!canEdit}
              />
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Notificaciones a Autoridades</h3>
                <Button variant="outline" onClick={() => setShowNotifications(false)}>
                  Cerrar
                </Button>
              </div>
              <AuthorityNotificationForm
                report={investigation}
                companyId={userCompanyId}
                onUpdate={async () => {
                  await onStageUpdate();
                  setShowNotifications(false);
                }}
                readOnly={!canEdit}
              />
            </div>
          </div>
        </div>
      )}

      {showPrecautionary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Medidas Precautorias</h3>
                <Button variant="outline" onClick={() => setShowPrecautionary(false)}>
                  Cerrar
                </Button>
              </div>
              <PrecautionaryMeasures
                reportId={investigation.id}
                companyId={userCompanyId}
                existingMeasures={investigation.karinProcess?.precautionaryMeasures || []}
                onSuccess={async () => {
                  await onStageUpdate();
                  setShowPrecautionary(false);
                }}
                onClose={() => setShowPrecautionary(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};