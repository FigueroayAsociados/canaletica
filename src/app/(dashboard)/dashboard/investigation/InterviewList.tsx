// src/components/investigation/InterviewList.tsx

import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { addInterview } from '@/lib/services/investigationService';

// Esquema de validación para entrevistas
const InterviewSchema = Yup.object().shape({
  interviewee: Yup.string().required('El nombre del entrevistado es obligatorio'),
  position: Yup.string().required('El cargo o posición es obligatorio'),
  date: Yup.date()
    .max(new Date(), 'La fecha no puede ser futura')
    .required('La fecha de la entrevista es obligatoria'),
  summary: Yup.string()
    .min(50, 'El resumen debe tener al menos 50 caracteres')
    .required('El resumen es obligatorio'),
  keyPoints: Yup.array()
    .of(Yup.string().required('Este punto clave no puede estar vacío'))
    .min(1, 'Debe agregar al menos un punto clave'),
  isConfidential: Yup.boolean(),
});

interface InterviewListProps {
  reportId: string;
  interviews: any[];
  canEdit: boolean;
  onInterviewAdded: (interview: any) => void;
}

export const InterviewList: React.FC<InterviewListProps> = ({
  reportId,
  interviews,
  canEdit,
  onInterviewAdded,
}) => {
  const { uid } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);
  
  // Valores iniciales para el formulario
  const initialValues = {
    interviewee: '',
    position: '',
    date: new Date().toISOString().split('T')[0],
    summary: '',
    keyPoints: [''],
    isConfidential: false,
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (values: any) => {
    if (!uid) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const companyId = 'default'; // En un sistema multi-tenant, esto vendría de un contexto o URL
      
      const result = await addInterview(
        companyId,
        reportId,
        uid,
        values
      );
      
      if (result.success) {
        // Crear objeto de entrevista para actualizar la UI
        const newInterview = {
          id: result.interviewId,
          ...values,
          date: new Date(values.date),
          conductedBy: uid,
          createdAt: new Date(),
        };
        
        onInterviewAdded(newInterview);
        setShowForm(false);
      } else {
        setError(result.error || 'Error al registrar la entrevista');
      }
    } catch (error) {
      console.error('Error al registrar la entrevista:', error);
      setError('Ha ocurrido un error al registrar la entrevista');
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
    }).format(dateObj);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Entrevistas</CardTitle>
            <CardDescription>
              Registro de entrevistas realizadas durante la investigación
            </CardDescription>
          </div>
          {canEdit && !showForm && (
            <Button onClick={() => setShowForm(true)}>
              Registrar Nueva Entrevista
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showForm ? (
            <Formik
              initialValues={initialValues}
              validationSchema={InterviewSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched }) => (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre del entrevistado */}
                    <div>
                      <Label htmlFor="interviewee" required>
                        Nombre del Entrevistado
                      </Label>
                      <Field
                        as={Input}
                        id="interviewee"
                        name="interviewee"
                        placeholder="Nombre completo"
                        className={`mt-1 ${touched.interviewee && errors.interviewee ? 'border-error' : ''}`}
                      />
                      <ErrorMessage name="interviewee">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                    
                    {/* Cargo o posición */}
                    <div>
                      <Label htmlFor="position" required>
                        Cargo o Posición
                      </Label>
                      <Field
                        as={Input}
                        id="position"
                        name="position"
                        placeholder="Cargo en la empresa"
                        className={`mt-1 ${touched.position && errors.position ? 'border-error' : ''}`}
                      />
                      <ErrorMessage name="position">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                  </div>
                  
                  {/* Fecha de la entrevista */}
                  <div>
                    <Label htmlFor="date" required>
                      Fecha de la Entrevista
                    </Label>
                    <Field
                      as={Input}
                      type="date"
                      id="date"
                      name="date"
                      max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
                      className={`mt-1 ${touched.date && errors.date ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="date">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Resumen de la entrevista */}
                  <div>
                    <Label htmlFor="summary" required>
                      Resumen de la Entrevista
                    </Label>
                    <Field
                      as={Textarea}
                      id="summary"
                      name="summary"
                      rows={4}
                      placeholder="Resuma los principales temas tratados y la información proporcionada por el entrevistado..."
                      className={`mt-1 ${touched.summary && errors.summary ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="summary">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Puntos clave */}
                  <div>
                    <Label required>
                      Puntos Clave Identificados
                    </Label>
                    <FieldArray name="keyPoints">
                      {({ remove, push }) => (
                        <div className="space-y-2">
                          {values.keyPoints.map((point, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div className="flex-1">
                                <Field
                                  as={Input}
                                  name={`keyPoints.${index}`}
                                  placeholder="Punto clave identificado en la entrevista"
                                  className={`${
                                    touched.keyPoints?.[index] && 
                                    (errors.keyPoints as any)?.[index] 
                                      ? 'border-error' 
                                      : ''
                                  }`}
                                />
                                {touched.keyPoints?.[index] && 
                                  (errors.keyPoints as any)?.[index] && (
                                    <div className="text-error text-sm mt-1">
                                      {(errors.keyPoints as any)[index]}
                                    </div>
                                  )
                                }
                              </div>
                              {values.keyPoints.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => remove(index)}
                                >
                                  Eliminar
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => push('')}
                          >
                            Agregar Punto Clave
                          </Button>
                        </div>
                      )}
                    </FieldArray>
                    <ErrorMessage name="keyPoints">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Confidencialidad */}
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="isConfidential"
                      name="isConfidential"
                      className="h-4 w-4 text-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="isConfidential" className="ml-2">
                      Marcar como confidencial (solo visible para investigadores)
                    </Label>
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
                      {isSubmitting ? 'Guardando...' : 'Registrar Entrevista'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          ) : selectedInterview ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Entrevista a {selectedInterview.interviewee}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedInterview(null)}
                >
                  Volver a la Lista
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Entrevistado</h4>
                  <p className="text-gray-900">{selectedInterview.interviewee}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Cargo</h4>
                  <p className="text-gray-900">{selectedInterview.position}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha</h4>
                  <p className="text-gray-900">{formatDate(selectedInterview.date)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Confidencialidad</h4>
                  <p className="text-gray-900">
                    {selectedInterview.isConfidential ? 'Confidencial' : 'No confidencial'}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Resumen</h4>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">
                    {selectedInterview.summary}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Puntos Clave</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {selectedInterview.keyPoints.map((point: string, index: number) => (
                    <li key={index} className="text-sm text-gray-800">{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : interviews.length > 0 ? (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <Card key={interview.id} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {interview.interviewee}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {interview.position} - {formatDate(interview.date)}
                        </p>
                      </div>
                      {interview.isConfidential && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Confidencial
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {interview.summary}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedInterview(interview)}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No hay entrevistas registradas</h3>
              <p className="mt-1 text-sm text-gray-500">
                Registre entrevistas para documentar los testimonios recopilados durante la investigación.
              </p>
              {canEdit && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="mt-4"
                >
                  Registrar Primera Entrevista
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};