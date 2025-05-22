// src/components/investigation/KarinDeadlinesTimelineAdvanced.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO, isAfter, isBefore, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { 
  KarinDeadline, 
  KarinStageDeadline, 
  getDeadlinesByReportId, 
  updateDeadline, 
  createDeadline,
  calculateStageDeadlines,
  generateDeadlineNotifications,
  DeadlineAlertLevel,
  getAffectedByExtension,
  extendDeadline
} from '@/lib/services/karinDeadlinesService';
import { KarinProcessStage, KarinStageType, KarinLegalRequirement } from '@/types/karinDeadlines';
import { getBusinessDaysCount, formatRelativeDateWithDays } from '@/lib/utils/dateUtils';

interface KarinDeadlinesTimelineAdvancedProps {
  reportId: string;
  companyId: string;
  reportDate: Date | string;
  showActions?: boolean;
  onDeadlineUpdate?: (updatedDeadline: KarinDeadline) => void;
}

export default function KarinDeadlinesTimelineAdvanced({
  reportId,
  companyId,
  reportDate,
  showActions = true,
  onDeadlineUpdate
}: KarinDeadlinesTimelineAdvancedProps) {
  const { uid, isAdmin, isInvestigator } = useCurrentUser();
  
  // Estados para gestionar los plazos
  const [deadlines, setDeadlines] = useState<KarinDeadline[]>([]);
  const [stageDeadlines, setStageDeadlines] = useState<KarinStageDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para edición
  const [isEditingDeadline, setIsEditingDeadline] = useState<string | null>(null);
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [isExtendingDeadline, setIsExtendingDeadline] = useState<string | null>(null);
  
  // Formulario para edición y creación
  const [deadlineForm, setDeadlineForm] = useState<Partial<KarinDeadline>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    stage: KarinProcessStage.COMPLAINT_FILED,
    stageType: KarinStageType.MANDATORY,
    legalRequirement: KarinLegalRequirement.LAW_21643,
    businessDays: 5,
    completed: false,
    completedDate: null,
    notificationSent: false,
    notes: '',
    createdBy: uid || ''
  });
  
  // Formulario para extensión de plazos
  const [extensionForm, setExtensionForm] = useState({
    additionalDays: 5,
    reason: '',
    affectedDeadlines: [] as KarinDeadline[]
  });
  
  // Cargar plazos al montar el componente
  useEffect(() => {
    loadDeadlines();
  }, [reportId, companyId]);
  
  // Cargar los plazos desde la base de datos
  const loadDeadlines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const parsedReportDate = typeof reportDate === 'string' 
        ? parseISO(reportDate) 
        : reportDate;
      
      if (!isValid(parsedReportDate)) {
        throw new Error('La fecha de reporte no es válida');
      }
      
      const result = await getDeadlinesByReportId(companyId, reportId);
      
      if (result.success) {
        setDeadlines(result.deadlines || []);
        
        // Si no hay plazos, calcular automáticamente los plazos iniciales
        if (result.deadlines && result.deadlines.length === 0) {
          const calculatedStages = await calculateStageDeadlines(parsedReportDate);
          setStageDeadlines(calculatedStages);
        }
      } else {
        setError(result.error || 'Error al cargar los plazos');
      }
    } catch (err) {
      console.error('Error al cargar plazos:', err);
      setError('Ha ocurrido un error al cargar los plazos');
    } finally {
      setLoading(false);
    }
  };
  
  // Mostrar mensaje de éxito temporal
  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };
  
  // Manejar la actualización de un plazo
  const handleUpdateDeadline = async (deadlineId: string) => {
    try {
      setError(null);
      
      if (!validateDeadlineForm()) {
        return;
      }
      
      const result = await updateDeadline(
        companyId,
        reportId,
        deadlineId,
        deadlineForm as Partial<KarinDeadline>
      );
      
      if (result.success) {
        showSuccessMessage('Plazo actualizado correctamente');
        await loadDeadlines();
        setIsEditingDeadline(null);
        
        // Notificar al componente padre si es necesario
        if (onDeadlineUpdate && result.deadline) {
          onDeadlineUpdate(result.deadline);
        }
      } else {
        setError(result.error || 'Error al actualizar el plazo');
      }
    } catch (err) {
      console.error('Error al actualizar plazo:', err);
      setError('Ha ocurrido un error al actualizar el plazo');
    }
  };
  
  // Manejar la creación de un nuevo plazo
  const handleAddDeadline = async () => {
    try {
      setError(null);
      
      if (!validateDeadlineForm()) {
        return;
      }
      
      const result = await createDeadline(
        companyId,
        reportId,
        deadlineForm as Omit<KarinDeadline, 'id' | 'createdAt' | 'updatedAt'>
      );
      
      if (result.success) {
        showSuccessMessage('Plazo creado correctamente');
        await loadDeadlines();
        setIsAddingDeadline(false);
        resetDeadlineForm();
        
        // Notificar al componente padre si es necesario
        if (onDeadlineUpdate && result.deadline) {
          onDeadlineUpdate(result.deadline);
        }
      } else {
        setError(result.error || 'Error al crear el plazo');
      }
    } catch (err) {
      console.error('Error al añadir plazo:', err);
      setError('Ha ocurrido un error al crear el plazo');
    }
  };
  
  // Manejar la extensión de un plazo
  const handleExtendDeadline = async (deadlineId: string) => {
    try {
      setError(null);
      
      if (!extensionForm.reason.trim()) {
        setError('Debe proporcionar una razón para la extensión del plazo');
        return;
      }
      
      if (extensionForm.additionalDays <= 0) {
        setError('El número de días adicionales debe ser mayor a cero');
        return;
      }
      
      const result = await extendDeadline(
        companyId,
        reportId,
        deadlineId,
        extensionForm.additionalDays,
        extensionForm.reason,
        uid || ''
      );
      
      if (result.success) {
        showSuccessMessage('Plazo extendido correctamente');
        await loadDeadlines();
        setIsExtendingDeadline(null);
        resetExtensionForm();
        
        // Notificar al componente padre si es necesario
        if (onDeadlineUpdate && result.updatedDeadlines) {
          // Notificamos del último plazo actualizado
          onDeadlineUpdate(result.updatedDeadlines[result.updatedDeadlines.length - 1]);
        }
      } else {
        setError(result.error || 'Error al extender el plazo');
      }
    } catch (err) {
      console.error('Error al extender plazo:', err);
      setError('Ha ocurrido un error al extender el plazo');
    }
  };
  
  // Manejar la completación de un plazo
  const handleCompleteDeadline = async (deadlineId: string) => {
    try {
      setError(null);
      
      const deadline = deadlines.find(d => d.id === deadlineId);
      if (!deadline) {
        setError('Plazo no encontrado');
        return;
      }
      
      const result = await updateDeadline(
        companyId,
        reportId,
        deadlineId,
        {
          completed: true,
          completedDate: new Date().toISOString()
        }
      );
      
      if (result.success) {
        showSuccessMessage('Plazo marcado como completado');
        await loadDeadlines();
        
        // Notificar al componente padre si es necesario
        if (onDeadlineUpdate && result.deadline) {
          onDeadlineUpdate(result.deadline);
        }
      } else {
        setError(result.error || 'Error al completar el plazo');
      }
    } catch (err) {
      console.error('Error al completar plazo:', err);
      setError('Ha ocurrido un error al completar el plazo');
    }
  };
  
  // Iniciar la edición de un plazo
  const handleEditDeadline = (deadline: KarinDeadline) => {
    setDeadlineForm({
      title: deadline.title,
      description: deadline.description,
      dueDate: new Date(deadline.dueDate).toISOString().split('T')[0],
      stage: deadline.stage,
      stageType: deadline.stageType,
      legalRequirement: deadline.legalRequirement,
      businessDays: deadline.businessDays,
      completed: deadline.completed,
      completedDate: deadline.completedDate,
      notificationSent: deadline.notificationSent,
      notes: deadline.notes || ''
    });
    
    setIsEditingDeadline(deadline.id);
    setIsAddingDeadline(false);
    setIsExtendingDeadline(null);
  };
  
  // Iniciar la extensión de un plazo
  const handlePrepareExtension = async (deadlineId: string) => {
    try {
      const deadline = deadlines.find(d => d.id === deadlineId);
      if (!deadline) {
        setError('Plazo no encontrado');
        return;
      }
      
      // Obtener los plazos que se verían afectados por la extensión
      const affectedDeadlines = await getAffectedByExtension(
        companyId,
        reportId,
        deadlineId
      );
      
      if (affectedDeadlines.success) {
        setExtensionForm({
          ...extensionForm,
          affectedDeadlines: affectedDeadlines.deadlines || []
        });
        
        setIsExtendingDeadline(deadlineId);
        setIsEditingDeadline(null);
        setIsAddingDeadline(false);
      } else {
        setError(affectedDeadlines.error || 'Error al obtener plazos afectados');
      }
    } catch (err) {
      console.error('Error al preparar extensión:', err);
      setError('Ha ocurrido un error al preparar la extensión');
    }
  };
  
  // Inicializar los plazos a partir de las etapas calculadas
  const handleInitializeDeadlines = async () => {
    try {
      setError(null);
      
      if (stageDeadlines.length === 0) {
        setError('No hay etapas calculadas para inicializar');
        return;
      }
      
      // Crear plazos para cada etapa
      let hasError = false;
      
      for (const stageDeadline of stageDeadlines) {
        const deadlineData: Omit<KarinDeadline, 'id' | 'createdAt' | 'updatedAt'> = {
          title: stageDeadline.title,
          description: stageDeadline.description,
          dueDate: stageDeadline.dueDate.toISOString(),
          stage: stageDeadline.stage,
          stageType: stageDeadline.stageType,
          legalRequirement: stageDeadline.legalRequirement,
          businessDays: stageDeadline.businessDays,
          completed: false,
          completedDate: null,
          notificationSent: false,
          notes: '',
          createdBy: uid || ''
        };
        
        const result = await createDeadline(
          companyId,
          reportId,
          deadlineData
        );
        
        if (!result.success) {
          hasError = true;
          setError(`Error al crear plazo para etapa ${stageDeadline.title}: ${result.error}`);
          break;
        }
      }
      
      if (!hasError) {
        showSuccessMessage('Plazos inicializados correctamente');
        await loadDeadlines();
        setStageDeadlines([]);
        
        // Generar notificaciones iniciales
        await generateDeadlineNotifications(companyId, reportId);
      }
    } catch (err) {
      console.error('Error al inicializar plazos:', err);
      setError('Ha ocurrido un error al inicializar los plazos');
    }
  };
  
  // Validar el formulario de plazos
  const validateDeadlineForm = () => {
    if (!deadlineForm.title?.trim()) {
      setError('El título del plazo es obligatorio');
      return false;
    }
    
    if (!deadlineForm.dueDate) {
      setError('La fecha de vencimiento es obligatoria');
      return false;
    }
    
    if (!deadlineForm.stage) {
      setError('La etapa del proceso es obligatoria');
      return false;
    }
    
    return true;
  };
  
  // Reiniciar formulario de plazos
  const resetDeadlineForm = () => {
    setDeadlineForm({
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      stage: KarinProcessStage.COMPLAINT_FILED,
      stageType: KarinStageType.MANDATORY,
      legalRequirement: KarinLegalRequirement.LAW_21643,
      businessDays: 5,
      completed: false,
      completedDate: null,
      notificationSent: false,
      notes: '',
      createdBy: uid || ''
    });
  };
  
  // Reiniciar formulario de extensión
  const resetExtensionForm = () => {
    setExtensionForm({
      additionalDays: 5,
      reason: '',
      affectedDeadlines: []
    });
  };
  
  // Obtener el color según el nivel de alerta
  const getAlertColor = (dueDate: Date, completed: boolean) => {
    if (completed) return 'bg-green-100 border-green-500 text-green-800';
    
    const today = new Date();
    
    if (isAfter(today, dueDate)) {
      return 'bg-red-100 border-red-500 text-red-800'; // Vencido
    }
    
    const businessDaysLeft = getBusinessDaysCount(today, dueDate);
    
    if (businessDaysLeft <= 1) {
      return 'bg-red-50 border-red-400 text-red-700'; // Crítico (hoy o mañana)
    } else if (businessDaysLeft <= 3) {
      return 'bg-yellow-50 border-yellow-400 text-yellow-700'; // Advertencia (3 días o menos)
    } else if (businessDaysLeft <= 5) {
      return 'bg-blue-50 border-blue-400 text-blue-700'; // Información (5 días o menos)
    } else {
      return 'bg-gray-50 border-gray-300 text-gray-700'; // Normal
    }
  };
  
  // Obtener el nivel de alerta
  const getAlertLevel = (dueDate: Date, completed: boolean): DeadlineAlertLevel => {
    if (completed) return DeadlineAlertLevel.COMPLETED;
    
    const today = new Date();
    
    if (isAfter(today, dueDate)) {
      return DeadlineAlertLevel.OVERDUE;
    }
    
    const businessDaysLeft = getBusinessDaysCount(today, dueDate);
    
    if (businessDaysLeft <= 1) {
      return DeadlineAlertLevel.CRITICAL;
    } else if (businessDaysLeft <= 3) {
      return DeadlineAlertLevel.WARNING;
    } else if (businessDaysLeft <= 5) {
      return DeadlineAlertLevel.INFO;
    } else {
      return DeadlineAlertLevel.NORMAL;
    }
  };
  
  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  
  // Traducir la etapa a español
  const translateStage = (stage: KarinProcessStage): string => {
    const translations: Record<KarinProcessStage, string> = {
      [KarinProcessStage.COMPLAINT_FILED]: 'Interposición de denuncia',
      [KarinProcessStage.RECEPTION]: 'Recepción de denuncia',
      [KarinProcessStage.RISK_ASSESSMENT]: 'Evaluación de riesgo',
      [KarinProcessStage.ADMISSIBILITY]: 'Admisibilidad',
      [KarinProcessStage.PRELIMINARY_INVESTIGATION]: 'Investigación preliminar',
      [KarinProcessStage.FORMAL_INVESTIGATION]: 'Investigación formal',
      [KarinProcessStage.PRELIMINARY_REPORT]: 'Informe preliminar',
      [KarinProcessStage.EVIDENCE_REVIEW]: 'Revisión de evidencia',
      [KarinProcessStage.OBSERVATIONS]: 'Observaciones',
      [KarinProcessStage.FINAL_REPORT]: 'Informe final',
      [KarinProcessStage.RESOLUTION]: 'Resolución',
      [KarinProcessStage.SANCTION]: 'Sanción',
      [KarinProcessStage.APPEAL]: 'Apelación',
      [KarinProcessStage.FINAL_RESOLUTION]: 'Resolución final',
      [KarinProcessStage.FOLLOW_UP]: 'Seguimiento',
      [KarinProcessStage.CLOSURE]: 'Cierre del caso',
      [KarinProcessStage.PRECAUTIONARY_MEASURES]: 'Medidas precautorias',
      [KarinProcessStage.AUTHORITY_NOTIFICATION]: 'Notificación a autoridad',
      [KarinProcessStage.SUBSANATION]: 'Subsanación',
      [KarinProcessStage.INVESTIGATION_PLAN]: 'Plan de investigación',
      [KarinProcessStage.EXTENSION_REQUEST]: 'Solicitud de prórroga',
      [KarinProcessStage.WITNESS_TESTIMONIES]: 'Testimonios de testigos',
      [KarinProcessStage.ACCUSED_RESPONSE]: 'Respuesta del acusado',
      [KarinProcessStage.IMPLEMENTATION]: 'Implementación de medidas'
    };
    
    return translations[stage] || stage;
  };
  
  // Traducir el tipo de etapa a español
  const translateStageType = (stageType: KarinStageType): string => {
    switch (stageType) {
      case KarinStageType.MANDATORY:
        return 'Obligatoria';
      case KarinStageType.RECOMMENDED:
        return 'Recomendada';
      case KarinStageType.OPTIONAL:
        return 'Opcional';
      default:
        return stageType;
    }
  };
  
  // Traducir el requisito legal a español
  const translateLegalRequirement = (requirement: KarinLegalRequirement): string => {
    switch (requirement) {
      case KarinLegalRequirement.LAW_21643:
        return 'Ley 21.643';
      case KarinLegalRequirement.INTERNAL_PROCEDURE:
        return 'Procedimiento interno';
      case KarinLegalRequirement.BEST_PRACTICE:
        return 'Mejor práctica';
      case KarinLegalRequirement.OTHER:
        return 'Otro';
      default:
        return requirement;
    }
  };
  
  // Organizar los plazos por etapas
  const organizeDeadlinesByStage = () => {
    const stageGroups: Record<string, KarinDeadline[]> = {};
    
    deadlines.forEach(deadline => {
      const stageKey = deadline.stage;
      if (!stageGroups[stageKey]) {
        stageGroups[stageKey] = [];
      }
      stageGroups[stageKey].push(deadline);
    });
    
    // Ordenar los grupos según el orden natural de las etapas
    const stageOrder = Object.values(KarinProcessStage);
    
    return Object.entries(stageGroups)
      .sort(([stageA], [stageB]) => {
        const indexA = stageOrder.indexOf(stageA as KarinProcessStage);
        const indexB = stageOrder.indexOf(stageB as KarinProcessStage);
        return indexA - indexB;
      })
      .map(([stage, deadlines]) => ({
        stage: stage as KarinProcessStage,
        deadlines: deadlines.sort((a, b) => {
          const dateA = new Date(a.dueDate);
          const dateB = new Date(b.dueDate);
          return dateA.getTime() - dateB.getTime();
        })
      }));
  };
  
  const deadlinesByStage = organizeDeadlinesByStage();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando plazos...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Mensajes de error y éxito */}
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Cabecera y botones de acción */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Plazos Legales Ley Karin</h2>
        
        {showActions && (
          <div className="flex items-center space-x-2">
            {stageDeadlines.length > 0 && deadlines.length === 0 && (
              <Button 
                onClick={handleInitializeDeadlines}
                variant="primary"
              >
                Inicializar Plazos
              </Button>
            )}
            
            <Button 
              onClick={() => {
                resetDeadlineForm();
                setIsAddingDeadline(true);
                setIsEditingDeadline(null);
                setIsExtendingDeadline(null);
              }}
            >
              Añadir Plazo
            </Button>
          </div>
        )}
      </div>
      
      {/* Plazos calculados pendientes de inicialización */}
      {stageDeadlines.length > 0 && deadlines.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plazos Calculados (Pendientes de Inicialización)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Se han calculado automáticamente los siguientes plazos para este caso. Haga clic en "Inicializar Plazos" para comenzar a hacer seguimiento.
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Límite</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días Hábiles</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stageDeadlines.map((stage, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{stage.title}</div>
                          <div className="text-xs text-gray-500">{translateStage(stage.stage)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(stage.dueDate, 'dd/MM/yyyy', { locale: es })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            stage.stageType === KarinStageType.MANDATORY 
                              ? 'bg-red-100 text-red-800' 
                              : stage.stageType === KarinStageType.RECOMMENDED
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {translateStageType(stage.stageType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stage.businessDays}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Formulario para añadir plazo */}
      {isAddingDeadline && (
        <Card>
          <CardHeader>
            <CardTitle>Añadir Nuevo Plazo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deadlineTitle">Título del Plazo*</Label>
                  <Input
                    id="deadlineTitle"
                    value={deadlineForm.title || ''}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="deadlineDueDate">Fecha de Vencimiento*</Label>
                  <Input
                    id="deadlineDueDate"
                    type="date"
                    value={deadlineForm.dueDate || ''}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, dueDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="deadlineDescription">Descripción</Label>
                <Textarea
                  id="deadlineDescription"
                  value={deadlineForm.description || ''}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="deadlineStage">Etapa del Proceso*</Label>
                  <Select
                    id="deadlineStage"
                    value={deadlineForm.stage || KarinProcessStage.COMPLAINT_FILED}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      stage: e.target.value as KarinProcessStage 
                    })}
                    className="mt-1"
                  >
                    {Object.values(KarinProcessStage).map((stage) => (
                      <option key={stage} value={stage}>
                        {translateStage(stage)}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="deadlineStageType">Tipo de Etapa</Label>
                  <Select
                    id="deadlineStageType"
                    value={deadlineForm.stageType || KarinStageType.MANDATORY}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      stageType: e.target.value as KarinStageType 
                    })}
                    className="mt-1"
                  >
                    {Object.values(KarinStageType).map((type) => (
                      <option key={type} value={type}>
                        {translateStageType(type)}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="deadlineLegalRequirement">Requisito Legal</Label>
                  <Select
                    id="deadlineLegalRequirement"
                    value={deadlineForm.legalRequirement || KarinLegalRequirement.LAW_21643}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      legalRequirement: e.target.value as KarinLegalRequirement 
                    })}
                    className="mt-1"
                  >
                    {Object.values(KarinLegalRequirement).map((req) => (
                      <option key={req} value={req}>
                        {translateLegalRequirement(req)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deadlineBusinessDays">Días Hábiles</Label>
                  <Input
                    id="deadlineBusinessDays"
                    type="number"
                    min="1"
                    value={deadlineForm.businessDays || 5}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      businessDays: parseInt(e.target.value) || 5 
                    })}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center pt-8">
                  <input
                    type="checkbox"
                    id="deadlineCompleted"
                    checked={deadlineForm.completed || false}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      completed: e.target.checked,
                      completedDate: e.target.checked ? new Date().toISOString() : null
                    })}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <Label htmlFor="deadlineCompleted" className="ml-2">
                    Plazo Completado
                  </Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="deadlineNotes">Notas Adicionales</Label>
                <Textarea
                  id="deadlineNotes"
                  value={deadlineForm.notes || ''}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, notes: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddingDeadline(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddDeadline}>
                  Guardar Plazo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Formulario para editar plazo */}
      {isEditingDeadline && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Plazo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDeadlineTitle">Título del Plazo*</Label>
                  <Input
                    id="editDeadlineTitle"
                    value={deadlineForm.title || ''}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="editDeadlineDueDate">Fecha de Vencimiento*</Label>
                  <Input
                    id="editDeadlineDueDate"
                    type="date"
                    value={deadlineForm.dueDate ? new Date(deadlineForm.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, dueDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editDeadlineDescription">Descripción</Label>
                <Textarea
                  id="editDeadlineDescription"
                  value={deadlineForm.description || ''}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editDeadlineStage">Etapa del Proceso*</Label>
                  <Select
                    id="editDeadlineStage"
                    value={deadlineForm.stage || KarinProcessStage.COMPLAINT_FILED}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      stage: e.target.value as KarinProcessStage 
                    })}
                    className="mt-1"
                  >
                    {Object.values(KarinProcessStage).map((stage) => (
                      <option key={stage} value={stage}>
                        {translateStage(stage)}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="editDeadlineStageType">Tipo de Etapa</Label>
                  <Select
                    id="editDeadlineStageType"
                    value={deadlineForm.stageType || KarinStageType.MANDATORY}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      stageType: e.target.value as KarinStageType 
                    })}
                    className="mt-1"
                  >
                    {Object.values(KarinStageType).map((type) => (
                      <option key={type} value={type}>
                        {translateStageType(type)}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="editDeadlineLegalRequirement">Requisito Legal</Label>
                  <Select
                    id="editDeadlineLegalRequirement"
                    value={deadlineForm.legalRequirement || KarinLegalRequirement.LAW_21643}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      legalRequirement: e.target.value as KarinLegalRequirement 
                    })}
                    className="mt-1"
                  >
                    {Object.values(KarinLegalRequirement).map((req) => (
                      <option key={req} value={req}>
                        {translateLegalRequirement(req)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDeadlineBusinessDays">Días Hábiles</Label>
                  <Input
                    id="editDeadlineBusinessDays"
                    type="number"
                    min="1"
                    value={deadlineForm.businessDays || 5}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      businessDays: parseInt(e.target.value) || 5 
                    })}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center pt-8">
                  <input
                    type="checkbox"
                    id="editDeadlineCompleted"
                    checked={deadlineForm.completed || false}
                    onChange={(e) => setDeadlineForm({ 
                      ...deadlineForm, 
                      completed: e.target.checked,
                      completedDate: e.target.checked ? new Date().toISOString() : null
                    })}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <Label htmlFor="editDeadlineCompleted" className="ml-2">
                    Plazo Completado
                  </Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="editDeadlineNotes">Notas Adicionales</Label>
                <Textarea
                  id="editDeadlineNotes"
                  value={deadlineForm.notes || ''}
                  onChange={(e) => setDeadlineForm({ ...deadlineForm, notes: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditingDeadline(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleUpdateDeadline(isEditingDeadline)}>
                  Actualizar Plazo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Formulario para extender plazo */}
      {isExtendingDeadline && (
        <Card>
          <CardHeader>
            <CardTitle>Extender Plazo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Va a extender el plazo <strong>{deadlines.find(d => d.id === isExtendingDeadline)?.title}</strong>. 
                  Esta acción también afectará a los plazos dependientes posteriores.
                </p>
                
                {extensionForm.affectedDeadlines.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      Plazos que se verán afectados por esta extensión:
                    </p>
                    <ul className="list-disc list-inside text-xs text-yellow-700">
                      {extensionForm.affectedDeadlines.map(deadline => (
                        <li key={deadline.id}>
                          {deadline.title} - Actualmente: {formatDate(deadline.dueDate)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="extensionDays">Días Hábiles Adicionales*</Label>
                  <Input
                    id="extensionDays"
                    type="number"
                    min="1"
                    max="30"
                    value={extensionForm.additionalDays}
                    onChange={(e) => setExtensionForm({ 
                      ...extensionForm, 
                      additionalDays: parseInt(e.target.value) || 5 
                    })}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="extensionReason">Razón de la Extensión*</Label>
                <Textarea
                  id="extensionReason"
                  value={extensionForm.reason}
                  onChange={(e) => setExtensionForm({ ...extensionForm, reason: e.target.value })}
                  className="mt-1"
                  rows={3}
                  placeholder="Explique la razón por la que necesita extender este plazo..."
                />
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setIsExtendingDeadline(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleExtendDeadline(isExtendingDeadline)}>
                  Confirmar Extensión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Lista de plazos por etapas */}
      {deadlines.length > 0 ? (
        <div className="space-y-6">
          {deadlinesByStage.map(({ stage, deadlines }) => (
            <Card key={stage}>
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg">{translateStage(stage)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {deadlines.map(deadline => {
                    const dueDate = new Date(deadline.dueDate);
                    const alertLevel = getAlertLevel(dueDate, deadline.completed || false);
                    const alertColor = getAlertColor(dueDate, deadline.completed || false);
                    
                    return (
                      <div 
                        key={deadline.id} 
                        className={`p-4 ${alertColor} border-l-4`}
                      >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                          <div className="mb-2 md:mb-0">
                            <div className="flex items-center">
                              <h3 className="text-md font-medium">{deadline.title}</h3>
                              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                deadline.stageType === KarinStageType.MANDATORY 
                                  ? 'bg-red-100 text-red-800' 
                                  : deadline.stageType === KarinStageType.RECOMMENDED
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                {translateStageType(deadline.stageType)}
                              </span>
                            </div>
                            
                            {deadline.description && (
                              <p className="text-sm mt-1">{deadline.description}</p>
                            )}
                            
                            <div className="flex flex-wrap items-center mt-2 gap-2 text-sm">
                              <span className="font-medium">
                                Vence: {formatDate(deadline.dueDate)}
                              </span>
                              
                              <span className="text-xs">
                                {formatRelativeDateWithDays(new Date(deadline.dueDate))}
                              </span>
                              
                              {deadline.completed && (
                                <span className="inline-flex items-center bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                  Completado: {deadline.completedDate ? formatDate(deadline.completedDate) : 'Fecha no registrada'}
                                </span>
                              )}
                            </div>
                            
                            {deadline.notes && (
                              <div className="mt-2">
                                <p className="text-xs italic">{deadline.notes}</p>
                              </div>
                            )}
                          </div>
                          
                          {showActions && (
                            <div className="flex flex-wrap gap-2">
                              {!deadline.completed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCompleteDeadline(deadline.id)}
                                >
                                  Completar
                                </Button>
                              )}
                              
                              {!deadline.completed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrepareExtension(deadline.id)}
                                >
                                  Extender
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditDeadline(deadline)}
                              >
                                Editar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border rounded-md p-8 text-center">
          <p className="text-gray-500">No hay plazos definidos para este caso.</p>
          {stageDeadlines.length === 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Añada manualmente nuevos plazos usando el botón "Añadir Plazo".
            </p>
          )}
        </div>
      )}
    </div>
  );
}