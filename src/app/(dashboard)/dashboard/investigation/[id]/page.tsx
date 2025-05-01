'use client';



// src/app/(dashboard)/dashboard/investigation/[id]/page.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { InvestigationPlan } from '@/components/investigation/InvestigationPlan';
import { PreliminaryReport } from '@/components/investigation/PreliminaryReport';
import { InterviewList } from '@/components/investigation/InterviewList';
import { FindingsList } from '@/components/investigation/FindingsList';
import { TasksList } from '@/components/investigation/TasksList';
import { FinalReport } from '@/components/investigation/FinalReport';
import { KarinTimeline } from '@/components/investigation/KarinTimeline';
import LegalDocumentGenerator from '@/components/ai/LegalDocumentGenerator';
import LegalDocumentViewer from '@/components/ai/LegalDocumentViewer';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useAI } from '@/lib/hooks/useAI';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { 



  getInvestigationDetails,
  completeInvestigation,
  updateKarinStage
} from '@/lib/services/investigationService';

export default function InvestigationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const { uid, isAdmin, isInvestigator, isSuperAdmin, profile } = useCurrentUser();
  const { isEnabled } = useFeatureFlags();
  const { generateLegalDocument, isGeneratingDocument, generatedDocument, error: aiError } = useAI();
  
  // Estados
  const [investigation, setInvestigation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showAiTab, setShowAiTab] = useState(false);
  
  // Determinar la pestaña inicial para casos de Ley Karin
  useEffect(() => {
    if (investigation?.isKarinLaw) {
      setActiveTab('karin'); // Cambiar a la pestaña de Ley Karin para estos casos
    }
  }, [investigation?.isKarinLaw]);
  const [concludingComment, setConcludingComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState<boolean>(false);
  
  // Verificar si el usuario es el investigador asignado, un administrador o un super administrador
  const isAssignedInvestigator = investigation?.assignedTo === uid;
  const canEdit = isAssignedInvestigator || isAdmin || isSuperAdmin;
  
  // Verificar si la funcionalidad de IA está habilitada
  useEffect(() => {
    const aiFeatureEnabled = isEnabled('aiEnabled');
    setShowAiTab(aiFeatureEnabled);
  }, [isEnabled]);
  
  // Cargar los datos de la investigación
  useEffect(() => {
    async function fetchInvestigationDetails() {
      if (!reportId || !uid) return;
      
      try {
        setLoading(true);
        const companyId = 'default'; // En un sistema multi-tenant, esto vendría de un contexto o URL
        
        const result = await getInvestigationDetails(companyId, reportId);
        
        if (result.success) {
          setInvestigation(result.investigation);
        } else {
          setError(result.error || 'Error al cargar los detalles de la investigación');
        }
      } catch (error) {
        console.error('Error al cargar detalles de investigación:', error);
        setError('Ha ocurrido un error al cargar los detalles de la investigación');
      } finally {
        setLoading(false);
      }
    }
    
    fetchInvestigationDetails();
  }, [reportId, uid]);
  
  // Manejar la actualización del plan
  const handlePlanUpdated = (updatedPlan: any) => {
    setInvestigation(prev => ({
      ...prev,
      plan: updatedPlan
    }));
  };
  
  // Manejar la adición de una entrevista
  const handleInterviewAdded = (newInterview: any) => {
    setInvestigation(prev => ({
      ...prev,
      interviews: [newInterview, ...(prev.interviews || [])]
    }));
  };
  
  // Manejar la adición de un hallazgo
  const handleFindingAdded = (newFinding: any) => {
    setInvestigation(prev => ({
      ...prev,
      findings: [newFinding, ...(prev.findings || [])]
    }));
  };
  
  // Manejar la adición o actualización de una tarea
  const handleTaskUpdated = (tasks: any[]) => {
    setInvestigation(prev => ({
      ...prev,
      tasks
    }));
  };
  
  // Manejar la actualización del informe preliminar
  const handlePreliminaryReportUpdated = (updatedReport: any) => {
    setInvestigation(prev => ({
      ...prev,
      preliminaryReport: updatedReport
    }));
  };
  
  // Manejar la actualización del informe final
  const handleReportUpdated = (updatedReport: any) => {
    setInvestigation(prev => ({
      ...prev,
      finalReport: updatedReport
    }));
  };
  
  // Completar la investigación
  const handleCompleteInvestigation = async () => {
    if (!concludingComment.trim()) {
      alert('Por favor, ingrese un comentario de conclusión.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const companyId = 'default';
      
      const result = await completeInvestigation(
        companyId,
        reportId,
        uid!,
        concludingComment
      );
      
      if (result.success) {
        // Actualizar el estado localmente
        setInvestigation(prev => ({
          ...prev,
          status: 'Resuelta'
        }));
        
        // Cerrar el diálogo
        setShowCompleteDialog(false);
        
        // Mostrar mensaje de éxito
        alert('Investigación completada exitosamente.');
        
        // Redireccionar al listado de investigaciones después de un breve retraso
        setTimeout(() => {
          router.push('/dashboard/investigation');
        }, 2000);
      } else {
        setError(result.error || 'Error al completar la investigación');
      }
    } catch (error) {
      console.error('Error al completar la investigación:', error);
      setError('Ha ocurrido un error al completar la investigación');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Actualizar etapa del proceso Ley Karin
  const handleUpdateKarinStage = async (stage: string, notes: string) => {
    try {
      const companyId = 'default';
      
      const result = await updateKarinStage(
        companyId,
        reportId,
        uid!,
        stage,
        notes
      );
      
      if (result.success) {
        // Recargar los datos de la investigación para reflejar los cambios
        const updatedResult = await getInvestigationDetails(companyId, reportId);
        if (updatedResult.success) {
          setInvestigation(updatedResult.investigation);
        }
        
        return Promise.resolve();
      } else {
        setError(result.error || 'Error al actualizar etapa Ley Karin');
        return Promise.reject(new Error(result.error));
      }
    } catch (error) {
      console.error('Error al actualizar etapa Ley Karin:', error);
      setError('Ha ocurrido un error al actualizar la etapa del proceso Ley Karin');
      return Promise.reject(error);
    }
  };
  
  if (!isInvestigator && !isAdmin && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página. Esta sección está reservada para investigadores y administradores.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando información de la investigación...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard/investigation">
            <Button>Volver al Listado</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (!investigation) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>No se encontró la investigación solicitada.</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard/investigation">
            <Button>Volver al Listado</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Verificar si la investigación está completa o si falta algún elemento clave
  const hasEssentialElements = investigation.plan && 
                             investigation.interviews?.length > 0 && 
                             investigation.findings?.length > 0 && 
                             investigation.finalReport &&
                             // Para casos Ley Karin, también necesitamos el informe preliminar
                             (!investigation.isKarinLaw || investigation.preliminaryReport);
  
  const canComplete = hasEssentialElements && 
                    (investigation.status === 'En Investigación' || 
                     investigation.status === 'En Evaluación');
  
  // Formatear fechas
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  };
  
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            Investigación: Denuncia #{investigation.code}
            {investigation.isKarinLaw && (
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Ley Karin
              </span>
            )}
          </h1>
          <div className="flex items-center mt-1 space-x-2">
            <ReportStatusBadge status={investigation.status} />
            <span className="text-gray-500">
              Creada el {formatDate(investigation.createdAt)}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Link href="/dashboard/investigation">
            <Button variant="outline">Volver</Button>
          </Link>
          
          <Link href={`/dashboard/reports/${reportId}`}>
            <Button variant="outline">Ver Denuncia</Button>
          </Link>
          
          {canEdit && canComplete && (
            <Button 
              onClick={() => setShowCompleteDialog(true)}
              className="bg-green-600 hover:bg-green-700"
              disabled={!hasEssentialElements}
            >
              Completar Investigación
            </Button>
          )}
        </div>
      </div>
      
      {/* Diálogo de confirmación para completar la investigación */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Completar Investigación</h3>
            <p className="text-gray-600 mb-4">
              Al completar la investigación, el estado de la denuncia cambiará a "Resuelta" y se generará un informe final.
              Este paso no se puede deshacer.
            </p>
            
            <div className="mb-4">
              <Label htmlFor="concludingComment">Comentario de conclusión</Label>
              <Textarea
                id="concludingComment"
                value={concludingComment}
                onChange={(e) => setConcludingComment(e.target.value)}
                rows={4}
                placeholder="Resuma las conclusiones de la investigación y las medidas recomendadas..."
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCompleteDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCompleteInvestigation}
                disabled={isSubmitting || !concludingComment.trim()}
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar y Completar'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${
          (showAiTab && investigation?.isKarinLaw) ? 'grid-cols-8' : 
          (showAiTab || investigation?.isKarinLaw) ? 'grid-cols-7' : 'grid-cols-6'
        }`}>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          {investigation?.isKarinLaw && (
            <TabsTrigger value="preliminary" className="bg-red-50 text-red-800 hover:bg-red-100">Inf. Preliminar</TabsTrigger>
          )}
          <TabsTrigger value="interviews">Entrevistas</TabsTrigger>
          <TabsTrigger value="findings">Hallazgos</TabsTrigger>
          <TabsTrigger value="report">Informe Final</TabsTrigger>
          {showAiTab && (
            <TabsTrigger value="ai" className="bg-blue-50 text-blue-800 hover:bg-blue-100">Asistente IA</TabsTrigger>
          )}
          {investigation?.isKarinLaw && (
            <TabsTrigger value="karin" className="bg-red-50 text-red-800 hover:bg-red-100">Ley Karin</TabsTrigger>
          )}
        </TabsList>
        
        {/* Pestaña de Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Categoría</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {investigation.category === 'modelo_prevencion' && 'Modelo de Prevención de Delitos'}
                  {investigation.category === 'ley_karin' && 'Ley Karin'}
                  {investigation.category === 'ciberseguridad' && 'Ciberseguridad'}
                  {investigation.category === 'reglamento_interno' && 'Infracciones al Reglamento Interno'}
                  {investigation.category === 'politicas_codigos' && 'Políticas y Códigos'}
                  {investigation.category === 'represalias' && 'Represalias'}
                  {investigation.category === 'otros' && 'Otros'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Subcategoría</h3>
                <p className="mt-1 text-sm text-gray-900">{investigation.subcategory}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Denunciante</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {investigation.isAnonymous 
                    ? 'Anónimo' 
                    : investigation.reporter?.contactInfo?.name || 'No disponible'
                  }
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Fecha del Incidente</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(investigation.eventDate)}
                </p>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Descripción</h3>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-line">
                    {investigation.detailedDescription}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Progreso de la Investigación */}
          <Card>
            <CardHeader>
              <CardTitle>Progreso de la Investigación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                    investigation.plan ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {investigation.plan ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span>1</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Plan de Investigación</h3>
                    <p className="text-xs text-gray-500">
                      {investigation.plan 
                        ? 'Plan creado el ' + formatDate(investigation.plan.createdAt) 
                        : 'Pendiente de crear'
                      }
                    </p>
                  </div>
                  {!investigation.plan && canEdit && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setActiveTab('plan')}
                    >
                      Crear Plan
                    </Button>
                  )}
                </div>
                
                {investigation.isKarinLaw && (
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                      investigation.preliminaryReport ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {investigation.preliminaryReport ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span>2</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Informe Preliminar
                        <span className="ml-2 text-xs text-red-600 font-normal">Ley Karin</span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        {investigation.preliminaryReport 
                          ? 'Informe creado el ' + formatDate(investigation.preliminaryReport.createdAt) 
                          : 'Pendiente de crear - Requerido para Dirección del Trabajo'
                        }
                      </p>
                    </div>
                    {!investigation.preliminaryReport && canEdit && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-auto"
                        onClick={() => setActiveTab('preliminary')}
                      >
                        Crear Informe
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                    (investigation.interviews?.length || 0) > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {(investigation.interviews?.length || 0) > 0 ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span>{investigation.isKarinLaw ? '3' : '2'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Entrevistas</h3>
                    <p className="text-xs text-gray-500">
                      {(investigation.interviews?.length || 0) > 0 
                        ? `${investigation.interviews.length} entrevista(s) realizada(s)` 
                        : 'Ninguna entrevista registrada'
                      }
                    </p>
                  </div>
                  {(investigation.interviews?.length || 0) === 0 && canEdit && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setActiveTab('interviews')}
                    >
                      Registrar Entrevista
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                    (investigation.findings?.length || 0) > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {(investigation.findings?.length || 0) > 0 ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span>{investigation.isKarinLaw ? '4' : '3'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Hallazgos</h3>
                    <p className="text-xs text-gray-500">
                      {(investigation.findings?.length || 0) > 0 
                        ? `${investigation.findings.length} hallazgo(s) registrado(s)` 
                        : 'Ningún hallazgo registrado'
                      }
                    </p>
                  </div>
                  {(investigation.findings?.length || 0) === 0 && canEdit && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setActiveTab('findings')}
                    >
                      Registrar Hallazgo
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                    investigation.finalReport 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {investigation.finalReport ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span>{investigation.isKarinLaw ? '5' : '4'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Informe Final</h3>
                    <p className="text-xs text-gray-500">
                      {investigation.finalReport 
                        ? 'Informe creado el ' + formatDate(investigation.finalReport.createdAt) 
                        : 'Pendiente de crear'
                      }
                    </p>
                  </div>
                  {!investigation.finalReport && canEdit && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setActiveTab('report')}
                    >
                      Crear Informe
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tareas */}
          <Card>
            <CardHeader>
              <CardTitle>Tareas Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              {(investigation.tasks?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {investigation.tasks
                    .filter((task: any) => task.status !== 'completada' && task.status !== 'cancelada')
                    .slice(0, 5) // Mostrar solo las primeras 5 tareas pendientes
                    .map((task: any) => (
                      <div key={task.id} className="flex items-center border-l-4 border-yellow-400 pl-3 py-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                          <p className="text-xs text-gray-500">
                            Vence el: {formatDate(task.dueDate)} - 
                            Prioridad: {
                              task.priority === 'alta' ? 'Alta' :
                              task.priority === 'media' ? 'Media' : 'Baja'
                            }
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveTab('tasks')}
                        >
                          Ver
                        </Button>
                      </div>
                    ))
                  }
                  
                  {investigation.tasks.filter((task: any) => 
                    task.status !== 'completada' && task.status !== 'cancelada'
                  ).length > 5 && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('tasks')}
                      >
                        Ver todas las tareas
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No hay tareas pendientes</p>
                  {canEdit && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setActiveTab('tasks')}
                    >
                      Crear Tarea
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Plan */}
        <TabsContent value="plan">
          <InvestigationPlan 
            reportId={reportId}
            plan={investigation.plan}
            reportData={investigation}
            isKarinLaw={investigation.isKarinLaw}
            canEdit={canEdit}
            onPlanUpdated={handlePlanUpdated}
          />
        </TabsContent>
        
        {/* Pestaña de Informe Preliminar */}
        {investigation?.isKarinLaw && (
          <TabsContent value="preliminary">
            <PreliminaryReport 
              reportId={reportId}
              reportData={investigation || {}}
              preliminaryReport={investigation?.preliminaryReport || null}
              isKarinLaw={investigation?.isKarinLaw || false}
              canEdit={canEdit}
              onReportUpdated={handlePreliminaryReportUpdated}
            />
          </TabsContent>
        )}
        
        {/* Pestaña de Entrevistas */}
        <TabsContent value="interviews">
          <InterviewList
            reportId={reportId}
            interviews={investigation.interviews || []}
            canEdit={canEdit}
            onInterviewAdded={handleInterviewAdded}
          />
        </TabsContent>
        
        {/* Pestaña de Hallazgos */}
        <TabsContent value="findings">
          <FindingsList
            reportId={reportId}
            findings={investigation.findings || []}
            evidences={investigation.evidences || []}
            canEdit={canEdit}
            onFindingAdded={handleFindingAdded}
          />
        </TabsContent>
        
        {/* Pestaña de Tareas */}
        <TabsContent value="tasks">
          <TasksList
            reportId={reportId}
            tasks={investigation.tasks || []}
            canEdit={canEdit}
            onTasksUpdated={handleTaskUpdated}
          />
        </TabsContent>
        
        {/* Pestaña de Informe */}
        <TabsContent value="report">
          <FinalReport
            reportId={reportId}
            report={investigation.finalReport}
            findings={investigation.findings || []}
            isKarinLaw={investigation.isKarinLaw}
            canEdit={canEdit}
            onReportUpdated={handleReportUpdated}
          />
        </TabsContent>
        
        {/* Pestaña de Ley Karin */}
        {investigation?.isKarinLaw && (
          <TabsContent value="karin">
            <KarinTimeline
              report={investigation}
              onUpdateStage={handleUpdateKarinStage}
            />
          </TabsContent>
        )}
        
        {/* Pestaña de Asistente IA */}
        {showAiTab && (
          <TabsContent value="ai" className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Asistente de Inteligencia Artificial</h3>
              <p className="text-sm text-blue-600">
                Este asistente utiliza inteligencia artificial para generar documentos legales 
                y administrativos relacionados con la investigación. Los documentos generados 
                son sugerencias y deben ser revisados antes de su uso oficial.
              </p>
            </div>
            
            <LegalDocumentGenerator
              reportId={reportId}
              reportData={{
                ...investigation,
                currentUserName: profile?.displayName || 'Investigador',
                currentUserPosition: profile?.position || 'Investigador Asignado',
                companyName: 'Empresa', // En un sistema real, obtener desde el contexto
              }}
              generateDocument={generateLegalDocument}
              isLoading={isGeneratingDocument}
              error={aiError}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}