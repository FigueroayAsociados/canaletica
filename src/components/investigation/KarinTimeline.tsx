// src/components/investigation/KarinTimeline.tsx

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

interface KarinTimelineProps {
  report: any;
  onUpdateStage: (stage: string, notes: string) => Promise<void>;
}

export const KarinTimeline: React.FC<KarinTimelineProps> = ({
  report,
  onUpdateStage,
}) => {
  const { uid, isAdmin, isInvestigator } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  
  const canEdit = isAdmin || isInvestigator || uid === report?.assignedTo;
  
  // Calcular plazos de la Ley Karin
  useEffect(() => {
    if (report) {
      // Ley Karin tiene plazos específicos:
      // - 5 días hábiles para iniciar investigación tras recepción de denuncia 
      // - 30 días hábiles para concluir investigación (prorrogable una vez)
      
      const createdDate = report.createdAt?.toDate ? new Date(report.createdAt.toDate()) : new Date(report.createdAt);
      
      // Si ya hay una investigación iniciada, usar esa fecha para el cálculo de 30 días
      let investigationStartDate;
      if (report.karinProcess?.investigationStartDate) {
        investigationStartDate = new Date(report.karinProcess.investigationStartDate);
      } else {
        // Fecha límite para iniciar investigación: recepción + 5 días hábiles
        investigationStartDate = addBusinessDays(createdDate, 5);
      }
      
      const now = new Date();
      
      if (!report.karinProcess?.investigationStartDate) {
        // Estamos en la fase de inicio de investigación, calcular días para iniciar
        const businessDays = getBusinessDaysCount(now, investigationStartDate);
        setDaysRemaining(businessDays);
      } else {
        // Estamos en fase de desarrollo de investigación, calcular días para concluir
        const deadline = report.karinProcess?.investigationDeadline 
          ? new Date(report.karinProcess.investigationDeadline)
          : addBusinessDays(investigationStartDate, 30);
        
        const businessDays = getBusinessDaysCount(now, deadline);
        setDaysRemaining(businessDays);
      }
    }
  }, [report]);
  
  // Avanzar a la siguiente etapa del proceso
  const handleAdvanceStage = async (nextStage: string) => {
    if (!canEdit) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onUpdateStage(nextStage, notes);
      setNotes('');
    } catch (error) {
      console.error('Error al actualizar etapa:', error);
      setError('Error al actualizar la etapa del proceso');
    } finally {
      setLoading(false);
    }
  };
  
  // Convertir etapa a string legible
  const stageName = (stage: string): string => {
    const stages: {[key: string]: string} = {
      'orientation': 'Orientación',
      'complaint_filed': 'Interposición de Denuncia',
      'reception': 'Recepción de Denuncia',
      'precautionary_measures': 'Medidas Precautorias',
      'decision_to_investigate': 'Decisión de Investigar',
      'investigation': 'Investigación',
      'report_creation': 'Creación de Informe',
      'report_approval': 'Aprobación de Informe',
      'labor_department': 'Remisión a Dirección del Trabajo',
      'measures_adoption': 'Adopción de Medidas',
      'sanctions': 'Sanciones',
      'false_claim': 'Denuncia Falsa',
      'retaliation_review': 'Revisión de Represalias',
      'closed': 'Caso Cerrado'
    };
    
    return stages[stage] || stage;
  };
  
  // Determinar siguiente etapa según la etapa actual
  const getNextStage = (currentStage: string): string => {
    const stageFlow: {[key: string]: string} = {
      'orientation': 'complaint_filed',
      'complaint_filed': 'reception',
      'reception': 'precautionary_measures',
      'precautionary_measures': 'decision_to_investigate',
      'decision_to_investigate': 'investigation',
      'investigation': 'report_creation',
      'report_creation': 'report_approval',
      'report_approval': 'labor_department',
      'labor_department': 'measures_adoption',
      'measures_adoption': 'sanctions',
      'sanctions': 'closed'
    };
    
    return stageFlow[currentStage] || 'closed';
  };
  
  // Convertir timestamp o fecha en formato legible
  const formatDate = (date: any) => {
    if (!date) return 'No disponible';
    
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };
  
  // Verificar si es posible avanzar a la siguiente etapa
  const canAdvanceStage = (currentStage: string): boolean => {
    // Lógica para determinar si se puede avanzar según la etapa actual
    // Por ejemplo, no se puede avanzar a "Investigación" sin haber completado el plan
    
    if (currentStage === 'decision_to_investigate' && !report.plan) {
      return false;
    }
    
    if (currentStage === 'investigation' && (!report.interviews || report.interviews.length === 0)) {
      return false;
    }
    
    if (currentStage === 'report_creation' && (!report.findings || report.findings.length === 0)) {
      return false;
    }
    
    if (currentStage === 'report_approval' && !report.finalReport) {
      return false;
    }
    
    return true;
  };
  
  // Añadir días hábiles a una fecha (omitiendo fines de semana)
  function addBusinessDays(date: Date, days: number): Date {
    let result = new Date(date);
    let count = 0;
    
    while (count < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // No es sábado ni domingo
        count++;
      }
    }
    
    return result;
  }
  
  // Calcular número de días hábiles entre dos fechas
  function getBusinessDaysCount(startDate: Date, endDate: Date): number {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    
    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      curDate.setDate(curDate.getDate() + 1);
    }
    
    return count;
  }
  
  if (!report?.isKarinLaw) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              Este caso no está clasificado como un caso de Ley Karin.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Obtener la etapa actual del proceso
  const currentStage = report.karinProcess?.stage || 'orientation';
  const nextStage = getNextStage(currentStage);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Proceso Ley Karin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium">Etapa actual</p>
                <p className="text-base">{stageName(currentStage)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Plazo restante</p>
                <p className={`text-base ${daysRemaining && daysRemaining < 3 ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                  {daysRemaining !== null ? `${daysRemaining} día(s) hábil(es)` : 'Calculando...'}
                </p>
              </div>
            </div>
            
            {/* Alerta de plazo crítico */}
            {daysRemaining !== null && daysRemaining < 3 && (
              <Alert className="bg-red-50 border-red-200 mt-2">
                <AlertDescription className="text-red-800">
                  <strong>¡Alerta de plazo!</strong> Quedan menos de 3 días hábiles para cumplir con el plazo legal.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Historial de etapas */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Historial de etapas</h3>
              <div className="border-l-2 border-gray-200 pl-4 space-y-4">
                {report.karinProcess?.stageHistory?.map((history: any, index: number) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-6 mt-1.5 h-4 w-4 rounded-full bg-primary"></div>
                    <div>
                      <p className="text-sm font-medium">{stageName(history.stage)}</p>
                      <p className="text-xs text-gray-500">{formatDate(history.date)}</p>
                      {history.notes && (
                        <p className="text-xs text-gray-600 mt-1">{history.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Etapa actual */}
                <div className="relative">
                  <div className="absolute -left-6 mt-1.5 h-4 w-4 rounded-full bg-primary"></div>
                  <div>
                    <p className="text-sm font-medium">{stageName(currentStage)}</p>
                    <p className="text-xs text-gray-500">Etapa actual</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Acciones disponibles */}
            {canEdit && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium mb-3">Avanzar a la siguiente etapa</h3>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Siguiente etapa: {stageName(nextStage)}</p>
                    <textarea
                      placeholder="Notas sobre el cambio de etapa (opcional)"
                      className="w-full mt-2 p-2 border border-gray-300 rounded-md text-sm"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                  
                  {!canAdvanceStage(currentStage) && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertDescription className="text-yellow-800">
                        No es posible avanzar a la siguiente etapa hasta completar los requisitos actuales.
                        {currentStage === 'decision_to_investigate' && ' Debe crear un plan de investigación.'}
                        {currentStage === 'investigation' && ' Debe registrar al menos una entrevista.'}
                        {currentStage === 'report_creation' && ' Debe registrar al menos un hallazgo.'}
                        {currentStage === 'report_approval' && ' Debe crear el informe final.'}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={() => handleAdvanceStage(nextStage)}
                      disabled={loading || !canAdvanceStage(currentStage)}
                    >
                      {loading ? 'Procesando...' : `Avanzar a ${stageName(nextStage)}`}
                    </Button>
                  </div>
                  
                  {error && (
                    <p className="text-sm text-red-600 mt-2">{error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};