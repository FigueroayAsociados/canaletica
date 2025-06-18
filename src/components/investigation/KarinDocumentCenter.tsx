'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PreliminaryReport } from './PreliminaryReport';
import { FinalReport } from './FinalReport';
import { InterviewList } from './InterviewList';
import { formatChileanDate } from '@/lib/utils/dateUtils';

interface KarinDocumentCenterProps {
  investigation: any;
  canEdit: boolean;
  onDocumentUpdate: () => Promise<void>;
  userCompanyId: string;
}

export const KarinDocumentCenter: React.FC<KarinDocumentCenterProps> = ({
  investigation,
  canEdit,
  onDocumentUpdate,
  userCompanyId
}) => {
  const [activeDocument, setActiveDocument] = useState('overview');

  const currentStage = investigation.karinProcess?.stage || 'complaint_filed';

  // Determinar qué documentos están disponibles según la etapa
  const getAvailableDocuments = () => {
    const stageOrder = getStageOrder(currentStage);
    
    return {
      interviews: stageOrder >= getStageOrder('investigation'),
      preliminaryReport: stageOrder >= getStageOrder('report_creation'),
      finalReport: stageOrder >= getStageOrder('final_report'),
      notifications: stageOrder >= getStageOrder('dt_notification'),
      measures: stageOrder >= getStageOrder('measures_adoption')
    };
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

  const formatDate = (date: any) => {
    if (!date) return 'No disponible';
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    return formatChileanDate(dateObj);
  };

  const getDocumentStatus = (docType: string) => {
    switch (docType) {
      case 'interviews':
        return investigation.interviews?.length > 0 ? 'completed' : 'pending';
      case 'preliminaryReport':
        return investigation.preliminaryReport ? 'completed' : 'pending';
      case 'finalReport':
        return investigation.finalReport ? 'completed' : 'pending';
      case 'notifications':
        return investigation.karinProcess?.dtInitialNotificationDate ? 'completed' : 'pending';
      case 'measures':
        return investigation.karinProcess?.measuresImplemented ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">En Progreso</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">Pendiente</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">No Disponible</Badge>;
    }
  };

  const available = getAvailableDocuments();

  return (
    <div className="space-y-6">
      {/* Resumen de documentos */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Centro de Documentos Ley Karin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Entrevistas y Testimonios */}
            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
              <div>
                <h4 className="font-medium">Entrevistas</h4>
                <p className="text-sm text-gray-600">
                  {investigation.interviews?.length || 0} registradas
                </p>
              </div>
              {getStatusBadge(getDocumentStatus('interviews'))}
            </div>

            {/* Informe Preliminar */}
            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
              <div>
                <h4 className="font-medium">Informe Preliminar</h4>
                <p className="text-sm text-gray-600">
                  {investigation.preliminaryReport ? 
                    `Creado ${formatDate(investigation.preliminaryReport.createdAt)}` : 
                    'No creado'
                  }
                </p>
              </div>
              {getStatusBadge(getDocumentStatus('preliminaryReport'))}
            </div>

            {/* Informe Final */}
            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
              <div>
                <h4 className="font-medium">Informe Final</h4>
                <p className="text-sm text-gray-600">
                  {investigation.finalReport ? 
                    `Creado ${formatDate(investigation.finalReport.createdAt)}` : 
                    'No creado'
                  }
                </p>
              </div>
              {getStatusBadge(getDocumentStatus('finalReport'))}
            </div>

            {/* Notificaciones */}
            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
              <div>
                <h4 className="font-medium">Notificaciones</h4>
                <p className="text-sm text-gray-600">
                  DT y SUSESO
                </p>
              </div>
              {getStatusBadge(getDocumentStatus('notifications'))}
            </div>

            {/* Medidas */}
            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
              <div>
                <h4 className="font-medium">Medidas</h4>
                <p className="text-sm text-gray-600">
                  Precautorias y Finales
                </p>
              </div>
              {getStatusBadge(getDocumentStatus('measures'))}
            </div>

            {/* Evidencias */}
            <div className="flex items-center justify-between p-3 bg-white rounded-md border">
              <div>
                <h4 className="font-medium">Evidencias</h4>
                <p className="text-sm text-gray-600">
                  {investigation.evidences?.length || 0} archivos
                </p>
              </div>
              {getStatusBadge(investigation.evidences?.length > 0 ? 'completed' : 'pending')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de documentos por pestañas */}
      <Tabs value={activeDocument} onValueChange={setActiveDocument}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger 
            value="interviews" 
            disabled={!available.interviews}
            className={available.interviews ? '' : 'opacity-50'}
          >
            Entrevistas
          </TabsTrigger>
          <TabsTrigger 
            value="preliminary" 
            disabled={!available.preliminaryReport}
            className={available.preliminaryReport ? '' : 'opacity-50'}
          >
            Inf. Preliminar
          </TabsTrigger>
          <TabsTrigger 
            value="final" 
            disabled={!available.finalReport}
            className={available.finalReport ? '' : 'opacity-50'}
          >
            Inf. Final
          </TabsTrigger>
        </TabsList>

        {/* Resumen de documentos */}
        <TabsContent value="overview" className="space-y-4">
          <Alert className="border-blue-300 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>Centro de Documentos:</strong> Gestione todos los documentos requeridos para el proceso Ley Karin desde aquí.
              Los documentos se habilitan progresivamente según avance en las etapas.
            </AlertDescription>
          </Alert>

          {/* Cronología de documentos */}
          <Card>
            <CardHeader>
              <CardTitle>Cronología de Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Plan de Investigación */}
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    investigation.plan ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {investigation.plan ? '✓' : '1'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Plan de Investigación</h4>
                    <p className="text-sm text-gray-600">
                      {investigation.plan ? 
                        `Creado ${formatDate(investigation.plan.createdAt)}` : 
                        'Requerido para iniciar investigación'
                      }
                    </p>
                  </div>
                  {getStatusBadge(investigation.plan ? 'completed' : 'pending')}
                </div>

                {/* Entrevistas */}
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    (investigation.interviews?.length || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {(investigation.interviews?.length || 0) > 0 ? '✓' : '2'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Entrevistas y Testimonios</h4>
                    <p className="text-sm text-gray-600">
                      {(investigation.interviews?.length || 0) > 0 ? 
                        `${investigation.interviews.length} entrevistas realizadas` : 
                        'Pendiente de realizar entrevistas'
                      }
                    </p>
                  </div>
                  {getStatusBadge((investigation.interviews?.length || 0) > 0 ? 'completed' : 'pending')}
                </div>

                {/* Informe Preliminar */}
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    investigation.preliminaryReport ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {investigation.preliminaryReport ? '✓' : '3'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Informe Preliminar</h4>
                    <p className="text-sm text-gray-600">
                      {investigation.preliminaryReport ? 
                        `Creado ${formatDate(investigation.preliminaryReport.createdAt)}` : 
                        'Requerido para Ley Karin'
                      }
                    </p>
                  </div>
                  {getStatusBadge(investigation.preliminaryReport ? 'completed' : 'pending')}
                </div>

                {/* Informe Final */}
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    investigation.finalReport ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {investigation.finalReport ? '✓' : '4'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Informe Final</h4>
                    <p className="text-sm text-gray-600">
                      {investigation.finalReport ? 
                        `Creado ${formatDate(investigation.finalReport.createdAt)}` : 
                        'Se crea al finalizar investigación'
                      }
                    </p>
                  </div>
                  {getStatusBadge(investigation.finalReport ? 'completed' : 'pending')}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entrevistas */}
        <TabsContent value="interviews">
          {available.interviews ? (
            <InterviewList
              reportId={investigation.id}
              companyId={userCompanyId}
              interviews={investigation.interviews || []}
              canEdit={canEdit}
              onInterviewAdded={onDocumentUpdate}
              isKarinLaw={true}
            />
          ) : (
            <Alert>
              <AlertDescription>
                Las entrevistas estarán disponibles cuando se inicie la etapa de investigación.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Informe Preliminar */}
        <TabsContent value="preliminary">
          {available.preliminaryReport ? (
            <PreliminaryReport
              reportId={investigation.id}
              reportData={investigation}
              preliminaryReport={investigation.preliminaryReport || null}
              isKarinLaw={true}
              canEdit={canEdit}
              onReportUpdated={onDocumentUpdate}
            />
          ) : (
            <Alert>
              <AlertDescription>
                El informe preliminar estará disponible durante la etapa de creación de informe.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Informe Final */}
        <TabsContent value="final">
          {available.finalReport ? (
            <FinalReport
              reportId={investigation.id}
              report={investigation.finalReport}
              findings={investigation.findings || []}
              isKarinLaw={true}
              canEdit={canEdit}
              onReportUpdated={onDocumentUpdate}
            />
          ) : (
            <Alert>
              <AlertDescription>
                El informe final estará disponible en las etapas finales del proceso.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};