// src/components/investigation/TasksList.tsx

import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { addTask, updateTaskStatus } from '@/lib/services/investigationService';
import { getUsersByRole } from '@/lib/services/userService';
import { UserRole, DEFAULT_COMPANY_ID } from '@/lib/utils/constants';
import { formatChileanDate } from '@/lib/utils/dateUtils';

// Esquema de validación para tareas
const TaskSchema = Yup.object().shape({
  title: Yup.string().required('El título es obligatorio'),
  description: Yup.string().required('La descripción es obligatoria'),
  assignedTo: Yup.string().required('Debe asignar la tarea a alguien'),
  dueDate: Yup.date()
    .min(new Date(), 'La fecha límite no puede ser en el pasado')
    .required('La fecha límite es obligatoria'),
  priority: Yup.string().required('La prioridad es obligatoria'),
});

interface TasksListProps {
  reportId: string;
  tasks: any[];
  canEdit: boolean;
  onTasksUpdated: (tasks: any[]) => void;
}

export const TasksList: React.FC<TasksListProps> = ({
  reportId,
  tasks,
  canEdit,
  onTasksUpdated,
}) => {
  const { uid, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [statusComment, setStatusComment] = useState<string>('');
  const [investigators, setInvestigators] = useState<any[]>([]);

  const userCompanyId = profile?.company || contextCompanyId;
  
  // Cargar investigadores al montar el componente
  useEffect(() => {
    const loadInvestigators = async () => {
      try {
        const companyId = userCompanyId;

        // Cargar tanto investigadores como administradores que pueden ser asignados a tareas
        const investigatorsResult = await getUsersByRole(companyId, UserRole.INVESTIGATOR);
        const adminsResult = await getUsersByRole(companyId, UserRole.ADMIN);
        
        let availableUsers = [];
        
        if (investigatorsResult.success && investigatorsResult.users) {
          availableUsers = [...availableUsers, ...investigatorsResult.users];
        }
        
        if (adminsResult.success && adminsResult.users) {
          availableUsers = [...availableUsers, ...adminsResult.users];
        }
        
        // Eliminar posibles duplicados (por ID)
        const uniqueUsers = Array.from(
          new Map(availableUsers.map(user => [user.id, user])).values()
        );
        
        setInvestigators(uniqueUsers);
      } catch (error) {
        console.error('Error al cargar investigadores:', error);
        setError('No se pudieron cargar los investigadores');
      }
    };
    
    loadInvestigators();
  }, []);

  // Valores iniciales para el formulario
  const initialValues = {
    title: '',
    description: '',
    assignedTo: uid || '',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], // Una semana desde hoy
    priority: 'media',
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (values: any) => {
    if (!uid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const companyId = userCompanyId;

      const result = await addTask(
        companyId,
        reportId,
        uid,
        values
      );
      
      if (result.success) {
        // Crear objeto de tarea para actualizar la UI
        const newTask = {
          id: result.taskId,
          ...values,
          status: 'pendiente',
          createdBy: uid,
          createdAt: new Date(),
        };
        
        const updatedTasks = [...tasks, newTask];
        onTasksUpdated(updatedTasks);
        setShowForm(false);
      } else {
        setError(result.error || 'Error al crear la tarea');
      }
    } catch (error) {
      console.error('Error al crear tarea:', error);
      setError('Ha ocurrido un error al crear la tarea');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Manejar cambio de estado de tarea
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!uid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const companyId = userCompanyId;

      const result = await updateTaskStatus(
        companyId,
        reportId,
        taskId,
        uid,
        newStatus as 'pendiente' | 'en_progreso' | 'completada' | 'cancelada',
        statusComment
      );
      
      if (result.success) {
        // Actualizar la tarea en el estado local
        const updatedTasks = tasks.map(task => 
          task.id === taskId
            ? { 
                ...task, 
                status: newStatus,
                comment: statusComment,
                updatedBy: uid,
                updatedAt: new Date(), 
                completedAt: newStatus === 'completada' ? new Date() : null
              }
            : task
        );
        
        onTasksUpdated(updatedTasks);
        setSelectedTask(null);
        setStatusComment('');
      } else {
        setError(result.error || 'Error al actualizar el estado de la tarea');
      }
    } catch (error) {
      console.error('Error al actualizar estado de tarea:', error);
      setError('Ha ocurrido un error al actualizar el estado');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Formatear fechas
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    
    return formatChileanDate(dateObj);
  };
  
  // Filtrar tareas por estado
  const pendingTasks = tasks.filter(task => task.status !== 'completada' && task.status !== 'cancelada');
  const completedTasks = tasks.filter(task => task.status === 'completada' || task.status === 'cancelada');
  
  // Obtener clase CSS según la prioridad
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-red-100 text-red-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baja':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Obtener clase CSS según el estado
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-gray-100 text-gray-800';
      case 'en_progreso':
        return 'bg-blue-100 text-blue-800';
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Texto para mostrar el estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_progreso':
        return 'En Progreso';
      case 'completada':
        return 'Completada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };
  
  // Calcular días restantes hasta fecha límite
  const getDaysRemaining = (dueDate: any) => {
    const today = new Date();
    const dueDateObj = dueDate.toDate ? new Date(dueDate.toDate()) : new Date(dueDate);
    
    // Normalizar fechas a medianoche para una comparación justa
    today.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);
    
    const diffTime = dueDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Tareas de Investigación</CardTitle>
            <CardDescription>
              Gestión de tareas relacionadas con la investigación
            </CardDescription>
          </div>
          {canEdit && !showForm && !selectedTask && (
            <Button onClick={() => setShowForm(true)}>
              Crear Nueva Tarea
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showForm ? (
            <Formik
              initialValues={initialValues}
              validationSchema={TaskSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched }) => (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Título de la tarea */}
                    <div className="md:col-span-2">
                      <Label htmlFor="title" required>
                        Título de la Tarea
                      </Label>
                      <Field
                        as={Input}
                        id="title"
                        name="title"
                        placeholder="Título descriptivo de la tarea"
                        className={`mt-1 ${touched.title && errors.title ? 'border-error' : ''}`}
                      />
                      <ErrorMessage name="title">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    
                    {/* Prioridad */}
                    <div>
                      <Label htmlFor="priority" required>
                        Prioridad
                      </Label>
                      <Field
                        as={Select}
                        id="priority"
                        name="priority"
                        className={`mt-1 ${touched.priority && errors.priority ? 'border-error' : ''}`}
                      >
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                      </Field>
                      <ErrorMessage name="priority">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    
                    {/* Fecha límite */}
                    <div>
                      <Label htmlFor="dueDate" required>
                        Fecha Límite
                      </Label>
                      <Field
                        as={Input}
                        type="date"
                        id="dueDate"
                        name="dueDate"
                        className={`mt-1 ${touched.dueDate && errors.dueDate ? 'border-error' : ''}`}
                      />
                      <ErrorMessage name="dueDate">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    
                    {/* Asignado a */}
                    <div className="md:col-span-2">
                      <Label htmlFor="assignedTo" required>
                        Asignado a
                      </Label>
                      <Field
                        as={Select}
                        id="assignedTo"
                        name="assignedTo"
                        className={`mt-1 ${touched.assignedTo && errors.assignedTo ? 'border-error' : ''}`}
                      >
                        <option value="">Seleccione una persona</option>
                        <option value={uid}>Yo ({profile?.displayName})</option>
                        {investigators.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.displayName} {user.role === UserRole.INVESTIGATOR ? '(Investigador)' : '(Admin)'}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="assignedTo">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    
                    {/* Descripción */}
                    <div className="md:col-span-2">
                      <Label htmlFor="description" required>
                        Descripción
                      </Label>
                      <Field
                        as={Textarea}
                        id="description"
                        name="description"
                        rows={3}
                        placeholder="Describa la tarea a realizar"
                        className={`mt-1 ${touched.description && errors.description ? 'border-error' : ''}`}
                      />
                      <ErrorMessage name="description">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="error">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Guardando...' : 'Crear Tarea'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          ) : selectedTask ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedTask.title}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                >
                  Volver a la Lista
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityClass(selectedTask.priority)}`}>
                    Prioridad: {selectedTask.priority === 'alta' ? 'Alta' : selectedTask.priority === 'media' ? 'Media' : 'Baja'}
                  </span>
                </div>
                <div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(selectedTask.status)}`}>
                    Estado: {getStatusText(selectedTask.status)}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha límite</h4>
                  <p className="text-sm text-gray-900">{formatDate(selectedTask.dueDate)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Asignado a</h4>
                  <p className="text-sm text-gray-900">
                    {selectedTask.assignedTo === uid 
                      ? `Yo (${profile?.displayName})` 
                      : investigators.find(user => user.id === selectedTask.assignedTo)?.displayName || 'Otro investigador'}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Descripción</h4>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">
                    {selectedTask.description}
                  </p>
                </div>
              </div>
              
              {selectedTask.comment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Comentario</h4>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-800 whitespace-pre-line">
                      {selectedTask.comment}
                    </p>
                  </div>
                </div>
              )}
              
              {canEdit && selectedTask.status !== 'completada' && selectedTask.status !== 'cancelada' && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Actualizar Estado</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="statusComment">Comentario</Label>
                      <Textarea
                        id="statusComment"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="Añada un comentario sobre esta actualización..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.status !== 'en_progreso' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(selectedTask.id, 'en_progreso')}
                          disabled={isSubmitting}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Iniciar Tarea
                        </Button>
                      )}
                      
                      {selectedTask.status !== 'completada' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(selectedTask.id, 'completada')}
                          disabled={isSubmitting}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Marcar como Completada
                        </Button>
                      )}
                      
                      {selectedTask.status !== 'cancelada' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusChange(selectedTask.id, 'cancelada')}
                          disabled={isSubmitting}
                        >
                          Cancelar Tarea
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Tareas pendientes */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tareas Pendientes</h3>
                
                {pendingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {pendingTasks.map((task) => {
                      const daysRemaining = getDaysRemaining(task.dueDate);
                      const isLate = daysRemaining < 0;
                      const isCloseToDeadline = daysRemaining >= 0 && daysRemaining <= 2;
                      
                      return (
                        <Card key={task.id} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                                <div className="flex items-center mt-1 space-x-2">
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityClass(task.priority)}`}>
                                    {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Media' : 'Baja'}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClass(task.status)}`}>
                                    {getStatusText(task.status)}
                                  </span>
                                </div>
                                <p className={`text-xs mt-1 ${
                                  isLate 
                                    ? 'text-red-600 font-medium' 
                                    : isCloseToDeadline 
                                      ? 'text-yellow-600' 
                                      : 'text-gray-500'
                                }`}>
                                  {isLate 
                                    ? `Vencida hace ${Math.abs(daysRemaining)} días` 
                                    : `Vence en ${daysRemaining} días (${formatDate(task.dueDate)})`}
                                </p>
                              </div>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTask(task)}
                              >
                                Ver Detalles
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay tareas pendientes</p>
                )}
              </div>
              
              {/* Tareas completadas */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tareas Completadas</h3>
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <Card key={task.id} className="bg-gray-50 opacity-70">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                              <div className="flex items-center mt-1 space-x-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusClass(task.status)}`}>
                                  {getStatusText(task.status)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Fecha límite: {formatDate(task.dueDate)}
                              </p>
                            </div>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTask(task)}
                            >
                              Ver Detalles
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {tasks.length === 0 && (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No hay tareas registradas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Cree tareas para organizar la investigación y asignar responsabilidades.
                  </p>
                  {canEdit && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="mt-4"
                    >
                      Crear Primera Tarea
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};