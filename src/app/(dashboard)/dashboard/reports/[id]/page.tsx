'use client';



// src/app/(dashboard)/dashboard/reports/[id]/page.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import ExportReportPDF from '@/components/reports/ExportReportPDF';
import RiskAnalysisCard from '@/components/ai/RiskAnalysisCard';
import IntelligentRiskAnalysisCard from '@/components/ai/IntelligentRiskAnalysisCard';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { useAI } from '@/lib/hooks/useAI';
import { useIntelligentRisk } from '@/lib/hooks/useIntelligentRisk';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { Spinner } from '@/components/ui/spinner';
import { 
  useReport, 
  useUpdateReportStatus,
  useUpdateKarinStage, 
  useUsersByRole,
  useAssignInvestigator,
  useAddCommunication
} from '@/lib/hooks/useReports';
import { updateReportStats } from '@/lib/services/reportService';




export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const { uid, isAdmin, isInvestigator, isSuperAdmin, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const { isEnabled } = useFeatureFlags();
  const { analyzeRisk, riskAnalysis, isLoading: isAiLoading } = useAI();
  const { analyzeIntelligentRisk, analysis: intelligentAnalysis, isLoading: isIntelligentLoading } = useIntelligentRisk();

  // Estados para las acciones
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusComment, setStatusComment] = useState<string>('');
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>('');
  const [assignmentComment, setAssignmentComment] = useState<string>('');
  const [newMessage, setNewMessage] = useState<string>('');
  const [isInternalMessage, setIsInternalMessage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [showRiskAnalysis, setShowRiskAnalysis] = useState<boolean>(false);

  // Usar el company del perfil del usuario o el companyId del contexto
  let companyId = profile?.company || contextCompanyId;
  
  // Para despliegues de Vercel, asegurar que companyId sea 'default' si contiene patrones de Vercel
  if (companyId && (
      companyId.includes('-vercel') || 
      companyId.startsWith('canaletica-') ||
      companyId.includes('-ricardo-figueroas-projects-')
    )) {
    console.log(`[ReportDetailPage] Corrigiendo companyId de Vercel "${companyId}" a "default"`);
    companyId = 'default';
  }

  // Determinar el rol de forma robusta basado en los flags del hook
  const getUserRole = () => {
    if (isSuperAdmin) return 'super_admin';
    if (profile?.role) return profile.role;
    if (isAdmin) return 'admin';
    if (isInvestigator) return 'investigator';
    return null; // No devolver 'user' hasta que el perfil esté completamente cargado
  };

  const userRole = getUserRole();
  
  // Debug log para verificar que el rol se está determinando correctamente
  console.log(`[ReportDetailPage] userRole determinado: ${userRole}, isSuperAdmin: ${isSuperAdmin}, profile?.role: ${profile?.role}`);
  
  const { 
    data: reportResult, 
    isLoading, 
    isError, 
    error 
  } = useReport(companyId, reportId, userRole, uid);

  // Cargar investigadores si el usuario es admin
  const { 
    data: investigatorsResult 
  } = useUsersByRole(companyId, 'investigator');

  // Preparar las mutaciones
  const updateStatusMutation = useUpdateReportStatus();
  const updateKarinStage = useUpdateKarinStage();
  const assignInvestigatorMutation = useAssignInvestigator();
  const addCommunicationMutation = useAddCommunication();
  
  // Inicializar estados cuando los datos están disponibles
  useEffect(() => {
    if (reportResult?.success && reportResult.report) {
      // Para casos de Ley Karin, usar la etapa del proceso como estado inicial
      if (reportResult.report.isKarinLaw) {
        setNewStatus(reportResult.report.karinProcess?.stage || 'complaint_filed');
      } else {
        setNewStatus(reportResult.report.status);
      }
      setSelectedInvestigator(reportResult.report.assignedTo || '');
      
      // Verificar si el Análisis Inteligente está habilitado (nuevo sistema híbrido)
      const intelligentRiskEnabled = isEnabled('intelligentRiskAnalysisEnabled');
      setShowRiskAnalysis(intelligentRiskEnabled);
      
      // Si el Análisis Inteligente está habilitado, realizar análisis híbrido
      if (intelligentRiskEnabled && !intelligentAnalysis) {
        const report = reportResult.report;
        
        // Preparar datos del reporte para análisis inteligente
        const reportData = {
          id: reportId,
          detailedDescription: report.detailedDescription,
          category: report.category,
          subcategory: report.subcategory,
          isAnonymous: report.isAnonymous,
          hasEvidence: report.hasEvidence,
          isKarinLaw: report.isKarinLaw,
          involvedPersons: report.involvedPersons || [],
          previousActions: report.previousActions,
          expectation: report.expectation,
          exactLocation: report.exactLocation,
          eventDate: report.eventDate,
          priority: report.priority
        } as any;
        
        analyzeIntelligentRisk(reportData);
      }
    }
  }, [reportResult, isEnabled, analyzeIntelligentRisk, intelligentAnalysis, reportId]);

  // Obtener el reporte de los datos cargados
  const report = reportResult?.success ? reportResult.report : null;
  
  // Obtener los investigadores de los datos cargados
  const investigators = investigatorsResult?.success ? investigatorsResult.users || [] : [];
  
  // Función auxiliar para verificar si el estado es el mismo
  const isStatusUnchanged = (report: any, newStatus: string): boolean => {
    if (report.isKarinLaw) {
      return report.karinProcess?.stage === newStatus;
    } else {
      return report.status === newStatus;
    }
  };
  
  // Manejar cambio de estado
  const handleStatusChange = async () => {
    if (!report || isStatusUnchanged(report, newStatus) || !uid) return;
    
    try {
      if (report.isKarinLaw) {
        // Para casos de Ley Karin, usamos la actualización de etapa de proceso
        await updateKarinStage({
          companyId,
          reportId,
          newStage: newStatus,
          additionalData: { 
            actorId: uid, 
            notes: statusComment 
          }
        });
      } else {
        // Para casos normales, usamos la actualización de estado estándar
        await updateStatusMutation.mutateAsync({
          companyId,
          reportId,
          status: newStatus,
          additionalData: { 
            actorId: uid, 
            comment: statusComment 
          }
        });
        
        // Actualizar estadísticas
        await updateReportStats(companyId, report.status, newStatus);
      }
      
      // Limpiar comentario
      setStatusComment('');
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };
  
  // Manejar asignación de investigador
  const handleAssignInvestigator = async () => {
    if (!report || selectedInvestigator === report.assignedTo || !uid || !selectedInvestigator) return;
    
    try {
      // Ejecutar la mutación
      await assignInvestigatorMutation.mutateAsync({
        companyId,
        reportId,
        investigatorId: selectedInvestigator,
        actorId: uid,
        comment: assignmentComment
      });
      
      // Limpiar comentario
      setAssignmentComment('');
    } catch (error) {
      console.error('Error al asignar investigador:', error);
    }
  };
  
  // Manejar envío de mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !uid) return;
    
    try {
      // Ejecutar la mutación
      await addCommunicationMutation.mutateAsync({
        companyId,
        reportId,
        senderId: uid,
        content: newMessage,
        isFromReporter: false,
        isInternal: isInternalMessage
      });
      
      // Limpiar mensaje
      setNewMessage('');
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };
  
  // Loading state
  if (isLoading) {
    return <Spinner text="Cargando información de la denuncia..." />;
  }
  
  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Error al cargar la denuncia'}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard/reports">
            <Button>Volver al Listado</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // No report found
  if (!report) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>La denuncia no existe o no tiene permisos para verla.</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard/reports">
            <Button>Volver al Listado</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Formatear fechas
  const createdDate = report.createdAt.toDate 
    ? new Date(report.createdAt.toDate()) 
    : new Date(report.createdAt);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Comprobaciones pendientes mientras se cargan las mutaciones
  const isSubmitting = 
    updateStatusMutation.isPending || 
    updateKarinStage.isPending ||
    assignInvestigatorMutation.isPending || 
    addCommunicationMutation.isPending;
  
  return (
    <div className="space-y-6">
      {/* Cabecera con resumen */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            Denuncia #{report.code}
            {report.isKarinLaw && (
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Ley Karin
              </span>
            )}
          </h1>
          <p className="text-gray-500">
            Recibida el {formatDate(createdDate)}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/dashboard/reports">
            <Button variant="outline">Volver al Listado</Button>
          </Link>
          {isAdmin && (
            <Link href={`/dashboard/reports/${reportId}/edit`}>
              <Button>Editar Denuncia</Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Mostrar errores de mutaciones si existen */}
      {(updateStatusMutation.isError || updateKarinStage.isError || assignInvestigatorMutation.isError || addCommunicationMutation.isError) && (
        <Alert variant="error">
          <AlertDescription>
            {updateStatusMutation.error instanceof Error 
              ? updateStatusMutation.error.message 
              : updateKarinStage.error instanceof Error
                ? updateKarinStage.error.message
                : assignInvestigatorMutation.error instanceof Error 
                  ? assignInvestigatorMutation.error.message
                  : addCommunicationMutation.error instanceof Error
                    ? addCommunicationMutation.error.message
                    : 'Error al realizar la acción'}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="management">Gestión</TabsTrigger>
          <TabsTrigger value="communications">Comunicaciones</TabsTrigger>
          <TabsTrigger value="evidence">Evidencias</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Detalles */}
        <TabsContent value="details" className="space-y-6">
          {/* Análisis Inteligente de Riesgo - Solo visible si está habilitado */}
          {showRiskAnalysis && (
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              {/* Panel de Análisis Inteligente (IA + Compliance) */}
              <div className="col-span-1">
                {intelligentAnalysis ? (
                  <IntelligentRiskAnalysisCard analysis={intelligentAnalysis} />
                ) : (
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        🚀 Análisis Inteligente de Riesgo
                        <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full">
                          PREMIUM
                        </span>
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Sistema híbrido que combina Inteligencia Artificial + Análisis Legal de Compliance
                      </p>
                    </CardHeader>
                    <CardContent className="py-4">
                      {(isIntelligentLoading || isAiLoading) ? (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Spinner />
                          <p className="text-sm text-gray-600">Realizando análisis inteligente híbrido...</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-3">
                          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-3">🚀 Sistema Premium Híbrido</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="text-left">
                                <h5 className="font-medium text-blue-800 mb-2">🤖 Inteligencia Artificial:</h5>
                                <ul className="text-blue-700 space-y-1">
                                  <li>• Análisis semántico del texto</li>
                                  <li>• Detección de patrones sospechosos</li>
                                  <li>• Evaluación contextual inteligente</li>
                                </ul>
                              </div>
                              <div className="text-left">
                                <h5 className="font-medium text-purple-800 mb-2">⚖️ Compliance Legal:</h5>
                                <ul className="text-purple-700 space-y-1">
                                  <li>• Matriz de 15 delitos aplicables</li>
                                  <li>• Cálculo matemático P×I</li>
                                  <li>• Controles específicos por delito</li>
                                </ul>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-4">
                              Para activar este módulo, contacte a su administrador.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
          
          {/* Información principal */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la Denuncia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estado Actual</h3>
                  <div className="mt-1 flex items-center">
                    <ReportStatusBadge status={report.status} />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Prioridad</h3>
                  <div className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.priority === 'Alta' 
                        ? 'bg-red-100 text-red-800' 
                        : report.priority === 'Media'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {report.priority}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Categoría</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {report.category === 'modelo_prevencion' && 'Modelo de Prevención de Delitos'}
                    {report.category === 'ley_karin' && 'Ley Karin'}
                    {report.category === 'ciberseguridad' && 'Ciberseguridad'}
                    {report.category === 'reglamento_interno' && 'Infracciones al Reglamento Interno'}
                    {report.category === 'politicas_codigos' && 'Infracciones a Políticas y Códigos'}
                    {report.category === 'represalias' && 'Represalias'}
                    {report.category === 'otros' && 'Otros'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Subcategoría</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {report.subcategory}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha del Incidente</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {report.eventDate.toDate 
                      ? new Date(report.eventDate.toDate()).toLocaleDateString() 
                      : new Date(report.eventDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Investigador Asignado</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {report.assignedToName || 'No asignado'}
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Ubicación Exacta</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {report.exactLocation}
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Descripción Detallada</h3>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-line">
                      {report.detailedDescription}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Información del Denunciante */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Denunciante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.isAnonymous ? (
                  <Alert>
                    <AlertDescription>
                      Esta denuncia fue realizada de forma anónima.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Nombre</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {report.reporter.contactInfo?.name || 'No proporcionado'}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {report.reporter.contactInfo?.email || 'No proporcionado'}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Teléfono</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {report.reporter.contactInfo?.phone || 'No proporcionado'}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Relación con la Empresa</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {report.reporter.relationship}
                      </p>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Relación con los hechos</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {report.relationWithFacts === 'testigo' && 'Testigo directo'}
                    {report.relationWithFacts === 'victima' && 'Víctima'}
                    {report.relationWithFacts === 'conocimiento_indirecto' && 'Conocimiento indirecto'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Personas Denunciadas */}
          <Card>
            <CardHeader>
              <CardTitle>Personas Denunciadas</CardTitle>
            </CardHeader>
            <CardContent>
              {report.accusedPersons && report.accusedPersons.length > 0 ? (
                <div className="space-y-4">
                  {report.accusedPersons.map((person: any, index: number) => (
                    <div 
                      key={person.id || index} 
                      className="p-4 border border-gray-200 rounded-md"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Nombre</h3>
                          <p className="mt-1 text-sm text-gray-900">{person.name}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Cargo / Función</h3>
                          <p className="mt-1 text-sm text-gray-900">{person.position}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Departamento</h3>
                          <p className="mt-1 text-sm text-gray-900">{person.department}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Relación con el denunciante</h3>
                          <p className="mt-1 text-sm text-gray-900">{person.relationship}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No se ha identificado a las personas denunciadas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Gestión */}
        <TabsContent value="management" className="space-y-6">
          {/* Cambio de Estado */}
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Nuevo Estado</Label>
                  <Select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1"
                  >
                    {/* Mostrar estados específicos para casos de Ley Karin */}
                    {report.isKarinLaw ? (
                      <>
                        <option value="complaint_filed">Etapa 1: Interposición de la Denuncia</option>
                        <option value="reception">Etapa 2: Recepción de Denuncia</option>
                        <option value="subsanation">Etapa 2.1: Subsanación de la Denuncia</option>
                        <option value="precautionary_measures">Etapa 3: Medidas Precautorias</option>
                        <option value="decision_to_investigate">Etapa 4: Decisión de Investigar</option>
                        <option value="investigation">Etapa 5: Investigación</option>
                        <option value="report_creation">Etapa 6: Creación del Informe Preliminar</option>
                        <option value="report_approval">Etapa 7: Revisión Interna del Informe</option>
                        <option value="dt_notification">Etapa 8: Notificación a DT</option>
                        <option value="suseso_notification">Etapa 9: Notificación a SUSESO</option>
                        <option value="investigation_complete">Etapa 10: Investigación completa</option>
                        <option value="final_report">Etapa 11: Creación del Informe Final</option>
                        <option value="dt_submission">Etapa 12: Envío a DT</option>
                        <option value="dt_resolution">Etapa 13: Resolución de la DT</option>
                        <option value="measures_adoption">Etapa 14: Adopción de Medidas</option>
                        <option value="sanctions">Etapa 15: Sanciones</option>
                        <option value="closed">Finalizado</option>
                      </>
                    ) : (
                      <>
                        <option value="Nuevo">Nuevo</option>
                        <option value="Admitida">Admitida</option>
                        <option value="Asignada">Asignada</option>
                        <option value="En Investigación">En Investigación</option>
                        <option value="Pendiente Información">Pendiente Información</option>
                        <option value="En Evaluación">En Evaluación</option>
                        <option value="Resuelta">Resuelta</option>
                        <option value="En Seguimiento">En Seguimiento</option>
                        <option value="Cerrada">Cerrada</option>
                        <option value="Rechazada">Rechazada</option>
                      </>
                    )}
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="statusComment">Comentario (opcional)</Label>
                  <Textarea
                    id="statusComment"
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="Razón del cambio de estado..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <Button 
                  onClick={handleStatusChange}
                  disabled={isStatusUnchanged(report, newStatus) || isSubmitting}
                >
                  {updateStatusMutation.isPending ? 'Guardando...' : 'Actualizar Estado'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Asignación de Investigador (solo para admins) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Asignar Investigador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="investigator">Investigador</Label>
                    <Select
                      id="investigator"
                      value={selectedInvestigator}
                      onChange={(e) => setSelectedInvestigator(e.target.value)}
                      className="mt-1"
                    >
                      <option value="">Seleccione un investigador</option>
                      {investigators.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.displayName}
                        </option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="assignmentComment">Comentario (opcional)</Label>
                    <Textarea
                      id="assignmentComment"
                      value={assignmentComment}
                      onChange={(e) => setAssignmentComment(e.target.value)}
                      placeholder="Instrucciones o comentarios para el investigador..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleAssignInvestigator}
                    disabled={selectedInvestigator === report.assignedTo || !selectedInvestigator || isSubmitting}
                  >
                    {assignInvestigatorMutation.isPending ? 'Asignando...' : 'Asignar Investigador'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Historial de Actividades */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividades</CardTitle>
            </CardHeader>
            <CardContent>
              {report.activities && report.activities.length > 0 ? (
                <div className="space-y-6">
                  {report.activities.map((activity: any) => {
                    const timestamp = activity.timestamp.toDate 
                      ? new Date(activity.timestamp.toDate()) 
                      : new Date(activity.timestamp);
                    
                    return (
                      <div key={activity.id} className="relative">
                        <div className="flex items-start">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {activity.actionType === 'reportCreation' && (
                              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            )}
                            {activity.actionType === 'statusChange' && (
                              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                            {activity.actionType === 'assignmentChange' && (
                              <svg className="h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {activity.description}
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              {formatDate(timestamp)}
                            </div>
                            {activity.comment && (
                              <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200">
                                {activity.comment}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay actividades registradas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Comunicaciones */}
        <TabsContent value="communications" className="space-y-6">
          {/* Nueva Comunicación */}
          <Card>
            <CardHeader>
              <CardTitle>Enviar Mensaje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escriba su mensaje aquí..."
                  rows={4}
                />
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isInternal"
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                    checked={isInternalMessage}
                    onChange={(e) => setIsInternalMessage(e.target.checked)}
                  />
                  <label htmlFor="isInternal" className="ml-2 block text-sm text-gray-700">
                    Mensaje interno (solo visible para investigadores)
                  </label>
                </div>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSubmitting}
                >
                  {addCommunicationMutation.isPending ? 'Enviando...' : 'Enviar Mensaje'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Historial de Comunicaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Comunicaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {report.communications && report.communications.length > 0 ? (
                <div className="space-y-6">
                  {report.communications.map((message: any) => {
                    const timestamp = message.timestamp.toDate 
                      ? new Date(message.timestamp.toDate()) 
                      : new Date(message.timestamp);
                    
                    const isFromReporter = message.isFromReporter;
                    const isInternal = message.isInternal;
                    
                    return (
                      <div 
                        key={message.id} 
                        className={`flex ${isFromReporter ? 'justify-start' : 'justify-end'}`}
                      >
                        <div 
                          className={`max-w-md rounded-lg p-4 ${
                            isInternal 
                              ? 'bg-yellow-50 border border-yellow-200' 
                              : isFromReporter 
                                ? 'bg-gray-100 border border-gray-200' 
                                : 'bg-primary-50 border border-primary-200'
                          }`}
                        >
                          <div className="text-sm">
                            {isInternal && (
                              <div className="mb-1 text-xs font-medium text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded inline-block">
                                Mensaje Interno
                              </div>
                            )}
                            <div className="whitespace-pre-line">
                              {message.content}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 text-right">
                              {formatDate(timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay comunicaciones registradas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Evidencias */}
        <TabsContent value="evidence" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evidencias Aportadas</CardTitle>
            </CardHeader>
            <CardContent>
              {report.evidences && report.evidences.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.evidences.map((evidence: any) => (
                    <div 
                      key={evidence.id} 
                      className="p-4 border border-gray-200 rounded-md flex flex-col"
                    >
                      <div className="flex items-start mb-2">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {evidence.originalFilename || evidence.filename}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {evidence.uploadedAt?.toDate 
                              ? formatDate(new Date(evidence.uploadedAt.toDate())) 
                              : evidence.uploadedAt 
                                ? formatDate(new Date(evidence.uploadedAt))
                                : 'Fecha desconocida'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200 mb-3 flex-1">
                        {evidence.description}
                      </div>
                      
                      {evidence.storageRef && (
                        <a 
                          href={evidence.storageRef} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-dark text-sm font-medium"
                        >
                          Descargar archivo
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay evidencias registradas.</p>
              )}
              
              {report.additionalEvidenceDescription && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Evidencias adicionales mencionadas</h3>
                  <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-200">
                    {report.additionalEvidenceDescription}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Link href="/dashboard/reports">
          <Button variant="outline">Volver al Listado</Button>
        </Link>
        {isAdmin && (
          <Link href={`/dashboard/reports/${reportId}/edit`}>
            <Button variant="outline" className="ml-2">Editar Denuncia</Button>
          </Link>
        )}
        <div className="ml-2">
          <ExportReportPDF report={report} />
        </div>
      </div>
    </div>
  );
}