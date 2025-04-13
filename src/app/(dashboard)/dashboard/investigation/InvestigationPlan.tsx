// src/components/investigation/InvestigationPlan.tsx

import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { saveInvestigationPlan } from '@/lib/services/investigationService';

// Esquema de validación para el plan de investigación
const PlanSchema = Yup.object().shape({
  description: Yup.string()
    .min(50, 'La descripción debe tener al menos 50 caracteres')
    .required('La descripción es obligatoria'),
  approach: Yup.string()
    .min(50, 'El enfoque metodológico debe tener al menos 50 caracteres')
    .required('El enfoque metodológico es obligatorio'),
  timeline: Yup.string()
    .min(50, 'El cronograma debe tener al menos 50 caracteres')
    .required('El cronograma es obligatorio'),
  specialConsiderations: Yup.string(),
});

interface InvestigationPlanProps {
  reportId: string;
  plan: any;
  isKarinLaw: boolean;
  canEdit: boolean;
  onPlanUpdated: (plan: any) => void;
}

export const InvestigationPlan: React.FC<InvestigationPlanProps> = ({
  reportId,
  plan,
  isKarinLaw,
  canEdit,
  onPlanUpdated,
}) => {
  const { uid } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(!plan);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Preparar valores iniciales
  const initialValues = plan ? {
    description: plan.description || '',
    approach: plan.approach || '',
    timeline: plan.timeline || '',
    specialConsiderations: plan.specialConsiderations || '',
  } : {
    description: '',
    approach: '',
    timeline: '',
    specialConsiderations: '',
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (values: any) => {
    if (!uid) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const companyId = 'default'; // En un sistema multi-tenant, esto vendría de un contexto o URL
      
      const result = await saveInvestigationPlan(
        companyId,
        reportId,
        uid,
        values
      );
      
      if (result.success) {
        // Actualizar el plan local
        const updatedPlan = {
          ...values,
          type: 'plan',
          createdBy: uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        onPlanUpdated(updatedPlan);
        setIsEditing(false);
      } else {
        setError(result.error || 'Error al guardar el plan de investigación');
      }
    } catch (error) {
      console.error('Error al guardar el plan:', error);
      setError('Ha ocurrido un error al guardar el plan de investigación');
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
          <CardTitle>Plan de Investigación</CardTitle>
          <CardDescription>
            {plan 
              ? `Plan creado el ${formatDate(plan.createdAt)}` 
              : 'Defina el enfoque y los pasos a seguir en esta investigación'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isKarinLaw && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertDescription>
                <p className="text-red-800 font-medium">Caso Ley Karin</p>
                <p className="text-sm text-red-700 mt-1">
                  Recuerde que según la Ley Karin, la investigación debe iniciarse dentro de los 5 días hábiles
                  tras la recepción de la denuncia, y el informe preliminar debe entregarse en un plazo máximo
                  de 10 días hábiles.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          {isEditing ? (
            <Formik
              initialValues={initialValues}
              validationSchema={PlanSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched }) => (
                <Form className="space-y-4">
                  {/* Descripción general */}
                  <div>
                    <Label htmlFor="description" required>
                      Descripción General del Caso
                    </Label>
                    <Field
                      as={Textarea}
                      id="description"
                      name="description"
                      rows={4}
                      placeholder="Describa el contexto general del caso y los aspectos clave a investigar..."
                      className={`mt-1 ${touched.description && errors.description ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="description">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Enfoque metodológico */}
                  <div>
                    <Label htmlFor="approach" required>
                      Enfoque Metodológico
                    </Label>
                    <Field
                      as={Textarea}
                      id="approach"
                      name="approach"
                      rows={4}
                      placeholder="Detalle qué métodos de investigación utilizará, qué fuentes de información consultará, qué tipos de evidencia buscará..."
                      className={`mt-1 ${touched.approach && errors.approach ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="approach">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Cronograma */}
                  <div>
                    <Label htmlFor="timeline" required>
                      Cronograma de Investigación
                    </Label>
                    <Field
                      as={Textarea}
                      id="timeline"
                      name="timeline"
                      rows={4}
                      placeholder="Establezca las etapas de la investigación con plazos específicos para cada actividad..."
                      className={`mt-1 ${touched.timeline && errors.timeline ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="timeline">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Consideraciones especiales */}
                  <div>
                    <Label htmlFor="specialConsiderations">
                      Consideraciones Especiales (opcional)
                    </Label>
                    <Field
                      as={Textarea}
                      id="specialConsiderations"
                      name="specialConsiderations"
                      rows={3}
                      placeholder="Indique cualquier consideración especial, riesgos potenciales o limitaciones de la investigación..."
                      className="mt-1"
                    />
                  </div>
                  
                  {error && (
                    <Alert variant="error">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    {plan && (
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
                      {isSubmitting ? 'Guardando...' : plan ? 'Actualizar Plan' : 'Crear Plan'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Descripción General del Caso</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{plan.description}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Enfoque Metodológico</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{plan.approach}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Cronograma de Investigación</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{plan.timeline}</p>
                </div>
              </div>
              
              {plan.specialConsiderations && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Consideraciones Especiales</h3>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-800 whitespace-pre-line">{plan.specialConsiderations}</p>
                  </div>
                </div>
              )}
              
              {canEdit && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                  >
                    Editar Plan
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};