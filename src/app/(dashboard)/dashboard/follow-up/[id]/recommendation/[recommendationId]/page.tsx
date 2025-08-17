

// src/app/(dashboard)/dashboard/follow-up/[id]/recommendation/[recommendationId]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { SafeRender } from '@/components/ui/safe-render';
import { getReportById, updateRecommendation } from '@/lib/services/reportService';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { getUserProfileById } from '@/lib/services/userService';
import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';



// Esquema de validación para actualización de recomendación
const RecommendationUpdateSchema = Yup.object().shape({
  status: Yup.string().required('El estado es obligatorio'),
  evidence: Yup.string().when('status', {
    is: (val: string) => val === 'Completado',
    then: () => Yup.string().required('La evidencia es obligatoria cuando se marca como completado'),
    otherwise: () => Yup.string()
  }),
  comments: Yup.string()
});

export default function RecommendationDetailPage() {
  // Usar useParams hook para acceder a los parámetros de manera segura
  const params = useParams();
  const id = params.id as string;
  const recommendationId = params.recommendationId as string;

  const router = useRouter();
  const { uid, displayName, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const userCompanyId = profile?.company || contextCompanyId;
  const [report, setReport] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos
  useEffect(() => {
async function loadData() {
  if (!uid) return;

  try {
    setLoading(true);

    const result = await getReportById(userCompanyId, id, profile?.role, uid);
    if (result.success && result.report) {
      setReport(result.report);

      // Buscar la recomendación específica
      const recommendationsRef = collection(db, `companies/${userCompanyId}/reports/${id}/recommendations`);
      const recommendationSnap = await getDoc(doc(recommendationsRef, recommendationId));

      if (recommendationSnap.exists()) {
        const recommendationData = recommendationSnap.data();
        
        // Buscar el nombre del responsable si solo tenemos su ID
        let assignedToName = recommendationData.assignedTo;
        if (typeof recommendationData.assignedTo === 'string' && recommendationData.assignedTo.length > 0) {
          try {
            // Si parece ser un ID de usuario, buscar su nombre
            const userResult = await getUserProfileById(userCompanyId, recommendationData.assignedTo);
            if (userResult.success && userResult.profile) {
              assignedToName = userResult.profile.displayName || userResult.profile.email || recommendationData.assignedTo;
            }
          } catch (error) {
            console.error('Error al buscar nombre de usuario:', error);
            // Si hay error, mantener el valor original
          }
        }

        setRecommendation({
          id: recommendationSnap.id,
          ...recommendationData,
          assignedToName // Añadir el nombre resuelto
        });
      } else {
        setError('Recomendación no encontrada');
      }
    } else {
      setError(result.error || 'Error al cargar la denuncia');
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
    setError('Ha ocurrido un error al cargar los datos');
  } finally {
    setLoading(false);
  }
}

    loadData();
  }, [uid, id, recommendationId]);

  // Manejar actualización de recomendación
  const handleUpdateRecommendation = async (values: any) => {
    if (!uid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateRecommendation(
        userCompanyId,
        id,
        recommendationId,
        {
          status: values.status,
          evidence: values.evidence,
          comments: values.comments,
          updatedBy: displayName || uid,
        }
      );

      if (result.success) {
        setSuccess('Recomendación actualizada correctamente');
        // Actualizar datos locales
        setRecommendation(prev => ({
          ...prev,
          status: values.status,
          evidence: values.evidence,
          comments: values.comments,
          updatedAt: new Date(),
          updatedBy: displayName || uid,
          ...(values.status === 'Completado' && prev.status !== 'Completado'
            ? {
                completedAt: new Date(),
                completedBy: displayName || uid,
              }
            : {}),
        }));
      } else {
        setError(result.error || 'Error al actualizar la recomendación');
      }
    } catch (error) {
      console.error('Error al actualizar recomendación:', error);
      setError('Ha ocurrido un error al actualizar la recomendación');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear fecha
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  };

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
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (!report || !recommendation) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            {error || 'No se pudo cargar la información solicitada'}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => router.back()}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  // Valores iniciales para el formulario
  const initialValues = {
    status: recommendation.status || 'Pendiente',
    evidence: recommendation.evidence || '',
    comments: recommendation.comments || '',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Recomendación</h1>
        <Button onClick={() => router.back()} variant="outline">
          Volver
        </Button>
      </div>

      {/* Información de la denuncia */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Denuncia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Código</p>
              <p className="font-medium">{report.code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <ReportStatusBadge status={report.status} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categoría</p>
              <p className="font-medium">
                {report.category === 'modelo_prevencion' && 'Prevención de Delitos'}
                {report.category === 'ley_karin' && 'Ley Karin'}
                {report.category === 'ciberseguridad' && 'Ciberseguridad'}
                {report.category === 'reglamento_interno' && 'Reglamento Interno'}
                {report.category === 'politicas_codigos' && 'Políticas y Códigos'}
                {report.category === 'represalias' && 'Represalias'}
                {report.category === 'otros' && 'Otros'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Investigador</p>
              <p className="font-medium">{report.assignedToName || 'No asignado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles de la recomendación */}
      <Card>
        <CardHeader>
          <CardTitle>
            Detalles de la Recomendación
            {report.isKarinLaw && (
              <span className="ml-2 text-xs font-normal text-red-600 py-1 px-2 bg-red-50 border border-red-100 rounded-md">
                Ley Karin
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Recomendación creada el {formatDate(recommendation.createdAt)}
            {report.isKarinLaw && recommendation.dueDate && (
              <span className="ml-2 text-red-600">
                • Plazo legal: 15 días corridos (hasta {formatDate(recommendation.dueDate)})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">Acción Recomendada</h3>
            <p className="text-gray-700">{recommendation.action}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Responsable</p>
                <p className="font-medium">
                  <SafeRender condition={!!(recommendation?.assignedToName || recommendation?.assignedTo)} fallback="No asignado">
                    {recommendation?.assignedToName || recommendation?.assignedTo}
                  </SafeRender>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha límite</p>
                <p className="font-medium">{formatDate(recommendation.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Prioridad</p>
                <p className={`font-medium ${
                  recommendation.priority === 'Alta'
                    ? 'text-red-600'
                    : recommendation.priority === 'Media'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}>
                  {recommendation.priority}
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de actualización */}
          <div>
            <h3 className="text-lg font-medium mb-4">Actualizar Estado de Implementación</h3>
            <Formik
              initialValues={initialValues}
              validationSchema={RecommendationUpdateSchema}
              onSubmit={handleUpdateRecommendation}
            >
              {({ errors, touched, values }) => (
                <Form>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="status" required>
                        Estado de Implementación
                      </Label>
                      <Field
                        as={Select}
                        id="status"
                        name="status"
                        className={`mt-1 ${
                          touched.status && errors.status ? 'border-error' : ''
                        }`}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Progreso">En Progreso</option>
                        <option value="Completado">Completado</option>
                        <option value="Cancelado">Cancelado</option>
                      </Field>
                      <ErrorMessage name="status">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    <div>
                      <Label htmlFor="evidence" required={values.status === 'Completado'}>
                        Evidencia de Implementación
                        {report.isKarinLaw && (
                          <span className="ml-2 text-xs font-normal text-red-600">
                            (Obligatorio para Ley Karin)
                          </span>
                        )}
                      </Label>
                      <Field
                        as={Textarea}
                        id="evidence"
                        name="evidence"
                        rows={3}
                        placeholder="Describa la evidencia que respalda la implementación..."
                        className={`mt-1 ${
                          touched.evidence && errors.evidence ? 'border-error' : ''
                        }`}
                      />
                      {report.isKarinLaw ? (
                        <p className="text-xs text-red-600 mt-1">
                          <strong>Documentación obligatoria Ley Karin:</strong> Detalle: 
                          1) Acciones específicas realizadas
                          2) Fecha exacta de implementación 
                          3) Personal involucrado
                          4) Método de verificación del cumplimiento
                          5) Referencias a documentos o respaldos adjuntos
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          Incluya referencias a documentos, URLs, actas de reunión o cualquier otra evidencia
                          que respalde la implementación de esta recomendación.
                        </p>
                      )}
                      <ErrorMessage name="evidence">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    <div>
                      <Label htmlFor="comments">
                        Comentarios Adicionales
                      </Label>
                      <Field
                        as={Textarea}
                        id="comments"
                        name="comments"
                        rows={3}
                        placeholder="Comentarios sobre el progreso, dificultades o cualquier otra información relevante..."
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

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Guardando...' : 'Actualizar Estado'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>

          {/* Historial de cambios */}
          {recommendation.updatedAt && recommendation.updatedAt !== recommendation.createdAt && (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Historial de Cambios</h3>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500">
                  Última actualización: {formatDate(recommendation.updatedAt)} por
                  {recommendation.updatedBy || 'Usuario del sistema'}
                </p>
                {recommendation.completedAt && (
                  <p className="text-sm text-gray-500 mt-2">
                    Marcado como completado: {formatDate(recommendation.completedAt)} por
                    {recommendation.completedBy || 'Usuario del sistema'}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}