// src/components/investigation/FinalReport.tsx

import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { saveFinalReport, completeInvestigation } from '@/lib/services/investigationService';

// Esquema de validación para el informe final
const ReportSchema = Yup.object().shape({
  summary: Yup.string()
    .min(100, 'El resumen debe tener al menos 100 caracteres')
    .required('El resumen es obligatorio'),
  methodology: Yup.string()
    .min(100, 'La metodología debe tener al menos 100 caracteres')
    .required('La metodología es obligatoria'),
  findings: Yup.string()
    .min(100, 'Los hallazgos deben tener al menos 100 caracteres')
    .required('Los hallazgos son obligatorios'),
  conclusions: Yup.string()
    .min(100, 'Las conclusiones deben tener al menos 100 caracteres')
    .required('Las conclusiones son obligatorias'),
  recommendations: Yup.string()
    .min(100, 'Las recomendaciones deben tener al menos 100 caracteres')
    .required('Las recomendaciones son obligatorias'),
});

interface FinalReportProps {
  reportId: string;
  report: any;
  findings: any[];
  isKarinLaw: boolean;
  canEdit: boolean;
  onReportUpdated: (report: any) => void;
}

export const FinalReport: React.FC<FinalReportProps> = ({
  reportId,
  report,
  findings,
  isKarinLaw,
  canEdit,
  onReportUpdated,
}) => {
  const { uid, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const userCompanyId = profile?.company || contextCompanyId;
  const [isEditing, setIsEditing] = useState(!report);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [concludingComment, setConcludingComment] = useState('');
  
  // Preparar valores iniciales
  const initialValues = report ? {
    summary: report.summary || '',
    methodology: report.methodology || '',
    findings: report.findings || '',
    conclusions: report.conclusions || '',
    recommendations: report.recommendations || '',
    isKarinReport: isKarinLaw || false,
  } : {
    summary: '',
    methodology: 'Se realizó una investigación exhaustiva que incluyó:\n- Revisión de la denuncia y documentación disponible\n- Entrevistas a personas involucradas y testigos\n- Análisis de evidencias aportadas\n- Verificación de políticas y procedimientos internos aplicables',
    findings: findingsToText(), // Extraer texto de los hallazgos registrados
    conclusions: '',
    recommendations: '',
    isKarinReport: isKarinLaw || false,
  };
  
  // Función para convertir hallazgos existentes en texto para el informe
  function findingsToText() {
    if (!findings || findings.length === 0) return '';
    
    return findings.map((finding, index) => 
      `Hallazgo ${index + 1}: ${finding.title}\n${finding.description}\n\nSeveridad: ${
        finding.severity === 'alta' ? 'Alta' : 
        finding.severity === 'media' ? 'Media' : 'Baja'
      }\n\nConclusión: ${finding.conclusion}\n`
    ).join('\n---\n\n');
  }
  
  // Manejar el envío del formulario
  const handleSubmit = async (values: any) => {
    if (!uid) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await saveFinalReport(
        userCompanyId,
        reportId,
        uid,
        values
      );
      
      if (result.success) {
        // Actualizar el informe local
        const updatedReport = {
          ...values,
          type: 'finalReport',
          createdBy: uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        onReportUpdated(updatedReport);
        setIsEditing(false);
      } else {
        setError(result.error || 'Error al guardar el informe final');
      }
    } catch (error) {
      console.error('Error al guardar el informe:', error);
      setError('Ha ocurrido un error al guardar el informe final');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Manejar la finalización de la investigación
  const handleCompleteInvestigation = async () => {
    if (!uid || !report) return;
    
    if (!concludingComment.trim()) {
      setError('Debe proporcionar un comentario de conclusión');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await completeInvestigation(
        userCompanyId,
        reportId,
        uid,
        concludingComment
      );
      
      if (result.success) {
        // Mostrar mensaje de éxito
        setShowCompleteDialog(false);
        // Aquí no actualizamos el estado ya que se espera que la aplicación redirija al usuario
        // o actualice la UI de forma global debido a esta acción importante
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
  
  // Formatear fechas
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informe Final de Investigación</CardTitle>
          <CardDescription>
            {report 
              ? `Informe creado el ${formatDate(report.createdAt)}` 
              : 'Elabore el informe final con los resultados de la investigación'
            }
            {isKarinLaw && (
              <span className="block mt-1 text-red-600">
                Caso Ley Karin - Informe con formato especial según normativa
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Formik
              initialValues={initialValues}
              validationSchema={ReportSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched }) => (
                <Form className="space-y-4">
                  {/* Resumen ejecutivo */}
                  <div>
                    <Label htmlFor="summary" required>
                      Resumen Ejecutivo
                    </Label>
                    <Field
                      as={Textarea}
                      id="summary"
                      name="summary"
                      rows={4}
                      placeholder="Resumen breve del caso, partes involucradas y principales conclusiones..."
                      className={`mt-1 ${touched.summary && errors.summary ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="summary">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Metodología utilizada */}
                  <div>
                    <Label htmlFor="methodology" required>
                      Metodología Utilizada
                    </Label>
                    <Field
                      as={Textarea}
                      id="methodology"
                      name="methodology"
                      rows={4}
                      placeholder="Describa los métodos de investigación utilizados, entrevistas realizadas, etc..."
                      className={`mt-1 ${touched.methodology && errors.methodology ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="methodology">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Hallazgos */}
                  <div>
                    <Label htmlFor="findings" required>
                      Hallazgos
                    </Label>
                    <Field
                      as={Textarea}
                      id="findings"
                      name="findings"
                      rows={5}
                      placeholder="Detalle de los principales hallazgos de la investigación..."
                      className={`mt-1 ${touched.findings && errors.findings ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="findings">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Conclusiones */}
                  <div>
                    <Label htmlFor="conclusions" required>
                      Conclusiones
                    </Label>
                    <Field
                      as={Textarea}
                      id="conclusions"
                      name="conclusions"
                      rows={4}
                      placeholder="Conclusiones alcanzadas tras la investigación..."
                      className={`mt-1 ${touched.conclusions && errors.conclusions ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="conclusions">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Recomendaciones */}
                  <div>
                    <Label htmlFor="recommendations" required>
                      Recomendaciones
                    </Label>
                    <Field
                      as={Textarea}
                      id="recommendations"
                      name="recommendations"
                      rows={4}
                      placeholder="Medidas correctivas y preventivas recomendadas..."
                      className={`mt-1 ${touched.recommendations && errors.recommendations ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="recommendations">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Confirmación Ley Karin (si aplica) */}
                  {isKarinLaw && (
                    <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-200">
                      <div className="flex items-center">
                        <Field
                          type="checkbox"
                          id="isKarinReport"
                          name="isKarinReport"
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <Label htmlFor="isKarinReport" className="ml-2 text-red-800">
                          Confirmo que este informe cumple con los requisitos de la Ley Karin
                        </Label>
                      </div>
                      <p className="mt-2 text-sm text-red-700">
                        Al marcar esta casilla, confirma que el informe contiene toda la información requerida por la Ley Karin
                        y que se han seguido los procedimientos establecidos por la normativa.
                      </p>
                    </div>
                  )}
                  
                  {error && (
                    <Alert variant="error">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    {report && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Guardando...' : report ? 'Actualizar Informe' : 'Crear Informe'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Resumen Ejecutivo</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{report.summary}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Metodología Utilizada</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{report.methodology}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Hallazgos</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{report.findings}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Conclusiones</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{report.conclusions}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recomendaciones</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{report.recommendations}</p>
                </div>
              </div>
              
              {isKarinLaw && report.isKarinReport && (
                <div className="p-4 bg-red-50 rounded-md border border-red-200">
                  <p className="font-medium text-red-800">
                    Este informe cumple con los requisitos especiales de la Ley Karin
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                {canEdit && (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                  >
                    Editar Informe
                  </Button>
                )}
                
                {canEdit && (
                  <Button 
                    onClick={() => setShowCompleteDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Completar Investigación
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Diálogo para completar investigación */}
          {showCompleteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Completar Investigación</h3>
                <p className="text-gray-600 mb-4">
                  Al completar la investigación, el estado de la denuncia cambiará a "Resuelta".
                  Este paso es irreversible. ¿Está seguro de que desea proceder?
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
                  {error && <div className="text-error text-sm mt-1">{error}</div>}
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
        </CardContent>
      </Card>
      
      {!report && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-yellow-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Informe Final Pendiente
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  El informe final es un requisito para completar la investigación. 
                  Este documento resumirá los hallazgos, conclusiones y recomendaciones
                  derivadas de la investigación.
                </p>
                {findings.length === 0 && (
                  <p className="mt-2 text-sm text-yellow-600">
                    Nota: No se han registrado hallazgos aún. Es recomendable documentar
                    los hallazgos antes de crear el informe final.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};