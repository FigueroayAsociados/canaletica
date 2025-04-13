// src/components/investigation/RecommendationsList.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { addRecommendation, getRecommendations } from '@/lib/services/reportService';

// Esquema de validación para nuevas recomendaciones
const RecommendationSchema = Yup.object().shape({
  action: Yup.string()
    .min(10, 'La acción debe tener al menos 10 caracteres')
    .required('La acción recomendada es obligatoria'),
  assignedTo: Yup.string()
    .required('Debe asignar un responsable'),
  dueDate: Yup.date()
    .min(new Date(), 'La fecha límite debe ser futura')
    .required('La fecha límite es obligatoria'),
  priority: Yup.string()
    .required('La prioridad es obligatoria'),
});

interface RecommendationsListProps {
  companyId: string;
  reportId: string;
  canAdd: boolean;
  investigators?: any[];
}

export default function RecommendationsList({ 
  companyId, 
  reportId, 
  canAdd,
  investigators = [] 
}: RecommendationsListProps) {
  const { uid } = useCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Cargar recomendaciones al montar el componente
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        console.log('Obteniendo recomendaciones para:', { companyId, reportId });
        const result = await getRecommendations(companyId, reportId);
        
        if (result.success) {
          console.log('Recomendaciones obtenidas:', result.recommendations);
          setRecommendations(result.recommendations || []);
          setError(null);
        } else {
          console.error('Error al obtener recomendaciones:', result.error);
          setError('No se pudieron cargar las recomendaciones');
        }
      } catch (err) {
        console.error('Error al cargar recomendaciones:', err);
        setError('Error al cargar las recomendaciones');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [reportId, companyId]);
  // Valores iniciales para el formulario
  const initialValues = {
    action: '',
    assignedTo: '',
    dueDate: '',
    priority: 'Media',
    comments: '',
  };

  // Manejar envío del formulario
  const handleSubmit = async (values: any, { resetForm }: any) => {
    if (!uid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await addRecommendation(
        companyId,
        reportId,
        {
          action: values.action,
          assignedTo: values.assignedTo,
          dueDate: new Date(values.dueDate),
          priority: values.priority,
          comments: values.comments || '',
        },
        uid
      );

      if (result.success) {
        setSuccess('Recomendación añadida correctamente');
        resetForm();
        
        // Actualizar la lista de recomendaciones
        const refreshResult = await getRecommendations(companyId, reportId);
        if (refreshResult.success) {
          setRecommendations(refreshResult.recommendations || []);
        }
      } else {
        setError(result.error || 'Error al añadir la recomendación');
      }
    } catch (error: any) {
      console.error('Error al añadir recomendación:', error);
      setError('Ha ocurrido un error al añadir la recomendación');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No definida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-CL');
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2">Cargando recomendaciones...</p>
        </div>
      </div>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recomendaciones y Seguimiento</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Formulario para añadir recomendaciones */}
        {canAdd && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Añadir Nueva Recomendación</h3>
            <Formik
              initialValues={initialValues}
              validationSchema={RecommendationSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched }) => (
                <Form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="action" required>
                        Acción Recomendada
                      </Label>
                      <Field
                        as={Input}
                        id="action"
                        name="action"
                        placeholder="Describe la acción recomendada..."
                        className={`mt-1 ${
                          touched.action && errors.action ? 'border-error' : ''
                        }`}
                      />
                      <ErrorMessage name="action">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    <div>
                      <Label htmlFor="assignedTo" required>
                        Responsable
                      </Label>
                      <Field
                        as={Select}
                        id="assignedTo"
                        name="assignedTo"
                        className={`mt-1 ${
                          touched.assignedTo && errors.assignedTo ? 'border-error' : ''
                        }`}
                      >
                        <option value="">Seleccionar responsable</option>
                        {investigators.map((investigator) => (
                          <option key={investigator.id} value={investigator.id}>
                            {investigator.displayName}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="assignedTo">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    <div>
                      <Label htmlFor="dueDate" required>
                        Fecha Límite
                      </Label>
                      <Field
                        as={Input}
                        type="date"
                        id="dueDate"
                        name="dueDate"
                        className={`mt-1 ${
                          touched.dueDate && errors.dueDate ? 'border-error' : ''
                        }`}
                      />
                      <ErrorMessage name="dueDate">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    <div>
                      <Label htmlFor="priority" required>
                        Prioridad
                      </Label>
                      <Field
                        as={Select}
                        id="priority"
                        name="priority"
                        className={`mt-1 ${
                          touched.priority && errors.priority ? 'border-error' : ''
                        }`}
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                      </Field>
                      <ErrorMessage name="priority">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label htmlFor="comments">
                        Comentarios
                      </Label>
                      <Field
                        as={Textarea}
                        id="comments"
                        name="comments"
                        rows={3}
                        placeholder="Comentarios adicionales sobre esta recomendación..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  {error && (
                    <Alert variant="error" className="mt-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert variant="success" className="mt-4">
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Guardando...' : 'Añadir Recomendación'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}
        {/* Lista de recomendaciones existentes */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Recomendaciones Existentes</h3>
          {recommendations.length === 0 && !loading ? (
            <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay recomendaciones registradas
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Añade recomendaciones utilizando el formulario anterior.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className="border rounded-md overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
                    <span className="font-medium">{recommendation.action}</span>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        recommendation.status === 'Completado'
                          ? 'bg-green-100 text-green-800'
                          : recommendation.status === 'En Progreso'
                            ? 'bg-blue-100 text-blue-800'
                            : recommendation.status === 'Cancelado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {recommendation.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-500">Responsable:</span>
                        <div className="font-medium">
                          {recommendation.assignedToName || recommendation.assignedTo || 'No asignado'}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Fecha límite:</span>
                        <div className="font-medium">{formatDate(recommendation.dueDate)}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Prioridad:</span>
                        <div
                          className={`font-medium ${
                            recommendation.priority === 'Alta'
                              ? 'text-red-600'
                              : recommendation.priority === 'Media'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }`}
                        >
                          {recommendation.priority}
                        </div>
                      </div>
                    </div>
                    {recommendation.comments && (
                      <div className="mb-4">
                        <span className="text-sm text-gray-500">Comentarios:</span>
                        <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                          {recommendation.comments}
                        </div>
                      </div>
                    )}
                    {recommendation.evidence && (
                      <div className="mb-4">
                        <span className="text-sm text-gray-500">Evidencia de implementación:</span>
                        <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                          {recommendation.evidence}
                        </div>
                      </div>
                    )}
                    {recommendation.completedAt && (
                      <div className="mt-2 text-sm text-gray-500">
                        Completado el {formatDate(recommendation.completedAt)}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Link href={`/dashboard/follow-up/${reportId}/recommendation/${recommendation.id}`}>
                        <Button variant="outline" size="sm">
                          Ver Detalle
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}