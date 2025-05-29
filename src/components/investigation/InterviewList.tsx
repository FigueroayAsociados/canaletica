'use client';

// src/components/investigation/InterviewList.tsx
import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { addInterview, convertInterviewToTestimony, signTestimony } from '@/lib/services/investigationService';
import { formatChileanDate } from '@/lib/utils/dateUtils';

// Esquema de validación para entrevistas
const InterviewSchema = Yup.object().shape({
  interviewee: Yup.string().required('El nombre del entrevistado es obligatorio'),
  position: Yup.string().required('El cargo o posición es obligatorio'),
  location: Yup.string().required('El lugar de la entrevista es obligatorio'),
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
  recordingConsent: Yup.boolean(),
  protocol: Yup.string().oneOf(['formal', 'informal', 'estructurada', 'semi_estructurada']),
  isTestimony: Yup.boolean(),
  notes: Yup.string(),
});

// Esquema para testimonio
const TestimonySchema = Yup.object().shape({
  personName: Yup.string().required('El nombre es obligatorio'),
  personType: Yup.string()
    .oneOf(['complainant', 'accused', 'witness'], 'Tipo de persona no válido')
    .required('El tipo de persona es obligatorio'),
  signatureMethod: Yup.string()
    .oneOf(['fisica', 'electronica', 'firma_simple'], 'Método de firma no válido')
    .required('El método de firma es obligatorio'),
  authorizedDisclosure: Yup.boolean(),
  witnessName: Yup.string().when('signatureMethod', {
    is: 'fisica',
    then: () => Yup.string().required('Se requiere un testigo para la firma física'),
    otherwise: () => Yup.string(),
  }),
  witnessPosition: Yup.string().when('signatureMethod', {
    is: 'fisica',
    then: () => Yup.string().required('Se requiere la posición del testigo'),
    otherwise: () => Yup.string(),
  }),
  signatureObservations: Yup.string(),
});

interface InterviewListProps {
  reportId: string;
  companyId: string;
  interviews: any[];
  canEdit: boolean;
  isKarinLaw?: boolean;
  onInterviewAdded: (interview: any) => void;
}

export const InterviewList: React.FC<InterviewListProps> = ({
  reportId,
  companyId,
  interviews,
  canEdit,
  isKarinLaw = false,
  onInterviewAdded,
}) => {
  const { uid, displayName } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);
  const [showSignatureForm, setShowSignatureForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('interviews');
  const [signedTestimonies, setSignedTestimonies] = useState<any[]>([]);
  const [pendingTestimonies, setPendingTestimonies] = useState<any[]>([]);
  
  // Cargar testimonios firmados y pendientes al inicio
  useEffect(() => {
    if (interviews && isKarinLaw) {
      console.log('Procesando entrevistas para testimonios:', interviews);
      
      // Identificar todas las entrevistas marcadas como testimonios, con o sin testimonyId
      // Garantizar que estamos trabajando con valores booleanos correctos
      const interviewsWithTestimony = interviews.filter(interview => {
        // Convertir explícitamente a booleano por si viene como string u otro tipo
        const isTestimony = interview.isTestimony === true || interview.isTestimony === 'true';
        console.log(`Entrevista ${interview.id}: isTestimony=${isTestimony}, status=${interview.status}`);
        return isTestimony;
      });
      
      console.log('Total entrevistas marcadas como testimonio:', interviewsWithTestimony.length);
      
      // Identificar testimonios pendientes vs firmados
      const signed = interviewsWithTestimony.filter(
        interview => interview.status === 'signed' || interview.status === 'verified'
      );
      
      // Ampliar los criterios para testimonios pendientes para capturar todos los casos posibles
      const pending = interviewsWithTestimony.filter(interview => {
        const isPendingSignature = interview.status === 'pending_signature';
        const isDraft = interview.status === 'draft' || !interview.status;
        const result = isPendingSignature || (interview.isTestimony === true && isDraft);
        console.log(`Evaluando testimonio ${interview.id} para pendientes: isPendingSignature=${isPendingSignature}, isDraft=${isDraft}, resultado=${result}`);
        return result;
      });
      
      // Log más detallado para depurar
      console.log('Detalles de entrevistas marcadas como testimonio:', 
        interviewsWithTestimony.map(i => ({
          id: i.id,
          isTestimony: i.isTestimony,
          status: i.status,
          testimonyId: i.testimonyId
        })));
      
      console.log('Testimonios firmados:', signed.length, 'Testimonios pendientes:', pending.length);
      
      setSignedTestimonies(signed);
      setPendingTestimonies(pending);
    }
  }, [interviews, isKarinLaw]);
  
  // Valores iniciales para el formulario
  const initialValues = {
    interviewee: '',
    position: '',
    location: isKarinLaw ? 'Oficina de la empresa' : '',
    date: new Date().toISOString().split('T')[0],
    summary: '',
    keyPoints: [''],
    isConfidential: false,
    recordingConsent: false,
    protocol: isKarinLaw ? 'formal' : 'informal',
    isTestimony: isKarinLaw,
    notes: '',
  };
  
  // Valores iniciales para el formulario de firma
  const initialTestimonyValues = {
    personName: selectedInterview?.interviewee || '',
    personType: 'witness',
    signatureMethod: 'fisica',
    authorizedDisclosure: true,
    witnessName: '',
    witnessPosition: '',
    signatureObservations: '',
  };
  
  // Manejar el envío del formulario de entrevista
  const handleSubmit = async (values: any) => {
    if (!uid) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Preparar datos extendidos para la entrevista
      const extendedInterviewData = {
        ...values,
        conductedBy: uid,
        conductedByName: displayName || 'Usuario del sistema',
        status: values.isTestimony ? 'pending_signature' : 'draft',
        isTestimony: values.isTestimony,
        createdAt: new Date().toISOString(),
      };
      
      console.log('Creando entrevista para compañía:', companyId, 'reporte:', reportId);
      const result = await addInterview(
        companyId,
        reportId,
        uid,
        extendedInterviewData
      );
      
      if (result.success) {
        // Crear objeto de entrevista para actualizar la UI
        const newInterview = {
          id: result.interviewId,
          ...extendedInterviewData,
          date: new Date(values.date),
        };
        
        // Si es un testimonio y se generó un testimonyId, agregarlo al objeto
        if (values.isTestimony && result.testimonyId) {
          newInterview.testimonyId = result.testimonyId;
        }
        
        onInterviewAdded(newInterview);
        setShowForm(false);
        setSuccess(values.isTestimony 
          ? 'Testimonio registrado correctamente. Requiere firma para completarse.' 
          : 'Entrevista registrada correctamente.'
        );
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
  
  // Manejar el envío del formulario de firma
  const handleSignTestimony = async (values: any) => {
    if (!uid || !selectedInterview) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const signatureData = {
        signatureMethod: values.signatureMethod,
        authorizedDisclosure: values.authorizedDisclosure,
        witnessName: values.witnessName,
        witnessPosition: values.witnessPosition,
        signatureObservations: values.signatureObservations,
        signedAt: new Date().toISOString(),
        signatureVerifiedBy: uid,
        signatureVerifiedByName: displayName || 'Usuario del sistema',
      };
      
      // Determinar el ID correcto a usar para la firma
      // 1. Preferir testimonyId si existe
      // 2. Usar ID de la entrevista solo como último recurso
      const idToUse = selectedInterview.testimonyId || selectedInterview.id;
      console.log('Firmando testimonio:', idToUse, 'para entrevista:', selectedInterview.id);
      
      const result = await signTestimony(
        companyId,
        reportId,
        idToUse,
        signatureData
      );
      
      if (result.success) {
        setSuccess('Testimonio firmado correctamente');
        setShowSignatureForm(false);
        setSelectedInterview(null);
        
        // Si la API devolvió un ID de testimonio, usarlo para actualizar la UI
        const effectiveTestimonyId = result.testimonyId || idToUse;
        
        // Actualizar la lista de testimonios
        const updatedInterview = {
          ...selectedInterview,
          status: 'signed',
          testimonyId: effectiveTestimonyId,
          signatureDetails: signatureData,
        };
        
        // Notificar al componente padre para que actualice los datos
        onInterviewAdded(updatedInterview);
        
        // Volver a cargar la página con foco en la pestaña correcta
        setTimeout(() => {
          window.location.href = `/dashboard/investigation/${reportId}?tab=interviews&refresh=${Date.now()}`;
        }, 1500);
      } else if (result.needsReload) {
        // Si la API indica que se necesita recargar, mostrar mensaje y no intentar firmar de nuevo
        setSuccess('Se ha creado un nuevo testimonio. La página se recargará automáticamente...');
        setIsSubmitting(false);
        
        // Recargar la página después de un breve tiempo
        setTimeout(() => {
          window.location.href = `/dashboard/investigation/${reportId}?tab=interviews&refresh=${Date.now()}`;
        }, 1500);
      } else if (result.testimonyId) {
        // Si la API creó un nuevo testimonio, pero NO indica que hay que recargar, 
        // intentar UNA SOLA VEZ con el nuevo ID
        const retryValues = { ...values };
        
        // Actualizar el testimonio seleccionado con el nuevo ID
        setSelectedInterview({
          ...selectedInterview,
          testimonyId: result.testimonyId
        });
        
        setSuccess(`Se ha creado un nuevo testimonio con ID ${result.testimonyId}. Intentando firmar una vez más...`);
        
        // Esperar un momento y hacer un solo intento más
        setTimeout(async () => {
          try {
            // Usar directamente el nuevo ID para evitar recursión infinita
            console.log(`Firmando directamente con nuevo testimonyId: ${result.testimonyId}`);
            
            const directSignatureResult = await signTestimony(
              companyId,
              reportId,
              result.testimonyId,
              signatureData
            );
            
            console.log('Resultado de la firma directa:', directSignatureResult);
            
            if (directSignatureResult.success) {
              setSuccess('¡Testimonio firmado correctamente! Redirigiendo...');
            } else {
              setError(`No se pudo firmar: ${directSignatureResult.error}`);
              console.error('Error al firmar con el nuevo ID:', directSignatureResult.error);
            }
          } catch (err) {
            console.error('Error en la firma directa:', err);
            setError('Ocurrió un error al intentar firmar el testimonio');
          } finally {
            // Independientemente del resultado, recargar la página
            setTimeout(() => {
              window.location.href = `/dashboard/investigation/${reportId}?tab=interviews&refresh=${Date.now()}`;
            }, 2000);
          }
        }, 1000);
      } else {
        setError(result.error || 'Error al firmar el testimonio');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error al firmar el testimonio:', error);
      setError('Ha ocurrido un error al firmar el testimonio');
      setIsSubmitting(false);
    }
  };
  
  // Convertir entrevista a testimonio
  const handleConvertToTestimony = async (interview: any) => {
    if (!uid) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await convertInterviewToTestimony(
        companyId,
        reportId,
        interview.id,
        uid
      );
      
      if (result.success) {
        setSuccess('Entrevista convertida a testimonio correctamente');
        
        // Actualizar la UI con el ID del testimonio recién creado
        const updatedInterview = {
          ...interview,
          isTestimony: true,
          status: 'pending_signature',
          testimonyId: result.testimonyId, // Guardar el ID del testimonio
        };
        
        // Añadir a pendientes
        setPendingTestimonies(prev => [...prev, updatedInterview]);
        
        // Notificar al componente padre
        onInterviewAdded(updatedInterview);
        
        // Opcional: recargar para asegurar datos frescos
        setTimeout(() => {
          window.location.href = `/dashboard/investigation/${reportId}?tab=interviews&refresh=${Date.now()}`;
        }, 1500);
      } else {
        setError(result.error || 'Error al convertir la entrevista a testimonio');
      }
    } catch (error) {
      console.error('Error al convertir a testimonio:', error);
      setError('Ha ocurrido un error al convertir la entrevista a testimonio');
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
  
  // Obtener etiqueta de estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Borrador</Badge>;
      case 'pending_signature':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente de firma</Badge>;
      case 'signed':
        return <Badge className="bg-green-100 text-green-800">Firmado</Badge>;
      case 'verified':
        return <Badge className="bg-blue-100 text-blue-800">Verificado</Badge>;
      default:
        return null;
    }
  };
  
  // Filtrar entrevistas normales (no testimonios)
  const regularInterviews = interviews.filter(interview => !interview.isTestimony);
  
  return (
    <div className="space-y-6">
      {isKarinLaw ? (
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interviews">Entrevistas ({regularInterviews.length})</TabsTrigger>
            <TabsTrigger value="pending_testimonies" className="relative">
              Testimonios Pendientes
              {pendingTestimonies.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-[10px] text-white">
                  {pendingTestimonies.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="signed_testimonies" className="relative">
              Testimonios Firmados
              {signedTestimonies.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                  {signedTestimonies.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Pestaña de Entrevistas */}
          <TabsContent value="interviews">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Entrevistas</CardTitle>
                  <CardDescription>
                    Registro de entrevistas realizadas durante la investigación
                  </CardDescription>
                </div>
                {canEdit && !showForm && !selectedInterview && (
                  <Button onClick={() => setShowForm(true)}>
                    Registrar Nueva Entrevista
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {renderInterviewsContent(interviews)}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pestaña de Testimonios Pendientes */}
          <TabsContent value="pending_testimonies">
            <Card>
              <CardHeader>
                <CardTitle>Testimonios Pendientes de Firma</CardTitle>
                <CardDescription>
                  Testimonios formales que requieren firma para validez legal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingTestimonies.length > 0 ? (
                  <div className="space-y-4">
                    {pendingTestimonies.map((testimony) => (
                      <Card key={testimony.id} className="bg-yellow-50 border-yellow-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">
                                {testimony.interviewee}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {testimony.position} - {formatDate(testimony.date)}
                              </p>
                              <div className="mt-1">
                                {getStatusBadge(testimony.status)}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {testimony.summary}
                          </p>
                          <div className="mt-3 flex justify-end space-x-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInterview(testimony);
                                setShowSignatureForm(false);
                              }}
                            >
                              Ver Detalles
                            </Button>
                            {canEdit && (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedInterview(testimony);
                                  setShowSignatureForm(true);
                                }}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                Gestionar Firma
                              </Button>
                            )}
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay testimonios pendientes de firma</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Los testimonios pendientes de firma aparecerán aquí.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pestaña de Testimonios Firmados */}
          <TabsContent value="signed_testimonies">
            <Card>
              <CardHeader>
                <CardTitle>Testimonios Firmados</CardTitle>
                <CardDescription>
                  Testimonios formales validados con firma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {signedTestimonies.length > 0 ? (
                  <div className="space-y-4">
                    {signedTestimonies.map((testimony) => (
                      <Card key={testimony.id} className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">
                                {testimony.interviewee}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {testimony.position} - {formatDate(testimony.date)}
                              </p>
                              <div className="mt-1 flex items-center">
                                {getStatusBadge(testimony.status)}
                                {testimony.signatureDetails?.signatureMethod && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    Firma {testimony.signatureDetails.signatureMethod === 'fisica' 
                                      ? 'física' 
                                      : testimony.signatureDetails.signatureMethod === 'electronica'
                                        ? 'electrónica'
                                        : 'simple'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {testimony.summary}
                          </p>
                          {testimony.signatureDetails && (
                            <div className="mt-2 bg-white p-2 rounded-md border border-green-200 text-xs">
                              <p><strong>Firmado el:</strong> {formatDate(testimony.signatureDetails.signedAt)}</p>
                              {testimony.signatureDetails.witnessName && (
                                <p><strong>Testigo:</strong> {testimony.signatureDetails.witnessName}</p>
                              )}
                            </div>
                          )}
                          <div className="mt-3 flex justify-end">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInterview(testimony);
                                setShowSignatureForm(false);
                              }}
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay testimonios firmados</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Una vez que los testimonios sean firmados, aparecerán aquí.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Entrevistas</CardTitle>
              <CardDescription>
                Registro de entrevistas realizadas durante la investigación
              </CardDescription>
            </div>
            {canEdit && !showForm && !selectedInterview && (
              <Button onClick={() => setShowForm(true)}>
                Registrar Nueva Entrevista
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {renderInterviewsContent(interviews)}
          </CardContent>
        </Card>
      )}
      
      {/* Formulario de Firma de Testimonio */}
      {showSignatureForm && selectedInterview && (
        <Card className="border-yellow-300">
          <CardHeader>
            <CardTitle>Firma de Testimonio</CardTitle>
            <CardDescription>
              Complete la información de firma para validar el testimonio de {selectedInterview.interviewee}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Formik
              initialValues={initialTestimonyValues}
              validationSchema={TestimonySchema}
              onSubmit={handleSignTestimony}
            >
              {({ values, errors, touched, setFieldValue }) => (
                <Form className="space-y-4">
                  {/* Tipo de persona */}
                  <div>
                    <Label htmlFor="personType" required>
                      Tipo de Persona
                    </Label>
                    <div className="mt-1">
                      <Field as="select" 
                        id="personType" 
                        name="personType"
                        className="w-full rounded-md border border-gray-300 shadow-sm py-2"
                      >
                        <option value="complainant">Denunciante</option>
                        <option value="accused">Denunciado</option>
                        <option value="witness">Testigo</option>
                      </Field>
                    </div>
                    <ErrorMessage name="personType">
                      {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Método de firma */}
                  <div>
                    <Label htmlFor="signatureMethod" required>
                      Método de Firma
                    </Label>
                    <div className="mt-1">
                      <Field as="select" 
                        id="signatureMethod" 
                        name="signatureMethod"
                        className="w-full rounded-md border border-gray-300 shadow-sm py-2"
                      >
                        <option value="fisica">Firma física</option>
                        <option value="electronica">Firma electrónica avanzada</option>
                        <option value="firma_simple">Firma simple</option>
                      </Field>
                    </div>
                    <ErrorMessage name="signatureMethod">
                      {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                  
                  {/* Testigos de firma (solo para firma física) */}
                  {values.signatureMethod === 'fisica' && (
                    <div className="border p-3 rounded-md bg-gray-50">
                      <h4 className="text-sm font-medium mb-2">Testigo de la Firma</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="witnessName" required>
                            Nombre del Testigo
                          </Label>
                          <Field
                            as={Input}
                            id="witnessName"
                            name="witnessName"
                            placeholder="Nombre completo del testigo"
                            className={`mt-1 ${touched.witnessName && errors.witnessName ? 'border-red-500' : ''}`}
                          />
                          <ErrorMessage name="witnessName">
                            {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                          </ErrorMessage>
                        </div>
                        <div>
                          <Label htmlFor="witnessPosition" required>
                            Cargo del Testigo
                          </Label>
                          <Field
                            as={Input}
                            id="witnessPosition"
                            name="witnessPosition"
                            placeholder="Cargo o posición del testigo"
                            className={`mt-1 ${touched.witnessPosition && errors.witnessPosition ? 'border-red-500' : ''}`}
                          />
                          <ErrorMessage name="witnessPosition">
                            {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                          </ErrorMessage>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Observaciones */}
                  <div>
                    <Label htmlFor="signatureObservations">
                      Observaciones sobre la Firma
                    </Label>
                    <Field
                      as={Textarea}
                      id="signatureObservations"
                      name="signatureObservations"
                      rows={2}
                      placeholder="Observaciones adicionales sobre el proceso de firma"
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Autorización de divulgación */}
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="authorizedDisclosure"
                      name="authorizedDisclosure"
                      className="h-4 w-4 text-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="authorizedDisclosure" className="ml-2">
                      El firmante autoriza la divulgación del testimonio para efectos de la investigación
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
                      onClick={() => {
                        setShowSignatureForm(false);
                      }}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {isSubmitting ? 'Procesando...' : 'Registrar Firma'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </CardContent>
        </Card>
      )}
      
      {/* Mensajes de éxito o error */}
      {(success || error) && !showForm && !showSignatureForm && !selectedInterview && (
        <Alert variant={error ? "error" : "success"} className="mt-4">
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
  
  function renderInterviewsContent(interviewsToShow: any[]) {
    if (showForm) {
      return (
        <Formik
          initialValues={initialValues}
          validationSchema={InterviewSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue }) => (
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
                    className={`mt-1 ${touched.interviewee && errors.interviewee ? 'border-red-500' : ''}`}
                  />
                  <ErrorMessage name="interviewee">
                    {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
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
                    className={`mt-1 ${touched.position && errors.position ? 'border-red-500' : ''}`}
                  />
                  <ErrorMessage name="position">
                    {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                  </ErrorMessage>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className={`mt-1 ${touched.date && errors.date ? 'border-red-500' : ''}`}
                  />
                  <ErrorMessage name="date">
                    {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                  </ErrorMessage>
                </div>
                
                {/* Lugar de la entrevista */}
                <div>
                  <Label htmlFor="location" required>
                    Lugar de la Entrevista
                  </Label>
                  <Field
                    as={Input}
                    id="location"
                    name="location"
                    placeholder="Ej: Oficina central, Sala de reuniones"
                    className={`mt-1 ${touched.location && errors.location ? 'border-red-500' : ''}`}
                  />
                  <ErrorMessage name="location">
                    {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                  </ErrorMessage>
                </div>
              </div>
              
              {/* Protocolo de entrevista */}
              <div>
                <Label htmlFor="protocol">
                  Protocolo de Entrevista
                </Label>
                <Field as="select" 
                  id="protocol" 
                  name="protocol"
                  className="w-full rounded-md border border-gray-300 shadow-sm py-2 mt-1"
                >
                  <option value="formal">Formal (recomendado para Ley Karin)</option>
                  <option value="informal">Informal</option>
                  <option value="estructurada">Estructurada</option>
                  <option value="semi_estructurada">Semi-estructurada</option>
                </Field>
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
                  className={`mt-1 ${touched.summary && errors.summary ? 'border-red-500' : ''}`}
                />
                <ErrorMessage name="summary">
                  {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
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
                                  ? 'border-red-500' 
                                  : ''
                              }`}
                            />
                            {touched.keyPoints?.[index] && 
                              (errors.keyPoints as any)?.[index] && (
                                <div className="text-red-500 text-sm mt-1">
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
                  {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                </ErrorMessage>
              </div>
              
              {/* Notas adicionales */}
              <div>
                <Label htmlFor="notes">
                  Notas Adicionales
                </Label>
                <Field
                  as={Textarea}
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Añada cualquier información relevante no incluida en el resumen..."
                  className="mt-1"
                />
              </div>
              
              {/* Opciones adicionales */}
              <div className="space-y-2 border p-3 rounded-md bg-gray-50">
                <div className="flex items-center">
                  <Field
                    type="checkbox"
                    id="recordingConsent"
                    name="recordingConsent"
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <Label htmlFor="recordingConsent" className="ml-2">
                    El entrevistado consintió la grabación de la entrevista
                  </Label>
                </div>
                
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
                
                {isKarinLaw && (
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="isTestimony"
                      name="isTestimony"
                      className="h-4 w-4 text-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="isTestimony" className="ml-2">
                      Registrar como testimonio formal (requiere firma)
                    </Label>
                  </div>
                )}
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
      );
    }
    
    // Verificar si hay una entrevista seleccionada
    if (selectedInterview) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {selectedInterview.isTestimony ? 'Testimonio de ' : 'Entrevista a '} 
                {selectedInterview.interviewee}
              </h3>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-500 mr-2">
                  {formatDate(selectedInterview.date)}
                </span>
                {selectedInterview.isTestimony && getStatusBadge(selectedInterview.status)}
                {selectedInterview.isConfidential && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Confidencial
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedInterview(null);
                setShowSignatureForm(false);
                // No cambiamos la pestaña al volver para mantener la navegación coherente
              }}
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
              <h4 className="text-sm font-medium text-gray-500">Lugar</h4>
              <p className="text-gray-900">{selectedInterview.location || 'No especificado'}</p>
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
          
          {selectedInterview.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Notas Adicionales</h4>
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <p className="text-sm text-gray-800">{selectedInterview.notes}</p>
              </div>
            </div>
          )}
          
          {/* Detalles de firma si es un testimonio firmado */}
          {selectedInterview.isTestimony && selectedInterview.status === 'signed' && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Información de Firma</h4>
              <div className="bg-green-50 p-3 rounded-md border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Fecha de firma:</strong> {formatDate(selectedInterview.signatureDate || selectedInterview.signatureDetails?.signedAt)}
                  </div>
                  <div>
                    <strong>Método:</strong> {
                      selectedInterview.signatureDetails?.signatureMethod === 'fisica' ? 'Firma física' :
                      selectedInterview.signatureDetails?.signatureMethod === 'electronica' ? 'Firma electrónica avanzada' :
                      'Firma simple'
                    }
                  </div>
                  {selectedInterview.signatureDetails?.witnessName && (
                    <>
                      <div>
                        <strong>Testigo:</strong> {selectedInterview.signatureDetails.witnessName}
                      </div>
                      <div>
                        <strong>Cargo del testigo:</strong> {selectedInterview.signatureDetails.witnessPosition}
                      </div>
                    </>
                  )}
                  {selectedInterview.signatureDetails?.signatureObservations && (
                    <div className="md:col-span-2">
                      <strong>Observaciones:</strong> {selectedInterview.signatureDetails.signatureObservations}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {canEdit && !selectedInterview.isTestimony && isKarinLaw && (
            <div className="flex justify-end mt-2">
              <Button
                onClick={() => handleConvertToTestimony(selectedInterview)}
                disabled={isSubmitting}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Convertir a Testimonio Formal
              </Button>
            </div>
          )}
        </div>
      );
    } else if (interviewsToShow.length > 0) {
      return (
        <div className="space-y-4">
          {interviewsToShow.map((interview) => (
            <Card key={interview.id} className={`${interview.isTestimony ? 'bg-yellow-50' : 'bg-gray-50'}`}>
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
                  <div className="flex space-x-1">
                    {interview.isTestimony && getStatusBadge(interview.status)}
                    {interview.isConfidential && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Confidencial
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {interview.summary}
                </p>
                <div className="mt-3 flex justify-end">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedInterview(interview);
                      setShowSignatureForm(false);
                    }}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    } else {
      return (
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
      );
    }
  }
};