'use client';

// src/components/investigation/AuthorityNotificationForm.tsx
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { addBusinessDays, getBusinessDaysCount } from '@/lib/utils/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface AuthorityNotificationFormProps {
  report: any;
  companyId: string;
  onUpdate: () => void;
  readOnly?: boolean;
}

export const AuthorityNotificationForm: React.FC<AuthorityNotificationFormProps> = ({
  report,
  companyId,
  onUpdate,
  readOnly = false,
}) => {
  const { uid, displayName } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dt'); // 'dt', 'suseso', 'inspection'
  
  // Datos del reporte
  const karinProcess = report?.karinProcess || {};
  
  // Estados para notificaciones a la DT
  const [dtNotifications, setDtNotifications] = useState<any[]>(
    karinProcess.dtNotifications || []
  );
  
  // Estados para notificaciones a SUSESO/Mutualidades
  const [susesoNotifications, setSusesoNotifications] = useState<any[]>(
    karinProcess.susesoNotifications || []
  );
  
  // Estados para notificaciones a Inspección del Trabajo
  const [inspectionNotifications, setInspectionNotifications] = useState<any[]>(
    karinProcess.inspectionNotifications || []
  );
  
  // Estados para el formulario de nueva notificación a DT
  const [newDtNotification, setNewDtNotification] = useState({
    date: new Date().toISOString().substring(0, 10),
    method: 'email',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    trackingNumber: '',
    notes: '',
    oficina: '',
    direccion: '',
    status: 'enviada'
  });
  
  // Estados para el formulario de nueva notificación a SUSESO
  const [newSusesoNotification, setNewSusesoNotification] = useState({
    date: new Date().toISOString().substring(0, 10),
    entity: 'suseso',
    entityName: '',
    method: 'email',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    trackingNumber: '',
    notes: '',
    oficina: '',
    direccion: '',
    status: 'enviada'
  });
  
  // Estados para el formulario de nueva notificación a Inspección
  const [newInspectionNotification, setNewInspectionNotification] = useState({
    date: new Date().toISOString().substring(0, 10),
    method: 'email',
    inspectorName: '',
    inspectorEmail: '',
    inspectorPhone: '',
    trackingNumber: '',
    notes: '',
    visitScheduled: false,
    visitDate: '',
    status: 'enviada'
  });
  
  // Estado para archivo seleccionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  
  // Verifica plazos legales para notificaciones
  useEffect(() => {
    if (report) {
      // Verificar plazo DT (3 días hábiles desde recepción)
      const receptionDate = karinProcess.receivedDate
        ? new Date(karinProcess.receivedDate)
        : report.createdAt?.toDate
          ? new Date(report.createdAt.toDate())
          : new Date(report.createdAt);
      
      const dtDeadline = addBusinessDays(receptionDate, 3);
      const now = new Date();
      
      if (dtNotifications.length === 0 && getBusinessDaysCount(now, dtDeadline) <= 0) {
        // Plazo vencido para notificar a DT
        setError('El plazo legal de 3 días hábiles para notificar a la DT ha vencido. Debe proceder con urgencia.');
      } else if (dtNotifications.length === 0 && getBusinessDaysCount(now, dtDeadline) <= 1) {
        // Plazo crítico para notificar a DT
        setError('Solo queda 1 día hábil para cumplir con el plazo legal de notificación a la DT.');
      }
      
      // Verificar plazo SUSESO (5 días hábiles)
      const susesoDeadline = addBusinessDays(receptionDate, 5);
      
      if (susesoNotifications.length === 0 && dtNotifications.length > 0 && getBusinessDaysCount(now, susesoDeadline) <= 0) {
        // Plazo vencido para notificar a SUSESO
        setError('El plazo legal de 5 días hábiles para notificar a la SUSESO/Mutualidad ha vencido. Debe proceder con urgencia.');
      } else if (susesoNotifications.length === 0 && dtNotifications.length > 0 && getBusinessDaysCount(now, susesoDeadline) <= 2) {
        // Plazo crítico para notificar a SUSESO
        setError('Quedan 2 días hábiles o menos para cumplir con el plazo legal de notificación a la SUSESO/Mutualidad.');
      }
    }
  }, [report, karinProcess, dtNotifications, susesoNotifications]);
  
  // Añadir una nueva notificación a DT
  const handleAddDtNotification = async () => {
    if (!newDtNotification.date || !newDtNotification.method) {
      setError('Debe completar los campos obligatorios: fecha y método de notificación');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Crear nueva notificación con ID único
      const newNotification = {
        id: uuidv4(),
        ...newDtNotification,
        notifiedBy: uid,
        notifiedByName: displayName || 'Usuario del sistema',
      };
      
      // Si hay documento seleccionado, subir a Storage
      let documentId = undefined;
      if (selectedFile) {
        // Aquí deberías subir el archivo y obtener el ID
        // documentId = await uploadNotificationDocument(companyId, report.id, selectedFile, 'dt_notification');
        // Por ahora simulamos un ID
        documentId = `doc_${uuidv4()}`;
      }
      
      // Si hay comprobante seleccionado, subir a Storage
      let proofOfDeliveryId = undefined;
      if (proofFile) {
        // Aquí deberías subir el archivo y obtener el ID
        // proofOfDeliveryId = await uploadNotificationDocument(companyId, report.id, proofFile, 'dt_proof');
        // Por ahora simulamos un ID
        proofOfDeliveryId = `proof_${uuidv4()}`;
      }
      
      const finalNotification = {
        ...newNotification,
        documentId,
        proofOfDeliveryId,
        proofOfDeliveryType: proofFile ? 'comprobante_envio' : undefined
      };
      
      // Actualizar estado local
      const updatedNotifications = [...dtNotifications, finalNotification];
      setDtNotifications(updatedNotifications);
      
      // Guardar en Firestore
      // await registerAuthorityNotification(
      //   companyId,
      //   report.id,
      //   'dt',
      //   updatedNotifications
      // );
      
      // Limpiar formulario
      setNewDtNotification({
        date: new Date().toISOString().substring(0, 10),
        method: 'email',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        trackingNumber: '',
        notes: '',
        oficina: '',
        direccion: '',
        status: 'enviada'
      });
      setSelectedFile(null);
      setProofFile(null);
      setSuccess('Notificación a DT registrada correctamente');
      
      // Notificar al componente padre
      onUpdate();
    } catch (error) {
      console.error('Error al registrar notificación a DT:', error);
      setError('Error al registrar la notificación a la Dirección del Trabajo');
    } finally {
      setLoading(false);
    }
  };
  
  // Añadir una nueva notificación a SUSESO/Mutualidad
  const handleAddSusesoNotification = async () => {
    if (!newSusesoNotification.date || !newSusesoNotification.method || !newSusesoNotification.entity) {
      setError('Debe completar los campos obligatorios: fecha, entidad y método de notificación');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Crear nueva notificación con ID único
      const newNotification = {
        id: uuidv4(),
        ...newSusesoNotification,
        notifiedBy: uid,
        notifiedByName: displayName || 'Usuario del sistema',
      };
      
      // Si hay documento seleccionado, subir a Storage
      let documentId = undefined;
      if (selectedFile) {
        // Aquí deberías subir el archivo y obtener el ID
        // documentId = await uploadNotificationDocument(companyId, report.id, selectedFile, 'suseso_notification');
        // Por ahora simulamos un ID
        documentId = `doc_${uuidv4()}`;
      }
      
      // Si hay comprobante seleccionado, subir a Storage
      let proofOfDeliveryId = undefined;
      if (proofFile) {
        // Aquí deberías subir el archivo y obtener el ID
        // proofOfDeliveryId = await uploadNotificationDocument(companyId, report.id, proofFile, 'suseso_proof');
        // Por ahora simulamos un ID
        proofOfDeliveryId = `proof_${uuidv4()}`;
      }
      
      const finalNotification = {
        ...newNotification,
        documentId,
        proofOfDeliveryId,
        proofOfDeliveryType: proofFile ? 'comprobante_envio' : undefined
      };
      
      // Actualizar estado local
      const updatedNotifications = [...susesoNotifications, finalNotification];
      setSusesoNotifications(updatedNotifications);
      
      // Guardar en Firestore
      // await registerAuthorityNotification(
      //   companyId,
      //   report.id,
      //   'suseso',
      //   updatedNotifications
      // );
      
      // Limpiar formulario
      setNewSusesoNotification({
        date: new Date().toISOString().substring(0, 10),
        entity: 'suseso',
        entityName: '',
        method: 'email',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        trackingNumber: '',
        notes: '',
        oficina: '',
        direccion: '',
        status: 'enviada'
      });
      setSelectedFile(null);
      setProofFile(null);
      setSuccess('Notificación a SUSESO/Mutualidad registrada correctamente');
      
      // Notificar al componente padre
      onUpdate();
    } catch (error) {
      console.error('Error al registrar notificación a SUSESO:', error);
      setError('Error al registrar la notificación a SUSESO/Mutualidad');
    } finally {
      setLoading(false);
    }
  };
  
  // Añadir una nueva notificación a Inspección del Trabajo
  const handleAddInspectionNotification = async () => {
    if (!newInspectionNotification.date || !newInspectionNotification.method) {
      setError('Debe completar los campos obligatorios: fecha y método de notificación');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Crear nueva notificación con ID único
      const newNotification = {
        id: uuidv4(),
        ...newInspectionNotification,
        notifiedBy: uid,
        notifiedByName: displayName || 'Usuario del sistema',
      };
      
      // Si hay documento seleccionado, subir a Storage
      let documentId = undefined;
      if (selectedFile) {
        // Aquí deberías subir el archivo y obtener el ID
        // documentId = await uploadNotificationDocument(companyId, report.id, selectedFile, 'inspection_notification');
        // Por ahora simulamos un ID
        documentId = `doc_${uuidv4()}`;
      }
      
      const finalNotification = {
        ...newNotification,
        documentId,
      };
      
      // Actualizar estado local
      const updatedNotifications = [...inspectionNotifications, finalNotification];
      setInspectionNotifications(updatedNotifications);
      
      // Guardar en Firestore
      // await registerAuthorityNotification(
      //   companyId,
      //   report.id,
      //   'inspection',
      //   updatedNotifications
      // );
      
      // Limpiar formulario
      setNewInspectionNotification({
        date: new Date().toISOString().substring(0, 10),
        method: 'email',
        inspectorName: '',
        inspectorEmail: '',
        inspectorPhone: '',
        trackingNumber: '',
        notes: '',
        visitScheduled: false,
        visitDate: '',
        status: 'enviada'
      });
      setSelectedFile(null);
      setSuccess('Notificación a Inspección registrada correctamente');
      
      // Notificar al componente padre
      onUpdate();
    } catch (error) {
      console.error('Error al registrar notificación a Inspección:', error);
      setError('Error al registrar la notificación a la Inspección del Trabajo');
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar una notificación de DT
  const renderDtNotification = (notification: any, index: number) => {
    return (
      <div 
        key={notification.id || index}
        className="p-3 rounded-md border border-gray-200 mb-3"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <span className="font-medium text-sm">
                {new Date(notification.date).toLocaleDateString('es-CL')}
              </span>
              <Badge 
                className={`ml-2 ${notification.status === 'recibida' ? 'bg-green-100 text-green-800' : 
                  notification.status === 'enviada' ? 'bg-blue-100 text-blue-800' : 
                  notification.status === 'respondida' ? 'bg-purple-100 text-purple-800' : 
                  'bg-gray-100 text-gray-800'}`}
              >
                {notification.status === 'recibida' ? 'Recibida' : 
                 notification.status === 'enviada' ? 'Enviada' : 
                 notification.status === 'respondida' ? 'Respondida' : 'Pendiente'}
              </Badge>
            </div>
            <p className="text-sm mt-1">
              <span className="font-medium">Método:</span> {
                notification.method === 'email' ? 'Correo electrónico' :
                notification.method === 'presencial' ? 'Presencial' :
                notification.method === 'carta_certificada' ? 'Carta certificada' :
                notification.method === 'sistema_dt' ? 'Sistema DT' : notification.method
              }
            </p>
            {notification.contactPerson && (
              <p className="text-sm">
                <span className="font-medium">Contacto:</span> {notification.contactPerson}
              </p>
            )}
            {notification.trackingNumber && (
              <p className="text-sm">
                <span className="font-medium">N° Seguimiento:</span> {notification.trackingNumber}
              </p>
            )}
            {notification.oficina && (
              <p className="text-sm">
                <span className="font-medium">Oficina DT:</span> {notification.oficina}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-1">
            {notification.documentId && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Ver documento')}>
                Ver documento
              </Button>
            )}
            {notification.proofOfDeliveryId && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Ver comprobante')}>
                Ver comprobante
              </Button>
            )}
            {!readOnly && notification.status !== 'respondida' && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Marcar como recibida')}>
                Marcar como recibida
              </Button>
            )}
            {!readOnly && notification.status === 'recibida' && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Registrar respuesta')}>
                Registrar respuesta
              </Button>
            )}
          </div>
        </div>
        {notification.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
            <span className="font-medium">Notas:</span> {notification.notes}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-500">
          Notificado por: {notification.notifiedByName || 'Usuario del sistema'}
        </div>
      </div>
    );
  };
  
  // Renderizar una notificación de SUSESO
  const renderSusesoNotification = (notification: any, index: number) => {
    return (
      <div 
        key={notification.id || index}
        className="p-3 rounded-md border border-gray-200 mb-3"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <span className="font-medium text-sm">
                {new Date(notification.date).toLocaleDateString('es-CL')}
              </span>
              <Badge 
                className={`ml-2 ${notification.status === 'recibida' ? 'bg-green-100 text-green-800' : 
                  notification.status === 'enviada' ? 'bg-blue-100 text-blue-800' : 
                  notification.status === 'respondida' ? 'bg-purple-100 text-purple-800' : 
                  'bg-gray-100 text-gray-800'}`}
              >
                {notification.status === 'recibida' ? 'Recibida' : 
                 notification.status === 'enviada' ? 'Enviada' : 
                 notification.status === 'respondida' ? 'Respondida' : 'Pendiente'}
              </Badge>
            </div>
            <p className="text-sm mt-1">
              <span className="font-medium">Entidad:</span> {
                notification.entity === 'suseso' ? 'SUSESO' :
                notification.entity === 'achs' ? 'ACHS' :
                notification.entity === 'mutual_seguridad' ? 'Mutual de Seguridad' :
                notification.entity === 'ist' ? 'IST' :
                notification.entity === 'otra' && notification.entityName ? notification.entityName :
                'Otra'
              }
            </p>
            <p className="text-sm">
              <span className="font-medium">Método:</span> {
                notification.method === 'email' ? 'Correo electrónico' :
                notification.method === 'presencial' ? 'Presencial' :
                notification.method === 'carta_certificada' ? 'Carta certificada' :
                notification.method === 'sistema_suseso' ? 'Sistema SUSESO' : notification.method
              }
            </p>
            {notification.contactPerson && (
              <p className="text-sm">
                <span className="font-medium">Contacto:</span> {notification.contactPerson}
              </p>
            )}
            {notification.trackingNumber && (
              <p className="text-sm">
                <span className="font-medium">N° Seguimiento:</span> {notification.trackingNumber}
              </p>
            )}
            {notification.oficina && (
              <p className="text-sm">
                <span className="font-medium">Oficina:</span> {notification.oficina}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-1">
            {notification.documentId && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Ver documento')}>
                Ver documento
              </Button>
            )}
            {notification.proofOfDeliveryId && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Ver comprobante')}>
                Ver comprobante
              </Button>
            )}
            {!readOnly && notification.status !== 'respondida' && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Marcar como recibida')}>
                Marcar como recibida
              </Button>
            )}
            {!readOnly && notification.status === 'recibida' && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Registrar respuesta')}>
                Registrar respuesta
              </Button>
            )}
          </div>
        </div>
        {notification.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
            <span className="font-medium">Notas:</span> {notification.notes}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-500">
          Notificado por: {notification.notifiedByName || 'Usuario del sistema'}
        </div>
      </div>
    );
  };
  
  // Renderizar una notificación de Inspección
  const renderInspectionNotification = (notification: any, index: number) => {
    return (
      <div 
        key={notification.id || index}
        className="p-3 rounded-md border border-gray-200 mb-3"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <span className="font-medium text-sm">
                {new Date(notification.date).toLocaleDateString('es-CL')}
              </span>
              <Badge 
                className={`ml-2 ${notification.status === 'recibida' ? 'bg-green-100 text-green-800' : 
                  notification.status === 'enviada' ? 'bg-blue-100 text-blue-800' : 
                  notification.status === 'respondida' ? 'bg-purple-100 text-purple-800' : 
                  'bg-gray-100 text-gray-800'}`}
              >
                {notification.status === 'recibida' ? 'Recibida' : 
                 notification.status === 'enviada' ? 'Enviada' : 
                 notification.status === 'respondida' ? 'Respondida' : 'Pendiente'}
              </Badge>
            </div>
            <p className="text-sm mt-1">
              <span className="font-medium">Método:</span> {
                notification.method === 'email' ? 'Correo electrónico' :
                notification.method === 'presencial' ? 'Presencial' :
                notification.method === 'carta_certificada' ? 'Carta certificada' : notification.method
              }
            </p>
            {notification.inspectorName && (
              <p className="text-sm">
                <span className="font-medium">Inspector:</span> {notification.inspectorName}
              </p>
            )}
            {notification.visitScheduled && notification.visitDate && (
              <p className="text-sm">
                <span className="font-medium">Visita programada:</span> {new Date(notification.visitDate).toLocaleDateString('es-CL')}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-1">
            {notification.documentId && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Ver documento')}>
                Ver documento
              </Button>
            )}
            {!readOnly && notification.status !== 'respondida' && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('Marcar como recibida')}>
                Marcar como recibida
              </Button>
            )}
          </div>
        </div>
        {notification.notes && (
          <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
            <span className="font-medium">Notas:</span> {notification.notes}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-500">
          Notificado por: {notification.notifiedByName || 'Usuario del sistema'}
        </div>
      </div>
    );
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Notificaciones a Autoridades</span>
          <div className="flex space-x-2">
            {dtNotifications.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                DT: {dtNotifications.length}
              </span>
            )}
            {susesoNotifications.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                SUSESO: {susesoNotifications.length}
              </span>
            )}
            {inspectionNotifications.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                Inspección: {inspectionNotifications.length}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {dtNotifications.length === 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              <strong>Importante:</strong> Según la Ley Karin, debe notificar a la Dirección del Trabajo dentro de 3 días hábiles 
              desde la recepción de la denuncia.
            </AlertDescription>
          </Alert>
        )}
        
        {dtNotifications.length > 0 && susesoNotifications.length === 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              <strong>Recordatorio:</strong> Después de notificar a la DT, debe también notificar a la SUSESO o mutualidad correspondiente.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="dt" className="relative">
              Dirección del Trabajo
              {dtNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {dtNotifications.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="suseso" className="relative">
              SUSESO/Mutualidades
              {susesoNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {susesoNotifications.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inspection" className="relative">
              Inspección
              {inspectionNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {inspectionNotifications.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Tab Dirección del Trabajo */}
          <TabsContent value="dt">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Notificaciones a la Dirección del Trabajo</h3>
                
                {dtNotifications.length === 0 ? (
                  <div className="text-sm text-gray-500 mb-4">
                    No hay notificaciones registradas a la Dirección del Trabajo.
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {dtNotifications.map(renderDtNotification)}
                  </div>
                )}
                
                {/* Formulario para añadir nueva notificación a DT */}
                {!readOnly && (
                  <div className="border p-3 rounded-md mt-4">
                    <h4 className="text-sm font-medium mb-2">Registrar nueva notificación a DT</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="dtDate" className="block text-xs font-medium text-gray-700">
                            Fecha de notificación *
                          </label>
                          <input
                            type="date"
                            id="dtDate"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newDtNotification.date}
                            onChange={(e) => setNewDtNotification({...newDtNotification, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label htmlFor="dtMethod" className="block text-xs font-medium text-gray-700">
                            Método de notificación *
                          </label>
                          <select
                            id="dtMethod"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newDtNotification.method}
                            onChange={(e) => setNewDtNotification({...newDtNotification, method: e.target.value as any})}
                          >
                            <option value="email">Correo electrónico</option>
                            <option value="presencial">Presencial</option>
                            <option value="carta_certificada">Carta certificada</option>
                            <option value="sistema_dt">Sistema DT</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="dtContact" className="block text-xs font-medium text-gray-700">
                            Persona de contacto
                          </label>
                          <input
                            type="text"
                            id="dtContact"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newDtNotification.contactPerson}
                            onChange={(e) => setNewDtNotification({...newDtNotification, contactPerson: e.target.value})}
                            placeholder="Nombre del funcionario de DT"
                          />
                        </div>
                        <div>
                          <label htmlFor="dtTracking" className="block text-xs font-medium text-gray-700">
                            Número de seguimiento
                          </label>
                          <input
                            type="text"
                            id="dtTracking"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newDtNotification.trackingNumber}
                            onChange={(e) => setNewDtNotification({...newDtNotification, trackingNumber: e.target.value})}
                            placeholder="Código de seguimiento o ID"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="dtOffice" className="block text-xs font-medium text-gray-700">
                            Oficina DT
                          </label>
                          <input
                            type="text"
                            id="dtOffice"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newDtNotification.oficina}
                            onChange={(e) => setNewDtNotification({...newDtNotification, oficina: e.target.value})}
                            placeholder="Ej. DT Santiago Poniente"
                          />
                        </div>
                        <div>
                          <label htmlFor="dtAddress" className="block text-xs font-medium text-gray-700">
                            Dirección
                          </label>
                          <input
                            type="text"
                            id="dtAddress"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newDtNotification.direccion}
                            onChange={(e) => setNewDtNotification({...newDtNotification, direccion: e.target.value})}
                            placeholder="Dirección de la oficina"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="dtNotes" className="block text-xs font-medium text-gray-700">
                          Notas
                        </label>
                        <textarea
                          id="dtNotes"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                          value={newDtNotification.notes}
                          onChange={(e) => setNewDtNotification({...newDtNotification, notes: e.target.value})}
                          placeholder="Detalles adicionales sobre la notificación"
                          rows={3}
                        ></textarea>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="dtDocument" className="block text-xs font-medium text-gray-700">
                            Documento notificado
                          </label>
                          <input
                            type="file"
                            id="dtDocument"
                            className="mt-1 block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Adjunte el documento que se notificó a la DT
                          </p>
                        </div>
                        <div>
                          <label htmlFor="dtProof" className="block text-xs font-medium text-gray-700">
                            Comprobante de entrega
                          </label>
                          <input
                            type="file"
                            id="dtProof"
                            className="mt-1 block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                            onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Adjunte comprobante de recepción o envío
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAddDtNotification}
                          disabled={loading || !newDtNotification.date || !newDtNotification.method}
                        >
                          Registrar Notificación
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Tab SUSESO/Mutualidades */}
          <TabsContent value="suseso">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Notificaciones a SUSESO o Mutualidades</h3>
                
                {susesoNotifications.length === 0 ? (
                  <div className="text-sm text-gray-500 mb-4">
                    No hay notificaciones registradas a SUSESO o Mutualidades.
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {susesoNotifications.map(renderSusesoNotification)}
                  </div>
                )}
                
                {/* Formulario para añadir nueva notificación a SUSESO */}
                {!readOnly && (
                  <div className="border p-3 rounded-md mt-4">
                    <h4 className="text-sm font-medium mb-2">Registrar nueva notificación a SUSESO/Mutualidad</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="susesoDate" className="block text-xs font-medium text-gray-700">
                            Fecha de notificación *
                          </label>
                          <input
                            type="date"
                            id="susesoDate"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.date}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label htmlFor="susesoEntity" className="block text-xs font-medium text-gray-700">
                            Entidad *
                          </label>
                          <select
                            id="susesoEntity"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.entity}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, entity: e.target.value as any})}
                          >
                            <option value="suseso">SUSESO</option>
                            <option value="achs">ACHS</option>
                            <option value="mutual_seguridad">Mutual de Seguridad</option>
                            <option value="ist">IST</option>
                            <option value="otra">Otra</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="susesoMethod" className="block text-xs font-medium text-gray-700">
                            Método de notificación *
                          </label>
                          <select
                            id="susesoMethod"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.method}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, method: e.target.value as any})}
                          >
                            <option value="email">Correo electrónico</option>
                            <option value="presencial">Presencial</option>
                            <option value="carta_certificada">Carta certificada</option>
                            <option value="sistema_suseso">Sistema SUSESO</option>
                          </select>
                        </div>
                      </div>
                      
                      {newSusesoNotification.entity === 'otra' && (
                        <div>
                          <label htmlFor="susesoEntityName" className="block text-xs font-medium text-gray-700">
                            Nombre de la entidad *
                          </label>
                          <input
                            type="text"
                            id="susesoEntityName"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.entityName}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, entityName: e.target.value})}
                            placeholder="Nombre de la entidad"
                          />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="susesoContact" className="block text-xs font-medium text-gray-700">
                            Persona de contacto
                          </label>
                          <input
                            type="text"
                            id="susesoContact"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.contactPerson}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, contactPerson: e.target.value})}
                            placeholder="Nombre del funcionario"
                          />
                        </div>
                        <div>
                          <label htmlFor="susesoTracking" className="block text-xs font-medium text-gray-700">
                            Número de seguimiento
                          </label>
                          <input
                            type="text"
                            id="susesoTracking"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.trackingNumber}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, trackingNumber: e.target.value})}
                            placeholder="Código de seguimiento o ID"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="susesoOffice" className="block text-xs font-medium text-gray-700">
                            Oficina o sede
                          </label>
                          <input
                            type="text"
                            id="susesoOffice"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.oficina}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, oficina: e.target.value})}
                            placeholder="Ej. ACHS Santiago Centro"
                          />
                        </div>
                        <div>
                          <label htmlFor="susesoAddress" className="block text-xs font-medium text-gray-700">
                            Dirección
                          </label>
                          <input
                            type="text"
                            id="susesoAddress"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newSusesoNotification.direccion}
                            onChange={(e) => setNewSusesoNotification({...newSusesoNotification, direccion: e.target.value})}
                            placeholder="Dirección de la oficina"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="susesoNotes" className="block text-xs font-medium text-gray-700">
                          Notas
                        </label>
                        <textarea
                          id="susesoNotes"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                          value={newSusesoNotification.notes}
                          onChange={(e) => setNewSusesoNotification({...newSusesoNotification, notes: e.target.value})}
                          placeholder="Detalles adicionales sobre la notificación"
                          rows={3}
                        ></textarea>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="susesoDocument" className="block text-xs font-medium text-gray-700">
                            Documento notificado
                          </label>
                          <input
                            type="file"
                            id="susesoDocument"
                            className="mt-1 block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                          />
                        </div>
                        <div>
                          <label htmlFor="susesoProof" className="block text-xs font-medium text-gray-700">
                            Comprobante de entrega
                          </label>
                          <input
                            type="file"
                            id="susesoProof"
                            className="mt-1 block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                            onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAddSusesoNotification}
                          disabled={loading || !newSusesoNotification.date || !newSusesoNotification.method || !newSusesoNotification.entity || (newSusesoNotification.entity === 'otra' && !newSusesoNotification.entityName)}
                        >
                          Registrar Notificación
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Tab Inspección del Trabajo */}
          <TabsContent value="inspection">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Notificaciones a Inspección del Trabajo</h3>
                
                {inspectionNotifications.length === 0 ? (
                  <div className="text-sm text-gray-500 mb-4">
                    No hay notificaciones registradas a Inspección del Trabajo.
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {inspectionNotifications.map(renderInspectionNotification)}
                  </div>
                )}
                
                {/* Formulario para añadir nueva notificación a Inspección */}
                {!readOnly && (
                  <div className="border p-3 rounded-md mt-4">
                    <h4 className="text-sm font-medium mb-2">Registrar nueva notificación a Inspección</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="inspectionDate" className="block text-xs font-medium text-gray-700">
                            Fecha de notificación *
                          </label>
                          <input
                            type="date"
                            id="inspectionDate"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newInspectionNotification.date}
                            onChange={(e) => setNewInspectionNotification({...newInspectionNotification, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label htmlFor="inspectionMethod" className="block text-xs font-medium text-gray-700">
                            Método de notificación *
                          </label>
                          <select
                            id="inspectionMethod"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newInspectionNotification.method}
                            onChange={(e) => setNewInspectionNotification({...newInspectionNotification, method: e.target.value as any})}
                          >
                            <option value="email">Correo electrónico</option>
                            <option value="presencial">Presencial</option>
                            <option value="carta_certificada">Carta certificada</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="inspectorName" className="block text-xs font-medium text-gray-700">
                            Nombre del inspector
                          </label>
                          <input
                            type="text"
                            id="inspectorName"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newInspectionNotification.inspectorName}
                            onChange={(e) => setNewInspectionNotification({...newInspectionNotification, inspectorName: e.target.value})}
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div>
                          <label htmlFor="inspectorEmail" className="block text-xs font-medium text-gray-700">
                            Email del inspector
                          </label>
                          <input
                            type="email"
                            id="inspectorEmail"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newInspectionNotification.inspectorEmail}
                            onChange={(e) => setNewInspectionNotification({...newInspectionNotification, inspectorEmail: e.target.value})}
                            placeholder="correo@dt.gob.cl"
                          />
                        </div>
                        <div>
                          <label htmlFor="inspectorPhone" className="block text-xs font-medium text-gray-700">
                            Teléfono del inspector
                          </label>
                          <input
                            type="text"
                            id="inspectorPhone"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newInspectionNotification.inspectorPhone}
                            onChange={(e) => setNewInspectionNotification({...newInspectionNotification, inspectorPhone: e.target.value})}
                            placeholder="+56 2 XXXXXXXX"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="inspectionTracking" className="block text-xs font-medium text-gray-700">
                            Número de seguimiento
                          </label>
                          <input
                            type="text"
                            id="inspectionTracking"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newInspectionNotification.trackingNumber}
                            onChange={(e) => setNewInspectionNotification({...newInspectionNotification, trackingNumber: e.target.value})}
                            placeholder="Código de seguimiento o ID"
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center h-10 mt-6">
                            <input
                              type="checkbox"
                              id="visitScheduled"
                              className="rounded border-gray-300 text-blue-600"
                              checked={newInspectionNotification.visitScheduled}
                              onChange={(e) => setNewInspectionNotification({...newInspectionNotification, visitScheduled: e.target.checked})}
                            />
                            <label htmlFor="visitScheduled" className="ml-2 text-xs font-medium text-gray-700">
                              Visita programada
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      {newInspectionNotification.visitScheduled && (
                        <div>
                          <label htmlFor="visitDate" className="block text-xs font-medium text-gray-700">
                            Fecha de visita
                          </label>
                          <input
                            type="date"
                            id="visitDate"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                            value={newInspectionNotification.visitDate}
                            onChange={(e) => setNewInspectionNotification({...newInspectionNotification, visitDate: e.target.value})}
                          />
                        </div>
                      )}
                      
                      <div>
                        <label htmlFor="inspectionNotes" className="block text-xs font-medium text-gray-700">
                          Notas
                        </label>
                        <textarea
                          id="inspectionNotes"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                          value={newInspectionNotification.notes}
                          onChange={(e) => setNewInspectionNotification({...newInspectionNotification, notes: e.target.value})}
                          placeholder="Detalles adicionales sobre la notificación"
                          rows={3}
                        ></textarea>
                      </div>
                      
                      <div>
                        <label htmlFor="inspectionDocument" className="block text-xs font-medium text-gray-700">
                          Documento notificado
                        </label>
                        <input
                          type="file"
                          id="inspectionDocument"
                          className="mt-1 block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                          onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAddInspectionNotification}
                          disabled={loading || !newInspectionNotification.date || !newInspectionNotification.method}
                        >
                          Registrar Notificación
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Mensajes de estado */}
        {success && (
          <Alert variant="success" className="mt-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthorityNotificationForm;