// src/components/investigation/FindingsList.tsx

import React, { useState } from 'react';
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
import { useCompany } from '@/lib/hooks/useCompany';
import { addFinding } from '@/lib/services/investigationService';

// Esquema de validación para hallazgos
const FindingSchema = Yup.object().shape({
  title: Yup.string().required('El título es obligatorio'),
  description: Yup.string()
    .min(50, 'La descripción debe tener al menos 50 caracteres')
    .required('La descripción es obligatoria'),
  severity: Yup.string().required('La severidad es obligatoria'),
  relatedEvidence: Yup.array().min(0, 'Seleccione al menos una evidencia si aplica'),
  conclusion: Yup.string()
    .min(30, 'La conclusión debe tener al menos 30 caracteres')
    .required('La conclusión es obligatoria'),
});

interface FindingsListProps {
  reportId: string;
  findings: any[];
  evidences: any[];
  canEdit: boolean;
  onFindingAdded: (finding: any) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  reportId,
  findings,
  evidences,
  canEdit,
  onFindingAdded,
}) => {
  const { uid, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);

  // Determinar el ID de la compañía correcta
  const userCompanyId = profile?.company || contextCompanyId;
  
  // Valores iniciales para el formulario
  const initialValues = {
    title: '',
    description: '',
    severity: 'media',
    relatedEvidence: [],
    conclusion: '',
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (values: any) => {
    if (!uid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addFinding(
        userCompanyId,
        reportId,
        uid,
        values
      );
      
      if (result.success) {
        // Crear objeto de hallazgo para actualizar la UI
        const newFinding = {
          id: result.findingId,
          ...values,
          createdBy: uid,
          createdAt: new Date(),
        };
        
        onFindingAdded(newFinding);
        setShowForm(false);
      } else {
        setError(result.error || 'Error al registrar el hallazgo');
      }
    } catch (error) {
      console.error('Error al registrar hallazgo:', error);
      setError('Ha ocurrido un error al registrar el hallazgo');
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
  
  // Obtener el nombre de archivo de una evidencia por su ID
  const getEvidenceFilename = (evidenceId: string) => {
    const evidence = evidences.find(e => e.id === evidenceId);
    return evidence 
      ? (evidence.originalFilename || evidence.filename || 'Archivo sin nombre') 
      : 'Evidencia no encontrada';
  };
  
  // Colores para severidad
  const getSeverityColor = (severity: string) => {
    switch (severity) {
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
  
  // Texto para severidad
  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Media';
      case 'baja':
        return 'Baja';
      default:
        return 'No definida';
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Hallazgos de la Investigación</CardTitle>
            <CardDescription>
              Registro de hallazgos y conclusiones obtenidas durante la investigación
            </CardDescription>
          </div>
          {canEdit && !showForm && !selectedFinding && (
            <Button onClick={() => setShowForm(true)}>
              Registrar Nuevo Hallazgo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showForm ? (
            <Formik
              initialValues={initialValues}
              validationSchema={FindingSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, setFieldValue }) => (
                <Form className="space-y-4">
                  {/* Título del hallazgo */}
                  <div>
                    <Label htmlFor="title" required>
                      Título del Hallazgo
                    </Label>
                    <Field
                      as={Input}
                      id="title"
                      name="title"
                      placeholder="Título descriptivo del hallazgo"
                      className={`mt-1 ${touched.title && errors.title ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="title">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Severidad */}
                  <div>
                    <Label htmlFor="severity" required>
                      Severidad
                    </Label>
                    <Field
                      as={Select}
                      id="severity"
                      name="severity"
                      className={`mt-1 ${touched.severity && errors.severity ? 'border-error' : ''}`}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </Field>
                    <ErrorMessage name="severity">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Descripción del hallazgo */}
                  <div>
                    <Label htmlFor="description" required>
                      Descripción Detallada
                    </Label>
                    <Field
                      as={Textarea}
                      id="description"
                      name="description"
                      rows={4}
                      placeholder="Describa en detalle el hallazgo y su contexto..."
                      className={`mt-1 ${touched.description && errors.description ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="description">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Evidencias relacionadas */}
                  {evidences.length > 0 && (
                    <div>
                      <Label htmlFor="relatedEvidence">
                        Evidencias Relacionadas
                      </Label>
                      <div className="mt-1 space-y-2">
                        {evidences.map((evidence) => (
                          <div key={evidence.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`evidence-${evidence.id}`}
                              className="h-4 w-4 text-primary border-gray-300 rounded"
                              checked={values.relatedEvidence.includes(evidence.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFieldValue('relatedEvidence', [...values.relatedEvidence, evidence.id]);
                                } else {
                                  setFieldValue(
                                    'relatedEvidence',
                                    values.relatedEvidence.filter((id: string) => id !== evidence.id)
                                  );
                                }
                              }}
                            />
                            <label htmlFor={`evidence-${evidence.id}`} className="ml-2 block text-sm text-gray-700">
                              {evidence.originalFilename || evidence.filename}
                              <span className="text-xs text-gray-500 ml-2">
                                ({evidence.description.substring(0, 50)}...)
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                      <ErrorMessage name="relatedEvidence">
                        {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                      </ErrorMessage>
                    </div>
                  )}
                  
                  {/* Conclusión */}
                  <div>
                    <Label htmlFor="conclusion" required>
                      Conclusión
                    </Label>
                    <Field
                      as={Textarea}
                      id="conclusion"
                      name="conclusion"
                      rows={3}
                      placeholder="Conclusión del hallazgo e implicaciones para la investigación..."
                      className={`mt-1 ${touched.conclusion && errors.conclusion ? 'border-error' : ''}`}
                    />
                    <ErrorMessage name="conclusion">
                      {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
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
                      {isSubmitting ? 'Guardando...' : 'Registrar Hallazgo'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          ) : selectedFinding ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedFinding.title}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedFinding(null)}
                >
                  Volver a la Lista
                </Button>
              </div>
              
              <div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedFinding.severity)}`}>
                  Severidad: {getSeverityText(selectedFinding.severity)}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Registrado el {formatDate(selectedFinding.createdAt)}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Descripción</h4>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">
                    {selectedFinding.description}
                  </p>
                </div>
              </div>
              
              {selectedFinding.relatedEvidence && selectedFinding.relatedEvidence.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Evidencias Relacionadas</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedFinding.relatedEvidence.map((evidenceId: string) => (
                      <li key={evidenceId} className="text-sm text-gray-800">
                        {getEvidenceFilename(evidenceId)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Conclusión</h4>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-line">
                    {selectedFinding.conclusion}
                  </p>
                </div>
              </div>
            </div>
          ) : findings.length > 0 ? (
            <div className="space-y-4">
              {findings.map((finding) => (
                <Card key={finding.id} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {finding.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatDate(finding.createdAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(finding.severity)}`}>
                        {getSeverityText(finding.severity)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {finding.description}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedFinding(finding)}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No hay hallazgos registrados</h3>
              <p className="mt-1 text-sm text-gray-500">
                Registre los hallazgos encontrados durante la investigación para documentar el caso.
              </p>
              {canEdit && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="mt-4"
                >
                  Registrar Primer Hallazgo
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};