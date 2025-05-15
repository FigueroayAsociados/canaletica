'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeRender } from '@/components/ui/safe-render';
import { getReportByCode, getReportByCodeAndAccessCode, addCommunicationByCode } from '@/lib/services/reportService';

// Aseguramos que estos estados coincidan exactamente con los utilizados en ReportStatusBadge
const STATUS_COLORS: Record<string, string> = {
  'Nuevo': 'bg-red-100 text-red-800',
  'Admitida': 'bg-orange-100 text-orange-800',
  'Asignada': 'bg-yellow-100 text-yellow-800',
  'En Investigación': 'bg-blue-100 text-blue-800',
  'Pendiente Información': 'bg-purple-100 text-purple-800',
  'En Evaluación': 'bg-cyan-100 text-cyan-800',
  'Resuelta': 'bg-green-100 text-green-800',
  'En Seguimiento': 'bg-lime-100 text-lime-800',
  'Cerrada': 'bg-gray-100 text-gray-800',
  'Rechazada': 'bg-gray-800 text-white',
};

export default function ReportDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const reportCode = params.code as string;
  const email = searchParams.get('email');
  const accessCode = searchParams.get('accessCode');
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    async function fetchReport() {
      if (!reportCode) {
        return;
      }

      try {
        const companyId = 'default'; // TODO: Obtener el ID de la empresa desde la URL
        
        let result;
        if (accessCode) {
          // Si hay código de acceso, es una denuncia anónima
          result = await getReportByCodeAndAccessCode(companyId, reportCode, accessCode);
        } else if (email) {
          // Si hay email, es una denuncia identificada
          // TODO: Implementar verificación con email
          result = await getReportByCode(companyId, reportCode);
        } else {
          // Si no hay ninguno de los dos, redirigir a la página de búsqueda
          router.push('/track');
          return;
        }

        if (result.success && result.report) {
          setReport(result.report);
        } else {
          setError(result.error || 'No se encontró la denuncia');
        }
      } catch (error) {
        console.error('Error al obtener detalles de la denuncia:', error);
        setError('Ha ocurrido un error al obtener los detalles de la denuncia');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [reportCode, email, accessCode, router]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    setError(null);
    
    try {
      const companyId = 'default';
      
      // Usar la nueva función que acepta código de denuncia en lugar de ID
      const result = await addCommunicationByCode(
        companyId,
        reportCode,  // Ahora enviamos el código visible
        null, // userId null porque es el denunciante
        newMessage,
        true, // isFromReporter = true
        false // isInternal = false
      );
      
      if (result.success) {
        // Actualizar la lista de comunicaciones en el estado local
        const newMsg = {
          id: Date.now().toString(),
          timestamp: new Date(),
          senderId: 'reporter',
          content: newMessage,
          isFromReporter: true,
          isInternal: false,
          isRead: false,
        };
        
        setReport(prev => ({
          ...prev,
          communications: [newMsg, ...(prev.communications || [])]
        }));
        
        // Limpiar el campo de mensaje
        setNewMessage('');
      } else {
        setError(`Error al enviar el mensaje: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setError('Error al enviar el mensaje. Por favor, inténtelo de nuevo.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin text-primary">
          <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="mt-2 text-gray-600">Cargando detalles de la denuncia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center mt-4">
          <Link href="/track">
            <Button>Volver al Seguimiento</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 text-center">
        <Alert variant="error" className="mb-4">
          <AlertDescription>No se encontró la denuncia solicitada</AlertDescription>
        </Alert>
        <div className="text-center mt-4">
          <Link href="/track">
            <Button>Volver al Seguimiento</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Formatear fecha de creación
  const createdAt = report.createdAt 
    ? (typeof report.createdAt.toDate === 'function' 
        ? new Date(report.createdAt.toDate()).toLocaleDateString('es-CL')
        : report.createdAt.seconds 
          ? new Date(report.createdAt.seconds * 1000).toLocaleDateString('es-CL')
          : report.createdAt instanceof Date 
            ? report.createdAt.toLocaleDateString('es-CL')
            : 'Fecha no disponible')
    : 'Fecha no disponible';

  return (
    <div className="p-6 space-y-8">
      {/* Cabecera con resumen */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Denuncia #{reportCode}
            </h3>
            <p className="text-sm text-gray-500">Recibida el {createdAt}</p>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-sm">Estado:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[report.status] || 'bg-gray-100'}`}>
              {report.status}
            </span>
          </div>
        </div>
      </div>

      {/* Mostrar mensaje de error si hay alguno */}
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Pestañas para navegar entre secciones */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="timeline">Progreso</TabsTrigger>
          <TabsTrigger value="communications">Comunicaciones</TabsTrigger>
        </TabsList>

        {/* Pestaña de Detalles */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Denuncia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Categoría</h4>
                  <p className="mt-1">
                    {report.category === 'modelo_prevencion' && 'Modelo de Prevención de Delitos'}
                    {report.category === 'ley_karin' && 'Ley Karin (Acoso laboral/sexual)'}
                    {report.category === 'ciberseguridad' && 'Ciberseguridad'}
                    {report.category === 'reglamento_interno' && 'Infracciones al Reglamento Interno'}
                    {report.category === 'politicas_codigos' && 'Infracciones a Políticas y Códigos'}
                    {report.category === 'represalias' && 'Represalias'}
                    {report.category === 'otros' && 'Otros'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Subcategoría</h4>
                  <p className="mt-1">{report.subcategory}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Prioridad</h4>
                  <p className="mt-1">{report.priority}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Tipo de Denuncia</h4>
                  <p className="mt-1">{report.reporter?.isAnonymous ? 'Anónima' : 'Identificada'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Progreso de la Denuncia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="relative">
                  {/* Línea vertical */}
                  <div className="absolute top-0 left-5 h-full w-0.5 bg-gray-200"></div>
                  
                  {/* Pasos del proceso - Diferencia entre proceso normal y Ley Karin */}
                  {report.isKarinLaw ? (
                    // Proceso para Ley Karin
                    <div className="space-y-8">
                      {/* Paso 1: Interposición de Denuncia */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status.includes('Denuncia Interpuesta') || report.status.includes('Recepción') ||
                          report.status.includes('Notificación') || report.status.includes('Medidas Precautorias') ||
                          report.status.includes('Decisión') || report.status.includes('Investigación') || 
                          report.status.includes('Informe') || report.status.includes('Resolución') || 
                          report.status.includes('Adopción') || report.status.includes('Sanciones') || 
                          report.status.includes('Cerrado')
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Interposición de Denuncia</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            La denuncia Ley Karin ha sido interpuesta correctamente.
                          </p>
                        </div>
                      </div>

                      {/* Paso 2: Notificaciones y Medidas */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status.includes('Notificación') || report.status.includes('Medidas Precautorias') ||
                          report.status.includes('Decisión') || report.status.includes('Investigación') || 
                          report.status.includes('Informe') || report.status.includes('Resolución') || 
                          report.status.includes('Adopción') || report.status.includes('Sanciones') || 
                          report.status.includes('Cerrado')
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Notificaciones y Medidas</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Notificación a la DT (3 días), SUSESO (5 días) y aplicación de medidas precautorias.
                          </p>
                        </div>
                      </div>

                      {/* Paso 3: Investigación */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status.includes('Investigación') || 
                          report.status.includes('Informe') || report.status.includes('Resolución') || 
                          report.status.includes('Adopción') || report.status.includes('Sanciones') || 
                          report.status.includes('Cerrado')
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Investigación</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            La investigación está en curso (plazo máximo: 30 días hábiles).
                          </p>
                        </div>
                      </div>

                      {/* Paso 4: Informe Final */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status.includes('Informe') || report.status.includes('Resolución') || 
                          report.status.includes('Adopción') || report.status.includes('Sanciones') || 
                          report.status.includes('Cerrado')
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Informe y Envío a DT</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Creación del informe final y envío a la Dirección del Trabajo (2 días).
                          </p>
                        </div>
                      </div>

                      {/* Paso 5: Resolución DT */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status.includes('Resolución') || 
                          report.status.includes('Adopción') || report.status.includes('Sanciones') || 
                          report.status.includes('Cerrado')
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Resolución DT</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            La Dirección del Trabajo evalúa el procedimiento (30 días hábiles).
                          </p>
                        </div>
                      </div>

                      {/* Paso 6: Medidas y Sanciones */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status.includes('Adopción') || report.status.includes('Sanciones') || 
                          report.status.includes('En Seguimiento') ||
                          report.status.includes('Cerrado')
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Medidas y Sanciones</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Implementación de medidas correctivas y sanciones (15 días corridos).
                          </p>
                          {report.status.includes('En Seguimiento') && (
                            <div className="mt-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
                              En seguimiento: Verificando la implementación de las recomendaciones.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Paso 7: Cierre */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status.includes('Cerrado')
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Cierre</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            El caso ha sido cerrado formalmente tras la implementación de todas las acciones requeridas.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Proceso normal (no Ley Karin)
                    <div className="space-y-8">
                      {/* Paso 1: Recepción */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          report.status === 'Nuevo' ||
                          ['Admitida', 'Asignada', 'En Investigación', 'Pendiente Información', 'En Evaluación', 'Resuelta', 'En Seguimiento', 'Cerrada'].includes(report.status)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Recepción</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            La denuncia ha sido recibida en el sistema.
                          </p>
                        </div>
                      </div>

                      {/* Paso 2: Evaluación Inicial */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          ['Admitida', 'Asignada', 'En Investigación', 'Pendiente Información', 'En Evaluación', 'Resuelta', 'En Seguimiento', 'Cerrada'].includes(report.status)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Evaluación Inicial</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            La denuncia ha sido evaluada y admitida para investigación.
                          </p>
                        </div>
                      </div>

                      {/* Paso 3: Asignación */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          ['Asignada', 'En Investigación', 'Pendiente Información', 'En Evaluación', 'Resuelta', 'En Seguimiento', 'Cerrada'].includes(report.status)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Asignación</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Un investigador ha sido asignado al caso.
                          </p>
                        </div>
                      </div>

                      {/* Paso 4: Investigación */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          ['En Investigación', 'Pendiente Información', 'En Evaluación', 'Resuelta', 'En Seguimiento', 'Cerrada'].includes(report.status)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Investigación</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            La investigación está en curso. El investigador recopila evidencias y entrevista a las partes involucradas.
                          </p>
                          {(report.status === 'Pendiente Información') && (
                            <div className="mt-2 px-3 py-1 bg-purple-50 border border-purple-100 rounded-md text-sm text-purple-800">
                              Se requiere información adicional para continuar con la investigación.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Paso 5: Resolución y Seguimiento */}
                      <div className="relative">
                        <div className={`absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full ${
                          ['Resuelta', 'En Seguimiento', 'Cerrada'].includes(report.status)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-400'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-14">
                          <h4 className="text-base font-medium text-gray-900">Resolución</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            La investigación ha concluido y se han tomado decisiones sobre el caso.
                          </p>
                          {(report.status === 'En Seguimiento' || report.status === 'Resuelta') && (
                            <div className="mt-2 px-3 py-1 bg-lime-50 border border-lime-100 rounded-md text-sm text-lime-800">
                              {report.progress !== undefined ? (
                                <span>Progreso de recomendaciones: {report.progress}% completado</span>
                              ) : (
                                <span>Se están implementando recomendaciones y medidas correctivas.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Paso 6: Cierre (opcional) */}
                      {report.status === 'Cerrada' && (
                        <div className="relative">
                          <div className="absolute top-0 left-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="ml-14">
                            <h4 className="text-base font-medium text-gray-900">Cierre Definitivo</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              El caso ha sido cerrado formalmente tras la implementación de todas las acciones requeridas.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Comunicaciones */}
        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Comunicaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Lista de mensajes */}
              <div className="space-y-4 mb-6">
                {!report.communications || report.communications.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-md">
                    <p className="text-gray-500">No hay comunicaciones disponibles todavía.</p>
                  </div>
                ) : (
                  report.communications.map((message: any, index: number) => (
                    <div 
                      key={message.id || index} 
                      className={`p-4 rounded-lg ${
                        message.isFromReporter 
                          ? 'bg-blue-50 ml-4' 
                          : 'bg-gray-50 mr-4'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">
                          {message.isFromReporter ? 'Usted' : 'Investigador'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp 
                            ? (typeof message.timestamp.toDate === 'function'
                                ? new Date(message.timestamp.toDate()).toLocaleString('es-CL')
                                : message.timestamp.seconds
                                  ? new Date(message.timestamp.seconds * 1000).toLocaleString('es-CL')
                                  : message.timestamp instanceof Date
                                    ? message.timestamp.toLocaleString('es-CL')
                                    : 'Fecha desconocida')
                            : 'Fecha desconocida'
                          }
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Formulario para enviar nuevo mensaje */}
              <div className="space-y-4">
                <Label htmlFor="newMessage">Enviar un mensaje</Label>
                <Textarea
                  id="newMessage"
                  placeholder="Escriba su mensaje o consulta aquí..."
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                  >
                    {sendingMessage ? 'Enviando...' : 'Enviar Mensaje'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botón para volver */}
      <div className="flex justify-start">
        <Link href="/track">
          <Button variant="outline">
            ← Volver a Seguimiento
          </Button>
        </Link>
      </div>
    </div>
  );
}