'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  addBusinessDays, 
  getBusinessDaysCount, 
  formatChileanDate,
  BusinessDayType 
} from '@/lib/utils/dateUtils';

interface KarinDeadlineTrackerProps {
  investigation: any;
  onUpdate: () => Promise<void>;
}

interface Deadline {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  status: 'completed' | 'active' | 'pending' | 'overdue';
  isUrgent: boolean;
  stage: string;
}

export const KarinDeadlineTracker: React.FC<KarinDeadlineTrackerProps> = ({
  investigation,
  onUpdate
}) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [overallStatus, setOverallStatus] = useState<{
    total: number;
    completed: number;
    active: number;
    overdue: number;
  }>({ total: 0, completed: 0, active: 0, overdue: 0 });

  useEffect(() => {
    calculateDeadlines();
  }, [investigation]);

  const calculateDeadlines = () => {
    const now = new Date();
    const currentStage = investigation.karinProcess?.stage || 'complaint_filed';
    const createdAt = investigation.createdAt?.toDate ? 
      new Date(investigation.createdAt.toDate()) : 
      new Date(investigation.createdAt);

    const calculatedDeadlines: Deadline[] = [];

    // Plazo 1: Recepción de denuncia (3 días desde interposición)
    const receptionDeadline = addBusinessDays(createdAt, 3, BusinessDayType.ADMINISTRATIVE);
    calculatedDeadlines.push({
      id: 'reception',
      title: 'Recepción de Denuncia',
      description: 'Revisar y procesar la denuncia recibida',
      startDate: createdAt,
      endDate: receptionDeadline,
      daysTotal: 3,
      daysElapsed: getBusinessDaysCount(createdAt, now, BusinessDayType.ADMINISTRATIVE),
      daysRemaining: getBusinessDaysCount(now, receptionDeadline, BusinessDayType.ADMINISTRATIVE),
      status: ['reception', 'subsanation'].includes(currentStage) ? 'active' : 
              getStageOrder(currentStage) > getStageOrder('reception') ? 'completed' : 'pending',
      isUrgent: getBusinessDaysCount(now, receptionDeadline, BusinessDayType.ADMINISTRATIVE) <= 1,
      stage: 'reception'
    });

    // Plazo 2: Notificación a DT (3 días desde recepción)
    const receptionDate = investigation.karinProcess?.receivedDate ? 
      new Date(investigation.karinProcess.receivedDate) : receptionDeadline;
    const dtNotificationDeadline = addBusinessDays(receptionDate, 3, BusinessDayType.ADMINISTRATIVE);
    calculatedDeadlines.push({
      id: 'dt_notification',
      title: 'Notificación a Dirección del Trabajo',
      description: 'Informar a la DT sobre la denuncia recibida',
      startDate: receptionDate,
      endDate: dtNotificationDeadline,
      daysTotal: 3,
      daysElapsed: getBusinessDaysCount(receptionDate, now, BusinessDayType.ADMINISTRATIVE),
      daysRemaining: getBusinessDaysCount(now, dtNotificationDeadline, BusinessDayType.ADMINISTRATIVE),
      status: currentStage === 'dt_notification' ? 'active' : 
              getStageOrder(currentStage) > getStageOrder('dt_notification') ? 'completed' : 'pending',
      isUrgent: getBusinessDaysCount(now, dtNotificationDeadline, BusinessDayType.ADMINISTRATIVE) <= 1,
      stage: 'dt_notification'
    });

    // Plazo 3: Medidas precautorias (inmediatas, máximo 3 días)
    const precautionaryDeadline = addBusinessDays(receptionDate, 3, BusinessDayType.ADMINISTRATIVE);
    calculatedDeadlines.push({
      id: 'precautionary_measures',
      title: 'Medidas Precautorias',
      description: 'Evaluar y aplicar medidas de protección si es necesario',
      startDate: receptionDate,
      endDate: precautionaryDeadline,
      daysTotal: 3,
      daysElapsed: getBusinessDaysCount(receptionDate, now, BusinessDayType.ADMINISTRATIVE),
      daysRemaining: getBusinessDaysCount(now, precautionaryDeadline, BusinessDayType.ADMINISTRATIVE),
      status: currentStage === 'precautionary_measures' ? 'active' : 
              getStageOrder(currentStage) > getStageOrder('precautionary_measures') ? 'completed' : 'pending',
      isUrgent: getBusinessDaysCount(now, precautionaryDeadline, BusinessDayType.ADMINISTRATIVE) <= 1,
      stage: 'precautionary_measures'
    });

    // Plazo 4: Investigación (30 días, prorrogable a 60)
    const investigationStartDate = investigation.karinProcess?.investigationStartDate ?
      new Date(investigation.karinProcess.investigationStartDate) : receptionDate;
    const investigationDays = investigation.karinProcess?.investigationExtensionDate ? 60 : 30;
    const investigationDeadline = addBusinessDays(investigationStartDate, investigationDays, BusinessDayType.ADMINISTRATIVE);
    calculatedDeadlines.push({
      id: 'investigation',
      title: `Investigación (${investigationDays} días)`,
      description: 'Completar proceso de investigación: entrevistas, análisis, evidencias',
      startDate: investigationStartDate,
      endDate: investigationDeadline,
      daysTotal: investigationDays,
      daysElapsed: getBusinessDaysCount(investigationStartDate, now, BusinessDayType.ADMINISTRATIVE),
      daysRemaining: getBusinessDaysCount(now, investigationDeadline, BusinessDayType.ADMINISTRATIVE),
      status: ['investigation', 'report_creation', 'report_approval'].includes(currentStage) ? 'active' : 
              getStageOrder(currentStage) > getStageOrder('investigation') ? 'completed' : 'pending',
      isUrgent: getBusinessDaysCount(now, investigationDeadline, BusinessDayType.ADMINISTRATIVE) <= 5,
      stage: 'investigation'
    });

    // Plazo 5: Envío a DT (2 días desde aprobación del informe)
    const reportApprovalDate = investigation.karinProcess?.reportApprovalDate ?
      new Date(investigation.karinProcess.reportApprovalDate) : investigationDeadline;
    const dtSubmissionDeadline = addBusinessDays(reportApprovalDate, 2, BusinessDayType.ADMINISTRATIVE);
    calculatedDeadlines.push({
      id: 'dt_submission',
      title: 'Envío Formal a DT',
      description: 'Remitir expediente completo a la Dirección del Trabajo',
      startDate: reportApprovalDate,
      endDate: dtSubmissionDeadline,
      daysTotal: 2,
      daysElapsed: getBusinessDaysCount(reportApprovalDate, now, BusinessDayType.ADMINISTRATIVE),
      daysRemaining: getBusinessDaysCount(now, dtSubmissionDeadline, BusinessDayType.ADMINISTRATIVE),
      status: currentStage === 'dt_submission' ? 'active' : 
              getStageOrder(currentStage) > getStageOrder('dt_submission') ? 'completed' : 'pending',
      isUrgent: getBusinessDaysCount(now, dtSubmissionDeadline, BusinessDayType.ADMINISTRATIVE) <= 0,
      stage: 'dt_submission'
    });

    // Plazo 6: Adopción de medidas (15 días corridos desde resolución DT)
    const dtResponseDate = investigation.karinProcess?.laborDepartmentResponseDate ?
      new Date(investigation.karinProcess.laborDepartmentResponseDate) : dtSubmissionDeadline;
    let measuresDeadline = new Date(dtResponseDate);
    measuresDeadline.setDate(measuresDeadline.getDate() + 15);
    
    const timeDiffMeasures = measuresDeadline.getTime() - dtResponseDate.getTime();
    const daysElapsedMeasures = Math.floor((now.getTime() - dtResponseDate.getTime()) / (1000 * 3600 * 24));
    const daysRemainingMeasures = Math.ceil((measuresDeadline.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    calculatedDeadlines.push({
      id: 'measures_adoption',
      title: 'Adopción de Medidas (15 días corridos)',
      description: 'Implementar medidas ordenadas por la Dirección del Trabajo',
      startDate: dtResponseDate,
      endDate: measuresDeadline,
      daysTotal: 15,
      daysElapsed: Math.max(0, daysElapsedMeasures),
      daysRemaining: Math.max(0, daysRemainingMeasures),
      status: currentStage === 'measures_adoption' ? 'active' : 
              getStageOrder(currentStage) > getStageOrder('measures_adoption') ? 'completed' : 'pending',
      isUrgent: daysRemainingMeasures <= 3,
      stage: 'measures_adoption'
    });

    // Actualizar estados basado en fechas actuales
    calculatedDeadlines.forEach(deadline => {
      if (deadline.daysRemaining < 0 && deadline.status === 'active') {
        deadline.status = 'overdue';
      }
    });

    // Calcular estadísticas generales
    const stats = {
      total: calculatedDeadlines.length,
      completed: calculatedDeadlines.filter(d => d.status === 'completed').length,
      active: calculatedDeadlines.filter(d => d.status === 'active').length,
      overdue: calculatedDeadlines.filter(d => d.status === 'overdue').length
    };

    setDeadlines(calculatedDeadlines);
    setOverallStatus(stats);
  };

  const getStageOrder = (stage: string): number => {
    const order: {[key: string]: number} = {
      'complaint_filed': 0,
      'reception': 1,
      'subsanation': 1.5,
      'precautionary_measures': 2,
      'decision_to_investigate': 3,
      'investigation': 4,
      'report_creation': 5,
      'report_approval': 6,
      'dt_notification': 7,
      'suseso_notification': 8,
      'investigation_complete': 9,
      'final_report': 10,
      'dt_submission': 11,
      'dt_resolution': 12,
      'measures_adoption': 13,
      'closed': 14
    };
    return order[stage] || 0;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return '✅';
      case 'active': return '🔄';
      case 'overdue': return '⚠️';
      default: return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen general */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Resumen de Plazos Legales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallStatus.completed}</div>
              <div className="text-sm text-gray-600">Completados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{overallStatus.active}</div>
              <div className="text-sm text-gray-600">Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overallStatus.overdue}</div>
              <div className="text-sm text-gray-600">Vencidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{overallStatus.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de plazos */}
      <div className="space-y-4">
        {deadlines.map((deadline) => (
          <Card key={deadline.id} className={`border-2 ${getStatusColor(deadline.status)}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <span className="mr-2">{getStatusIcon(deadline.status)}</span>
                  {deadline.title}
                </span>
                <Badge className={getStatusColor(deadline.status)}>
                  {deadline.status === 'overdue' ? 'VENCIDO' :
                   deadline.status === 'completed' ? 'COMPLETADO' :
                   deadline.status === 'active' ? `${deadline.daysRemaining} días` :
                   'PENDIENTE'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-600">{deadline.description}</p>
                
                {/* Barra de progreso */}
                {deadline.status !== 'pending' && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progreso</span>
                      <span>{Math.round((deadline.daysElapsed / deadline.daysTotal) * 100)}%</span>
                    </div>
                    <Progress 
                      value={Math.min((deadline.daysElapsed / deadline.daysTotal) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                )}

                {/* Información de fechas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Inicio:</span>
                    <span className="ml-2 font-medium">{formatChileanDate(deadline.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vencimiento:</span>
                    <span className="ml-2 font-medium">{formatChileanDate(deadline.endDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Días transcurridos:</span>
                    <span className="ml-2 font-medium">{deadline.daysElapsed} de {deadline.daysTotal}</span>
                  </div>
                </div>

                {/* Alertas urgentes */}
                {deadline.isUrgent && deadline.status === 'active' && (
                  <Alert className="border-orange-300 bg-orange-50">
                    <AlertDescription className="text-orange-800">
                      <strong>⚠️ Plazo crítico:</strong> Quedan muy pocos días para completar esta etapa.
                    </AlertDescription>
                  </Alert>
                )}

                {deadline.status === 'overdue' && (
                  <Alert className="border-red-300 bg-red-50">
                    <AlertDescription className="text-red-800">
                      <strong>🚨 Plazo vencido:</strong> Esta etapa debería haber sido completada.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};