// src/lib/services/authorityNotifications.ts

import { db, storage, auth } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { addActivity } from './reportService';

/**
 * Registra una notificación a autoridades (DT, SUSESO, Inspección) en un reporte
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param authorityType Tipo de autoridad ('dt', 'suseso', 'inspection')
 * @param notifications Array de notificaciones a guardar
 * @returns Objeto con el resultado de la operación
 */
export async function registerAuthorityNotification(
  companyId: string,
  reportId: string,
  authorityType: 'dt' | 'suseso' | 'inspection',
  notifications: any[]
) {
  try {
    // Validar datos
    if (!companyId || !reportId || !authorityType || !notifications) {
      return {
        success: false,
        error: 'Datos no válidos para registrar notificación'
      };
    }

    // Obtener referencia al documento
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }

    const reportData = reportSnap.data();
    const karinProcess = reportData.karinProcess || {};

    // Determinar el campo a actualizar según el tipo de autoridad
    let fieldName = '';
    let activityType = '';
    let description = '';

    switch (authorityType) {
      case 'dt':
        fieldName = 'karinProcess.dtNotifications';
        activityType = 'dt_notification_added';
        description = 'Se registró notificación a la Dirección del Trabajo';
        
        // Si es la primera notificación, actualizar también la fecha de notificación inicial
        if (!karinProcess.dtInitialNotificationDate && notifications.length > 0) {
          await updateDoc(reportRef, {
            'karinProcess.dtInitialNotificationDate': notifications[0].date,
            'karinProcess.dtInitialNotificationId': notifications[0].id,
            'updatedAt': serverTimestamp()
          });
        }
        break;
        
      case 'suseso':
        fieldName = 'karinProcess.susesoNotifications';
        activityType = 'suseso_notification_added';
        description = 'Se registró notificación a SUSESO/Mutualidad';
        
        // Si es la primera notificación, actualizar también la fecha de notificación inicial
        if (!karinProcess.susesoNotificationDate && notifications.length > 0) {
          await updateDoc(reportRef, {
            'karinProcess.susesoNotificationDate': notifications[0].date,
            'karinProcess.susesoNotificationId': notifications[0].id,
            'updatedAt': serverTimestamp()
          });
        }
        break;
        
      case 'inspection':
        fieldName = 'karinProcess.inspectionNotifications';
        activityType = 'inspection_notification_added';
        description = 'Se registró notificación a Inspección del Trabajo';
        break;
        
      default:
        return {
          success: false,
          error: 'Tipo de autoridad no válido'
        };
    }

    // Actualizar las notificaciones en Firestore
    await updateDoc(reportRef, {
      [fieldName]: notifications,
      'updatedAt': serverTimestamp()
    });

    // Registrar actividad
    await addActivity(
      companyId,
      reportId,
      activityType,
      description,
      auth.currentUser?.uid || 'system',
      { count: notifications.length }
    );

    return {
      success: true
    };
  } catch (error) {
    console.error(`Error al registrar notificación a ${authorityType}:`, error);
    return {
      success: false,
      error: `Error al registrar la notificación: ${error.message}`
    };
  }
}

/**
 * Sube un documento relacionado con una notificación a autoridades
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param file Archivo a subir
 * @param documentType Tipo de documento
 * @returns Objeto con la información del documento subido
 */
export async function uploadNotificationDocument(
  companyId: string,
  reportId: string,
  file: File,
  documentType: 'dt_notification' | 'dt_proof' | 'suseso_notification' | 'suseso_proof' | 'inspection_notification'
) {
  try {
    // Validar datos
    if (!companyId || !reportId || !file) {
      return {
        success: false,
        error: 'Datos no válidos para subir el documento'
      };
    }

    // Generar una ID única para el documento
    const documentId = uuidv4();
    
    // Crear ruta de archivo en Storage
    const filePath = `companies/${companyId}/reports/${reportId}/authorities/${documentType}/${documentId}_${file.name}`;
    const storageRef = ref(storage, filePath);

    // Subir archivo a Storage
    await uploadBytes(storageRef, file);
    
    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(storageRef);

    return {
      success: true,
      documentId,
      filePath,
      downloadURL,
      fileName: file.name
    };
  } catch (error) {
    console.error('Error al subir documento de notificación:', error);
    return {
      success: false,
      error: `Error al subir el documento: ${error.message}`
    };
  }
}

/**
 * Actualiza el estado de una notificación a autoridades
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param notificationId ID de la notificación
 * @param authorityType Tipo de autoridad
 * @param status Nuevo estado de la notificación
 * @param responseInfo Información opcional de la respuesta recibida
 * @returns Objeto con el resultado de la operación
 */
export async function updateNotificationStatus(
  companyId: string,
  reportId: string,
  notificationId: string,
  authorityType: 'dt' | 'suseso' | 'inspection',
  status: 'pendiente' | 'enviada' | 'recibida' | 'respondida',
  responseInfo?: {
    responseDate?: string;
    responseDocumentId?: string;
  }
) {
  try {
    // Validar datos
    if (!companyId || !reportId || !notificationId || !authorityType || !status) {
      return {
        success: false,
        error: 'Datos no válidos para actualizar el estado de la notificación'
      };
    }

    // Obtener referencia al documento
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }

    const reportData = reportSnap.data();
    const karinProcess = reportData.karinProcess || {};
    
    // Determinar el campo según el tipo de autoridad
    let fieldName = '';
    let notificationsArray = [];
    
    switch (authorityType) {
      case 'dt':
        fieldName = 'karinProcess.dtNotifications';
        notificationsArray = karinProcess.dtNotifications || [];
        break;
        
      case 'suseso':
        fieldName = 'karinProcess.susesoNotifications';
        notificationsArray = karinProcess.susesoNotifications || [];
        break;
        
      case 'inspection':
        fieldName = 'karinProcess.inspectionNotifications';
        notificationsArray = karinProcess.inspectionNotifications || [];
        break;
        
      default:
        return {
          success: false,
          error: 'Tipo de autoridad no válido'
        };
    }
    
    // Buscar la notificación en el array y actualizarla
    const updatedNotifications = notificationsArray.map(notification => {
      if (notification.id === notificationId) {
        return {
          ...notification,
          status,
          responseDate: responseInfo?.responseDate || notification.responseDate,
          responseDocumentId: responseInfo?.responseDocumentId || notification.responseDocumentId
        };
      }
      return notification;
    });
    
    // Si no se encontró la notificación
    if (JSON.stringify(updatedNotifications) === JSON.stringify(notificationsArray)) {
      return {
        success: false,
        error: 'No se encontró la notificación especificada'
      };
    }
    
    // Actualizar en Firestore
    await updateDoc(reportRef, {
      [fieldName]: updatedNotifications,
      'updatedAt': serverTimestamp()
    });
    
    // Registrar actividad
    const activityTypes = {
      dt: 'dt_notification_updated',
      suseso: 'suseso_notification_updated',
      inspection: 'inspection_notification_updated'
    };
    
    const descriptions = {
      pendiente: 'Se marcó notificación como pendiente',
      enviada: 'Se marcó notificación como enviada',
      recibida: 'Se confirmó recepción de la notificación',
      respondida: 'Se registró respuesta a la notificación'
    };
    
    await addActivity(
      companyId,
      reportId,
      activityTypes[authorityType],
      descriptions[status],
      auth.currentUser?.uid || 'system',
      { notificationId }
    );
    
    return {
      success: true
    };
  } catch (error) {
    console.error(`Error al actualizar estado de notificación a ${authorityType}:`, error);
    return {
      success: false,
      error: `Error al actualizar el estado: ${error.message}`
    };
  }
}