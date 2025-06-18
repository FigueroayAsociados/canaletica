'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { KarinStageManager } from './KarinStageManager';
import { KarinDeadlineTracker } from './KarinDeadlineTracker';
import { KarinDocumentCenter } from './KarinDocumentCenter';
import { KarinComplianceChecklist } from './KarinComplianceChecklist';
import { 
  addBusinessDays, 
  getBusinessDaysCount, 
  formatChileanDate,
  BusinessDayType 
} from '@/lib/utils/dateUtils';

interface UnifiedKarinControllerProps {
  investigation: any;
  canEdit: boolean;
  onDataUpdate: () => Promise<void>;
  userCompanyId: string;
}

export const UnifiedKarinController: React.FC<UnifiedKarinControllerProps> = ({
  investigation,
  canEdit,
  onDataUpdate,
  userCompanyId
}) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [criticalDeadlines, setCriticalDeadlines] = useState<any[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  // Calcular progreso general y plazos críticos
  useEffect(() => {
    if (investigation) {
      calculateOverallProgress();
      calculateCriticalDeadlines();
    }
  }, [investigation]);

  const calculateOverallProgress = () => {
    const currentStage = investigation.karinProcess?.stage || 'complaint_filed';
    const allStages = [
      'complaint_filed', 'reception', 'subsanation', 'precautionary_measures',
      'decision_to_investigate', 'investigation', 'report_creation', 'report_approval',
      'dt_notification', 'suseso_notification', 'investigation_complete',
      'final_report', 'dt_submission', 'dt_resolution', 'measures_adoption', 'closed'
    ];
    
    const currentIndex = allStages.indexOf(currentStage);
    const progress = currentIndex >= 0 ? (currentIndex / (allStages.length - 1)) * 100 : 0;
    setOverallProgress(Math.round(progress));
  };

  const calculateCriticalDeadlines = () => {
    const now = new Date();
    const deadlines: any[] = [];
    const currentStage = investigation.karinProcess?.stage || 'complaint_filed';
    
    // Calcular plazos según etapa actual
    switch (currentStage) {
      case 'reception':
        // 3 días para notificar a DT
        const receptionDate = investigation.karinProcess?.receivedDate 
          ? new Date(investigation.karinProcess.receivedDate) 
          : new Date(investigation.createdAt?.toDate ? investigation.createdAt.toDate() : investigation.createdAt);
        const dtNotificationDeadline = addBusinessDays(receptionDate, 3, BusinessDayType.ADMINISTRATIVE);
        const daysToNotify = getBusinessDaysCount(now, dtNotificationDeadline, BusinessDayType.ADMINISTRATIVE);
        
        deadlines.push({
          title: 'Notificación a Dirección del Trabajo',
          daysRemaining: daysToNotify,
          isUrgent: daysToNotify <= 1,
          deadline: dtNotificationDeadline
        });
        break;
        
      case 'investigation':
        // 30 días para investigación (prorrogable a 60)
        const investigationStartDate = investigation.karinProcess?.investigationStartDate
          ? new Date(investigation.karinProcess.investigationStartDate)
          : new Date(investigation.createdAt?.toDate ? investigation.createdAt.toDate() : investigation.createdAt);
        const investigationDeadline = investigation.karinProcess?.investigationExtensionDate
          ? addBusinessDays(investigationStartDate, 60, BusinessDayType.ADMINISTRATIVE)
          : addBusinessDays(investigationStartDate, 30, BusinessDayType.ADMINISTRATIVE);
        const daysToComplete = getBusinessDaysCount(now, investigationDeadline, BusinessDayType.ADMINISTRATIVE);
        
        deadlines.push({
          title: 'Completar Investigación',
          daysRemaining: daysToComplete,
          isUrgent: daysToComplete <= 5,
          deadline: investigationDeadline
        });
        break;
        
      case 'dt_submission':
        // 2 días para envío a DT
        const reportApprovalDate = investigation.karinProcess?.reportApprovalDate
          ? new Date(investigation.karinProcess.reportApprovalDate)
          : now;
        const submissionDeadline = addBusinessDays(reportApprovalDate, 2, BusinessDayType.ADMINISTRATIVE);
        const daysToSubmit = getBusinessDaysCount(now, submissionDeadline, BusinessDayType.ADMINISTRATIVE);
        
        deadlines.push({
          title: 'Envío Formal a Dirección del Trabajo',
          daysRemaining: daysToSubmit,
          isUrgent: daysToSubmit <= 0,
          deadline: submissionDeadline
        });
        break;
        
      case 'measures_adoption':
        // 15 días corridos para implementar medidas
        const dtResponseDate = investigation.karinProcess?.laborDepartmentResponseDate
          ? new Date(investigation.karinProcess.laborDepartmentResponseDate)
          : now;
        let measuresDeadline = new Date(dtResponseDate);
        measuresDeadline.setDate(measuresDeadline.getDate() + 15);
        const timeDiff = measuresDeadline.getTime() - now.getTime();
        const daysToImplement = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        deadlines.push({
          title: 'Implementar Medidas Ordenadas',
          daysRemaining: daysToImplement,
          isUrgent: daysToImplement <= 3,
          deadline: measuresDeadline
        });
        break;
    }
    
    setCriticalDeadlines(deadlines);
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

  const getStageColor = (stage: string): string => {
    const colors: {[key: string]: string} = {
      'complaint_filed': 'bg-blue-100 text-blue-800',
      'reception': 'bg-yellow-100 text-yellow-800',
      'subsanation': 'bg-orange-100 text-orange-800',
      'precautionary_measures': 'bg-red-100 text-red-800',
      'investigation': 'bg-purple-100 text-purple-800',
      'dt_submission': 'bg-indigo-100 text-indigo-800',
      'closed': 'bg-green-100 text-green-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const currentStage = investigation.karinProcess?.stage || 'complaint_filed';

  return (
    <div className="space-y-6">
      {/* Panel de estado actual */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-red-800">Estado Actual del Proceso</span>
            <Badge className={getStageColor(currentStage)}>
              {getStageName(currentStage)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progreso general */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-red-700">Progreso General</span>
                <span className="text-red-700">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Plazos críticos */}
            {criticalDeadlines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-2">Plazos Críticos</h4>
                <div className="space-y-2">
                  {criticalDeadlines.map((deadline, index) => (
                    <Alert 
                      key={index} 
                      className={deadline.isUrgent ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}
                    >
                      <AlertDescription className={deadline.isUrgent ? 'text-red-800' : 'text-yellow-800'}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{deadline.title}</span>
                          <Badge variant={deadline.isUrgent ? 'destructive' : 'secondary'}>
                            {deadline.daysRemaining <= 0 
                              ? 'VENCIDO' 
                              : `${deadline.daysRemaining} día${deadline.daysRemaining !== 1 ? 's' : ''}`
                            }
                          </Badge>
                        </div>
                        <div className="text-xs mt-1">
                          Vence: {formatChileanDate(deadline.deadline)}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pestañas unificadas */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen Proceso</TabsTrigger>
          <TabsTrigger value="stages">Gestión Etapas</TabsTrigger>
          <TabsTrigger value="documents">Centro Documentos</TabsTrigger>
          <TabsTrigger value="compliance">Lista Verificación</TabsTrigger>
        </TabsList>

        {/* Resumen del proceso */}
        <TabsContent value="overview" className="space-y-4">
          <KarinDeadlineTracker
            investigation={investigation}
            onUpdate={onDataUpdate}
          />
        </TabsContent>

        {/* Gestión de etapas */}
        <TabsContent value="stages" className="space-y-4">
          <KarinStageManager
            investigation={investigation}
            canEdit={canEdit}
            onStageUpdate={onDataUpdate}
            userCompanyId={userCompanyId}
          />
        </TabsContent>

        {/* Centro de documentos */}
        <TabsContent value="documents" className="space-y-4">
          <KarinDocumentCenter
            investigation={investigation}
            canEdit={canEdit}
            onDocumentUpdate={onDataUpdate}
            userCompanyId={userCompanyId}
          />
        </TabsContent>

        {/* Lista de verificación */}
        <TabsContent value="compliance" className="space-y-4">
          <KarinComplianceChecklist
            investigation={investigation}
            canEdit={canEdit}
            onUpdate={onDataUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};