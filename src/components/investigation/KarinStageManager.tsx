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
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    return formatChileanDate(dateObj);
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
                  <span className="ml-2">{formatDate(investigation.karinProcess?.stageStartDate)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Última actualización:</span>
                  <span className="ml-2">{formatDate(investigation.karinProcess?.lastUpdated)}</span>
                </div>
              </div>
            </div>

            {/* Verificación de requisitos */}
            {!canAdvanceStage() && (
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertDescription className="text-yellow-800">
                  <strong>Requisitos pendientes:</strong> Complete las tareas requeridas para esta etapa antes de continuar.
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