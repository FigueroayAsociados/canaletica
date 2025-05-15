// src/components/investigation/KarinTimeline.tsx

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { 
  addBusinessDays, 
  getBusinessDaysCount, 
  isChileanHoliday, 
  formatChileanDate,
  BusinessDayType
} from '@/lib/utils/dateUtils';

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
      const now = new Date();
      const createdDate = report.createdAt?.toDate ? new Date(report.createdAt.toDate()) : new Date(report.createdAt);
      const currentStage = report.karinProcess?.stage || 'complaint_filed';
      
      // Determinación de plazos según la etapa actual
      switch (currentStage) {
        case 'reception':
          // Plazo para notificar a DT: 3 días hábiles desde recepción
          const receptionDate = report.karinProcess?.receivedDate 
            ? new Date(report.karinProcess.receivedDate) 
            : createdDate;
          const dtNotificationDeadline = addBusinessDays(receptionDate, 3, BusinessDayType.ADMINISTRATIVE);
          setDaysRemaining(getBusinessDaysCount(now, dtNotificationDeadline, BusinessDayType.ADMINISTRATIVE));
          break;
          
        case 'subsanation':
          // Plazo para subsanar: 5 días hábiles desde solicitud
          if (report.karinProcess?.subsanationRequested) {
            const subsanationRequestDate = new Date(report.karinProcess.subsanationRequested);
            const subsanationDeadline = addBusinessDays(subsanationRequestDate, 5, BusinessDayType.ADMINISTRATIVE);
            setDaysRemaining(getBusinessDaysCount(now, subsanationDeadline, BusinessDayType.ADMINISTRATIVE));
          }
          break;
          
        case 'dt_notification':
          // Plazo para notificar a DT: 3 días hábiles desde recepción
          const dtReceptionDate = report.karinProcess?.receivedDate 
            ? new Date(report.karinProcess.receivedDate) 
            : createdDate;
          const dtDeadline = addBusinessDays(dtReceptionDate, 3, BusinessDayType.ADMINISTRATIVE);
          setDaysRemaining(getBusinessDaysCount(now, dtDeadline, BusinessDayType.ADMINISTRATIVE));
          break;
          
        case 'suseso_notification':
          // Plazo para notificar a SUSESO: 5 días hábiles desde conocimiento
          const susesoReceptionDate = report.karinProcess?.receivedDate 
            ? new Date(report.karinProcess.receivedDate) 
            : createdDate;
          const susesoDeadline = addBusinessDays(susesoReceptionDate, 5, BusinessDayType.ADMINISTRATIVE);
          setDaysRemaining(getBusinessDaysCount(now, susesoDeadline, BusinessDayType.ADMINISTRATIVE));
          break;
          
        case 'precautionary_measures':
          // Plazo para medidas precautorias: 3 días hábiles desde recepción
          const precautionaryReceptionDate = report.karinProcess?.receivedDate 
            ? new Date(report.karinProcess.receivedDate) 
            : createdDate;
          const precautionaryDeadline = addBusinessDays(precautionaryReceptionDate, 3, BusinessDayType.ADMINISTRATIVE);
          setDaysRemaining(getBusinessDaysCount(now, precautionaryDeadline, BusinessDayType.ADMINISTRATIVE));
          break;
          
        case 'investigation':
          // Plazo para investigación: 30 días hábiles (prorrogable una vez)
          // Para Ley Karin utilizamos días hábiles administrativos (lunes a viernes)
          let investigationStartDate;
          if (report.karinProcess?.investigationStartDate) {
            investigationStartDate = new Date(report.karinProcess.investigationStartDate);
          } else {
            // Fecha estimada de inicio
            investigationStartDate = report.karinProcess?.decisionToInvestigateDate
              ? new Date(report.karinProcess.decisionToInvestigateDate)
              : addBusinessDays(createdDate, 5, BusinessDayType.ADMINISTRATIVE);
          }
          
          // Considerar prórroga si existe
          const investigationDeadline = report.karinProcess?.investigationDeadline 
            ? new Date(report.karinProcess.investigationDeadline)
            : report.karinProcess?.investigationExtensionDate
              ? addBusinessDays(investigationStartDate, 60, BusinessDayType.ADMINISTRATIVE) // Con prórroga: 60 días
              : addBusinessDays(investigationStartDate, 30, BusinessDayType.ADMINISTRATIVE); // Sin prórroga: 30 días
          
          setDaysRemaining(getBusinessDaysCount(now, investigationDeadline, BusinessDayType.ADMINISTRATIVE));
          break;
          
        case 'labor_department':
          // Plazo para enviar a DT: 2 días hábiles desde finalización informe
          const reportApprovalDate = report.karinProcess?.reportApprovalDate
            ? new Date(report.karinProcess.reportApprovalDate)
            : now;
          const laborDeptDeadline = addBusinessDays(reportApprovalDate, 2, BusinessDayType.ADMINISTRATIVE);
          setDaysRemaining(getBusinessDaysCount(now, laborDeptDeadline, BusinessDayType.ADMINISTRATIVE));
          break;
          
        case 'dt_resolution':
          // Plazo para resolución DT: 30 días hábiles desde remisión
          const referralDate = report.karinProcess?.laborDepartmentReferralDate
            ? new Date(report.karinProcess.laborDepartmentReferralDate)
            : now;
          const dtResolutionDeadline = addBusinessDays(referralDate, 30, BusinessDayType.ADMINISTRATIVE);
          setDaysRemaining(getBusinessDaysCount(now, dtResolutionDeadline, BusinessDayType.ADMINISTRATIVE));
          break;
          
        case 'measures_adoption':
          // Plazo para implementar medidas: 15 días CORRIDOS (no hábiles)
          const dtResponseDate = report.karinProcess?.laborDepartmentResponseDate
            ? new Date(report.karinProcess.laborDepartmentResponseDate)
            : now;
          
          // Añadir 15 días calendario (no hábiles)
          let measuresDeadline = new Date(dtResponseDate);
          measuresDeadline.setDate(measuresDeadline.getDate() + 15);
          
          // Calcular días calendario restantes
          const timeDiff = measuresDeadline.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
          setDaysRemaining(daysRemaining);
          break;
          
        default:
          // Para otras etapas, no mostrar plazos específicos
          setDaysRemaining(null);
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
      'complaint_filed': 'Interposición de Denuncia',
      'reception': 'Recepción de Denuncia',
      'subsanation': 'Subsanación de Denuncia',
      'dt_notification': 'Notificación a DT',
      'suseso_notification': 'Notificación a SUSESO/Mutualidad',
      'precautionary_measures': 'Medidas Precautorias',
      'decision_to_investigate': 'Decisión de Investigar',
      'investigation': 'Investigación',
      'report_creation': 'Creación Informe Preliminar', 
      'report_approval': 'Revisión Interna del Informe',
      'investigation_complete': 'Investigación Completa',
      'final_report': 'Creación Informe Final',
      'dt_submission': 'Envío Formal a DT (2 días)',
      'dt_resolution': 'Resolución de la DT (30 días)',
      'measures_adoption': 'Adopción de Medidas (15 días)',
      'sanctions': 'Sanciones',
      'false_claim': 'Denuncia Falsa',
      'retaliation_review': 'Revisión de Represalias',
      'third_party': 'Caso con Terceros',
      'subcontracting': 'Régimen de Subcontratación',
      'closed': 'Caso Cerrado',
      // Mapear valores antiguos por compatibilidad
      'orientation': 'Interposición de Denuncia', // Valor antiguo mapeado a etapa actual
      'preliminaryReport': 'Creación Informe Preliminar', // Valor antiguo mapeado a etapa actual
      'labor_department': 'Investigación Completa' // Para compatibilidad con casos existentes
    };
    
    return stages[stage] || stage;
  };
  
  // Determinar siguiente etapa según la etapa actual
  const getNextStage = (currentStage: string): string => {
    // Manejar etapas antiguas mapeándolas a las nuevas
    let mappedStage = currentStage;
    if (currentStage === 'orientation') {
      mappedStage = 'complaint_filed';
    } else if (currentStage === 'preliminaryReport') {
      mappedStage = 'report_creation';
    }
    
    // Flujo principal actualizado según plazos de Ley Karin y requisitos legales
    const mainFlow: {[key: string]: string} = {
      'complaint_filed': 'reception',                 // Etapa 1: Interposición de Denuncia
      'reception': 'precautionary_measures',          // Etapa 2: Recepción -> Etapa 3: Medidas Precautorias
      'precautionary_measures': 'decision_to_investigate', // Etapa 3: Medidas -> Etapa 4: Decisión de Investigar
      'decision_to_investigate': 'investigation',     // Etapa 4: Decisión -> Etapa 5: Investigación
      'investigation': 'report_creation',             // Etapa 5: Investigación -> Etapa 6: Informe preliminar
      'report_creation': 'report_approval',           // Etapa 6: Creación Informe -> Etapa 7: Revisión Interna
      'report_approval': 'dt_notification',           // Etapa 7: Revisión Interna -> Etapa 8: Notificación a DT
      'dt_notification': 'suseso_notification',       // Etapa 8: Notificación DT -> Etapa 9: Notificación SUSESO
      'suseso_notification': 'investigation_complete', // Etapa 9: Notificación SUSESO -> Etapa 10: Investigación Completa
      'investigation_complete': 'final_report',       // Etapa 10: Investigación Completa -> Etapa 11: Informe Final
      'final_report': 'dt_submission',                // Etapa 11: Informe Final -> Etapa 12: Envío a DT
      'dt_submission': 'dt_resolution',               // Etapa 12: Envío a DT -> Etapa 13: Resolución DT
      'dt_resolution': 'measures_adoption',           // Etapa 13: Resolución DT -> Etapa 14: Adopción Medidas
      'measures_adoption': 'sanctions',               // Etapa 14: Adopción Medidas -> Etapa 15: Sanciones
      'sanctions': 'closed'                           // Etapa 15: Sanciones -> Cierre
    };
    
    // Flujos alternativos según condiciones del caso
    const alternativeFlows: {[key: string]: {condition: boolean, nextStage: string}[]} = {
      'reception': [
        // Si requiere subsanación, ir a etapa de subsanación (plazo 5 días)
        { condition: !!report.karinProcess?.requiresSubsanation, nextStage: 'subsanation' },
      ],
      'subsanation': [
        // Volver al flujo principal después de subsanación
        { condition: true, nextStage: 'precautionary_measures' },
      ],
    };
    
    // Verificar si hay un flujo alternativo aplicable
    if (mappedStage in alternativeFlows) {
      for (const {condition, nextStage} of alternativeFlows[mappedStage]) {
        if (condition) {
          return nextStage;
        }
      }
    }
    
    // Si no hay flujo alternativo, seguir el flujo principal
    return mainFlow[mappedStage] || 'closed';
  };
  
  // Convertir timestamp o fecha en formato legible
  const formatDate = (date: any) => {
    if (!date) return 'No disponible';
    
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    
    return formatChileanDate(dateObj);
  };
  
  // Verificar si es posible avanzar a la siguiente etapa
  const canAdvanceStage = (currentStage: string): boolean => {
    // Lógica para determinar si se puede avanzar según la etapa actual y los requerimientos legales
    
    // Etapa de recepción - Verificar que esté toda la información necesaria
    if (currentStage === 'reception') {
      // Si requiere subsanación, no puede avanzar sin marcar que requiere subsanar
      if (report.karinProcess?.requiresSubsanation === undefined) {
        return false;
      }
      
      // Verificar si se ha informado a la víctima sobre sus derechos
      if (report.karinProcess?.informedRights !== true) {
        return false;
      }
    }
    
    // Etapa de subsanación - Verificar que se haya recibido la subsanación
    if (currentStage === 'subsanation' && !report.karinProcess?.subsanationReceived) {
      return false;
    }
    
    // Notificación a DT - Verificar que se haya notificado
    if (currentStage === 'dt_notification' && !report.karinProcess?.dtInitialNotificationDate) {
      return false;
    }
    
    // Notificación a SUSESO - Verificar que se haya notificado
    if (currentStage === 'suseso_notification' && !report.karinProcess?.susesoNotificationDate) {
      return false;
    }
    
    // Medidas precautorias - Verificar que se hayan implementado las medidas
    if (currentStage === 'precautionary_measures' && 
        (!report.karinProcess?.precautionaryMeasures || 
         report.karinProcess.precautionaryMeasures.length === 0 || 
         !report.karinProcess?.precautionaryAppliedDate)) {
      return false;
    }
    
    // Decisión de investigar - Verificar el plan
    if (currentStage === 'decision_to_investigate' && !report.plan) {
      return false;
    }
    
    // Investigación - Verificar entrevistas y testimonios
    if (currentStage === 'investigation') {
      // Verificar si hay entrevistas registradas
      if (!report.interviews || report.interviews.length === 0) {
        return false;
      }
      
      // Verificar si los testimonios están firmados
      const allTestimoniesSigned = report.karinProcess?.testimonies?.every(t => t.hasSigned === true);
      if (!allTestimoniesSigned) {
        return false;
      }
      
      // Verificar si se informó sobre derechos a denuncia penal cuando corresponde
      if (report.isAbuseCase && report.karinProcess?.rightsToCriminalReport !== true) {
        return false;
      }
    }
    
    // Creación de informe - Verificar hallazgos
    if (currentStage === 'report_creation' && (!report.findings || report.findings.length === 0)) {
      return false;
    }
    
    // Aprobación de informe preliminar - Verificar informe preliminar
    if (currentStage === 'report_approval' && !report.preliminaryReport) {
      return false;
    }
    
    // Investigación completa - Verificar que se completó la investigación
    if ((currentStage === 'investigation_complete' || currentStage === 'labor_department') && 
        !report.karinProcess?.investigationCompleted) {
      return false;
    }
    
    // Informe Final - Verificar que existe el informe final
    if (currentStage === 'final_report' && !report.finalReport) {
      return false;
    }
    
    // Envío a DT - Verificar envío completo
    if (currentStage === 'dt_submission' && !report.karinProcess?.laborDepartmentReferralCompleteFile) {
      return false;
    }
    
    // Resolución DT - Verificar respuesta o plazo vencido (30 días)
    if (currentStage === 'dt_resolution') {
      const hasResponse = !!report.karinProcess?.laborDepartmentResponse;
      const responseTimeout = !!report.karinProcess?.laborDepartmentNoResponse;
      
      if (!hasResponse && !responseTimeout) {
        return false;
      }
    }
    
    // Adopción de medidas - Verificar que se hayan adoptado las medidas
    if (currentStage === 'measures_adoption') {
      if (!report.karinProcess?.measuresAdopted || report.karinProcess.measuresAdopted.length === 0) {
        return false;
      }
      
      // Verificar que todas las medidas requeridas estén implementadas
      const allMeasuresImplemented = report.karinProcess.measuresAdopted.every(
        m => m.status === 'implemented' || m.status === 'verified'
      );
      
      if (!allMeasuresImplemented) {
        return false;
      }
    }
    
    // Sanciones - Verificar que se hayan aplicado sanciones o justificado la no aplicación
    if (currentStage === 'sanctions' && 
        (!report.karinProcess?.sanctionsApplied || 
         report.karinProcess.sanctionsApplied.length === 0) && 
        !report.karinProcess?.closingJustification) {
      return false;
    }
    
    return true;
  };
  
  // Las funciones de cálculo de días hábiles han sido trasladadas al archivo dateUtils.ts
  
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
  const currentStage = report.karinProcess?.stage || 'complaint_filed';
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
                    
                    {/* Información específica según la etapa */}
                    {currentStage === 'reception' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> Proceso inmediato para adoptar medidas precautorias.
                        {report.karinProcess?.requiresSubsanation && 
                          " Se requiere subsanación de la denuncia (plazo de 5 días hábiles)."}
                      </p>
                    )}
                    
                    {currentStage === 'subsanation' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> 5 días hábiles para que el denunciante complete la información requerida.
                      </p>
                    )}
                    
                    {currentStage === 'dt_notification' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Obligación legal:</strong> Se debe notificar a la DT con el informe preliminar preparado después de 
                        tomar la decisión de investigar e iniciar la investigación.
                      </p>
                    )}
                    
                    {currentStage === 'suseso_notification' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Obligación legal:</strong> Después de notificar a la DT, se debe notificar a las mutualidades (SUSESO) 
                        adjuntando el informe preliminar creado durante la investigación.
                      </p>
                    )}
                    
                    {currentStage === 'precautionary_measures' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> Las medidas precautorias deben implementarse dentro de 3 días hábiles desde la recepción de la denuncia.
                      </p>
                    )}
                    
                    {currentStage === 'investigation' && (
                      <>
                        <p className="text-xs text-orange-600 mt-1">
                          <strong>Plazo legal:</strong> 30 días hábiles para completar la investigación.
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          <strong>Requisitos:</strong> Registrar testimonios firmados y dejar constancia escrita de todas las diligencias.
                        </p>
                        {(report.karinProcess?.testimonies?.length > 0 && !report.karinProcess?.testimonies?.every(t => t.hasSigned)) && (
                          <p className="text-xs text-red-600 mt-1">
                            <strong>Pendiente:</strong> Algunos testimonios no están firmados o no tienen copia física.
                          </p>
                        )}
                        {/* Verificación extendida para entrevistas formales como testimonios */}
                        {report.karinProcess?.extendedInterviews && 
                         report.karinProcess.extendedInterviews.some(i => i.isTestimony && i.status !== 'signed' && i.status !== 'verified') && (
                          <p className="text-xs text-red-600 mt-1">
                            <strong>Pendiente:</strong> Hay entrevistas formales que requieren firma para ser testimonios válidos.
                          </p>
                        )}
                        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                          <h4 className="text-xs font-medium">Estado de testimonios</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {(report.karinProcess?.testimonies?.filter(t => t.hasSigned)?.length || 0) + 
                               (report.karinProcess?.extendedInterviews?.filter(i => i.isTestimony && (i.status === 'signed' || i.status === 'verified'))?.length || 0)} Firmados
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                              {(report.karinProcess?.testimonies?.filter(t => !t.hasSigned)?.length || 0) + 
                               (report.karinProcess?.extendedInterviews?.filter(i => i.isTestimony && i.status === 'pending_signature')?.length || 0)} Pendientes
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {(report.karinProcess?.extendedInterviews?.filter(i => !i.isTestimony)?.length || 0)} Entrevistas
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {currentStage === 'report_creation' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Requisito:</strong> El informe preliminar debe crearse después de la investigación y antes 
                        de notificar a la DT y SUSESO.
                      </p>
                    )}
                    
                    {currentStage === 'report_approval' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Requisito:</strong> Se debe revisar y aprobar internamente el informe preliminar 
                        antes de notificar a la DT y SUSESO.
                      </p>
                    )}
                    
                    {currentStage === 'investigation_complete' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> La investigación debe completarse en un máximo de 30 días hábiles.
                      </p>
                    )}
                    
                    {/* Para compatibilidad con registros antiguos */}
                    {currentStage === 'labor_department' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> La investigación debe completarse en un máximo de 30 días hábiles.
                      </p>
                    )}
                    
                    {currentStage === 'final_report' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Requisito:</strong> El informe final debe incluir todos los hallazgos, 
                        conclusiones y recomendaciones detalladas según exige la Ley Karin.
                      </p>
                    )}
                    
                    {currentStage === 'dt_submission' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> Debe enviarse el informe final y todo el expediente 
                        a la DT dentro de 2 días hábiles de finalizada la investigación.
                      </p>
                    )}
                    
                    {currentStage === 'dt_resolution' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> La DT tiene 30 días hábiles para revisar el procedimiento y emitir un pronunciamiento.
                        {report.karinProcess?.laborDepartmentReferralDate && (
                          <> Fecha estimada de respuesta: {formatDate(addBusinessDays(new Date(report.karinProcess.laborDepartmentReferralDate), 30, BusinessDayType.ADMINISTRATIVE))}</>
                        )}
                      </p>
                    )}
                    
                    {currentStage === 'measures_adoption' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Plazo legal:</strong> 15 días corridos (no hábiles) para implementar las medidas y sanciones después de la resolución de la DT.
                      </p>
                    )}
                    
                    {currentStage === 'sanctions' && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Requisito:</strong> Se deben aplicar sanciones adecuadas a la gravedad de los hechos acreditados. 
                        Verificar necesidad de aplicar artículo 160 del Código del Trabajo.
                      </p>
                    )}
                    
                    {/* Casos especiales */}
                    {report.karinProcess?.isThirdParty && (
                      <p className="text-xs bg-purple-50 text-purple-800 p-1 rounded mt-1">
                        <strong>Caso especial:</strong> Involucra a terceros ajenos a la relación laboral.
                      </p>
                    )}
                    
                    {report.karinProcess?.isSubcontracting && (
                      <p className="text-xs bg-purple-50 text-purple-800 p-1 rounded mt-1">
                        <strong>Caso especial:</strong> Régimen de subcontratación.
                        {report.karinProcess?.multipleEmployersInvolved && 
                          " Involucra trabajadores de distintas empresas."}
                      </p>
                    )}
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
                        <strong>No es posible avanzar a la siguiente etapa</strong> hasta completar los requisitos actuales:
                        {currentStage === 'reception' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            {report.karinProcess?.requiresSubsanation === undefined && (
                              <li>Debe indicar si la denuncia requiere subsanación</li>
                            )}
                            {report.karinProcess?.informedRights !== true && (
                              <li>Debe informar al trabajador sobre sus derechos legales</li>
                            )}
                          </ul>
                        )}
                        
                        {currentStage === 'subsanation' && !report.karinProcess?.subsanationReceived && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>La subsanación de la denuncia aún no ha sido recibida</li>
                            <li>Plazo legal: 5 días hábiles para que el denunciante subsane</li>
                            <li>Use el formulario de subsanación para gestionar los ítems pendientes</li>
                          </ul>
                        )}
                        
                        {currentStage === 'dt_notification' && !report.karinProcess?.dtInitialNotificationDate && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe notificar a la DT del inicio de la investigación</li>
                            <li>Plazo legal: 3 días hábiles desde la recepción de la denuncia</li>
                          </ul>
                        )}
                        
                        {currentStage === 'suseso_notification' && !report.karinProcess?.susesoNotificationDate && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe notificar a la mutualidad (SUSESO)</li>
                            <li>Plazo legal: 5 días hábiles</li>
                          </ul>
                        )}
                        
                        {currentStage === 'precautionary_measures' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            {(!report.karinProcess?.precautionaryMeasures || report.karinProcess.precautionaryMeasures.length === 0) && (
                              <li>Debe definir al menos una medida precautoria</li>
                            )}
                            {!report.karinProcess?.precautionaryAppliedDate && (
                              <li>Debe registrar la fecha de aplicación de las medidas</li>
                            )}
                            <li>Plazo legal: 3 días hábiles desde la recepción</li>
                          </ul>
                        )}
                        
                        {currentStage === 'decision_to_investigate' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe crear un plan de investigación</li>
                            <li>Debe designar un investigador imparcial</li>
                          </ul>
                        )}
                        
                        {currentStage === 'investigation' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            {(!report.interviews || report.interviews.length === 0) && (
                              <li>Debe registrar al menos una entrevista</li>
                            )}
                            {(!report.karinProcess?.testimonies?.every(t => t.hasSigned === true)) && (
                              <li>Todos los testimonios deben estar firmados</li>
                            )}
                            {(report.isAbuseCase && report.karinProcess?.rightsToCriminalReport !== true) && (
                              <li>Debe informar sobre derechos a denuncia penal</li>
                            )}
                          </ul>
                        )}
                        
                        {currentStage === 'report_creation' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe registrar al menos un hallazgo</li>
                            <li>El informe debe contener conclusiones y propuestas de medidas</li>
                          </ul>
                        )}
                        
                        {currentStage === 'report_approval' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe crear y aprobar el informe preliminar</li>
                            <li>El informe forma parte de la notificación inicial a la DT</li>
                          </ul>
                        )}
                        
                        {currentStage === 'labor_department' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>La investigación debe completarse en un plazo máximo de 30 días hábiles</li>
                            <li>Esta etapa implica concluir todas las diligencias de investigación</li>
                          </ul>
                        )}
                        
                        {currentStage === 'final_report' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe crear el informe final con todos los hallazgos</li>
                            <li>El informe debe cumplir con todos los requisitos legales de la Ley Karin</li>
                          </ul>
                        )}
                        
                        {currentStage === 'dt_submission' && !report.karinProcess?.laborDepartmentReferralCompleteFile && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe enviar el expediente completo a la DT</li>
                            <li>Plazo legal: 2 días hábiles desde finalización de la investigación</li>
                          </ul>
                        )}
                        
                        {currentStage === 'dt_resolution' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe registrar la respuesta de la DT o marcar que no hubo respuesta en 30 días</li>
                          </ul>
                        )}
                        
                        {currentStage === 'measures_adoption' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            {(!report.karinProcess?.measuresAdopted || report.karinProcess.measuresAdopted.length === 0) && (
                              <li>Debe definir las medidas a implementar</li>
                            )}
                            {(report.karinProcess?.measuresAdopted && !report.karinProcess.measuresAdopted.every(
                              m => m.status === 'implemented' || m.status === 'verified'
                            )) && (
                              <li>Todas las medidas deben estar implementadas</li>
                            )}
                            <li>Plazo legal: 15 días corridos desde el pronunciamiento de la DT</li>
                          </ul>
                        )}
                        
                        {currentStage === 'sanctions' && (
                          <ul className="list-disc pl-5 mt-1 text-xs">
                            <li>Debe aplicar sanciones o justificar por qué no aplican</li>
                            <li>Debe considerar si corresponde aplicar el artículo 160 del Código del Trabajo</li>
                          </ul>
                        )}
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