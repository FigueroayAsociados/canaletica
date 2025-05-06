'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { ensureKarinCategoryExists } from '@/lib/services/setupService';
import { getKarinReports } from '@/lib/services/reportService';
import { KarinProcessStage, DEFAULT_PRECAUTIONARY_MEASURES, KARIN_RISK_QUESTIONS } from '@/types/report';
import { useKarinReports, useUpdateKarinStage } from '@/lib/hooks/useReports';
import { PrecautionaryMeasures } from '@/components/investigation/PrecautionaryMeasures';

export default function AdminLeyKarinPage() {
  // 1. Estados de React - todos juntos al principio
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  // Estados para modales y UI
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isMeasuresModalOpen, setIsMeasuresModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isManageReportModalOpen, setIsManageReportModalOpen] = useState(false);
  const [isMeasuresFormModalOpen, setIsMeasuresFormModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editingMeasure, setEditingMeasure] = useState<string | null>(null);
  
  // 2. Custom hooks
  const { isAdmin } = useCurrentUser();
  
  // 3. Variables constantes
  const companyId = 'default'; // Usar ID predeterminado
  
  // 4. Funciones traducidas
  // Traducir etapa del proceso a español para mejor visualización
  const translateStage = React.useCallback((stage?: string): string => {
    if (!stage) return 'No definida';
    
    const stageMap: Record<string, string> = {
      'complaint_filed': 'Denuncia Interpuesta',
      'reception': 'Recepción',
      'subsanation': 'Subsanación',
      'dt_notification': 'Notificación Inicial a DT',
      'suseso_notification': 'Notificación a SUSESO',
      'precautionary_measures': 'Medidas Precautorias',
      'decision_to_investigate': 'Decisión de Investigar',
      'investigation': 'En Investigación',
      'report_creation': 'Creación de Informe',
      'report_approval': 'Aprobación de Informe',
      'labor_department': 'Remisión a Dir. del Trabajo',
      'dt_resolution': 'Resolución de DT',
      'measures_adoption': 'Adopción de Medidas',
      'sanctions': 'Sanciones',
      'third_party': 'Caso con Terceros',
      'subcontracting': 'Régimen Subcontratación',
      'closed': 'Cerrada',
      // Mapear valores antiguos por compatibilidad
      'orientation': 'Denuncia Interpuesta', // Mapeo de etapa antigua a nueva
      'preliminaryReport': 'Creación de Informe' // Mapeo de etapa antigua a nueva
    };
    
    return stageMap[stage] || stage;
  }, []);
  
  // 5. Hooks de React Query
  const initializeCategory = useMutation({
    mutationFn: () => ensureKarinCategoryExists(companyId),
    onSuccess: (result) => {
      if (result.success) {
        setSuccess(`Categoría Ley Karin configurada correctamente: ${result.message}. ID: ${result.categoryId}`);
      }
    },
    onError: (error: any) => {
      console.error('Error al inicializar categoría Ley Karin:', error);
      setError(error.message || 'Error al inicializar el módulo de Ley Karin');
    }
  });
  
  const { 
    data: reportsData, 
    isLoading: isLoadingReports, 
    error: reportsError 
  } = useKarinReports(companyId);
  
  const updateStageMutation = useUpdateKarinStage();
  
  // 6. Funciones de gestión con useCallback
  const resetKarinCategory = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ensureKarinCategoryExists(companyId);
      
      if (result.success) {
        setSuccess(`Categoría Ley Karin actualizada correctamente. Recargue la página.`);
      } else {
        setError(result.error || "Error desconocido al recrear categoría");
      }
    } catch (err) {
      setError("Error al reiniciar: " + (err.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  
  const handleManageReport = React.useCallback((report: any) => {
    setSelectedReport(report);
    setIsManageReportModalOpen(true);
  }, []);
  
  const openMeasuresForm = React.useCallback(() => {
    if (!selectedReport) return;
    
    setIsMeasuresFormModalOpen(true);
    setIsManageReportModalOpen(false);
  }, [selectedReport]);
  
  const updateReportStage = React.useCallback(async (reportId: string, newStage: string, additionalData = {}) => {
    try {
      setLoading(true);
      
      await updateStageMutation.mutateAsync({
        companyId,
        reportId,
        newStage: newStage as KarinProcessStage,
        additionalData
      });
      
      setSuccess(`Etapa actualizada a: ${translateStage(newStage)}`);
      setIsManageReportModalOpen(false);
    } catch (error) {
      console.error('Error al actualizar etapa:', error);
      setError('Error al actualizar la etapa de la denuncia');
    } finally {
      setLoading(false);
    }
  }, [companyId, updateStageMutation, translateStage]);
  
  // 7. Effects
  // Estado para rastrear la inicialización
  const [initAttempted, setInitAttempted] = useState(false);

  useEffect(() => {
    // Solo inicializar una vez al cargar la página
    if (!initAttempted && !initializeCategory.isPending && !initializeCategory.isSuccess) {
      setInitAttempted(true);
      initializeCategory.mutate();
    }
  }, [initializeCategory, initAttempted]);
  
  useEffect(() => {
    if (reportsData?.success) {
      setReports(reportsData.reports);
    } else if (reportsData?.error) {
      setError(reportsData.error);
    }
  }, [reportsData]);
  
  useEffect(() => {
    setLoading(initializeCategory.isPending || isLoadingReports);
  }, [initializeCategory.isPending, isLoadingReports]);
  
  useEffect(() => {
    if (reportsError) {
      setError((reportsError as Error).message || 'Error al cargar denuncias Ley Karin');
    }
  }, [reportsError]);
  
  // 8. Renderizados condicionales
  if (!isAdmin) {
    return (
      <Alert variant="error" className="mb-4">
        <AlertDescription>No tiene permisos para acceder a esta sección.</AlertDescription>
      </Alert>
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
          <p className="text-gray-600">Inicializando módulo Ley Karin...</p>
        </div>
      </div>
    );
  }

  // 9. Renderizado principal
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Administración - Ley Karin</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsGuideModalOpen(true)}
          >
            Ver Guía
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsStatsModalOpen(true)}
          >
            Estadísticas
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Panel Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Las denuncias por Ley Karin requieren un proceso especial con plazos específicos.
              </p>
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full"
                  onClick={() => setIsConfigModalOpen(true)}
                >
                  Editar Configuración
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={resetKarinCategory}
                >
                  Reiniciar Categoría
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plantillas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Administre las plantillas de informes, actas y formularios requeridos por la Ley Karin.
              </p>
              <Button 
                className="w-full"
                onClick={() => setIsTemplatesModalOpen(true)}
              >
                Administrar Plantillas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medidas Precautorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Configure las medidas precautorias predefinidas disponibles para las denuncias Ley Karin.
              </p>
              <Button 
                className="w-full"
                onClick={() => setIsMeasuresModalOpen(true)}
              >
                Configurar Medidas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagrama de Flujo del Proceso */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Flujo del Proceso Ley Karin</CardTitle>
          {selectedReport && (
            <div className="text-sm text-gray-600">
              Mostrando progreso de: <span className="font-semibold">{selectedReport.code}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg overflow-x-auto">
            <div className="flex flex-nowrap min-w-max gap-2">
              {/* Etapas del proceso como diagrama de flujo */}
              {['complaint_filed', 'reception', 'subsanation', 'precautionary_measures', 'decision_to_investigate', 
                'investigation', 'report_creation', 'report_approval', 'dt_notification', 'suseso_notification', 
                'investigation_complete', 'final_report', 'dt_submission', 'dt_resolution', 'measures_adoption', 'sanctions', 'closed']
                .map((stage, index, stages) => {
                  // Determinar si la etapa está completa o activa basado en el reporte seleccionado
                  let isActive = false;
                  let isCompleted = false;
                  
                  if (selectedReport) {
                    const currentStageIndex = stages.indexOf(selectedReport.karinProcess?.stage);
                    isActive = stage === selectedReport.karinProcess?.stage;
                    isCompleted = currentStageIndex > index;
                  }
                  
                  return (
                    <div key={stage} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center 
                          ${isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isActive 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-500'}`}>
                          {isCompleted ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (index + 1)}
                        </div>
                        <span className="text-xs mt-2 text-center w-20">{translateStage(stage)}</span>
                      </div>
                      {index < stages.length - 1 && (
                        <div className={`w-8 h-0.5 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                      )}
                    </div>
                  );
                })
              }
            </div>
          </div>
          
          {!selectedReport && (
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Haga clic en "Gestionar" en una denuncia para ver su progreso en el flujo</p>
            </div>
          )}
          
          {selectedReport && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">Denuncia:</span> {selectedReport.code}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Etapa:</span> {translateStage(selectedReport.karinProcess?.stage)}
                </div>
                <div>
                  {selectedReport.remainingDays !== null && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedReport.isOverdue 
                        ? 'bg-red-100 text-red-800' 
                        : selectedReport.remainingDays <= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedReport.isOverdue 
                        ? `Vencido (${Math.abs(selectedReport.remainingDays)} días)` 
                        : `${selectedReport.remainingDays} días restantes`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard de Denuncias Ley Karin */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Denuncias Ley Karin Activas</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay denuncias Ley Karin activas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Etapa
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investigador
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Días Restantes
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subcategoría
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.createdAt?.toDate 
                            ? new Date(report.createdAt.toDate()).toLocaleDateString()
                            : new Date(report.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {translateStage(report.karinProcess?.stage)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.assignedToName || 'No asignado'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.remainingDays !== null ? (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            report.isOverdue 
                              ? 'bg-red-100 text-red-800' 
                              : report.remainingDays <= 5
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {report.isOverdue 
                              ? `Vencido (${Math.abs(report.remainingDays)} días)` 
                              : `${report.remainingDays} días`}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.subcategory || 'No especificada'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="mr-2" onClick={() => handleManageReport(report)}>
                            Gestionar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => window.open(`/dashboard/investigation/${report.id}`, '_blank')}
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para gestionar una denuncia Ley Karin */}
      {isManageReportModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Gestionar Denuncia Ley Karin</h3>
              <button onClick={() => setIsManageReportModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">Código: <span className="font-bold">{selectedReport.code}</span></p>
                  <p className="text-sm">Etapa actual: <span className="font-semibold">{translateStage(selectedReport.karinProcess?.stage)}</span></p>
                </div>
                <div>
                  <p className="text-sm">Creada: {new Date(selectedReport.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm">Investigador: {selectedReport.assignedToName || 'No asignado'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Actualizar etapa del proceso</h4>
                <div className="grid grid-cols-1 gap-4">
                  {['complaint_filed', 'reception', 'subsanation', 'precautionary_measures', 
                   'decision_to_investigate', 'investigation', 'report_creation', 'report_approval',
                   'dt_notification', 'suseso_notification', 'investigation_complete', 'final_report',
                   'dt_submission', 'dt_resolution', 'measures_adoption', 'sanctions', 
                   'third_party', 'subcontracting', 'closed'].map((stage) => (
                    <Button 
                      key={stage}
                      variant={selectedReport.karinProcess?.stage === stage ? "default" : "outline"} 
                      className="justify-start"
                      disabled={selectedReport.karinProcess?.stage === stage}
                      onClick={() => updateReportStage(selectedReport.id, stage)}
                    >
                      {translateStage(stage)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Acciones rápidas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => window.open(`/dashboard/investigation/${selectedReport.id}`, '_blank')}>
                    Ver detalles completos
                  </Button>
                  <Button variant="outline" onClick={openMeasuresForm}>
                    Gestionar medidas
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`/dashboard/investigation/${selectedReport.id}`, '_blank')}>
                    Asignar investigador
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`/dashboard/reports/${selectedReport.id}`, '_blank')}>
                    Ver reporte final
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsManageReportModalOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de configuración - Placeholder */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Configuración Ley Karin</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Días hábiles para investigación</label>
                <input type="number" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" defaultValue={30} />
                <p className="mt-1 text-xs text-gray-500">Plazo máximo legal: 30 días hábiles</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Días hábiles para medidas precautorias</label>
                <input type="number" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" defaultValue={3} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Enviar notificaciones</label>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm">Al cambiar de etapa</span>
                  </label>
                </div>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm">Al acercarse la fecha límite</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsConfigModalOpen(false)}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de plantillas - Placeholder */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Plantillas Ley Karin</h3>
              <button onClick={() => setIsTemplatesModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {editingTemplate ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">Editar plantilla: {editingTemplate}</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md"
                        defaultValue={editingTemplate}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contenido de la plantilla</label>
                      <textarea 
                        className="w-full p-2 border rounded-md font-mono text-sm"
                        rows={15}
                        defaultValue={`# ${editingTemplate}

Este es un documento de plantilla para ${editingTemplate.toLowerCase()}.

## Campos disponibles:

- \{\{fecha\}\}: Fecha actual
- \{\{codigo_denuncia\}\}: Código único de la denuncia
- \{\{nombre_denunciante\}\}: Nombre del denunciante
- \{\{nombre_denunciado\}\}: Nombre del denunciado
- \{\{detalle_denuncia\}\}: Descripción detallada proporcionada

## Secciones

1. Introducción
2. Antecedentes
3. Desarrollo
4. Conclusiones
5. Recomendaciones`}
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Utilice la sintaxis Markdown para dar formato al documento. Los campos entre {'{{'}llaves{'}}'}  serán reemplazados con la información de la denuncia.</p>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setEditingTemplate(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          setSuccess("Plantilla guardada correctamente");
                          setEditingTemplate(null);
                        }}
                      >
                        Guardar Plantilla
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h4 className="font-medium">Acta de Denuncia</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingTemplate("Acta de Denuncia")}
                      >
                        Editar
                      </Button>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">Documento formal para registrar una denuncia por acoso laboral o sexual.</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h4 className="font-medium">Informe de Investigación</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingTemplate("Informe de Investigación")}
                      >
                        Editar
                      </Button>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">Formato estándar para reportar los hallazgos de la investigación.</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h4 className="font-medium">Medidas Precautorias</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingTemplate("Medidas Precautorias")}
                      >
                        Editar
                      </Button>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">Documento para formalizar las medidas precautorias impuestas.</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h4 className="font-medium">Resolución Final</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingTemplate("Resolución Final")}
                      >
                        Editar
                      </Button>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">Plantilla para documentar la decisión final del proceso.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button variant="outline">
                Añadir Nueva Plantilla
              </Button>
              <Button variant="secondary" onClick={() => setIsTemplatesModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de medidas precautorias - Placeholder */}
      {isMeasuresModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Medidas Precautorias</h3>
              <button onClick={() => setIsMeasuresModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {editingMeasure ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">{editingMeasure === 'new' ? 'Nueva Medida Precautoria' : 'Editar Medida Precautoria'}</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la medida</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md"
                        defaultValue={editingMeasure === 'new' ? '' : editingMeasure}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea 
                        className="w-full p-2 border rounded-md"
                        rows={3}
                        defaultValue={editingMeasure === 'new' ? '' : 'Descripción detallada sobre cómo implementar esta medida precautoria y cuál es su objetivo principal.'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plazo recomendado</label>
                      <div className="flex space-x-2">
                        <input 
                          type="number" 
                          className="w-20 p-2 border rounded-md"
                          defaultValue="3"
                        />
                        <select className="p-2 border rounded-md">
                          <option value="dias">Días</option>
                          <option value="semanas">Semanas</option>
                          <option value="meses">Meses</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setEditingMeasure(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          setSuccess("Medida precautoria guardada correctamente");
                          setEditingMeasure(null);
                        }}
                      >
                        Guardar Medida
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Lista de medidas precautorias predefinidas */}
                  {DEFAULT_PRECAUTIONARY_MEASURES.map((measure, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{measure.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{measure.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingMeasure(measure.name)}
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button 
                variant="outline"
                onClick={() => setEditingMeasure('new')}
              >
                Añadir Nueva Medida
              </Button>
              <Button variant="secondary" onClick={() => setIsMeasuresModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de guía de Ley Karin */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Guía de Implementación - Ley Karin</h3>
              <button onClick={() => setIsGuideModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="prose max-w-none">
              <h2>Acerca de la Ley Karin</h2>
              <p>
                La <strong>Ley Karin</strong> (Ley 21.643), vigente desde junio de 2023, establece la tipificación del acoso laboral y sexual como conductas que constituyen vulneraciones a los derechos fundamentales del trabajador, modificando el Código del Trabajo y la Ley de Estatuto Administrativo.
              </p>
              
              <h3>Principales aspectos:</h3>
              <ul>
                <li>Define y regula el acoso laboral, acoso sexual y violencia en el trabajo.</li>
                <li>Establece un procedimiento de denuncia obligatorio para empresas.</li>
                <li>Exige medidas precautorias durante la investigación.</li>
                <li>Establece plazos máximos para cada etapa del proceso.</li>
                <li>Obliga a designar un investigador imparcial.</li>
              </ul>
              
              <h3>Diagrama del procedimiento:</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <ol className="list-decimal pl-5 space-y-4">
                  <li>
                    <strong>Interposición de la denuncia:</strong> La persona afectada o un tercero presenta la denuncia formal.
                  </li>
                  <li>
                    <strong>Recepción de la denuncia:</strong> La empresa verifica que cumpla con los requisitos mínimos.
                  </li>
                  <li>
                    <strong>Medidas precautorias:</strong> Se implementan dentro de los 3 días hábiles siguientes a la recepción.
                  </li>
                  <li>
                    <strong>Decisión de investigar:</strong> Se designa a un investigador imparcial.
                  </li>
                  <li>
                    <strong>Investigación:</strong> Plazo máximo de 30 días hábiles.
                  </li>
                  <li>
                    <strong>Creación del Informe:</strong> Redacción del informe con hallazgos.
                  </li>
                  <li>
                    <strong>Aprobación del Informe:</strong> Revisión y aprobación del informe final.
                  </li>
                  <li>
                    <strong>Dirección del Trabajo (DT):</strong> <span className="text-orange-700">Dentro de los 2 días hábiles siguientes a la finalización de la investigación</span>, se debe enviar el informe final y todo el expediente a la Dirección del Trabajo, quienes tendrán <span className="text-orange-700">30 días hábiles para revisar el procedimiento</span>.
                  </li>
                  <li>
                    <strong>Adopción de medidas:</strong> Una vez que la DT emite su pronunciamiento, hay un plazo de <span className="text-orange-700">15 días para implementar las medidas</span> propuestas en la investigación o las que la DT disponga.
                  </li>
                  <li>
                    <strong>Sanciones:</strong> Aplicación de sanciones según corresponda.
                  </li>
                </ol>
              </div>
              
              <h3>Plazos legales importantes:</h3>
              <table className="min-w-full mt-4 border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Etapa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Plazo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">Medidas Precautorias</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border">3 días hábiles</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">Investigación</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border">30 días hábiles</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">Envío a Dirección del Trabajo</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border">2 días hábiles tras finalizar investigación</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">Revisión por Dirección del Trabajo</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border">30 días hábiles</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">Implementación de medidas</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border">15 días tras resolución de DT</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">Información a partes</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border">5 días hábiles</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={() => setIsGuideModalOpen(false)}>
                Cerrar Guía
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de estadísticas */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Estadísticas - Ley Karin</h3>
              <button onClick={() => setIsStatsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{reports.length}</div>
                  <div className="text-sm text-gray-600">Denuncias Totales</div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {reports.filter(r => r.karinProcess?.stage === 'investigation').length}
                  </div>
                  <div className="text-sm text-gray-600">En Investigación</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {reports.filter(r => r.karinProcess?.stage === 'closed').length}
                  </div>
                  <div className="text-sm text-gray-600">Cerradas</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Distribución por Subcategoría</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-24 text-sm">Acoso Laboral</div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">65%</div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-24 text-sm">Acoso Sexual</div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: '25%' }}></div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">25%</div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-24 text-sm">Violencia</div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: '10%' }}></div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">10%</div>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Tiempo Promedio por Etapa</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-28 text-sm">Medidas</div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">2.5 días</div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-28 text-sm">Investigación</div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">22.5 días</div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-28 text-sm">Total Proceso</div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: '70%' }}></div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">35 días</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Factores de Riesgo más Frecuentes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {KARIN_RISK_QUESTIONS.filter(q => q.riskLevel === 'high').map((question, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mt-1.5"></span>
                      <span className="text-sm">{question.question}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setIsStatsModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para aplicar medidas precautorias usando el nuevo componente */}
      {isMeasuresFormModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Aplicar Medidas Precautorias</h3>
              <button onClick={() => setIsMeasuresFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded mb-4">
              <div>
                <p className="text-sm font-medium">Código: <span className="font-bold">{selectedReport.code}</span></p>
                <p className="text-sm">Etapa actual: <span className="font-semibold">{translateStage(selectedReport.karinProcess?.stage)}</span></p>
              </div>
            </div>
            
            {/* Nuevo componente de medidas precautorias */}
            <PrecautionaryMeasures 
              reportId={selectedReport.id}
              companyId={companyId}
              existingMeasures={selectedReport.karinProcess?.precautionaryMeasures || []}
              onClose={() => {
                setIsMeasuresFormModalOpen(false);
                setIsManageReportModalOpen(true);
              }}
              onSuccess={() => {
                setSuccess("Medidas precautorias aplicadas correctamente");
                setIsMeasuresFormModalOpen(false);
              }}
            />
            
            {/* Mostrar factores de riesgo si existen en el reporte seleccionado */}
            {selectedReport.karinRiskFactors && Object.keys(selectedReport.karinRiskFactors).length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium mb-2">Factores de riesgo identificados</h4>
                <ul className="space-y-1">
                  {KARIN_RISK_QUESTIONS.filter(q => selectedReport.karinRiskFactors[q.id] === true).map(question => (
                    <li key={question.id} className="flex items-start">
                      <span className={`inline-block w-3 h-3 rounded-full mt-1 mr-2 ${
                        question.riskLevel === 'high' ? 'bg-red-500' : 
                        question.riskLevel === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                      }`}></span>
                      <span className="text-sm">
                        {question.question} 
                        <span className="text-xs text-gray-600 ml-1">
                          ({question.riskLevel === 'high' ? 'Alto' : question.riskLevel === 'medium' ? 'Medio' : 'Bajo'})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}