'use client';

// src/app/(dashboard)/dashboard/reports/[id]/edit/page.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { getReportById, updateReport } from '@/lib/services/reportService';

// Esquema de validación para la edición de denuncias
const ReportEditSchema = Yup.object().shape({
  // Información general
  category: Yup.string().required('La categoría es obligatoria'),
  subcategory: Yup.string().required('La subcategoría es obligatoria'),
  priority: Yup.string().required('La prioridad es obligatoria'),
  
  // Detalles del incidente
  eventDate: Yup.date()
    .max(new Date(), 'La fecha no puede ser futura')
    .required('La fecha del incidente es obligatoria'),
  exactLocation: Yup.string().required('La ubicación exacta es obligatoria'),
  detailedDescription: Yup.string()
    .min(50, 'La descripción debe tener al menos 50 caracteres')
    .required('La descripción detallada es obligatoria'),
});

export default function EditReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const { isAdmin, uid, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const userCompanyId = profile?.company || contextCompanyId;
  
  // Estados
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Cargar datos de la denuncia
  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);

        const result = await getReportById(userCompanyId, reportId);
        
        if (result.success) {
          setReport(result.report);
        } else {
          setError(result.error || 'Error al cargar la denuncia');
        }
      } catch (error) {
        console.error('Error al cargar denuncia:', error);
        setError('Ha ocurrido un error al cargar los datos de la denuncia');
      } finally {
        setLoading(false);
      }
    }
    
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);
  
  const handleSubmit = async (values: any) => {
    if (!isAdmin || !report) return;
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const result = await updateReport(userCompanyId, reportId, values);
      
      if (result.success) {
        setSuccess(true);
        
        // Actualizar el reporte local con los nuevos valores
        setReport({
          ...report,
          ...values,
        });
        
        // Redireccionar después de un breve retraso
        setTimeout(() => {
          router.push(`/dashboard/reports/${reportId}`);
        }, 2000);
      } else {
        setError(result.error || 'Error al actualizar la denuncia');
      }
    } catch (error) {
      console.error('Error al actualizar denuncia:', error);
      setError('Ha ocurrido un error al actualizar la denuncia');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para editar denuncias. Esta acción está reservada para administradores.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href={`/dashboard/reports/${reportId}`}>
            <Button>Volver a la Denuncia</Button>
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
          <p className="text-gray-600">Cargando información de la denuncia...</p>
        </div>
      </div>
    );
  }
  
  if (error && !report) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard/reports">
            <Button>Volver al Listado</Button>
          </Link>
        </div>
      </div>
    );
  }
  
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
  
  // Extraer valores iniciales del reporte
  const initialValues = {
    // Información general
    category: report.category || '',
    subcategory: report.subcategory || '',
    priority: report.priority || 'Media',
    isKarinLaw: report.isKarinLaw || false,
    
    // Detalles del incidente
    eventDate: report.eventDate && report.eventDate.toDate 
      ? new Date(report.eventDate.toDate()).toISOString().split('T')[0]
      : report.eventDate 
        ? new Date(report.eventDate).toISOString().split('T')[0]
        : '',
    exactLocation: report.exactLocation || '',
    detailedDescription: report.detailedDescription || '',
    
    // Datos opcionales
    previousActions: report.previousActions || '',
    expectation: report.expectation || '',
    
    // Campos específicos Ley Karin
    karinFrequency: report.karinFrequency || '',
    karinWorkImpact: report.karinWorkImpact || '',
    karinSexualType: report.karinSexualType || '',
    karinViolenceDescription: report.karinViolenceDescription || '',
    karinRequestedMeasures: report.karinRequestedMeasures || '',
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Editar Denuncia #{report.code}</h1>
        <div>
          <Link href={`/dashboard/reports/${reportId}`}>
            <Button variant="outline">Cancelar</Button>
          </Link>
        </div>
      </div>
      
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <AlertDescription>
            La denuncia ha sido actualizada correctamente. Redirigiendo...
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Información de la Denuncia</CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={initialValues}
            validationSchema={ReportEditSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, setFieldValue, handleChange }) => (
              <Form className="space-y-6">
                {/* Información general */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Categoría */}
                  <div>
                    <Label htmlFor="category" required>
                      Categoría
                    </Label>
                    <Field
                      as={Select}
                      id="category"
                      name="category"
                      className="mt-1"
                      error={touched.category && errors.category}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        handleChange(e);
                        // Si cambia a o desde Ley Karin, actualizar el flag
                        const isKarinLaw = e.target.value === 'ley_karin';
                        setFieldValue('isKarinLaw', isKarinLaw);
                      }}
                    >
                      <option value="">Seleccione una categoría</option>
                      <option value="modelo_prevencion">Modelo de Prevención de Delitos</option>
                      <option value="ley_karin">Ley Karin</option>
                      <option value="ciberseguridad">Ciberseguridad</option>
                      <option value="reglamento_interno">Infracciones al Reglamento Interno</option>
                      <option value="politicas_codigos">Infracciones a Políticas y Códigos</option>
                      <option value="represalias">Represalias</option>
                      <option value="otros">Otros</option>
                    </Field>
                    <ErrorMessage name="category">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Subcategoría */}
                  <div>
                    <Label htmlFor="subcategory" required>
                      Subcategoría
                    </Label>
                    <Field
                      as={Select}
                      id="subcategory"
                      name="subcategory"
                      className="mt-1"
                      error={touched.subcategory && errors.subcategory}
                      disabled={!values.category}
                    >
                      <option value="">Seleccione una subcategoría</option>
                      
                      {values.category === 'modelo_prevencion' && (
                        <>
                          <option value="cohecho">Cohecho</option>
                          <option value="lavado_activos">Lavado de activos</option>
                          <option value="financiamiento_terrorismo">Financiamiento del terrorismo</option>
                          <option value="receptacion">Receptación</option>
                          <option value="negociacion_incompatible">Negociación incompatible</option>
                          <option value="corrupcion_particulares">Corrupción entre particulares</option>
                          <option value="otros_delitos_economicos">Otros delitos económicos</option>
                        </>
                      )}
                      
                      {values.category === 'ley_karin' && (
                        <>
                          <option value="acoso_laboral">Acoso laboral</option>
                          <option value="acoso_sexual">Acoso sexual</option>
                          <option value="violencia_trabajo">Violencia en el trabajo</option>
                        </>
                      )}
                      
                      {values.category === 'ciberseguridad' && (
                        <>
                          <option value="fraude_informatico">Fraude informático</option>
                          <option value="acceso_no_autorizado">Acceso no autorizado</option>
                          <option value="interceptacion_datos">Interceptación de datos</option>
                          <option value="otro">Otro</option>
                        </>
                      )}
                      
                      {values.category === 'reglamento_interno' && (
                        <>
                          <option value="incumplimiento_normas">Incumplimiento de normas</option>
                          <option value="ausentismo">Ausentismo injustificado</option>
                          <option value="otro">Otro</option>
                        </>
                      )}
                      
                      {values.category === 'politicas_codigos' && (
                        <>
                          <option value="codigo_etica">Código de ética</option>
                          <option value="politica_regalos">Política de regalos</option>
                          <option value="conflicto_intereses">Conflicto de intereses</option>
                          <option value="otro">Otro</option>
                        </>
                      )}
                      
                      {values.category === 'represalias' && (
                        <>
                          <option value="represalia_denuncia">Represalia por denuncia previa</option>
                          <option value="represalia_testigo">Represalia por actuar como testigo</option>
                          <option value="otro">Otro</option>
                        </>
                      )}
                      
                      {values.category === 'otros' && (
                        <option value="otro">Otro</option>
                      )}
                    </Field>
                    <ErrorMessage name="subcategory">
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
                      className="mt-1"
                      error={touched.priority && errors.priority}
                    >
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </Field>
                    <ErrorMessage name="priority">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Fecha del incidente */}
                  <div>
                    <Label htmlFor="eventDate" required>
                      Fecha del Incidente
                    </Label>
                    <Field
                      as={Input}
                      type="date"
                      id="eventDate"
                      name="eventDate"
                      className="mt-1"
                      error={touched.eventDate && errors.eventDate}
                      max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
                    />
                    <ErrorMessage name="eventDate">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                </div>
                
                {/* Ubicación exacta */}
                <div>
                  <Label htmlFor="exactLocation" required>
                    Ubicación Exacta
                  </Label>
                  <Field
                    as={Input}
                    id="exactLocation"
                    name="exactLocation"
                    className="mt-1"
                    error={touched.exactLocation && errors.exactLocation}
                    placeholder="Ej: Oficina principal, piso 3, sala de reuniones B, etc."
                  />
                  <ErrorMessage name="exactLocation">
                    {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                  </ErrorMessage>
                </div>
                
                {/* Descripción detallada */}
                <div>
                  <Label htmlFor="detailedDescription" required>
                    Descripción Detallada
                  </Label>
                  <Field
                    as={Textarea}
                    id="detailedDescription"
                    name="detailedDescription"
                    rows={6}
                    className="mt-1"
                    error={touched.detailedDescription && errors.detailedDescription}
                    placeholder="Describa con el mayor detalle posible qué ocurrió, cómo ocurrió, quiénes participaron, y cualquier otra información relevante."
                  />
                  <ErrorMessage name="detailedDescription">
                    {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                  </ErrorMessage>
                </div>
                
                {/* Campos opcionales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Acciones previas */}
                  <div>
                    <Label htmlFor="previousActions">
                      Acciones Previas Realizadas
                    </Label>
                    <Field
                      as={Textarea}
                      id="previousActions"
                      name="previousActions"
                      rows={3}
                      className="mt-1"
                      placeholder="Acciones que el denunciante realizó antes de presentar la denuncia"
                    />
                  </div>
                  
                  {/* Expectativas */}
                  <div>
                    <Label htmlFor="expectation">
                      Expectativas sobre la Resolución
                    </Label>
                    <Field
                      as={Textarea}
                      id="expectation"
                      name="expectation"
                      rows={3}
                      className="mt-1"
                      placeholder="Expectativas del denunciante sobre la resolución"
                    />
                  </div>
                </div>
                
                {/* Campos específicos para Ley Karin */}
                {values.isKarinLaw && (
                  <div className="mt-6 p-4 bg-red-50 rounded-md border border-red-200">
                    <h3 className="text-lg font-medium text-red-800 mb-4">
                      Información Específica Ley Karin
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Frecuencia */}
                      <div>
                        <Label htmlFor="karinFrequency">
                          Frecuencia de los Hechos
                        </Label>
                        <Field
                          as={Select}
                          id="karinFrequency"
                          name="karinFrequency"
                          className="mt-1"
                        >
                          <option value="">Seleccione una opción</option>
                          <option value="unica">Única vez</option>
                          <option value="ocasional">Ocasional</option>
                          <option value="reiterada">Reiterada</option>
                          <option value="sistematica">Sistemática</option>
                        </Field>
                      </div>
                      
                      {/* Tipo de acoso sexual (si aplica) */}
                      {values.subcategory === 'acoso_sexual' && (
                        <div>
                          <Label htmlFor="karinSexualType">
                            Tipo de Acoso Sexual
                          </Label>
                          <Field
                            as={Select}
                            id="karinSexualType"
                            name="karinSexualType"
                            className="mt-1"
                          >
                            <option value="">Seleccione una opción</option>
                            <option value="verbal">Verbal</option>
                            <option value="no_verbal">No verbal</option>
                            <option value="fisico">Físico</option>
                            <option value="digital">Digital/Virtual</option>
                          </Field>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 gap-6">
                      {/* Impacto laboral (para acoso laboral) */}
                      {values.subcategory === 'acoso_laboral' && (
                        <div>
                          <Label htmlFor="karinWorkImpact">
                            Impacto en el Ambiente Laboral
                          </Label>
                          <Field
                            as={Textarea}
                            id="karinWorkImpact"
                            name="karinWorkImpact"
                            rows={3}
                            className="mt-1"
                            placeholder="Describa cómo ha impactado esta situación en el ambiente laboral"
                          />
                        </div>
                      )}
                      
                      {/* Descripción de la violencia */}
                      {values.subcategory === 'violencia_trabajo' && (
                        <div>
                          <Label htmlFor="karinViolenceDescription">
                            Descripción de la Agresión
                          </Label>
                          <Field
                            as={Textarea}
                            id="karinViolenceDescription"
                            name="karinViolenceDescription"
                            rows={3}
                            className="mt-1"
                            placeholder="Describa con detalle la agresión o acto de violencia"
                          />
                        </div>
                      )}
                      
                      {/* Medidas solicitadas */}
                      <div>
                        <Label htmlFor="karinRequestedMeasures">
                          Medidas de Protección Solicitadas
                        </Label>
                        <Field
                          as={Textarea}
                          id="karinRequestedMeasures"
                          name="karinRequestedMeasures"
                          rows={3}
                          className="mt-1"
                          placeholder="Indique si se han solicitado medidas específicas de protección"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Botones de acción */}
                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <Link href={`/dashboard/reports/${reportId}`}>
                    <Button variant="outline" type="button">
                      Cancelar
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={submitting || success}
                  >
                    {submitting ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}