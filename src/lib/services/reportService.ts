// src/lib/services/reportService.ts

import {
    collection,
    addDoc,
    getDoc,
    updateDoc,
    query,
    where,
    getDocs,
    doc,
    serverTimestamp,
    Timestamp,
    orderBy,
    limit as firestoreLimit,
    setDoc,
    increment,
    deleteDoc
  } from 'firebase/firestore';
  import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { db, storage } from '@/lib/firebase/config';
  import { v4 as uuidv4 } from 'uuid';
  import { ReportFormValues, KarinProcessStage } from '@/types/report';
  import { getUserProfileById } from './userService';
  import { 
    notifyReportCreated, 
    notifyAdminsNewReport, 
    notifyInvestigatorAssigned, 
    notifyRecommendationDueSoon,
    notifyReportClosed,
    createNotification
  } from './notificationService';
  // Importación que funciona tanto en SSR como en cliente
// No importamos directamente para evitar errores durante el SSR
let PDFDocument = null;
if (typeof window === 'undefined') {
  // En el servidor
  PDFDocument = require('pdfkit');
}
// En el cliente, los módulos se importarán dinámicamente cuando sea necesario

/**
 * Función para asignar un reporte a un investigador o admin
 */
export async function assignReport(
  companyId: string,
  reportId: string,
  investigatorId: string,
  investigatorName: string
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return { success: false, error: 'Reporte no encontrado' };
    }
    
    // Actualizar documento con la información del investigador asignado
    await updateDoc(reportRef, {
      investigatorId,
      investigatorName,
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'in_progress' // Actualizar estado a "en progreso"
    });
    
    // Obtener datos para notificación
    const reportData = reportDoc.data();
    
    // Crear notificación para el investigador asignado
    await notifyInvestigatorAssigned(companyId, {
      reportId,
      reportCode: reportData.reportCode,
      investigatorId,
      category: reportData.category
    });
    
    return { 
      success: true,
      message: `Reporte asignado a ${investigatorName}`
    };
  } catch (error) {
    console.error('Error al asignar reporte:', error);
    return {
      success: false,
      error: 'Error al asignar el reporte'
    };
  }
}
  
  // Crear una nueva denuncia
  export async function createReport(companyId: string, reportData: ReportFormValues) {
    try {
      // Generar código único para seguimiento
      const reportCode = generateReportCode();
  
      // Si es anónimo, generar código de acceso
      let accessCode = '';
      if (reportData.isAnonymous) {
        accessCode = generateAccessCode();
      }
  
      // Convertir fechas a Timestamp
      const eventDate = new Date(reportData.eventDate);
      const knowledgeDate = new Date(reportData.knowledgeDate);
  
      // Preparar datos para Firestore
      const reportToSave = {
        // Información general
        code: reportCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'Nuevo',
        priority: reportData.isKarinLaw ? 'Alta' : 'Media',
        
        // Categorización
        category: reportData.category,
        subcategory: reportData.subcategory,
        isKarinLaw: reportData.isKarinLaw,
        
        // Fechas
        eventDate: Timestamp.fromDate(eventDate),
        knowledgeDate: Timestamp.fromDate(knowledgeDate),
        
        // Descripción
        detailedDescription: reportData.detailedDescription,
        exactLocation: reportData.exactLocation,
        conductFrequency: reportData.conductFrequency,
        impact: reportData.impact || '',
        
        // Información adicional
        previousActions: reportData.previousActions || '',
        expectation: reportData.expectation || '',
        
        // Denunciante
        reporter: {
          relationship: reportData.relationship,
          isAnonymous: reportData.isAnonymous,
          relationWithFacts: reportData.relationWithFacts,
          // Solo incluir contactInfo si no es anónimo
          ...(reportData.isAnonymous 
            ? { accessCode } 
            : { contactInfo: reportData.contactInfo }
          ),
        },
      };
  
      // Agregar campos específicos Ley Karin solo si están definidos
      if (reportData.isKarinLaw) {
        if (reportData.karinFrequency) reportToSave.karinFrequency = reportData.karinFrequency;
        if (reportData.karinWorkImpact) reportToSave.karinWorkImpact = reportData.karinWorkImpact;
        if (reportData.karinSexualType) reportToSave.karinSexualType = reportData.karinSexualType;
        if (reportData.karinViolenceDescription) reportToSave.karinViolenceDescription = reportData.karinViolenceDescription;
        if (reportData.karinRequestedMeasures) reportToSave.karinRequestedMeasures = reportData.karinRequestedMeasures;
        
        // Inicializar el proceso especial para Ley Karin
        const today = new Date();
        
        // Convertir a formato ISO para almacenamiento
        const todayISO = today.toISOString();
        
        // Calcular fecha límite (30 días hábiles)
        const investigationDeadline = calculateBusinessDays(today, 30);
        
        reportToSave.karinProcess = {
          stage: 'complaint_filed', // Comienza en la etapa de denuncia interpuesta
          receivedDate: todayISO,
          investigationStartDate: todayISO,
          investigationDeadline: investigationDeadline.toISOString(),
          testimonies: [],
          evidence: []
        };
        
        // También cambiamos el estado a específico de Ley Karin
        reportToSave.status = 'Ley Karin - Denuncia Interpuesta';
      }
  
      // Guardar en Firestore
      const reportRef = await addDoc(
        collection(db, `companies/${companyId}/reports`),
        reportToSave
      );
  
      // Guardar denunciados
      for (const accused of reportData.accusedPersons) {
        await addDoc(
          collection(db, `companies/${companyId}/reports/${reportRef.id}/accused`),
          {
            name: accused.name,
            position: accused.position,
            department: accused.department,
            relationship: accused.relationship,
            createdAt: serverTimestamp(),
          }
        );
      }
  
      // Guardar testigos
      for (const witness of reportData.witnesses) {
        if (witness.name) {
          await addDoc(
            collection(db, `companies/${companyId}/reports/${reportRef.id}/witnesses`),
            {
              name: witness.name,
              contact: witness.contact || '',
              createdAt: serverTimestamp(),
            }
          );
        }
      }
  
      // Registrar actividad inicial
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportRef.id}/activities`),
        {
          timestamp: serverTimestamp(),
          actionType: 'reportCreation',
          description: 'Denuncia creada',
          actorId: 'system',
          visibleToReporter: true,
        }
      );
  
  // Enviar notificaciones - Ahora con mejor manejo de errores
try {
  console.log('Inicio de proceso de notificaciones');
  
  // 1. Si no es anónimo y proporcionó correo, notificar al denunciante
  if (!reportData.isAnonymous && reportData.contactInfo?.email) {
    try {
      console.log(`Intentando notificar al denunciante: ${reportData.contactInfo.email}`);
      const notifyResult = await notifyReportCreated(
        companyId,
        reportRef.id,
        reportCode,
        reportData.contactInfo.email
      );
      console.log('Resultado notificación denunciante:', notifyResult);
    } catch (reporterError) {
      console.error('Error específico al notificar denunciante:', reporterError);
      // Continuar con el flujo
    }
  }

  // 2. Notificar a los administradores (en un bloque try independiente)
  try {
    console.log('Intentando notificar a administradores');
    const adminNotifyResult = await notifyAdminsNewReport(
      companyId,
      reportRef.id,
      reportCode,
      reportData.category,
      reportData.isKarinLaw
    );
    console.log('Resultado notificación administradores:', adminNotifyResult);
  } catch (adminError) {
    console.error('Error específico al notificar administradores:', adminError);
    // Continuar con el flujo
  }
} catch (notificationError) {
  console.error('Error general al enviar notificaciones:', notificationError);
  // No interrumpir el flujo por error en notificaciones
}    
      return {
        success: true,
        reportId: reportRef.id,
        reportCode,
        accessCode,
      };
    } catch (error) {
      console.error('Error creating report:', error);
      return {
        success: false,
        error: 'Error al crear la denuncia',
      };
    }
  }
  
  // Subir evidencia
 // Mejora de la función uploadEvidence para incluir reintentos
// Reemplaza esta función en tu archivo reportService.ts

/**
 * Sube un archivo de evidencia con mejor manejo de errores y soporte para progreso
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param file Archivo a subir
 * @param description Descripción de la evidencia
 * @param onProgress Callback opcional para reportar progreso (0-100)
 * @param maxRetries Número máximo de reintentos (por defecto 3)
 * @returns Objeto con resultado de la operación
 */
export async function uploadEvidence(
  companyId: string,
  reportId: string,
  file: File,
  description: string,
  onProgress?: (progress: number) => void,
  maxRetries = 3
) {
  let attempts = 0;
  let lastError = null;
  
  // Validaciones iniciales
  if (!file) {
    return { 
      success: false, 
      error: 'No se proporcionó ningún archivo'
    };
  }
  
  // Verificar límites de tamaño según tipo de archivo
  const fileSizeLimits = {
    document: 15 * 1024 * 1024, // 15MB
    image: 50 * 1024 * 1024,    // 50MB
    media: 100 * 1024 * 1024    // 100MB
  };
  
  let sizeLimit = fileSizeLimits.document; // Por defecto
  
  // Determinar límite según el tipo
  if (file.type.startsWith('image/')) {
    sizeLimit = fileSizeLimits.image;
  } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    sizeLimit = fileSizeLimits.media;
  }
  
  // Verificar tamaño
  if (file.size > sizeLimit) {
    const sizeInMB = Math.round(sizeLimit / (1024 * 1024));
    return {
      success: false,
      error: `El archivo excede el tamaño máximo permitido (${sizeInMB}MB)`
    };
  }
  
  while (attempts < maxRetries) {
    try {
      attempts++;
      console.log(`Intento de subida ${attempts}/${maxRetries} para el archivo ${file.name}`);
      
      if (onProgress) onProgress(5); // Inicia la subida
      
      const fileId = uuidv4();
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = `${fileId}.${fileExtension}`;
      
      console.log(`Intentando subir archivo a: companies/${companyId}/reports/${reportId}/evidence/${fileName}`);
      
      // Crear referencia al archivo en Storage
      const fileRef = ref(
        storage,
        `companies/${companyId}/reports/${reportId}/evidence/${fileName}`
      );
      
      console.log('FileRef creado:', fileRef);
      
      try {
        // Usar un método más simple para diagnosticar el problema
        console.log('Iniciando carga de archivo simplificada...');
        if (onProgress) onProgress(30); // Archivo subiendo
        
        // Subir archivo con configuración mínima para diagnóstico
        const uploadTask = uploadBytes(fileRef, file);
        
        console.log('Esperando resultado de la subida...');
        const snapshot = await uploadTask;
        console.log('Subida completada:', snapshot);
        
        if (onProgress) onProgress(60); // Archivo subido, obteniendo URL
      } catch (uploadError) {
        console.error('Error específico durante la subida:', uploadError);
        throw uploadError; // Re-lanzar para el manejo de errores principal
      }
      
      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(fileRef);
      
      if (onProgress) onProgress(80); // URL obtenida, guardando referencia
      
      // Guardar referencia en Firestore
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/evidence`),
        {
          originalFilename: file.name,
          filename: fileName,
          fileType: file.type,
          size: file.size,
          uploadedAt: serverTimestamp(),
          description,
          storageRef: downloadURL,
        }
      );
      
      if (onProgress) onProgress(100); // Todo completado
      
      console.log(`Archivo ${file.name} subido exitosamente después de ${attempts} intentos`);
      return { success: true, fileUrl: downloadURL };
    } catch (error) {
      lastError = error;
      console.error(`Error en la subida (intento ${attempts}/${maxRetries}):`, error);
      
      if (attempts >= maxRetries) {
        console.error(`Se alcanzó el número máximo de reintentos para ${file.name}`);
        break;
      }
      
      // Esperar antes de reintentar (con backoff exponencial)
      const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000); // Máximo 10 segundos
      console.log(`Esperando ${delay}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { 
    success: false, 
    error: `Error al subir el archivo después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}`
  };
}
  
  // Buscar denuncia por código
export async function getReportByCode(companyId: string, reportCode: string) {
  try {
    const reportsRef = collection(db, `companies/${companyId}/reports`);
    const q = query(reportsRef, where('code', '==', reportCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Denuncia no encontrada' };
    }

    const reportDoc = querySnapshot.docs[0];
    const reportId = reportDoc.id;
    const reportData = reportDoc.data();

    // Si hay un investigador asignado, obtener su nombre
    let assignedToName = undefined;
    if (reportData.assignedTo) {
      const userResult = await getUserProfileById(companyId, reportData.assignedTo);
      if (userResult.success) {
        assignedToName = userResult.profile.displayName;
      }
    }

    // Obtener las comunicaciones con el denunciante
    const communicationsRef = collection(db, `companies/${companyId}/reports/${reportId}/communications`);
    const communicationsQuery = query(communicationsRef, orderBy('timestamp', 'desc'));
    const communicationsSnap = await getDocs(communicationsQuery);

    const communications = communicationsSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // Filtrar para excluir mensajes internos que no deberían ver los denunciantes
      .filter(comm => !comm.isInternal);

    return {
      success: true,
      reportId: reportDoc.id,
      report: {
        id: reportId,
        ...reportData,
        assignedToName,
        communications
      },
    };
  } catch (error) {
    console.error('Error fetching report:', error);
    return { success: false, error: 'Error al buscar la denuncia' };
  }
}

// Buscar denuncia por código y código de acceso (para denuncias anónimas)
export async function getReportByCodeAndAccessCode(
  companyId: string,
  reportCode: string,
  accessCode: string
) {
  try {
    const result = await getReportByCode(companyId, reportCode);

    if (!result.success) {
      return result;
    }

    // Verificar el código de acceso para denuncias anónimas
    if (result.report.reporter?.isAnonymous) {
      if (result.report.reporter?.accessCode === accessCode) {
        return result;
      } else {
        return { success: false, error: 'Código de acceso incorrecto' };
      }
    }

    // Si no es anónima, no debería estar usando código de acceso
    return { success: false, error: 'Esta denuncia no utiliza código de acceso' };
  } catch (error) {
    console.error('Error fetching report with access code:', error);
    return { success: false, error: 'Error al buscar la denuncia' };
  }
}
  
  /**
   * Obtiene todas las denuncias de una compañía
   * @param companyId ID de la compañía
   * @param userRole Rol del usuario (opcional)
   * @param userId ID del usuario (opcional)
   */
  export async function getAllReports(
    companyId: string,
    userRole?: string | null,
    userId?: string | null
  ) {
    try {
      if (!companyId) {
        console.error('getAllReports: companyId is empty');
        return {
          success: false,
          error: 'ID de compañía no válido',
          reports: []
        };
      }

      // VERIFICACIÓN CRÍTICA DE AISLAMIENTO DE DATOS:
      // Si es admin pero NO super_admin, SOLO puede ver su propia compañía
      if (userRole === 'admin' && userId) {
        // Obtener el perfil del usuario para verificar a qué compañía pertenece
        try {
          const userRef = doc(db, `companies/${companyId}/users/${userId}`);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            // Si el usuario pertenece a otra compañía, bloquear el acceso
            if (userData.company && userData.company !== companyId) {
              console.error(`⚠️ ALERTA DE SEGURIDAD: Usuario admin ${userId} intentó acceder a compañía ${companyId} pero pertenece a ${userData.company}`);
              return {
                success: false,
                error: 'No tiene permiso para acceder a los datos de esta compañía',
                reports: []
              };
            }
          }
        } catch (error) {
          console.error('Error al verificar el perfil del usuario:', error);
          // En caso de error, permitimos continuar pero con un warning
          console.warn('No se pudo verificar el aislamiento multi-tenant, se permite acceso con precaución');
        }
      }

      console.log(`Buscando denuncias en: companies/${companyId}/reports`);
      const reportsRef = collection(db, `companies/${companyId}/reports`);
      const q = query(reportsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log(`Se encontraron ${querySnapshot.size} denuncias`);
      
      if (querySnapshot.empty) {
        return { success: true, reports: [] };
      }
      
      // Procesar los documentos para obtener los datos
      const reports = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Si hay un investigador asignado, obtener su nombre
        let assignedToName = undefined;
        if (data.assignedTo) {
          try {
            const userResult = await getUserProfileById(companyId, data.assignedTo);
            if (userResult.success) {
              assignedToName = userResult.profile.displayName;
            }
          } catch (err) {
            console.error(`Error al obtener perfil de usuario ${data.assignedTo}:`, err);
            // Continuar sin el nombre del usuario asignado
          }
        }
        
        return {
          id: doc.id,
          ...data,
          assignedToName,
        };
      }));
      
      return {
        success: true,
        reports,
      };
    } catch (error) {
      console.error('Error getting all reports:', error);
      return {
        success: false,
        error: 'Error al obtener las denuncias',
        reports: []
      };
    }
  }
  
  /**
   * Obtiene una denuncia por su ID
   * @param companyId ID de la compañía
   * @param reportId ID del reporte
   * @param userRole Rol del usuario (opcional)
   * @param userId ID del usuario (opcional)
   */
  export async function getReportById(
    companyId: string,
    reportId: string,
    userRole?: string | null,
    userId?: string | null
  ) {
    try {
      // VERIFICACIÓN CRÍTICA DE AISLAMIENTO DE DATOS:
      // Si es admin pero NO super_admin, SOLO puede ver su propia compañía
      if (userRole === 'admin' && userId) {
        // Obtener el perfil del usuario para verificar a qué compañía pertenece
        try {
          const userRef = doc(db, `companies/${companyId}/users/${userId}`);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            // Si el usuario pertenece a otra compañía, bloquear el acceso
            if (userData.company && userData.company !== companyId) {
              console.error(`⚠️ ALERTA DE SEGURIDAD: Usuario admin ${userId} intentó acceder a compañía ${companyId} pero pertenece a ${userData.company}`);
              return {
                success: false,
                error: 'No tiene permiso para acceder a los datos de esta compañía'
              };
            }
          }
        } catch (error) {
          console.error('Error al verificar el perfil del usuario:', error);
          // En caso de error, permitimos continuar pero con un warning
          console.warn('No se pudo verificar el aislamiento multi-tenant, se permite acceso con precaución');
        }
      }

      const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        return {
          success: false,
          error: 'Denuncia no encontrada',
        };
      }
      
      const reportData = reportSnap.data();
      
      // Si hay un investigador asignado, obtener su nombre
      let assignedToName = undefined;
      if (reportData.assignedTo) {
        const userResult = await getUserProfileById(companyId, reportData.assignedTo);
        if (userResult.success) {
          assignedToName = userResult.profile.displayName;
        }
      }
      
      // Obtener las evidencias asociadas a la denuncia
      const evidencesRef = collection(db, `companies/${companyId}/reports/${reportId}/evidence`);
      const evidencesSnap = await getDocs(evidencesRef);
      const evidences = evidencesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Obtener las personas denunciadas
      const accusedRef = collection(db, `companies/${companyId}/reports/${reportId}/accused`);
      const accusedSnap = await getDocs(accusedRef);
      const accusedPersons = accusedSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Obtener las actividades (historial)
      const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
      const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
      const activitiesSnap = await getDocs(activitiesQuery);
      const activities = activitiesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Obtener las comunicaciones con el denunciante
      const communicationsRef = collection(db, `companies/${companyId}/reports/${reportId}/communications`);
      const communicationsQuery = query(communicationsRef, orderBy('timestamp', 'desc'));
      const communicationsSnap = await getDocs(communicationsQuery);
      const communications = communicationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        success: true,
        report: {
          id: reportId,
          ...reportData,
          assignedToName,
          evidences,
          accusedPersons,
          activities,
          communications,
        },
      };
    } catch (error) {
      console.error('Error getting report by ID:', error);
      return {
        success: false,
        error: 'Error al obtener la denuncia',
      };
    }
  }
  
  /**
   * Actualiza el estado de una denuncia
   */
  export async function updateReportStatus(
    companyId: string,
    reportId: string,
    newStatus: string,
    userId: string,
    comment: string
  ) {
    try {
      const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
      
      // Actualizar el estado
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      
      // Registrar la actividad
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        {
          timestamp: serverTimestamp(),
          actorId: userId,
          actionType: 'statusChange',
          description: `Estado cambiado a: ${newStatus}`,
          comment: comment || '',
          previousStatus: (await getDoc(reportRef)).data()?.status,
          newStatus,
          visibleToReporter: true,
        }
      );
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating report status:', error);
      return {
        success: false,
        error: 'Error al actualizar el estado de la denuncia',
      };
    }
  }
  
  /**
   * Asigna un investigador a una denuncia
   */
  export async function assignInvestigator(
    companyId: string,
    reportId: string,
    investigatorId: string,
    userId: string,
    comment: string
  ) {
    try {
      const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
      const reportData = (await getDoc(reportRef)).data();
      
      if (!reportData) {
        return {
          success: false,
          error: 'Denuncia no encontrada',
        };
      }
      
      // Obtener información del investigador
      const investigatorResult = await getUserProfileById(companyId, investigatorId);
      if (!investigatorResult.success) {
        return {
          success: false,
          error: 'Investigador no encontrado',
        };
      }
      
      const previousAssignee = reportData.assignedTo || null;
      
      // Actualizar la asignación
      await updateDoc(reportRef, {
        assignedTo: investigatorId,
        status: reportData.status === 'Nuevo' || reportData.status === 'Admitida' ? 'Asignada' : reportData.status,
        updatedAt: serverTimestamp(),
      });
      
      // Registrar la actividad
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        {
          timestamp: serverTimestamp(),
          actorId: userId,
          actionType: 'assignmentChange',
          description: `Denuncia asignada a: ${investigatorResult.profile.displayName}`,
          comment: comment || '',
          previousAssignee,
          newAssignee: investigatorId,
          visibleToReporter: true,
        }
      );
      
  // Enviar notificación al investigador
try {
  await notifyInvestigatorAssigned(
    companyId,
    reportId,
    reportData.code,
    investigatorId,
    investigatorResult.profile.email,
    reportData.category,
    reportData.isKarinLaw
  );
} catch (notificationError) {
  console.error('Error al notificar al investigador:', notificationError);
  // No interrumpir el flujo por error en notificaciones
}
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error assigning investigator:', error);
      return {
        success: false,
        error: 'Error al asignar investigador',
      };
    }
  }
  
  /**
 * Añade un comentario o comunicación a una denuncia
 */
export async function addCommunication(
  companyId: string,
  reportId: string,
  userId: string | null,
  content: string,
  isFromReporter: boolean,
  isInternal: boolean
) {
  try {
    // Añadir la comunicación
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/communications`),
      {
        timestamp: serverTimestamp(),
        senderId: userId || 'reporter',
        content,
        isFromReporter,
        isInternal,
        isRead: false,
      }
    );
    
    // Actualizar la marca de tiempo de la denuncia
    await updateDoc(
      doc(db, `companies/${companyId}/reports/${reportId}`),
      {
        updatedAt: serverTimestamp(),
      }
    );
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error adding communication:', error);
    return {
      success: false,
      error: 'Error al añadir comunicación',
    };
  }
}

/**
 * Añade un comentario o comunicación a una denuncia utilizando el código de denuncia
 */
export async function addCommunicationByCode(
  companyId: string,
  reportCode: string,  // Ahora recibe el código visible en lugar del ID
  userId: string | null,
  content: string,
  isFromReporter: boolean,
  isInternal: boolean
) {
  try {
    // Primero debemos encontrar el ID interno del reporte usando el código
    const reportsRef = collection(db, `companies/${companyId}/reports`);
    const q = query(reportsRef, where('code', '==', reportCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { 
        success: false, 
        error: 'No se encontró la denuncia con el código proporcionado'
      };
    }
    
    // Obtener el ID interno de la denuncia
    const reportDoc = querySnapshot.docs[0];
    const reportId = reportDoc.id;
    
    // Usar la función original con el ID correcto
    return await addCommunication(
      companyId,
      reportId,
      userId,
      content,
      isFromReporter,
      isInternal
    );
  } catch (error) {
    console.error('Error adding communication by code:', error);
    return {
      success: false,
      error: 'Error al añadir comunicación',
    };
  }
}
  
  /**
   * Obtiene estadísticas de las denuncias
   */
  export async function getReportStatistics(companyId: string) {
    try {
      // Referencia a las estadísticas (doc único)
      const statsRef = doc(db, `companies/${companyId}/stats/reports`);
      const statsSnap = await getDoc(statsRef);
      
      if (!statsSnap.exists()) {
        // Si no existe el documento de estadísticas, crearlo
        await setDoc(statsRef, {
          totalReports: 0,
          byStatus: {},
          byCategory: {},
          updated: serverTimestamp(),
        });
        
        return {
          success: true,
          stats: {
            totalReports: 0,
            byStatus: {},
            byCategory: {},
          },
        };
      }
      
      return {
        success: true,
        stats: statsSnap.data(),
      };
    } catch (error) {
      console.error('Error getting report statistics:', error);
      return {
        success: false,
        error: 'Error al obtener estadísticas',
      };
    }
  }
  
  /**
   * Incrementa las estadísticas cuando se crea una nueva denuncia
   */
  export async function incrementReportStats(
    companyId: string,
    category: string,
    status: string
  ) {
    try {
      const statsRef = doc(db, `companies/${companyId}/stats/reports`);
      
      // Incrementar contadores
      await updateDoc(statsRef, {
        totalReports: increment(1),
        [`byStatus.${status}`]: increment(1),
        [`byCategory.${category}`]: increment(1),
        updated: serverTimestamp(),
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error incrementing report stats:', error);
      // No fallar si las estadísticas no se actualizan
      return { success: true };
    }
  }
  
  /**
   * Actualiza las estadísticas cuando cambia el estado de una denuncia
   */
  export async function updateReportStats(
    companyId: string,
    oldStatus: string,
    newStatus: string
  ) {
    try {
      const statsRef = doc(db, `companies/${companyId}/stats/reports`);
      
      // Decrementar contador del estado anterior e incrementar el nuevo
      await updateDoc(statsRef, {
        [`byStatus.${oldStatus}`]: increment(-1),
        [`byStatus.${newStatus}`]: increment(1),
        updated: serverTimestamp(),
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating report stats:', error);
      // No fallar si las estadísticas no se actualizan
      return { success: true };
    }
  }
  
  /**
   * Actualiza la información de una denuncia
   */
  export async function updateReport(
    companyId: string,
    reportId: string,
    updates: any
  ) {
    try {
      const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        return {
          success: false,
          error: 'Denuncia no encontrada',
        };
      }
      
      const currentData = reportSnap.data();
      
      // Si hay cambio de categoría, verificar si el estado de Ley Karin ha cambiado
      const wasKarinLaw = currentData.isKarinLaw;
      const isNowKarinLaw = updates.isKarinLaw;
      
      // Preparar los datos a actualizar
      const updatedData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      // Convertir fechas a Timestamp si existen
      if (updates.eventDate) {
        updatedData.eventDate = Timestamp.fromDate(new Date(updates.eventDate));
      }
      
      // Actualizar la prioridad automáticamente si es Ley Karin
      if (isNowKarinLaw && updates.priority !== 'Alta') {
        updatedData.priority = 'Alta';
      }
      
      // Eliminar campos específicos de Ley Karin si están undefined
      if (isNowKarinLaw) {
        if (!updates.karinFrequency) delete updatedData.karinFrequency;
        if (!updates.karinWorkImpact) delete updatedData.karinWorkImpact;
        if (!updates.karinSexualType) delete updatedData.karinSexualType;
        if (!updates.karinViolenceDescription) delete updatedData.karinViolenceDescription;
        if (!updates.karinRequestedMeasures) delete updatedData.karinRequestedMeasures;
      }
      
      // Actualizar la denuncia
      await updateDoc(reportRef, updatedData);
      
      // Registrar la actividad de actualización
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        {
          timestamp: serverTimestamp(),
          actorId: 'admin', // Idealmente debería ser el ID del usuario que realiza la actualización
          actionType: 'reportEdited',
          description: 'Información de la denuncia actualizada',
          visibleToReporter: false,
        }
      );
      
      // Si cambió el estado de Ley Karin, actualizar estadísticas
      if (wasKarinLaw !== isNowKarinLaw) {
        // Actualizar estadísticas por categoría
        const statsRef = doc(db, `companies/${companyId}/stats/reports`);
        
        if (isNowKarinLaw) {
          // Se cambió a Ley Karin
          await updateDoc(statsRef, {
            [`byCategory.${currentData.category}`]: increment(-1),
            'byCategory.ley_karin': increment(1),
            updated: serverTimestamp(),
          });
        } else if (wasKarinLaw) {
          // Ya no es Ley Karin
          await updateDoc(statsRef, {
            'byCategory.ley_karin': increment(-1),
            [`byCategory.${updates.category}`]: increment(1),
            updated: serverTimestamp(),
          });
        }
      }
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating report:', error);
      return {
        success: false,
        error: 'Error al actualizar la denuncia',
      };
    }
  }
  
  // Funciones de ayuda
  function generateReportCode() {
    // Generar código alfanumérico único de 8 caracteres
    return (
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
  }
  
  function generateAccessCode() {
    // Generar código de acceso seguro para denunciantes anónimos
    return uuidv4().substring(0, 8);
  }
  
  /**
   * Calcula una fecha futura basada en días hábiles (excluyendo sábados y domingos)
   * @param startDate Fecha de inicio
   * @param businessDays Cantidad de días hábiles a sumar
   * @returns Fecha resultante después de agregar los días hábiles
   */
  function calculateBusinessDays(startDate: Date, businessDays: number): Date {
    const result = new Date(startDate);
    let daysAdded = 0;
    
    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      
      // Si no es sábado (6) ni domingo (0), entonces es un día hábil
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
    
    return result;
  }
  
  /**
   * Calcula días hábiles entre dos fechas (excluyendo sábados y domingos)
   * @param startDate Fecha de inicio
   * @param endDate Fecha de fin
   * @returns Número de días hábiles entre las fechas
   */
  function getBusinessDaysBetweenDates(startDate: Date, endDate: Date): number {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    
    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      
      // Si no es sábado (6) ni domingo (0), entonces es un día hábil
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      
      curDate.setDate(curDate.getDate() + 1);
    }
    
    return count;
  }

/**
 * Calcula la fecha límite para una etapa del proceso Ley Karin
 * @param startDate Fecha de inicio
 * @param stage Etapa para la que se calcula el plazo
 * @returns Fecha límite calculada
 */
function calculateKarinStageDeadline(startDate: Date, stage: KarinProcessStage): Date {
  // Plazos según documento oficial de procedimiento Ley Karin
  const deadlines: Record<KarinProcessStage, number> = {
    'complaint_filed': 1,              // 1 día hábil para interponer denuncia
    'reception': 3,                    // 3 días hábiles para recibir y validar denuncia
    'precautionary_measures': 1,       // 24 horas (1 día) para medidas precautorias
    'decision_to_investigate': 3,      // 3 días hábiles para decidir investigar
    'investigation': 30,               // 30 días hábiles para investigación
    'report_creation': 5,              // 5 días hábiles para crear informe
    'report_approval': 3,              // 3 días hábiles para aprobar informe
    'labor_department': 15,            // 15 días hábiles estimados para Dir. del Trabajo
    'measures_adoption': 5,            // 5 días hábiles para adoptar medidas
    'sanctions': 10,                   // 10 días hábiles para proceso de sanciones
    'false_claim': 10,                 // 10 días hábiles para investigar denuncia falsa
    'retaliation_review': 5,           // 5 días hábiles para revisión de represalias
    'subsanation': 5,                  // 5 días hábiles para subsanación
    'dt_notification': 10,             // 10 días hábiles para notificación a DT
    'suseso_notification': 10,         // 10 días hábiles para notificación a SUSESO
    'closed': 0                        // No hay plazo para etapa cerrada
  };
  
  // Obtener días hábiles correspondientes a la etapa
  const days = deadlines[stage] || 3; // Por defecto 3 días si no está especificado
  
  // Calcular fecha límite
  return calculateBusinessDays(startDate, days);
}

/**
 * Genera un número de folio digital para documentos del proceso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param documentType Tipo de documento
 * @returns Número de folio en formato específico
 */
async function generateKarinFolioNumber(
  companyId: string,
  reportId: string,
  documentType: string
): Promise<string> {
  try {
    // Obtener código de la denuncia
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return `FOLIO-${Date.now()}`;
    }
    
    const reportData = reportSnap.data();
    const reportCode = reportData.code || 'NOCOD';
    
    // Obtener contador de documentos para este tipo
    const counterRef = doc(db, `companies/${companyId}/counters/karin_documents`);
    const counterSnap = await getDoc(counterRef);
    
    let counter = 1;
    if (counterSnap.exists()) {
      const counterData = counterSnap.data();
      counter = (counterData[documentType] || 0) + 1;
      
      // Actualizar contador
      await updateDoc(counterRef, {
        [documentType]: counter
      });
    } else {
      // Crear contador si no existe
      await setDoc(counterRef, {
        [documentType]: counter
      });
    }
    
    // Generar folio con formato: TIPO-CODIGOREPORTE-CONTADOR
    // Ejemplo: DECL-ABC12345-001
    const documentTypeCode = documentType.substring(0, 4).toUpperCase();
    const counterFormatted = counter.toString().padStart(3, '0');
    
    return `${documentTypeCode}-${reportCode}-${counterFormatted}`;
  } catch (error) {
    console.error('Error al generar folio:', error);
    // En caso de error, generar un folio basado en timestamp
    return `${documentType.substring(0, 4).toUpperCase()}-${Date.now()}`;
  }
}

/**
 * Registra un documento en el proceso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param documentData Datos del documento
 * @returns Resultado de la operación con el folio asignado
 */
export async function registerKarinDocument(
  companyId: string,
  reportId: string,
  documentData: {
    type: string;         // Tipo de documento: 'testimonio', 'declaracion', 'informe', etc.
    title: string;        // Título descriptivo del documento
    fileId?: string;      // ID del archivo adjunto (opcional)
    description: string;  // Descripción del contenido
    stage: KarinProcessStage; // Etapa relacionada con el documento
    authorId: string;     // ID del usuario que crea el documento
  }
): Promise<{
  success: boolean;
  folioNumber?: string;
  error?: string;
}> {
  try {
    // Generar folio digital
    const folioNumber = await generateKarinFolioNumber(companyId, reportId, documentData.type);
    
    // Guardar documento en la colección de documentos de la denuncia
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/karin_documents`),
      {
        ...documentData,
        folioNumber,
        createdAt: serverTimestamp(),
        documentStatus: 'active'
      }
    );
    
    // Registrar actividad
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`),
      {
        timestamp: serverTimestamp(),
        actionType: 'karin_document_registered',
        description: `Documento registrado: ${documentData.title}`,
        documentType: documentData.type,
        folioNumber,
        visibleToReporter: false
      }
    );
    
    return {
      success: true,
      folioNumber
    };
  } catch (error) {
    console.error('Error al registrar documento Ley Karin:', error);
    return {
      success: false,
      error: 'Error al registrar documento'
    };
  }
}

/**
 * Actualiza el estado del proceso Ley Karin y calcula automáticamente los plazos
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param newStage Nueva etapa del proceso
 * @param additionalData Datos adicionales específicos de la etapa
 * @param userId ID del usuario que realiza el cambio de etapa
 * @returns Resultado de la operación
 */
export async function updateKarinProcessStage(
  companyId: string,
  reportId: string,
  newStage: KarinProcessStage,
  additionalData: any = {},
  userId: string = 'system'
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportData.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Obtener el proceso actual o crear uno nuevo si no existe
    const karinProcess = reportData.karinProcess || {
      stage: 'complaint_filed',
      complaintFiledDate: new Date().toISOString(),
      stageHistory: []
    };
    
    // Fecha actual para registros
    const now = new Date();
    const nowISO = now.toISOString();
    
    // Guardar la etapa anterior en el historial
    if (!karinProcess.stageHistory) {
      karinProcess.stageHistory = [];
    }
    
    // Solo agregar al historial si es un cambio de etapa
    if (karinProcess.stage !== newStage) {
      karinProcess.stageHistory.push({
        stage: karinProcess.stage,
        date: nowISO,
        user: userId,
        notes: additionalData.stageNotes || ''
      });
    }
    
    // Actualizar la etapa
    karinProcess.stage = newStage;
    
    // Establecer fecha específica para la etapa actual
    const stageProperty = `${newStage}Date`;
    if (!karinProcess[stageProperty]) {
      karinProcess[stageProperty] = nowISO;
    }
    
    // Calcular plazo para la etapa actual si corresponde
    if (!additionalData[`${newStage}Deadline`]) {
      const deadline = calculateKarinStageDeadline(now, newStage);
      karinProcess[`${newStage}Deadline`] = deadline.toISOString();
    }
    
    // Añadir los datos adicionales específicos de la etapa
    Object.assign(karinProcess, additionalData);
    
    // Determinar el nuevo estado visible para los usuarios
    let newStatus = '';
    switch(newStage) {
      case 'complaint_filed':
        newStatus = 'Ley Karin - Denuncia Interpuesta';
        break;
      case 'reception':
        newStatus = 'Ley Karin - Denuncia Recibida';
        break;
      case 'precautionary_measures':
        newStatus = 'Ley Karin - Medidas Precautorias';
        break;
      case 'decision_to_investigate':
        newStatus = 'Ley Karin - Decisión de Investigar';
        break;
      case 'investigation':
        newStatus = 'Ley Karin - En Investigación';
        break;
      case 'report_creation':
        newStatus = 'Ley Karin - Creación de Informe';
        break;
      case 'report_approval':
        newStatus = 'Ley Karin - Aprobación de Informe';
        break;
      case 'labor_department':
        newStatus = 'Ley Karin - En Dirección del Trabajo';
        break;
      case 'measures_adoption':
        newStatus = 'Ley Karin - Adopción de Medidas';
        break;
      case 'sanctions':
        newStatus = 'Ley Karin - Sanciones';
        break;
      case 'false_claim':
        newStatus = 'Ley Karin - Denuncia Falsa';
        break;
      case 'retaliation_review':
        newStatus = 'Ley Karin - Revisión de Represalias';
        break;
      case 'subsanation':
        newStatus = 'Ley Karin - Subsanación';
        break;
      case 'dt_notification':
        newStatus = 'Ley Karin - Notificación a DT';
        break;
      case 'suseso_notification':
        newStatus = 'Ley Karin - Notificación a SUSESO';
        break;
      case 'closed':
        newStatus = 'Ley Karin - Cerrado';
        break;
    }
    
    // Actualizar el documento con seguimiento de plazos
    await updateDoc(reportRef, {
      karinProcess,
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad detallada
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`),
      {
        timestamp: serverTimestamp(),
        actorId: userId,
        actionType: 'karin_stage_update',
        description: `Etapa de Ley Karin actualizada a: ${newStatus}`,
        previousStage: reportData.karinProcess?.stage || 'ninguna',
        newStage: newStage,
        stageDeadline: karinProcess[`${newStage}Deadline`],
        stageData: additionalData,
        visibleToReporter: true
      }
    );
    
    // Crear notificaciones específicas para ciertas etapas
    if (reportData.assignedTo) {
      try {
        const userResult = await getUserProfileById(companyId, reportData.assignedTo);
        if (userResult.success) {
          const recipient = userResult.profile.email;
          
          // Notificaciones específicas según la etapa
          if (newStage === 'investigation') {
            await createNotification(companyId, {
              recipient,
              type: 'karin_investigation_started',
              title: 'Investigación Ley Karin iniciada',
              content: `<p>La investigación de la denuncia ${reportData.code} ha sido iniciada.</p>
                <p>Plazo máximo: 30 días hábiles (${new Date(karinProcess.investigationDeadline).toLocaleDateString()})</p>`,
              reportId,
              reportCode: reportData.code,
              userId: reportData.assignedTo
            });
          } else if (newStage === 'report_creation') {
            await createNotification(companyId, {
              recipient,
              type: 'karin_report_required',
              title: 'Informe Ley Karin requerido',
              content: `<p>Se requiere crear el informe para la denuncia ${reportData.code}.</p>
                <p>Plazo: 5 días hábiles (${new Date(karinProcess.report_creationDeadline).toLocaleDateString()})</p>`,
              reportId,
              reportCode: reportData.code,
              userId: reportData.assignedTo
            });
          }
        }
      } catch (notificationError) {
        console.error('Error al enviar notificación de cambio de etapa:', notificationError);
      }
    }
    
    return {
      success: true,
      stage: newStage,
      status: newStatus,
      deadline: karinProcess[`${newStage}Deadline`]
    };
  } catch (error) {
    console.error('Error al actualizar etapa Ley Karin:', error);
    return {
      success: false,
      error: 'Error al actualizar la etapa del proceso Ley Karin'
    };
  }
}

/**
 * Agrega medidas precautorias a una denuncia Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param measures IDs de las medidas precautorias seleccionadas
 * @param justification Justificación de las medidas
 * @returns Resultado de la operación
 */
export async function addKarinPrecautionaryMeasures(
  companyId: string,
  reportId: string,
  measures: string[],
  justification: string
) {
  try {
    // Validar datos
    if (!measures || measures.length === 0) {
      return {
        success: false,
        error: 'Debe seleccionar al menos una medida precautoria'
      };
    }
    
    // Obtener el reporte para verificar factores de riesgo
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Actualizar a la etapa de medidas precautorias
    const today = new Date().toISOString();
    
    // Incluir datos adicionales para el cambio de etapa
    const updateData: any = { 
      precautionaryMeasures: measures,
      precautionaryMeasuresDate: today,
      precautionaryMeasuresJustification: justification
    };
    
    // Si el reporte tiene factores de riesgo, incluirlos en la documentación
    if (reportData.karinRiskFactors) {
      updateData.riskFactors = reportData.karinRiskFactors;
    }
    
    // Actualizar etapa a medidas precautorias
    const result = await updateKarinProcessStage(
      companyId,
      reportId,
      'precautionary_measures',
      updateData
    );
    
    // Registrar actividad específica para las medidas
    if (result.success) {
      const activityData: any = {
        timestamp: serverTimestamp(),
        actionType: 'karin_precautionary_measures',
        description: `Se han aplicado ${measures.length} medidas precautorias`,
        measures: measures,
        justification: justification,
        visibleToReporter: true
      };
      
      // Agregar factores de riesgo a la actividad si existen
      if (reportData.karinRiskFactors) {
        activityData.riskFactors = reportData.karinRiskFactors;
      }
      
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        activityData
      );
    }
    
    return result;
  } catch (error) {
    console.error('Error al agregar medidas precautorias:', error);
    return {
      success: false,
      error: 'Error al agregar medidas precautorias'
    };
  }
}

/**
 * Asigna un investigador a una denuncia Ley Karin y cambia a la etapa de investigación
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param investigatorId ID del investigador asignado
 * @param investigateInternally Si true, se investiga internamente; si false, se deriva a la Dirección del Trabajo
 * @param comments Comentarios adicionales sobre la decisión
 * @param actorId ID del usuario que realiza la asignación
 * @returns Resultado de la operación
 */
export async function assignKarinInvestigator(
  companyId: string,
  reportId: string,
  investigatorId: string,
  investigateInternally: boolean,
  comments: string = '',
  actorId: string = 'system'
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportData.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Obtener información del investigador
    const userResult = await getUserProfileById(companyId, investigatorId);
    if (!userResult.success) {
      return {
        success: false,
        error: 'Investigador no encontrado'
      };
    }
    
    const today = new Date();
    const todayISO = today.toISOString();
    
    // Calcular fecha límite (30 días hábiles)
    const investigationDeadline = calculateBusinessDays(today, 30);
    const deadlineISO = investigationDeadline.toISOString();
    
    // Determinar la etapa apropiada según la decisión
    const newStage: KarinProcessStage = investigateInternally 
      ? 'investigation' 
      : 'labor_department';
    
    // Datos adicionales para la etapa
    const additionalData: any = {
      assignedInvestigator: investigatorId,
      investigatorName: userResult.profile.displayName,
      investigatorEmail: userResult.profile.email,
      investigationStartDate: todayISO,
      investigationDeadline: deadlineISO,
      investigateInternally: investigateInternally,
      decisionComments: comments,
      decisionToInvestigateDate: todayISO,
      dtInvestigationType: investigateInternally ? 'internal' : 'labor_department'
    };
    
    // Si se deriva a la Dirección del Trabajo
    if (!investigateInternally) {
      additionalData.laborDepartmentReferralDate = todayISO;
    }
    
    // Pasar el ID del usuario que hace la acción para el registro de historial
    const result = await updateKarinProcessStage(
      companyId,
      reportId,
      newStage,
      additionalData,
      actorId
    );
    
    // También actualizar el campo assignedTo general del reporte
    if (result.success) {
      await updateDoc(reportRef, {
        assignedTo: investigatorId,
        updatedAt: serverTimestamp()
      });
      
      // Notificar al investigador asignado
      try {
        await notifyInvestigatorAssigned(
          companyId,
          reportId,
          reportData.code,
          investigatorId,
          userResult.profile.email,
          'Ley Karin', // Categoría específica para Ley Karin
          true // Es Ley Karin
        );
      } catch (notificationError) {
        console.error('Error al notificar al investigador:', notificationError);
        // No fallar la operación completa si la notificación falla
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error al asignar investigador Ley Karin:', error);
    return {
      success: false,
      error: 'Error al asignar investigador'
    };
  }
}

/**
 * Registra un informe final para un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param reportData Datos del informe
 * @param userId ID del usuario que crea el informe
 * @returns Resultado de la operación
 */
export async function createKarinFinalReport(
  companyId: string,
  reportId: string,
  reportData: {
    conclusions: string;
    findings: string[];
    recommendedMeasures: string[];
    suggestedSanctions?: string[];
    fileId?: string;
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
  folioNumber?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Verificar la etapa actual
    const currentStage = reportDoc.karinProcess?.stage;
    if (currentStage !== 'investigation') {
      return {
        success: false,
        error: `No se puede crear informe en la etapa actual (${currentStage}). Debe estar en etapa de investigación.`
      };
    }
    
    // Generar folio para el informe
    const folioNumber = await generateKarinFolioNumber(companyId, reportId, 'informe');
    
    // Datos para el cambio de etapa
    const today = new Date();
    const todayISO = today.toISOString();
    
    // Primero registrar el documento
    const documentResult = await registerKarinDocument(
      companyId,
      reportId,
      {
        type: 'informe_final',
        title: 'Informe final de investigación',
        description: reportData.conclusions.substring(0, 100) + '...',
        fileId: reportData.fileId,
        stage: 'report_creation',
        authorId: userId
      }
    );
    
    // Actualizar la etapa del caso a creación de informe
    const updateResult = await updateKarinProcessStage(
      companyId,
      reportId,
      'report_creation',
      {
        reportCreationDate: todayISO,
        reportFileId: reportData.fileId,
        reportFolioNumber: documentResult.folioNumber || folioNumber,
        reportConclusions: reportData.conclusions,
        reportFindings: reportData.findings,
        reportRecommendedMeasures: reportData.recommendedMeasures,
        reportSuggestedSanctions: reportData.suggestedSanctions || [],
        reportCreatedBy: userId,
        // Inicializar el array de revisiones
        reportRevisions: [{
          date: todayISO,
          reviewer: userId,
          comments: 'Informe creado, pendiente de revisión',
          status: 'needs_review'
        }]
      },
      userId
    );
    
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error || 'Error al actualizar la etapa del proceso'
      };
    }
    
    // Crear notificación para administradores para revisar el informe
    try {
      // Buscar administradores
      const usersRef = collection(db, `companies/${companyId}/users`);
      const q = query(usersRef, where('role', '==', 'admin'));
      const adminsSnapshot = await getDocs(q);
      
      if (!adminsSnapshot.empty) {
        for (const adminDoc of adminsSnapshot.docs) {
          const adminData = adminDoc.data();
          
          await createNotification(companyId, {
            recipient: adminData.email,
            type: 'karin_report_review_required',
            title: 'Informe Ley Karin requiere revisión',
            content: `<p>Se ha creado un informe final para el caso Ley Karin: ${reportDoc.code}</p>
              <p>Por favor, revise el informe y apruébelo o solicite cambios.</p>`,
            reportId,
            reportCode: reportDoc.code,
            userId: adminDoc.id
          });
        }
      }
    } catch (notificationError) {
      console.error('Error al notificar a administradores sobre nuevo informe:', notificationError);
    }
    
    return {
      success: true,
      folioNumber: documentResult.folioNumber || folioNumber
    };
  } catch (error) {
    console.error('Error al crear informe Ley Karin:', error);
    return {
      success: false,
      error: 'Error al crear el informe final'
    };
  }
}

/**
 * Revisa y aprueba/rechaza un informe de Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param reviewData Datos de la revisión
 * @param userId ID del usuario que realiza la revisión
 * @returns Resultado de la operación
 */
export async function reviewKarinReport(
  companyId: string,
  reportId: string,
  reviewData: {
    status: 'approved' | 'rejected' | 'needs_changes';
    comments: string;
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Verificar la etapa actual
    const currentStage = reportDoc.karinProcess?.stage;
    if (currentStage !== 'report_creation') {
      return {
        success: false,
        error: `No se puede revisar el informe en la etapa actual (${currentStage}). Debe estar en etapa de creación de informe.`
      };
    }
    
    const today = new Date();
    const todayISO = today.toISOString();
    
    // Obtener revisiones actuales o inicializar array
    const karinProcess = reportDoc.karinProcess || {};
    const revisions = karinProcess.reportRevisions || [];
    
    // Añadir la nueva revisión
    revisions.push({
      date: todayISO,
      reviewer: userId,
      comments: reviewData.comments,
      status: reviewData.status
    });
    
    // Si es aprobado, cambiar a la siguiente etapa
    if (reviewData.status === 'approved') {
      return await updateKarinProcessStage(
        companyId,
        reportId,
        'report_approval',
        {
          reportApprovalDate: todayISO,
          reportRevisions: revisions,
          reportApprovedBy: userId
        },
        userId
      );
    } else {
      // Actualizar solo las revisiones, sin cambiar etapa
      await updateDoc(reportRef, {
        'karinProcess.reportRevisions': revisions,
        updatedAt: serverTimestamp()
      });
      
      // Registrar actividad
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        {
          timestamp: serverTimestamp(),
          actorId: userId,
          actionType: 'karin_report_review',
          description: `Informe revisado: ${
            reviewData.status === 'needs_changes' ? 'Se solicitaron cambios' : 'Informe rechazado'
          }`,
          reviewStatus: reviewData.status,
          comments: reviewData.comments,
          visibleToReporter: false
        }
      );
      
      // Notificar al creador del informe
      try {
        const creatorId = karinProcess.reportCreatedBy;
        if (creatorId) {
          const userResult = await getUserProfileById(companyId, creatorId);
          if (userResult.success) {
            await createNotification(companyId, {
              recipient: userResult.profile.email,
              type: 'karin_report_requires_changes',
              title: 'Se requieren cambios en el informe Ley Karin',
              content: `<p>Su informe para el caso ${reportDoc.code} requiere cambios.</p>
                <p>Comentarios: ${reviewData.comments}</p>`,
              reportId,
              reportCode: reportDoc.code,
              userId: creatorId
            });
          }
        }
      } catch (notificationError) {
        console.error('Error al notificar sobre revisión de informe:', notificationError);
      }
      
      return {
        success: true
      };
    }
  } catch (error) {
    console.error('Error al revisar informe Ley Karin:', error);
    return {
      success: false,
      error: 'Error al procesar la revisión del informe'
    };
  }
}

/**
 * Registra la remisión de un caso Ley Karin a la Dirección del Trabajo
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param referralData Datos de la remisión
 * @param userId ID del usuario que realiza la remisión
 * @returns Resultado de la operación
 */
export async function referKarinToLaborDepartment(
  companyId: string,
  reportId: string,
  referralData: {
    referralMethod: 'web' | 'email' | 'presencial' | 'correo';
    referralId?: string;   // ID o número de seguimiento asignado por la DT
    comments?: string;
    fileId?: string;       // ID del documento de remisión
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Verificar que la etapa sea la correcta
    const currentStage = reportDoc.karinProcess?.stage;
    if (currentStage !== 'report_approval') {
      return {
        success: false,
        error: `No se puede remitir a la Dirección del Trabajo en la etapa actual (${currentStage}). El informe debe estar aprobado.`
      };
    }
    
    const today = new Date();
    const todayISO = today.toISOString();
    
    // Registrar documento de remisión si hay ID de archivo
    let folioNumber = '';
    if (referralData.fileId) {
      const documentResult = await registerKarinDocument(
        companyId,
        reportId,
        {
          type: 'remision_dt',
          title: 'Remisión a la Dirección del Trabajo',
          description: referralData.comments || 'Envío de caso a la Dirección del Trabajo',
          fileId: referralData.fileId,
          stage: 'labor_department',
          authorId: userId
        }
      );
      
      if (documentResult.success) {
        folioNumber = documentResult.folioNumber;
      }
    }
    
    // Actualizar etapa a Dirección del Trabajo
    return await updateKarinProcessStage(
      companyId,
      reportId,
      'labor_department',
      {
        laborDepartmentReferralDate: todayISO,
        laborDepartmentReferralMethod: referralData.referralMethod,
        laborDepartmentReferralId: referralData.referralId || '',
        laborDepartmentReferralComments: referralData.comments || '',
        laborDepartmentReferralFileId: referralData.fileId || '',
        laborDepartmentReferralFolioNumber: folioNumber,
        laborDepartmentReferralBy: userId
      },
      userId
    );
  } catch (error) {
    console.error('Error al remitir caso a la Dirección del Trabajo:', error);
    return {
      success: false,
      error: 'Error al procesar la remisión a la Dirección del Trabajo'
    };
  }
}

/**
 * Registra la respuesta de la Dirección del Trabajo a un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param responseData Datos de la respuesta
 * @param userId ID del usuario que registra la respuesta
 * @returns Resultado de la operación
 */
export async function registerLaborDepartmentResponse(
  companyId: string,
  reportId: string,
  responseData: {
    responseDate: Date;
    responseDetails: string;
    fileId?: string;        // ID del documento de respuesta
    recommendations?: string[];
    nextStage: 'measures_adoption' | 'sanctions' | 'closed';
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Verificar que la etapa sea la correcta
    const currentStage = reportDoc.karinProcess?.stage;
    if (currentStage !== 'labor_department') {
      return {
        success: false,
        error: `No se puede registrar respuesta de la DT en la etapa actual (${currentStage}).`
      };
    }
    
    // Registrar documento de respuesta si hay ID de archivo
    let folioNumber = '';
    if (responseData.fileId) {
      const documentResult = await registerKarinDocument(
        companyId,
        reportId,
        {
          type: 'respuesta_dt',
          title: 'Respuesta de la Dirección del Trabajo',
          description: responseData.responseDetails.substring(0, 100) + '...',
          fileId: responseData.fileId,
          stage: 'labor_department',
          authorId: userId
        }
      );
      
      if (documentResult.success) {
        folioNumber = documentResult.folioNumber;
      }
    }
    
    // Actualizar la información de respuesta y avanzar a la siguiente etapa
    return await updateKarinProcessStage(
      companyId,
      reportId,
      responseData.nextStage,
      {
        laborDepartmentResponseDate: responseData.responseDate.toISOString(),
        laborDepartmentResponse: responseData.responseDetails,
        laborDepartmentResponseFileId: responseData.fileId || '',
        laborDepartmentResponseFolioNumber: folioNumber,
        laborDepartmentRecommendations: responseData.recommendations || [],
        laborDepartmentResponseRegisteredBy: userId
      },
      userId
    );
  } catch (error) {
    console.error('Error al registrar respuesta de la Dirección del Trabajo:', error);
    return {
      success: false,
      error: 'Error al procesar la respuesta de la Dirección del Trabajo'
    };
  }
}

/**
 * Registra medidas de adopción para un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param measuresData Datos de las medidas a adoptar
 * @param userId ID del usuario que registra las medidas
 * @returns Resultado de la operación
 */
export async function addKarinMeasures(
  companyId: string,
  reportId: string,
  measuresData: {
    measures: Array<{
      measure: string;
      description?: string;
      implementationDate: Date;
      responsibleId?: string;
    }>;
    comments?: string;
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Obtener el proceso actual
    const karinProcess = reportDoc.karinProcess || {};
    const currentStage = karinProcess.stage;
    
    // Verificar etapas válidas para adopción de medidas
    if (!['measures_adoption', 'report_approval', 'labor_department'].includes(currentStage)) {
      return {
        success: false,
        error: `No se pueden registrar medidas en la etapa actual (${currentStage}).`
      };
    }
    
    const today = new Date();
    const todayISO = today.toISOString();
    
    // Procesar las medidas
    const formattedMeasures = await Promise.all(
      measuresData.measures.map(async (measure) => {
        let responsibleName = '';
        
        // Obtener nombre del responsable si se proporcionó un ID
        if (measure.responsibleId) {
          try {
            const userResult = await getUserProfileById(companyId, measure.responsibleId);
            if (userResult.success) {
              responsibleName = userResult.profile.displayName || userResult.profile.email;
            }
          } catch (error) {
            console.error('Error al obtener datos del responsable:', error);
          }
        }
        
        return {
          measure: measure.measure,
          description: measure.description || '',
          date: measure.implementationDate.toISOString(),
          implementedBy: measure.responsibleId || userId,
          implementedByName: responsibleName || 'Sin asignar',
          status: 'pending',
          registerDate: todayISO
        };
      })
    );
    
    // Actualizar a la etapa de adopción de medidas si no está en ella
    if (currentStage !== 'measures_adoption') {
      const result = await updateKarinProcessStage(
        companyId,
        reportId,
        'measures_adoption',
        {
          measuresAdoptionDate: todayISO,
          measuresAdopted: formattedMeasures,
          measuresComments: measuresData.comments || ''
        },
        userId
      );
      
      return result;
    } else {
      // Si ya está en etapa de medidas, solo actualizar el array de medidas
      // Obtener las medidas existentes
      const existingMeasures = karinProcess.measuresAdopted || [];
      
      // Combinar con las nuevas medidas
      const updatedMeasures = [...existingMeasures, ...formattedMeasures];
      
      // Actualizar el documento
      await updateDoc(reportRef, {
        'karinProcess.measuresAdopted': updatedMeasures,
        'karinProcess.measuresComments': measuresData.comments || karinProcess.measuresComments || '',
        updatedAt: serverTimestamp()
      });
      
      // Registrar actividad
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        {
          timestamp: serverTimestamp(),
          actorId: userId,
          actionType: 'karin_measures_added',
          description: `Se agregaron ${formattedMeasures.length} medidas`,
          measures: formattedMeasures.map(m => m.measure),
          visibleToReporter: false
        }
      );
      
      return {
        success: true
      };
    }
  } catch (error) {
    console.error('Error al registrar medidas Ley Karin:', error);
    return {
      success: false,
      error: 'Error al registrar las medidas'
    };
  }
}

/**
 * Actualiza el estado de implementación de una medida Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param measureData Datos para actualizar la medida
 * @param userId ID del usuario que realiza la actualización
 * @returns Resultado de la operación
 */
export async function updateKarinMeasureStatus(
  companyId: string,
  reportId: string,
  measureData: {
    measureIndex: number;
    newStatus: 'pending' | 'in_progress' | 'implemented' | 'verified';
    verificationDate?: Date;
    comments?: string;
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Verificar que la etapa sea la correcta
    const karinProcess = reportDoc.karinProcess || {};
    const currentStage = karinProcess.stage;
    
    if (currentStage !== 'measures_adoption') {
      return {
        success: false,
        error: `No se puede actualizar medidas en la etapa actual (${currentStage}).`
      };
    }
    
    // Obtener las medidas actuales
    const measures = karinProcess.measuresAdopted || [];
    
    // Verificar que exista la medida con el índice especificado
    if (measureData.measureIndex < 0 || measureData.measureIndex >= measures.length) {
      return {
        success: false,
        error: 'Índice de medida no válido'
      };
    }
    
    // Actualizar el estado de la medida
    measures[measureData.measureIndex].status = measureData.newStatus;
    measures[measureData.measureIndex].comments = measureData.comments;
    
    // Si es verificada, agregar fecha de verificación
    if (measureData.newStatus === 'verified' && measureData.verificationDate) {
      measures[measureData.measureIndex].verificationDate = measureData.verificationDate.toISOString();
    }
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.measuresAdopted': measures,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`),
      {
        timestamp: serverTimestamp(),
        actorId: userId,
        actionType: 'karin_measure_status_update',
        description: `Estado de medida actualizado a: ${measureData.newStatus}`,
        measure: measures[measureData.measureIndex].measure,
        newStatus: measureData.newStatus,
        visibleToReporter: false
      }
    );
    
    // Verificar si todas las medidas están en estado "verificado"
    const allVerified = measures.every(measure => measure.status === 'verified');
    
    // Si todas están verificadas, sugerir avanzar a la siguiente etapa
    if (allVerified) {
      return {
        success: true,
        allMeasuresVerified: true
      };
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al actualizar estado de medida Ley Karin:', error);
    return {
      success: false,
      error: 'Error al actualizar el estado de la medida'
    };
  }
}

/**
 * Registra sanciones para un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param sanctionsData Datos de las sanciones
 * @param userId ID del usuario que registra las sanciones
 * @returns Resultado de la operación
 */
export async function addKarinSanctions(
  companyId: string,
  reportId: string,
  sanctionsData: {
    sanctions: Array<{
      type: 'menor' | 'media' | 'economica' | 'maxima';
      description: string;
      date: Date;
      appliedTo: string;
      fileId?: string; // ID del documento que respalda la sanción
    }>;
    comments?: string;
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Verificar etapas válidas para sanciones
    const karinProcess = reportDoc.karinProcess || {};
    const currentStage = karinProcess.stage;
    
    // Las sanciones deberían aplicarse después de medidas o dirección del trabajo
    if (!['measures_adoption', 'labor_department', 'report_approval'].includes(currentStage)) {
      return {
        success: false,
        error: `No se pueden registrar sanciones en la etapa actual (${currentStage}).`
      };
    }
    
    const today = new Date();
    const todayISO = today.toISOString();
    
    // Registrar documentos de sanciones si hay archivos adjuntos
    const processedSanctions = await Promise.all(
      sanctionsData.sanctions.map(async (sanction) => {
        let folioNumber = '';
        
        if (sanction.fileId) {
          try {
            const documentResult = await registerKarinDocument(
              companyId,
              reportId,
              {
                type: 'sancion',
                title: `Sanción ${sanction.type}`,
                description: sanction.description.substring(0, 100) + '...',
                fileId: sanction.fileId,
                stage: 'sanctions',
                authorId: userId
              }
            );
            
            if (documentResult.success) {
              folioNumber = documentResult.folioNumber;
            }
          } catch (error) {
            console.error('Error al registrar documento de sanción:', error);
          }
        }
        
        return {
          type: sanction.type,
          description: sanction.description,
          date: sanction.date.toISOString(),
          appliedTo: sanction.appliedTo,
          appliedBy: userId,
          fileId: sanction.fileId || '',
          folioNumber: folioNumber,
          registerDate: todayISO
        };
      })
    );
    
    // Actualizar a la etapa de sanciones
    const result = await updateKarinProcessStage(
      companyId,
      reportId,
      'sanctions',
      {
        sanctionsDate: todayISO,
        sanctionsApplied: processedSanctions,
        sanctionsComments: sanctionsData.comments || '',
        impugnationFiled: false
      },
      userId
    );
    
    return result;
  } catch (error) {
    console.error('Error al registrar sanciones Ley Karin:', error);
    return {
      success: false,
      error: 'Error al registrar sanciones'
    };
  }
}

/**
 * Registra una impugnación de sanciones en un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param impugnationData Datos de la impugnación
 * @param userId ID del usuario que registra la impugnación
 * @returns Resultado de la operación
 */
export async function registerKarinImpugnation(
  companyId: string,
  reportId: string,
  impugnationData: {
    impugnationDate: Date;
    description: string;
    fileId?: string;
    resolutionDate?: Date;
    resolution?: string;
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Verificar que la etapa sea la correcta
    const karinProcess = reportDoc.karinProcess || {};
    const currentStage = karinProcess.stage;
    
    if (currentStage !== 'sanctions') {
      return {
        success: false,
        error: `No se puede registrar impugnación en la etapa actual (${currentStage}).`
      };
    }
    
    // Registrar documento de impugnación si hay ID de archivo
    let folioNumber = '';
    if (impugnationData.fileId) {
      const documentResult = await registerKarinDocument(
        companyId,
        reportId,
        {
          type: 'impugnacion',
          title: 'Impugnación de sanciones',
          description: impugnationData.description.substring(0, 100) + '...',
          fileId: impugnationData.fileId,
          stage: 'sanctions',
          authorId: userId
        }
      );
      
      if (documentResult.success) {
        folioNumber = documentResult.folioNumber;
      }
    }
    
    // Actualizar datos de impugnación
    const updateData: any = {
      'karinProcess.impugnationFiled': true,
      'karinProcess.impugnationDate': impugnationData.impugnationDate.toISOString(),
      'karinProcess.impugnationDescription': impugnationData.description,
      'karinProcess.impugnationFileId': impugnationData.fileId || '',
      'karinProcess.impugnationFolioNumber': folioNumber,
      updatedAt: serverTimestamp()
    };
    
    // Si hay resolución, agregarla
    if (impugnationData.resolution && impugnationData.resolutionDate) {
      updateData['karinProcess.impugnationResolution'] = impugnationData.resolution;
      updateData['karinProcess.impugnationResolutionDate'] = impugnationData.resolutionDate.toISOString();
    }
    
    // Actualizar el documento
    await updateDoc(reportRef, updateData);
    
    // Registrar actividad
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`),
      {
        timestamp: serverTimestamp(),
        actorId: userId,
        actionType: 'karin_impugnation_registered',
        description: 'Se ha registrado una impugnación a las sanciones',
        impugnationDate: impugnationData.impugnationDate.toISOString(),
        folioNumber,
        visibleToReporter: false
      }
    );
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al registrar impugnación Ley Karin:', error);
    return {
      success: false,
      error: 'Error al registrar la impugnación'
    };
  }
}

/**
 * Marca un caso Ley Karin como denuncia falsa
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param falseClaimData Datos sobre la denuncia falsa
 * @param userId ID del usuario que registra la denuncia falsa
 * @returns Resultado de la operación
 */
export async function markAsFalseClaim(
  companyId: string,
  reportId: string,
  falseClaimData: {
    justification: string;
    evidence: string;
    fileId?: string;
    sanctions?: Array<{
      type: string;
      description: string;
      appliedTo: string;
    }>;
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    const today = new Date();
    const todayISO = today.toISOString();
    
    // Registrar documento de evidencia si hay ID de archivo
    let folioNumber = '';
    if (falseClaimData.fileId) {
      const documentResult = await registerKarinDocument(
        companyId,
        reportId,
        {
          type: 'denuncia_falsa',
          title: 'Evidencia de denuncia falsa',
          description: falseClaimData.justification.substring(0, 100) + '...',
          fileId: falseClaimData.fileId,
          stage: 'false_claim',
          authorId: userId
        }
      );
      
      if (documentResult.success) {
        folioNumber = documentResult.folioNumber;
      }
    }
    
    // Actualizar a la etapa de denuncia falsa
    return await updateKarinProcessStage(
      companyId,
      reportId,
      'false_claim',
      {
        falseClaimDate: todayISO,
        falseClaimJustification: falseClaimData.justification,
        falseClaimEvidence: falseClaimData.evidence,
        falseClaimFileId: falseClaimData.fileId || '',
        falseClaimFolioNumber: folioNumber,
        falseClaimSanctions: falseClaimData.sanctions || [],
        falseClaimRegisteredBy: userId
      },
      userId
    );
  } catch (error) {
    console.error('Error al marcar como denuncia falsa:', error);
    return {
      success: false,
      error: 'Error al marcar como denuncia falsa'
    };
  }
}

/**
 * Registra un caso de represalias en un proceso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param retaliationData Datos sobre las represalias
 * @param userId ID del usuario que registra las represalias
 * @returns Resultado de la operación
 */
export async function registerKarinRetaliation(
  companyId: string,
  reportId: string,
  retaliationData: {
    description: string;
    victim: string;
    perpetrator: string;
    date: Date;
    evidence?: string;
    fileId?: string;
    measuresRequested?: string[];
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Registrar documento de evidencia si hay ID de archivo
    let folioNumber = '';
    if (retaliationData.fileId) {
      const documentResult = await registerKarinDocument(
        companyId,
        reportId,
        {
          type: 'represalias',
          title: 'Denuncia de represalias',
          description: retaliationData.description.substring(0, 100) + '...',
          fileId: retaliationData.fileId,
          stage: 'retaliation_review',
          authorId: userId
        }
      );
      
      if (documentResult.success) {
        folioNumber = documentResult.folioNumber;
      }
    }
    
    // Actualizar a la etapa de revisión de represalias
    return await updateKarinProcessStage(
      companyId,
      reportId,
      'retaliation_review',
      {
        retaliationDate: retaliationData.date.toISOString(),
        retaliationDescription: retaliationData.description,
        retaliationVictim: retaliationData.victim,
        retaliationPerpetrator: retaliationData.perpetrator,
        retaliationEvidence: retaliationData.evidence || '',
        retaliationFileId: retaliationData.fileId || '',
        retaliationFolioNumber: folioNumber,
        retaliationMeasuresRequested: retaliationData.measuresRequested || [],
        retaliationRegisteredBy: userId,
        retaliationRegisteredDate: new Date().toISOString()
      },
      userId
    );
  } catch (error) {
    console.error('Error al registrar represalias:', error);
    return {
      success: false,
      error: 'Error al registrar represalias'
    };
  }
}

/**
 * Cierra un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param closureData Datos del cierre
 * @param userId ID del usuario que cierra el caso
 * @returns Resultado de la operación
 */
export async function closeKarinCase(
  companyId: string,
  reportId: string,
  closureData: {
    closingType: 'founded' | 'unfounded' | 'insufficient_evidence' | 'abandoned';
    justification: string;
    fileId?: string;
    recommendations?: string[];
  },
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportDoc = reportSnap.data();
    
    // Verificar que sea una denuncia Ley Karin
    if (!reportDoc.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Registrar documento de cierre si hay ID de archivo
    let folioNumber = '';
    if (closureData.fileId) {
      const documentResult = await registerKarinDocument(
        companyId,
        reportId,
        {
          type: 'cierre',
          title: 'Resolución de cierre de caso',
          description: closureData.justification.substring(0, 100) + '...',
          fileId: closureData.fileId,
          stage: 'closed',
          authorId: userId
        }
      );
      
      if (documentResult.success) {
        folioNumber = documentResult.folioNumber;
      }
    }
    
    // Cambiar a etapa cerrada
    const result = await updateKarinProcessStage(
      companyId,
      reportId,
      'closed',
      {
        resolutionDate: new Date().toISOString(),
        closingType: closureData.closingType,
        closingJustification: closureData.justification,
        closingFileId: closureData.fileId || '',
        closingFolioNumber: folioNumber,
        closingRecommendations: closureData.recommendations || [],
        closedBy: userId
      },
      userId
    );
    
    // Notificar cierre al denunciante (si no es anónimo)
    if (result.success && !reportDoc.reporter?.isAnonymous && reportDoc.reporter?.contactInfo?.email) {
      try {
        await notifyReportClosed(
          companyId,
          reportId,
          reportDoc.code,
          reportDoc.reporter.contactInfo.email
        );
      } catch (notificationError) {
        console.error('Error al notificar cierre al denunciante:', notificationError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error al cerrar caso Ley Karin:', error);
    return {
      success: false,
      error: 'Error al cerrar el caso'
    };
  }
}

/**
 * Obtiene todas las denuncias Ley Karin con información específica del proceso
 * @param companyId ID de la compañía
 * @returns Lista de denuncias de Ley Karin
 */
export async function getKarinReports(companyId: string) {
  try {
    // Obtener todas las denuncias de Ley Karin
    const reportsRef = collection(db, `companies/${companyId}/reports`);
    const q = query(reportsRef, where('isKarinLaw', '==', true), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        success: true,
        reports: []
      };
    }
    
    // Procesar los resultados
    const reports = await Promise.all(snapshot.docs.map(async (doc) => {
      const reportData = doc.data();
      let assignedToName = '';
      
      // Obtener nombre del investigador asignado si existe
      if (reportData.assignedTo) {
        const userResult = await getUserProfileById(companyId, reportData.assignedTo);
        if (userResult.success) {
          assignedToName = userResult.profile.displayName;
        }
      }
      
      // Calcular fechas límite y estado de vencimiento para distintas etapas
      let deadlineInfo = {
        hasDeadline: false,
        deadline: null,
        remainingDays: null,
        isOverdue: false,
        deadlineType: ''
      };
      
      // Determinar qué plazo mostrar según la etapa actual
      if (reportData.karinProcess) {
        const stage = reportData.karinProcess.stage;
        let deadlineDate = null;
        let deadlineType = '';
        
        // Priorizar plazos según la etapa
        if (stage === 'investigation' && reportData.karinProcess.investigationDeadline) {
          deadlineDate = new Date(reportData.karinProcess.investigationDeadline);
          deadlineType = 'Investigación';
        } else if (stage === 'report_creation' && reportData.karinProcess.report_creationDeadline) {
          deadlineDate = new Date(reportData.karinProcess.report_creationDeadline);
          deadlineType = 'Creación de Informe';
        } else if (stage === 'precautionary_measures' && reportData.karinProcess.precautionary_measuresDeadline) {
          deadlineDate = new Date(reportData.karinProcess.precautionary_measuresDeadline);
          deadlineType = 'Medidas Precautorias';
        } else if (stage === 'decision_to_investigate' && reportData.karinProcess.decision_to_investigateDeadline) {
          deadlineDate = new Date(reportData.karinProcess.decision_to_investigateDeadline);
          deadlineType = 'Decisión';
        } else if (stage === 'reception' && reportData.karinProcess.receptionDeadline) {
          deadlineDate = new Date(reportData.karinProcess.receptionDeadline);
          deadlineType = 'Recepción';
        }
        
        // Calcular días restantes si hay plazo
        if (deadlineDate) {
          const today = new Date();
          deadlineInfo.hasDeadline = true;
          deadlineInfo.deadline = deadlineDate;
          deadlineInfo.deadlineType = deadlineType;
          
          if (deadlineDate > today) {
            // Aún dentro del plazo
            deadlineInfo.remainingDays = getBusinessDaysBetweenDates(today, deadlineDate);
            deadlineInfo.isOverdue = false;
          } else {
            // Vencido
            deadlineInfo.remainingDays = -getBusinessDaysBetweenDates(deadlineDate, today);
            deadlineInfo.isOverdue = true;
          }
        }
      }
      
      // Obtener documentos relacionados con el caso (último documento)
      let latestDocument = null;
      try {
        const documentsRef = collection(db, `companies/${companyId}/reports/${doc.id}/karin_documents`);
        const documentsQuery = query(documentsRef, orderBy('createdAt', 'desc'), firestoreLimit(1));
        const documentsSnap = await getDocs(documentsQuery);
        
        if (!documentsSnap.empty) {
          latestDocument = {
            id: documentsSnap.docs[0].id,
            ...documentsSnap.docs[0].data()
          };
        }
      } catch (error) {
        console.error('Error al obtener documentos:', error);
      }
      
      return {
        id: doc.id,
        ...reportData,
        assignedToName,
        deadlineInfo,
        latestDocument
      };
    }));
    
    return {
      success: true,
      reports
    };
  } catch (error) {
    console.error('Error al obtener denuncias Ley Karin:', error);
    return {
      success: false,
      error: 'Error al obtener las denuncias Ley Karin',
      reports: []
    };
  }
}

/**
 * Obtiene los documentos asociados a un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @returns Lista de documentos del caso
 */
export async function getKarinDocuments(
  companyId: string,
  reportId: string
): Promise<{
  success: boolean;
  documents?: any[];
  error?: string;
}> {
  try {
    // Verificar que la denuncia exista y sea de tipo Ley Karin
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportData = reportSnap.data();
    if (!reportData.isKarinLaw) {
      return {
        success: false,
        error: 'Esta denuncia no corresponde a Ley Karin'
      };
    }
    
    // Obtener los documentos
    const documentsRef = collection(db, `companies/${companyId}/reports/${reportId}/karin_documents`);
    const q = query(documentsRef, orderBy('createdAt', 'desc'));
    const documentsSnap = await getDocs(q);
    
    // Obtener información adicional de cada documento
    const documents = await Promise.all(documentsSnap.docs.map(async (docSnap) => {
      const docData = docSnap.data();
      let authorName = 'Sistema';
      
      // Obtener nombre del autor si existe ID
      if (docData.authorId && docData.authorId !== 'system') {
        try {
          const userResult = await getUserProfileById(companyId, docData.authorId);
          if (userResult.success) {
            authorName = userResult.profile.displayName || userResult.profile.email;
          }
        } catch (error) {
          console.error('Error al obtener datos del autor:', error);
        }
      }
      
      return {
        id: docSnap.id,
        ...docData,
        authorName,
        createdAtFormatted: docData.createdAt ? 
          new Date(docData.createdAt.toDate()).toLocaleString() : 
          'Sin fecha'
      };
    }));
    
    return {
      success: true,
      documents
    };
  } catch (error) {
    console.error('Error al obtener documentos Ley Karin:', error);
    return {
      success: false,
      error: 'Error al obtener documentos'
    };
  }
}

/**
 * Interface para definir la estructura de un elemento en el expediente digital
 */
export interface DigitalFileItem {
  id: string;
  type: 'document' | 'evidence' | 'activity' | 'communication' | 'form' | 'notification' | 'testimony';
  title: string;
  description: string;
  date: Date | string;
  authorId?: string;
  authorName?: string;
  fileUrl?: string;
  fileId?: string;
  fileType?: string;
  content?: string;
  category?: string;
  stage?: string;
  folioNumber?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para el expediente digital completo
 */
export interface DigitalFile {
  reportId: string;
  reportCode: string;
  reportTitle: string;
  createdAt: Date;
  items: DigitalFileItem[];
  summary?: {
    totalDocuments: number;
    totalEvidences: number;
    totalActivities: number;
    totalCommunications: number;
    timeline: Array<{
      date: Date;
      event: string;
    }>;
  };
  metadata: {
    isKarinLaw: boolean;
    category: string;
    status: string;
    createdBy: string;
    closedAt?: Date;
  };
}

/**
 * Genera un expediente digital completo para cualquier tipo de denuncia
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @returns Objeto con el expediente digital completo
 */
export async function generateDigitalFile(
  companyId: string,
  reportId: string
): Promise<{
  success: boolean;
  digitalFile?: DigitalFile;
  error?: string;
}> {
  try {
    // 1. Obtener la información principal del reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Denuncia no encontrada'
      };
    }
    
    const reportData = reportSnap.data();
    const isKarinLaw = reportData.isKarinLaw || false;
    
    // 2. Crear estructura base del expediente
    const digitalFile: DigitalFile = {
      reportId,
      reportCode: reportData.code,
      reportTitle: `Denuncia ${reportData.code} - ${reportData.category}`,
      createdAt: new Date(),
      items: [],
      summary: {
        totalDocuments: 0,
        totalEvidences: 0,
        totalActivities: 0,
        totalCommunications: 0,
        timeline: []
      },
      metadata: {
        isKarinLaw,
        category: reportData.category,
        status: reportData.status,
        createdBy: 'Sistema',
        closedAt: reportData.closedAt ? new Date(reportData.closedAt.toDate()) : undefined
      }
    };
    
    // Array para almacenar todas las promesas de consultas
    const fetchPromises = [];
    
    // 3. Obtener todas las evidencias
    const evidencesPromise = getDocs(collection(db, `companies/${companyId}/reports/${reportId}/evidence`))
      .then(async (evidencesSnap) => {
        const evidences = await Promise.all(evidencesSnap.docs.map(async (evidenceDoc) => {
          const evidenceData = evidenceDoc.data();
          
          return {
            id: evidenceDoc.id,
            type: 'evidence',
            title: evidenceData.originalFilename || 'Evidencia sin nombre',
            description: evidenceData.description || 'Sin descripción',
            date: evidenceData.uploadedAt ? new Date(evidenceData.uploadedAt.toDate()) : new Date(),
            fileUrl: evidenceData.storageRef || '',
            fileType: evidenceData.fileType || 'unknown',
            authorId: 'reporter',
            authorName: reportData.reporter?.isAnonymous ? 'Denunciante anónimo' : (reportData.reporter?.contactInfo?.name || 'Denunciante'),
            category: 'evidence',
            metadata: {
              size: evidenceData.size,
              uploadedAt: evidenceData.uploadedAt ? new Date(evidenceData.uploadedAt.toDate()) : null
            }
          } as DigitalFileItem;
        }));
        
        digitalFile.items.push(...evidences);
        digitalFile.summary.totalEvidences = evidences.length;
        
        // Añadir a timeline
        evidences.forEach(evidence => {
          const date = evidence.date instanceof Date ? evidence.date : new Date(evidence.date);
          digitalFile.summary.timeline.push({
            date,
            event: `Evidencia subida: ${evidence.title}`
          });
        });
      });
    
    fetchPromises.push(evidencesPromise);
    
    // 4. Obtener el historial de actividades
    const activitiesPromise = getDocs(
      query(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        orderBy('timestamp', 'asc')
      )
    ).then(async (activitiesSnap) => {
      const activities = await Promise.all(activitiesSnap.docs.map(async (activityDoc) => {
        const activityData = activityDoc.data();
        let authorName = 'Sistema';
        
        // Obtener nombre del autor si existe ID
        if (activityData.actorId && activityData.actorId !== 'system') {
          try {
            const userResult = await getUserProfileById(companyId, activityData.actorId);
            if (userResult.success) {
              authorName = userResult.profile.displayName || userResult.profile.email;
            }
          } catch (error) {
            console.error('Error al obtener datos del autor:', error);
          }
        }
        
        return {
          id: activityDoc.id,
          type: 'activity',
          title: `Actividad: ${activityData.actionType}`,
          description: activityData.description || 'Sin descripción',
          date: activityData.timestamp ? new Date(activityData.timestamp.toDate()) : new Date(),
          authorId: activityData.actorId || 'system',
          authorName,
          content: JSON.stringify(activityData),
          category: activityData.actionType,
          metadata: {
            ...activityData
          }
        } as DigitalFileItem;
      }));
      
      digitalFile.items.push(...activities);
      digitalFile.summary.totalActivities = activities.length;
      
      // Añadir a timeline
      activities.forEach(activity => {
        const date = activity.date instanceof Date ? activity.date : new Date(activity.date);
        digitalFile.summary.timeline.push({
          date,
          event: activity.description
        });
      });
    });
    
    fetchPromises.push(activitiesPromise);
    
    // 5. Obtener las comunicaciones
    const communicationsPromise = getDocs(
      query(
        collection(db, `companies/${companyId}/reports/${reportId}/communications`),
        orderBy('timestamp', 'asc')
      )
    ).then(async (communicationsSnap) => {
      const communications = await Promise.all(communicationsSnap.docs.map(async (commDoc) => {
        const commData = commDoc.data();
        let authorName = 'Sistema';
        
        if (commData.isFromReporter) {
          authorName = reportData.reporter?.isAnonymous ? 
            'Denunciante anónimo' : 
            (reportData.reporter?.contactInfo?.name || 'Denunciante');
        } else if (commData.senderId && commData.senderId !== 'system') {
          try {
            const userResult = await getUserProfileById(companyId, commData.senderId);
            if (userResult.success) {
              authorName = userResult.profile.displayName || userResult.profile.email;
            }
          } catch (error) {
            console.error('Error al obtener datos del autor:', error);
          }
        }
        
        return {
          id: commDoc.id,
          type: 'communication',
          title: `Comunicación ${commData.isFromReporter ? 'del denunciante' : 'de la empresa'}`,
          description: commData.content.substring(0, 100) + (commData.content.length > 100 ? '...' : ''),
          date: commData.timestamp ? new Date(commData.timestamp.toDate()) : new Date(),
          authorId: commData.senderId || (commData.isFromReporter ? 'reporter' : 'system'),
          authorName,
          content: commData.content,
          category: commData.isFromReporter ? 'reporter' : (commData.isInternal ? 'internal' : 'company'),
          metadata: {
            isFromReporter: commData.isFromReporter,
            isInternal: commData.isInternal,
            isRead: commData.isRead
          }
        } as DigitalFileItem;
      }));
      
      digitalFile.items.push(...communications);
      digitalFile.summary.totalCommunications = communications.length;
      
      // Añadir solo las comunicaciones no internas a timeline
      communications
        .filter(comm => !comm.metadata.isInternal)
        .forEach(comm => {
          const date = comm.date instanceof Date ? comm.date : new Date(comm.date);
          digitalFile.summary.timeline.push({
            date,
            event: `Comunicación: ${comm.authorName}`
          });
        });
    });
    
    fetchPromises.push(communicationsPromise);
    
    // 6. Si es un caso de Ley Karin, obtener documentos específicos
    if (isKarinLaw) {
      const karinDocumentsPromise = getDocs(
        collection(db, `companies/${companyId}/reports/${reportId}/karin_documents`)
      ).then(async (docsSnap) => {
        const karinDocuments = await Promise.all(docsSnap.docs.map(async (docSnapshot) => {
          const docData = docSnapshot.data();
          let authorName = 'Sistema';
          
          if (docData.authorId && docData.authorId !== 'system') {
            try {
              const userResult = await getUserProfileById(companyId, docData.authorId);
              if (userResult.success) {
                authorName = userResult.profile.displayName || userResult.profile.email;
              }
            } catch (error) {
              console.error('Error al obtener datos del autor:', error);
            }
          }
          
          return {
            id: docSnapshot.id,
            type: 'document',
            title: docData.title || `Documento: ${docData.type}`,
            description: docData.description || 'Sin descripción',
            date: docData.createdAt ? new Date(docData.createdAt.toDate()) : new Date(),
            authorId: docData.authorId || 'system',
            authorName,
            fileUrl: docData.fileId ? `storage/companies/${companyId}/reports/${reportId}/documents/${docData.fileId}` : '',
            fileId: docData.fileId,
            category: docData.type,
            stage: docData.stage,
            folioNumber: docData.folioNumber,
            metadata: {
              documentStatus: docData.documentStatus,
              documentType: docData.type
            }
          } as DigitalFileItem;
        }));
        
        digitalFile.items.push(...karinDocuments);
        digitalFile.summary.totalDocuments += karinDocuments.length;
        
        // Añadir a timeline
        karinDocuments.forEach(doc => {
          const date = doc.date instanceof Date ? doc.date : new Date(doc.date);
          digitalFile.summary.timeline.push({
            date,
            event: `Documento registrado: ${doc.title} (${doc.folioNumber || 'Sin folio'})`
          });
        });
      });
      
      fetchPromises.push(karinDocumentsPromise);
    }
    
    // 7. Obtener recomendaciones si existen
    const recommendationsPromise = getDocs(
      collection(db, `companies/${companyId}/reports/${reportId}/recommendations`)
    ).then(async (recommendationsSnap) => {
      if (!recommendationsSnap.empty) {
        const recommendations = await Promise.all(recommendationsSnap.docs.map(async (recDoc) => {
          const recData = recDoc.data();
          let authorName = 'Sistema';
          let assignedToName = 'No asignado';
          
          // Obtener nombre del creador
          if (recData.createdBy && recData.createdBy !== 'system') {
            try {
              const userResult = await getUserProfileById(companyId, recData.createdBy);
              if (userResult.success) {
                authorName = userResult.profile.displayName || userResult.profile.email;
              }
            } catch (error) {
              console.error('Error al obtener datos del creador:', error);
            }
          }
          
          // Obtener nombre del asignado
          if (recData.assignedTo) {
            try {
              const userResult = await getUserProfileById(companyId, recData.assignedTo);
              if (userResult.success) {
                assignedToName = userResult.profile.displayName || userResult.profile.email;
              }
            } catch (error) {
              console.error('Error al obtener datos del asignado:', error);
            }
          }
          
          return {
            id: recDoc.id,
            type: 'document',
            title: `Recomendación: ${recData.action}`,
            description: recData.comments || 'Sin comentarios adicionales',
            date: recData.createdAt ? new Date(recData.createdAt.toDate()) : new Date(),
            authorId: recData.createdBy,
            authorName,
            content: `Recomendación: ${recData.action}\nAsignado a: ${assignedToName}\nFecha límite: ${new Date(recData.dueDate.toDate()).toLocaleDateString()}\nEstado: ${recData.status}`,
            category: 'recommendation',
            metadata: {
              status: recData.status,
              priority: recData.priority,
              dueDate: recData.dueDate ? new Date(recData.dueDate.toDate()) : null,
              completedAt: recData.completedAt ? new Date(recData.completedAt.toDate()) : null,
              completedBy: recData.completedBy,
              assignedTo: recData.assignedTo,
              assignedToName
            }
          } as DigitalFileItem;
        }));
        
        digitalFile.items.push(...recommendations);
        
        // Añadir a timeline
        recommendations.forEach(rec => {
          const date = rec.date instanceof Date ? rec.date : new Date(rec.date);
          digitalFile.summary.timeline.push({
            date,
            event: `Recomendación creada: ${rec.title}`
          });
          
          // Si está completada, añadir también ese evento
          if (rec.metadata.completedAt) {
            digitalFile.summary.timeline.push({
              date: rec.metadata.completedAt,
              event: `Recomendación completada: ${rec.title}`
            });
          }
        });
      }
    });
    
    fetchPromises.push(recommendationsPromise);
    
    // 8. Esperar que todas las consultas finalicen
    await Promise.all(fetchPromises);
    
    // 9. Ordenar todos los elementos por fecha
    digitalFile.items.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    // 10. Ordenar timeline
    digitalFile.summary.timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return {
      success: true,
      digitalFile
    };
  } catch (error) {
    console.error('Error al generar expediente digital:', error);
    return {
      success: false,
      error: 'Error al generar el expediente digital completo'
    };
  }
}

/**
 * Genera un PDF con el expediente digital completo
 * Este servicio integra con generación de PDF y puede exportar
 * en diferentes formatos según las necesidades del usuario
 * 
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param options Opciones de generación del expediente
 * @returns URL al archivo generado
 */
/**
 * Importación adicional para stream
 */
import { Readable } from 'stream';

// Función asincrónica para generar expediente digital en PDF
export async function generateDigitalFilePDF(
  companyId: string,
  reportId: string,
  options: {
    format?: 'pdf' | 'html' | 'docx' | 'zip';
    includeInternalCommunications?: boolean;
    includeTimeline?: boolean;
    includeSummary?: boolean;
    includeAttachments?: boolean;
    includeKarinDocuments?: boolean;
    generateTableOfContents?: boolean;
    watermark?: string;
    userId?: string;
    generateSignaturePage?: boolean;
    encryptWithPassword?: boolean;
    customHeader?: string;
    customFooter?: string;
    password?: string;
  } = {}
): Promise<{
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  exportId?: string;
  error?: string;
}> {
  try {
    // Establecer opciones predeterminadas
    const exportOptions = {
      format: options.format || 'pdf',
      includeInternalCommunications: options.includeInternalCommunications !== false,
      includeTimeline: options.includeTimeline !== false,
      includeSummary: options.includeSummary !== false,
      includeAttachments: options.includeAttachments !== false,
      includeKarinDocuments: options.includeKarinDocuments !== false,
      generateTableOfContents: options.generateTableOfContents !== false,
      watermark: options.watermark || '',
      userId: options.userId || 'system',
      generateSignaturePage: options.generateSignaturePage !== false,
      encryptWithPassword: options.encryptWithPassword || false,
      password: options.password || '',
      customHeader: options.customHeader || '',
      customFooter: options.customFooter || '',
    };
    
    // 1. Obtener el expediente digital completo
    const expedienteResult = await generateDigitalFile(companyId, reportId);
    
    if (!expedienteResult.success) {
      return {
        success: false,
        error: expedienteResult.error || 'Error al generar el expediente digital'
      };
    }
    
    const expediente = expedienteResult.digitalFile;
    
    // Filtrar comunicaciones internas si es necesario
    if (!exportOptions.includeInternalCommunications) {
      expediente.items = expediente.items.filter(item => {
        if (item.type === 'communication') {
          return !item.metadata?.isInternal;
        }
        return true;
      });
    }
    
    // Filtrar documentos de Ley Karin si es necesario
    if (!exportOptions.includeKarinDocuments) {
      expediente.items = expediente.items.filter(item => {
        // Excluir documentos relacionados con Ley Karin
        if (
          (item.type === 'document' && 
          (item.category?.toLowerCase().includes('karin') || 
           item.title?.toLowerCase().includes('karin') ||
           item.metadata?.documentType?.toLowerCase().includes('karin'))) ||
          (item.metadata?.isKarinDocument === true)
        ) {
          return false;
        }
        return true;
      });
    }
    
    // 2. Generar nombre de archivo según el formato
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = exportOptions.format === 'docx' ? 'docx' : 
                         exportOptions.format === 'html' ? 'html' : 
                         exportOptions.format === 'zip' ? 'zip' : 'pdf';
    
    const filename = `Expediente_${expediente.reportCode}_${timestamp}.${fileExtension}`;
    const storagePath = `companies/${companyId}/reports/${reportId}/exports/${filename}`;
    
    // Registrar la exportación en la base de datos
    const exportRef = await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/exports`),
      {
        type: `expediente_${exportOptions.format}`,
        filename,
        createdAt: serverTimestamp(),
        storagePath,
        fileSize: 0, // Se actualizará al generar el archivo real
        generatedBy: exportOptions.userId,
        status: 'processing',
        options: {
          ...exportOptions,
          // No incluir la contraseña en la BD por seguridad
          password: exportOptions.encryptWithPassword ? '******' : undefined
        },
        includesAttachments: exportOptions.includeAttachments,
        includesTimeline: exportOptions.includeTimeline,
        includesInternalCommunications: exportOptions.includeInternalCommunications,
        includesKarinDocuments: exportOptions.includeKarinDocuments,
        isEncrypted: exportOptions.encryptWithPassword
      }
    );
    
    // 3. IMPLEMENTACIÓN REAL: Generar el PDF con PDFKit
    try {
      // Crear documento PDF con opciones adecuadas
      const pdfOptions: any = {
        size: 'A4',
        margin: 50,
        info: {
          Title: `Expediente Digital: ${expediente.reportCode}`,
          Author: 'Canal Ética',
          Subject: `Expediente completo del caso ${expediente.reportCode}`,
          Keywords: 'expediente, digital, denuncia, ética',
          CreationDate: new Date()
        }
      };
      
      // Si se solicita cifrado con contraseña, configurarlo
      if (exportOptions.encryptWithPassword && exportOptions.password) {
        pdfOptions.userPassword = exportOptions.password;
        pdfOptions.ownerPassword = exportOptions.password;
        pdfOptions.permissions = {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false
        };
      }
      
      // Crear documento PDF con manejo especial para cliente/servidor
      let pdfDoc;
      let chunks: Buffer[] = [];
      let stream;
      let blobData;
      
      if (typeof window === 'undefined') {
        // Estamos en el servidor
        pdfDoc = new PDFDocument(pdfOptions);
        // Capturar chunks directamente
        pdfDoc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      } else {
        // Estamos en el navegador, cargar módulos dinámicamente
        // Esta implementación evita errores durante el SSR
        try {
          // Importar PDFKit y BlobStream de manera dinámica
          // Usamos importaciones tipo commonJS para compatibilidad
          const PDFKitModule = await import('pdfkit/js/pdfkit.standalone.js');
          const PDFKitClass = PDFKitModule.default || PDFKitModule;
          
          const BlobStreamModule = await import('blob-stream');
          const blobStream = BlobStreamModule.default || BlobStreamModule;
          
          // Crear el documento PDF
          pdfDoc = new PDFKitClass(pdfOptions);
          stream = pdfDoc.pipe(blobStream());
        } catch (e) {
          console.error('Error al cargar PDFKit en el navegador:', e);
          throw new Error('No se pudo generar el PDF en el navegador. Intente nuevamente más tarde.');
        }
      }
      
      // Función para añadir encabezado y pie de página en cada página
      const addHeaderAndFooter = () => {
        // Encabezado personalizado o predeterminado
        pdfDoc.fontSize(8)
           .fillColor('#666666')
           .text(
             exportOptions.customHeader || `Expediente Digital - ${expediente.reportCode}`, 
             50, 20, 
             { align: 'center', width: pdfDoc.page.width - 100 }
           );
        
        // Pie de página
        const footerText = exportOptions.customFooter || 
                          `Canal Ética | Generado: ${new Date().toLocaleString()} | Página ${pdfDoc.page.pageNumber}`;
        
        pdfDoc.fontSize(8)
           .fillColor('#666666')
           .text(
             footerText, 
             50, pdfDoc.page.height - 30, 
             { align: 'center', width: pdfDoc.page.width - 100 }
           );
        
        // Añadir marca de agua si está configurada
        if (exportOptions.watermark) {
          pdfDoc.save()
             .rotate(45, { origin: [pdfDoc.page.width / 2, pdfDoc.page.height / 2] })
             .fontSize(60)
             .fillColor('rgba(200, 200, 200, 0.3)')
             .text(exportOptions.watermark, 0, pdfDoc.page.height / 2, {
               align: 'center',
               width: pdfDoc.page.width
             })
             .restore();
        }
      };
      
      // Añadir evento para encabezado y pie de página en cada página
      pdfDoc.on('pageAdded', addHeaderAndFooter);
      
      // Agregar encabezado y pie de página a la primera página
      addHeaderAndFooter();
      
      // PORTADA
      pdfDoc.fontSize(26)
         .fillColor('#003366')
         .text('EXPEDIENTE DIGITAL', { align: 'center' })
         .moveDown(0.5);
      
      pdfDoc.fontSize(20)
         .fillColor('#333333')
         .text(`Código: ${expediente.reportCode}`, { align: 'center' })
         .moveDown(0.5);
      
      pdfDoc.fontSize(14)
         .fillColor('#666666')
         .text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'center' })
         .moveDown(2);
      
      // Añadir logo si existe
      // pdfDoc.image('public/logo.png', pdfDoc.page.width / 2 - 100, 300, { width: 200, align: 'center' });
      
      // Información general
      pdfDoc.fontSize(14)
         .fillColor('#333333')
         .text('INFORMACIÓN GENERAL', { align: 'center' })
         .moveDown(1);
      
      const infoTable = [
        ['Categoría:', expediente.metadata.category],
        ['Estado:', expediente.metadata.status],
        ['Tipo de caso:', expediente.metadata.isKarinLaw ? 'Ley Karin' : 'Estándar'],
        ['Elementos incluidos:', `${expediente.items.length} items`],
        ['Fecha de creación:', new Date(expediente.createdAt).toLocaleDateString()],
      ];
      
      let yPos = pdfDoc.y;
      infoTable.forEach((row, i) => {
        pdfDoc.fontSize(12)
           .fillColor('#333333')
           .text(row[0], 100, yPos, { width: 150 })
           .fillColor('#666666')
           .text(row[1], 250, yPos, { width: 250 });
        
        yPos += 25;
      });
      
      // TABLA DE CONTENIDOS
      if (exportOptions.generateTableOfContents) {
        pdfDoc.addPage();
        pdfDoc.fontSize(16)
           .fillColor('#003366')
           .text('TABLA DE CONTENIDO', { align: 'center' })
           .moveDown(1);
        
        // Generar mapa de secciones para el índice
        const sections = [
          { title: 'Información General del Caso', type: 'header', pageStart: 1 },
          { title: 'Línea de Tiempo', type: 'timeline', pageStart: exportOptions.includeTimeline ? 3 : undefined },
          { title: 'Documentos', type: 'documents', pageStart: 5 },
          { title: 'Comunicaciones', type: 'communications', pageStart: 7 },
          { title: 'Evidencias', type: 'evidence', pageStart: 10 },
          { title: 'Actividades del Sistema', type: 'activities', pageStart: 12 }
        ];
        
        if (expediente.metadata.isKarinLaw && exportOptions.includeKarinDocuments) {
          sections.push({ title: 'Documentos Ley Karin', type: 'karin_documents', pageStart: 15 });
        }
        
        // Si hay recomendaciones, incluirlas como sección
        if (expediente.items.some(item => item.category === 'recommendation')) {
          sections.push({ title: 'Recomendaciones', type: 'recommendations', pageStart: 20 });
        }
        
        if (exportOptions.generateSignaturePage) {
          sections.push({ title: 'Página de Firmas', type: 'signatures', pageStart: 25 });
        }
        
        // Dibujar tabla de contenidos
        let tocY = pdfDoc.y;
        sections.forEach((section, i) => {
          if (section.pageStart !== undefined) {
            pdfDoc.fontSize(12)
               .fillColor('#333333')
               .text(section.title, 100, tocY, { width: 300 })
               .text(`${section.pageStart}`, 400, tocY, { align: 'right', width: 50 });
            
            // Agregar línea de puntos entre el título y el número de página
            const xStart = 100 + pdfDoc.widthOfString(section.title) + 10;
            const xEnd = 400 - 5;
            const dots = '.'.repeat(Math.floor((xEnd - xStart) / 5));
            pdfDoc.text(dots, xStart, tocY, { width: xEnd - xStart, align: 'center' });
            
            tocY += 25;
          }
        });
      }
      
      // LÍNEA DE TIEMPO
      if (exportOptions.includeTimeline && expediente.summary?.timeline && expediente.summary.timeline.length > 0) {
        pdfDoc.addPage();
        pdfDoc.fontSize(16)
           .fillColor('#003366')
           .text('LÍNEA DE TIEMPO', { align: 'center' })
           .moveDown(1);
        
        // Ordenar eventos cronológicamente
        const sortedEvents = [...expediente.summary.timeline].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Dibujar línea de tiempo
        let timelineY = pdfDoc.y;
        sortedEvents.forEach((event, i) => {
          const date = new Date(event.date);
          
          // Dibujar punto en la línea
          pdfDoc.circle(100, timelineY + 10, 5)
             .fillAndStroke('#003366');
          
          // Si no es el último evento, dibujar línea al siguiente punto
          if (i < sortedEvents.length - 1) {
            doc.moveTo(100, timelineY + 15)
               .lineTo(100, timelineY + 35)
               .stroke('#003366');
          }
          
          // Fecha y descripción
          doc.fontSize(10)
             .fillColor('#666666')
             .text(date.toLocaleDateString(), 120, timelineY, { width: 100 })
             .fontSize(11)
             .fillColor('#333333')
             .text(event.event, 220, timelineY, { width: 300 });
          
          timelineY += 40;
          
          // Si se acerca al final de la página, crear una nueva
          if (timelineY > pdfDoc.page.height - 50) {
            pdfDoc.addPage();
            timelineY = 70; // Iniciar después del encabezado
          }
        });
      }
      
      // SECCIONES DE CONTENIDO
      // Agrupar elementos por tipo para organizarlos
      const itemsByType: {
        document: any[];
        evidence: any[];
        communication: any[];
        activity: any[];
      } = {
        document: [],
        evidence: [],
        communication: [],
        activity: []
      };
      
      // Clasificar elementos
      expediente.items.forEach(item => {
        if (itemsByType[item.type]) {
          itemsByType[item.type].push(item);
        }
      });
      
      // DOCUMENTOS
      if (itemsByType.document.length > 0) {
        pdfDoc.addPage();
        pdfDoc.fontSize(16)
           .fillColor('#003366')
           .text('DOCUMENTOS', { align: 'center' })
           .moveDown(1);
        
        let docsY = pdfDoc.y;
        itemsByType.document.forEach((document, i) => {
          // Título del documento con número de folio
          pdfDoc.fontSize(14)
             .fillColor('#003366')
             .text(`${i+1}. ${document.title}${document.folioNumber ? ` (Folio: ${document.folioNumber})` : ''}`, 50, docsY)
             .moveDown(0.5);
          
          docsY = pdfDoc.y;
          
          // Fecha y autor
          pdfDoc.fontSize(10)
             .fillColor('#666666')
             .text(`Fecha: ${new Date(document.date).toLocaleDateString()}`, 70, docsY)
             .moveDown(0.2);
          
          docsY = pdfDoc.y;
          
          if (document.authorName) {
            pdfDoc.text(`Autor: ${document.authorName}`, 70, docsY)
               .moveDown(0.5);
            docsY = pdfDoc.y;
          }
          
          // Descripción
          pdfDoc.fontSize(11)
             .fillColor('#333333')
             .text(`${document.description || "Sin descripción"}`, 70, docsY, {
               width: 450,
               align: 'justify'
             })
             .moveDown(0.5);
          
          docsY = pdfDoc.y;
          
          // Si tiene contenido, mostrarlo
          if (document.content) {
            pdfDoc.fontSize(10)
               .fillColor('#000000')
               .text(document.content, 70, docsY, {
                 width: 450,
                 align: 'left'
               })
               .moveDown(0.5);
            
            docsY = pdfDoc.y;
          }
          
          // Si hay URL de archivo, indicarlo
          if (document.fileUrl) {
            pdfDoc.fontSize(10)
               .fillColor('#0000FF')
               .text(`Documento adjunto: ${document.fileType || 'Archivo'}`, 70, docsY)
               .moveDown(1.5);
          } else {
            pdfDoc.moveDown(1.5);
          }
          
          docsY = pdfDoc.y;
          
          // Dibujar línea separadora excepto en el último documento
          if (i < itemsByType.document.length - 1) {
            pdfDoc.moveTo(50, docsY)
               .lineTo(550, docsY)
               .stroke('#CCCCCC');
            
            pdfDoc.moveDown(1);
            docsY = pdfDoc.y;
          }
          
          // Si nos acercamos al final de la página, crear una nueva
          if (docsY > pdfDoc.page.height - 100) {
            pdfDoc.addPage();
            docsY = 70; // Iniciar después del encabezado
          }
        });
      }
      
      // EVIDENCIAS
      if (itemsByType.evidence.length > 0) {
        pdfDoc.addPage();
        pdfDoc.fontSize(16)
           .fillColor('#003366')
           .text('EVIDENCIAS', { align: 'center' })
           .moveDown(1);
        
        let evidenceY = pdfDoc.y;
        itemsByType.evidence.forEach((evidence, i) => {
          // Título de la evidencia con número de folio
          pdfDoc.fontSize(14)
             .fillColor('#003366')
             .text(`${i+1}. ${evidence.title}${evidence.folioNumber ? ` (Folio: ${evidence.folioNumber})` : ''}`, 50, evidenceY)
             .moveDown(0.5);
          
          evidenceY = pdfDoc.y;
          
          // Fecha y autor
          pdfDoc.fontSize(10)
             .fillColor('#666666')
             .text(`Fecha: ${new Date(evidence.date).toLocaleDateString()}`, 70, evidenceY)
             .moveDown(0.2);
          
          evidenceY = pdfDoc.y;
          
          if (evidence.authorName) {
            pdfDoc.text(`Aportado por: ${evidence.authorName}`, 70, evidenceY)
               .moveDown(0.5);
            evidenceY = pdfDoc.y;
          }
          
          // Descripción
          pdfDoc.fontSize(11)
             .fillColor('#333333')
             .text(`${evidence.description || "Sin descripción"}`, 70, evidenceY, {
               width: 450,
               align: 'justify'
             })
             .moveDown(0.5);
          
          evidenceY = pdfDoc.y;
          
          // Si tiene categoría, mostrarla
          if (evidence.category) {
            pdfDoc.fontSize(10)
               .fillColor('#666666')
               .text(`Categoría: ${evidence.category}`, 70, evidenceY)
               .moveDown(0.5);
            
            evidenceY = pdfDoc.y;
          }
          
          // Si hay URL de archivo, indicarlo
          if (evidence.fileUrl) {
            pdfDoc.fontSize(10)
               .fillColor('#0000FF')
               .text(`Archivo de evidencia: ${evidence.fileType || 'Archivo'}`, 70, evidenceY)
               .moveDown(0.5);
            
            // Si es una imagen, intentar mostrarla en el PDF
            if (evidence.fileType && ['jpg', 'jpeg', 'png', 'gif'].includes(evidence.fileType.toLowerCase())) {
              // Aquí se insertaría la imagen si estuviera disponible localmente
              // En un entorno real, se podría descargar primero y luego insertar
              pdfDoc.moveDown(0.5)
                 .text('(Imagen de evidencia incluida en el expediente digital)', { 
                   width: 400, 
                   align: 'center' 
                 })
                 .moveDown(0.5);
            }
            
            evidenceY = pdfDoc.y;
          }
          
          // Metadatos adicionales
          if (evidence.metadata && Object.keys(evidence.metadata).length > 0) {
            pdfDoc.fontSize(10)
               .fillColor('#666666')
               .text('Información adicional:', 70, evidenceY)
               .moveDown(0.2);
            
            evidenceY = pdfDoc.y;
            
            Object.entries(evidence.metadata).forEach(([key, value]) => {
              pdfDoc.text(`${key}: ${value}`, 90, evidenceY)
                 .moveDown(0.2);
              evidenceY = pdfDoc.y;
            });
            
            pdfDoc.moveDown(0.5);
            evidenceY = pdfDoc.y;
          }
          
          // Dibujar línea separadora excepto en la última evidencia
          if (i < itemsByType.evidence.length - 1) {
            pdfDoc.moveTo(50, evidenceY)
               .lineTo(550, evidenceY)
               .stroke('#CCCCCC');
            
            pdfDoc.moveDown(1);
            evidenceY = pdfDoc.y;
          }
          
          // Si nos acercamos al final de la página, crear una nueva
          if (evidenceY > pdfDoc.page.height - 100) {
            pdfDoc.addPage();
            evidenceY = 70; // Iniciar después del encabezado
          }
        });
      }
      
      // COMUNICACIONES
      if (itemsByType.communication.length > 0) {
        pdfDoc.addPage();
        pdfDoc.fontSize(16)
           .fillColor('#003366')
           .text('COMUNICACIONES', { align: 'center' })
           .moveDown(1);
        
        // Ordenar comunicaciones por fecha
        const sortedCommunications = [...itemsByType.communication].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB;
        });
        
        let commY = pdfDoc.y;
        sortedCommunications.forEach((comm, i) => {
          // Título de la comunicación
          pdfDoc.fontSize(14)
             .fillColor('#003366')
             .text(`${i+1}. ${comm.title}`, 50, commY)
             .moveDown(0.5);
          
          commY = pdfDoc.y;
          
          // Fecha, emisor y receptor
          pdfDoc.fontSize(10)
             .fillColor('#666666')
             .text(`Fecha: ${new Date(comm.date).toLocaleDateString()}`, 70, commY)
             .moveDown(0.2);
          
          commY = pdfDoc.y;
          
          if (comm.authorName) {
            pdfDoc.text(`De: ${comm.authorName}`, 70, commY)
               .moveDown(0.2);
            commY = pdfDoc.y;
          }
          
          if (comm.metadata && comm.metadata.recipient) {
            pdfDoc.text(`Para: ${comm.metadata.recipient}`, 70, commY)
               .moveDown(0.5);
            commY = pdfDoc.y;
          }
          
          // Descripción/Asunto
          pdfDoc.fontSize(11)
             .fillColor('#333333')
             .text(`${comm.description || "Sin asunto"}`, 70, commY, {
               width: 450,
               align: 'justify'
             })
             .moveDown(0.5);
          
          commY = pdfDoc.y;
          
          // Contenido de la comunicación
          if (comm.content) {
            // Recuadro para el contenido
            pdfDoc.rect(70, commY, 450, 120).fillAndStroke('#F7F7F7', '#CCCCCC');
            
            pdfDoc.fontSize(10)
               .fillColor('#000000')
               .text(comm.content, 80, commY + 10, {
                 width: 430,
                 height: 100,
                 align: 'left'
               })
               .moveDown(0.5);
            
            commY += 130; // Ajustar según el tamaño real del contenido
          }
          
          // Tipo de comunicación
          if (comm.category) {
            pdfDoc.fontSize(10)
               .fillColor('#666666')
               .text(`Tipo: ${comm.category}`, 70, commY)
               .moveDown(0.5);
            
            commY = pdfDoc.y;
          }
          
          // Si hay archivos adjuntos, indicarlo
          if (comm.fileUrl) {
            pdfDoc.fontSize(10)
               .fillColor('#0000FF')
               .text(`Archivo adjunto: ${comm.fileType || 'Archivo'}`, 70, commY)
               .moveDown(1);
            
            commY = pdfDoc.y;
          }
          
          // Dibujar línea separadora excepto en la última comunicación
          if (i < sortedCommunications.length - 1) {
            pdfDoc.moveTo(50, commY)
               .lineTo(550, commY)
               .stroke('#CCCCCC');
            
            pdfDoc.moveDown(1);
            commY = pdfDoc.y;
          }
          
          // Si nos acercamos al final de la página, crear una nueva
          if (commY > pdfDoc.page.height - 100) {
            pdfDoc.addPage();
            commY = 70; // Iniciar después del encabezado
          }
        });
      }
      
      // ACTIVIDADES
      if (itemsByType.activity.length > 0) {
        pdfDoc.addPage();
        pdfDoc.fontSize(16)
           .fillColor('#003366')
           .text('ACTIVIDADES DEL SISTEMA', { align: 'center' })
           .moveDown(1);
        
        // Ordenar actividades cronológicamente
        const sortedActivities = [...itemsByType.activity].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB;
        });
        
        // Crear una tabla visualmente para mostrar actividades de sistema
        let activityY = pdfDoc.y;
        
        // Encabezado de la tabla
        pdfDoc.fontSize(12)
           .fillColor('#FFFFFF')
           .rect(50, activityY, 500, 30)
           .fill('#003366');
           
        pdfDoc.fillColor('#FFFFFF')
           .text('Fecha', 60, activityY + 10, { width: 80 })
           .text('Usuario', 150, activityY + 10, { width: 100 })
           .text('Actividad', 260, activityY + 10, { width: 280 });
        
        activityY += 40;
        
        // Filas de la tabla, alternando colores
        sortedActivities.forEach((activity, i) => {
          // Color de fondo alternado para mejorar legibilidad
          const rowColor = i % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
          pdfDoc.rect(50, activityY - 5, 500, 30)
             .fill(rowColor);
          
          // Fecha formateada
          const activityDate = new Date(activity.date);
          const formattedDate = `${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          
          pdfDoc.fontSize(10)
             .fillColor('#333333')
             .text(formattedDate, 60, activityY, { width: 80 })
             .text(activity.authorName || 'Sistema', 150, activityY, { width: 100 })
             .text(activity.description, 260, activityY, { width: 280 });
          
          activityY += 30;
          
          // Si se acerca al final de la página, crear una nueva
          if (activityY > pdfDoc.page.height - 50) {
            pdfDoc.addPage();
            
            // Repetir encabezado de la tabla en la nueva página
            activityY = 70;
            pdfDoc.fontSize(12)
               .fillColor('#FFFFFF')
               .rect(50, activityY, 500, 30)
               .fill('#003366');
               
            pdfDoc.fillColor('#FFFFFF')
               .text('Fecha', 60, activityY + 10, { width: 80 })
               .text('Usuario', 150, activityY + 10, { width: 100 })
               .text('Actividad', 260, activityY + 10, { width: 280 });
            
            activityY += 40;
          }
        });
        
        // Si hay actividades con contenido extenso, mostrarlas después de la tabla
        const detailedActivities = sortedActivities.filter(act => act.content && act.content.length > 50);
        
        if (detailedActivities.length > 0) {
          pdfDoc.addPage();
          
          pdfDoc.fontSize(14)
             .fillColor('#003366')
             .text('DETALLE DE ACTIVIDADES RELEVANTES', { align: 'center' })
             .moveDown(1);
          
          let detailY = pdfDoc.y;
          
          detailedActivities.forEach((activity, i) => {
            pdfDoc.fontSize(12)
               .fillColor('#003366')
               .text(`${i+1}. ${activity.title || activity.description}`, 50, detailY)
               .moveDown(0.5);
            
            detailY = pdfDoc.y;
            
            pdfDoc.fontSize(10)
               .fillColor('#666666')
               .text(`Fecha: ${new Date(activity.date).toLocaleDateString()}`, 70, detailY)
               .moveDown(0.2);
            
            if (activity.authorName) {
              pdfDoc.text(`Usuario: ${activity.authorName}`, 70, pdfDoc.y)
                 .moveDown(0.5);
            }
            
            // Mostrar contenido detallado
            pdfDoc.fontSize(10)
               .fillColor('#333333')
               .text(activity.content, 70, pdfDoc.y, { 
                 width: 450,
                 align: 'justify'
               })
               .moveDown(1);
            
            detailY = pdfDoc.y;
            
            // Añadir línea separadora excepto en la última actividad
            if (i < detailedActivities.length - 1) {
              pdfDoc.moveTo(50, detailY)
                 .lineTo(550, detailY)
                 .stroke('#CCCCCC')
                 .moveDown(1);
              
              detailY = pdfDoc.y;
            }
            
            // Si nos acercamos al final de la página, crear una nueva
            if (detailY > pdfDoc.page.height - 100) {
              pdfDoc.addPage();
              detailY = 70; // Iniciar después del encabezado
            }
          });
        }
      }
      
      // Añadir página de firmas si se solicita
      if (exportOptions.generateSignaturePage) {
        pdfDoc.addPage();
        pdfDoc.fontSize(16)
           .fillColor('#003366')
           .text('PÁGINA DE FIRMAS', { align: 'center' })
           .moveDown(1);
        
        pdfDoc.fontSize(12)
           .fillColor('#333333')
           .text('Este documento ha sido generado electrónicamente y tiene validez legal.', { align: 'center' })
           .moveDown(2);
        
        // Añadir líneas para firmas
        const signaturesCount = 3;
        for (let i = 0; i < signaturesCount; i++) {
          const yPosition = pdfDoc.y + 50;
          
          // Línea para firma
          pdfDoc.moveTo(150, yPosition)
             .lineTo(450, yPosition)
             .stroke('#333333');
          
          // Texto debajo de la línea
          pdfDoc.fontSize(10)
             .fillColor('#666666')
             .text('Nombre y Cargo', 150, yPosition + 10, { width: 300, align: 'center' });
          
          pdfDoc.moveDown(3);
        }
      }
      
      // Finalizar el documento
      pdfDoc.end();
      
      // Esperar a que se complete la generación del PDF
      let pdfBuffer: Buffer;
      
      if (typeof window === 'undefined') {
        // Servidor: Esperar que termine y combinar chunks
        await new Promise<void>((resolve) => {
          pdfDoc.on('end', () => resolve());
        });
        
        // Combinar los chunks en un único buffer
        pdfBuffer = Buffer.concat(chunks);
      } else {
        // Navegador: Usar blob-stream
        await new Promise<void>((resolve) => {
          stream.on('finish', () => {
            // Obtener blob del stream
            blobData = stream.toBlob('application/pdf');
            resolve();
          });
        });
        
        // Convertir blob a ArrayBuffer y luego a Buffer
        const arrayBuffer = await blobData.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuffer);
      }
      
      // 4. Subir el PDF a Firebase Storage
      const fileRef = ref(storage, storagePath);
      
      // Crear un blob a partir del buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      
      // Subir el archivo a Firebase Storage
      const uploadTask = uploadBytes(fileRef, blob);
      
      // Esperar a que se complete la subida
      const snapshot = await uploadTask;
      
      // Obtener la URL de descarga
      const downloadURL = await getDownloadURL(fileRef);
      
      // Actualizar la exportación con la información final
      await updateDoc(exportRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        fileSize: pdfBuffer.length,
        downloadUrl: downloadURL,
        sections: sections,
        pageCount: pdfDoc.bufferedPageRange().count
      });
      
      // 5. Registrar la actividad de generación del expediente
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        {
          timestamp: serverTimestamp(),
          actionType: 'digital_file_export',
          description: `Expediente digital generado en formato ${exportOptions.format.toUpperCase()}`,
          actorId: exportOptions.userId,
          visibleToReporter: false,
          metadata: {
            fileType: exportOptions.format,
            itemCount: expediente.items.length,
            filename,
            exportId: exportRef.id,
            fileSize: pdfBuffer.length,
            isEncrypted: exportOptions.encryptWithPassword
          }
        }
      );
      
      return {
        success: true,
        fileUrl: downloadURL,
        fileName: filename,
        fileSize: pdfBuffer.length,
        exportId: exportRef.id
      };
    } catch (pdfError) {
      console.error('Error específico al generar PDF:', pdfError);
      
      // Actualizar el estado de la exportación a error
      await updateDoc(exportRef, {
        status: 'error',
        error: pdfError.message || 'Error al generar el PDF',
        errorDetails: JSON.stringify(pdfError)
      });
      
      throw pdfError;
    }
  } catch (error) {
    console.error('Error al generar expediente digital:', error);
    return {
      success: false,
      error: 'Error al generar el expediente digital: ' + (error.message || error)
    };
  }
}

/**
 * Genera un documento de índice y carátula del expediente digital
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @returns Información sobre el índice generado
 */
export async function generateDigitalFileIndex(
  companyId: string,
  reportId: string
): Promise<{
  success: boolean;
  indexData?: {
    reportCode: string;
    title: string;
    sections: Array<{
      title: string;
      items: Array<{
        title: string;
        id: string;
        folio?: string;
        date: string;
        type: string;
      }>;
    }>;
    metadata: {
      totalPages: number;
      totalItems: number;
      generatedDate: string;
      isKarinLaw: boolean;
    };
  };
  error?: string;
}> {
  try {
    // Obtener expediente digital
    const expedienteResult = await generateDigitalFile(companyId, reportId);
    
    if (!expedienteResult.success) {
      return {
        success: false,
        error: expedienteResult.error || 'Error al generar datos del expediente'
      };
    }
    
    const expediente = expedienteResult.digitalFile;
    
    // Crear estructura de índice
    const indexData = {
      reportCode: expediente.reportCode,
      title: `Expediente Digital: ${expediente.reportTitle}`,
      sections: [
        {
          title: 'Información General',
          items: [{
            title: `Caso ${expediente.reportCode}`,
            id: 'info_general',
            date: new Date().toISOString(),
            type: 'metadata'
          }]
        }
      ],
      metadata: {
        totalPages: 0,
        totalItems: expediente.items.length,
        generatedDate: new Date().toISOString(),
        isKarinLaw: expediente.metadata.isKarinLaw
      }
    };
    
    // Agrupar items por tipo/categoría
    const typeGroups = {
      document: { title: 'Documentos', items: [] },
      evidence: { title: 'Evidencias', items: [] },
      communication: { title: 'Comunicaciones', items: [] },
      activity: { title: 'Actividades', items: [] }
    };
    
    // Agrupar elementos por tipo
    expediente.items.forEach(item => {
      if (typeGroups[item.type]) {
        typeGroups[item.type].items.push({
          title: item.title,
          id: item.id,
          folio: item.folioNumber,
          date: item.date instanceof Date ? item.date.toISOString() : item.date.toString(),
          type: item.type
        });
      }
    });
    
    // Añadir secciones no vacías al índice
    Object.values(typeGroups).forEach(group => {
      if (group.items.length > 0) {
        indexData.sections.push({
          title: group.title,
          items: group.items
        });
      }
    });
    
    // Añadir línea de tiempo como sección especial
    if (expediente.summary?.timeline && expediente.summary.timeline.length > 0) {
      indexData.sections.push({
        title: 'Línea de Tiempo',
        items: expediente.summary.timeline.map((event, index) => ({
          title: event.event,
          id: `timeline_${index}`,
          date: event.date.toISOString(),
          type: 'timeline'
        }))
      });
    }
    
    // Calcular número aproximado de páginas (simulación)
    indexData.metadata.totalPages = 
      2 + // Carátula e índice
      Math.ceil(expediente.items.length / 4) + // ~4 items por página
      (expediente.summary?.timeline ? Math.ceil(expediente.summary.timeline.length / 10) : 0); // ~10 eventos por página
    
    return {
      success: true,
      indexData
    };
  } catch (error) {
    console.error('Error al generar índice del expediente:', error);
    return {
      success: false,
      error: 'Error al generar el índice del expediente digital'
    };
  }
}

/**
 * Obtiene el historial de exportaciones de expedientes digitales para un reporte
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @returns Lista de exportaciones realizadas
 */
export async function getDigitalFileExports(
  companyId: string,
  reportId: string
): Promise<{
  success: boolean;
  exports?: Array<{
    id: string;
    filename: string;
    createdAt: string;
    fileType: string;
    fileSize?: number;
    downloadUrl?: string;
    generatedBy: string;
    generatedByName?: string;
    status: 'processing' | 'completed' | 'error';
    options?: Record<string, any>;
  }>;
  error?: string;
}> {
  try {
    // Verificar que el reporte exista
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Obtener exportaciones
    const exportsRef = collection(db, `companies/${companyId}/reports/${reportId}/exports`);
    const exportsQuery = query(exportsRef, orderBy('createdAt', 'desc'));
    const exportsSnap = await getDocs(exportsQuery);
    
    // Transformar datos
    const exports = await Promise.all(exportsSnap.docs.map(async (exportDoc) => {
      const exportData = exportDoc.data();
      let generatedByName = 'Sistema';
      
      // Obtener nombre del usuario que generó el expediente
      if (exportData.generatedBy && exportData.generatedBy !== 'system') {
        try {
          const userResult = await getUserProfileById(companyId, exportData.generatedBy);
          if (userResult.success) {
            generatedByName = userResult.profile.displayName || userResult.profile.email;
          }
        } catch (error) {
          console.error('Error al obtener datos del generador:', error);
        }
      }
      
      return {
        id: exportDoc.id,
        filename: exportData.filename || `expediente_${Date.now()}.pdf`,
        createdAt: exportData.createdAt ? exportData.createdAt.toDate().toISOString() : new Date().toISOString(),
        fileType: (exportData.type || 'pdf_expediente').replace('expediente_', ''),
        fileSize: exportData.fileSize,
        downloadUrl: exportData.downloadUrl || `https://storage.googleapis.com/bucket-name/${exportData.storagePath}`,
        generatedBy: exportData.generatedBy || 'system',
        generatedByName,
        status: exportData.status || 'completed',
        options: exportData.options
      };
    }));
    
    return {
      success: true,
      exports
    };
  } catch (error) {
    console.error('Error al obtener exportaciones:', error);
    return {
      success: false,
      error: 'Error al obtener el historial de exportaciones'
    };
  }
}

/**
 * Añade una recomendación para seguimiento de la denuncia
 */
export async function addRecommendation(
    companyId: string,
    reportId: string,
    recommendationData: {
      action: string;
      assignedTo: string;
      dueDate: Date;
      priority: string;
      comments?: string;
    },
    userId: string
  ) {
    try {
      const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
      const reportSnap = await getDoc(reportRef);
  
      if (!reportSnap.exists()) {
        return {
          success: false,
          error: 'Denuncia no encontrada',
        };
      }
  
      // Crear referencia para las recomendaciones
      const recommendationsRef = collection(db, `companies/${companyId}/reports/${reportId}/recommendations`);
      
      // Preparar datos para guardar
      const dataToSave = {
        ...recommendationData,
        status: 'Pendiente',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        dueDate: Timestamp.fromDate(recommendationData.dueDate),
        evidence: '',
        completedAt: null,
        completedBy: null,
      };
      
      // Guardar recomendación
      const docRef = await addDoc(recommendationsRef, dataToSave);
      
      // Registrar actividad
      await addDoc(
        collection(db, `companies/${companyId}/reports/${reportId}/activities`),
        {
          timestamp: serverTimestamp(),
          actorId: userId,
          actionType: 'recommendation_created',
          description: `Nueva recomendación creada: ${recommendationData.action}`,
          visibleToReporter: false,
        }
      );

      // Obtener información del responsable
      const userResult = await getUserProfileById(companyId, recommendationData.assignedTo);
      if (userResult.success) {
    try {
    const reportData = reportSnap.data();

    // Enviar notificación al responsable asignado
    await notifyRecommendationDueSoon(
      companyId,
      reportId,
      reportData.code,
      docRef.id,
      recommendationData.action,
      recommendationData.dueDate,
      recommendationData.assignedTo,
      userResult.profile.email,

      // Para la notificación inicial, enviamos los días restantes
      Math.ceil((recommendationData.dueDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    );
  } catch (notificationError) {
    console.error('Error al notificar asignación de recomendación:', notificationError);
  }
}

      // Si la denuncia no está en estado "En Seguimiento", actualizarla
      const reportData = reportSnap.data();
      if (reportData.status === 'Resuelta') {
        await updateDoc(reportRef, {
          status: 'En Seguimiento',
          updatedAt: serverTimestamp(),
        });
        
        // Actualizar estadísticas
        await updateReportStats(companyId, 'Resuelta', 'En Seguimiento');
        
        // Registrar cambio de estado
        await addDoc(
          collection(db, `companies/${companyId}/reports/${reportId}/activities`),
          {
            timestamp: serverTimestamp(),
            actorId: userId,
            actionType: 'statusChange',
            description: 'Estado cambiado a: En Seguimiento',
            previousStatus: 'Resuelta',
            newStatus: 'En Seguimiento',
            visibleToReporter: true,
          }
        );
      }
      
      return {
        success: true,
        recommendationId: docRef.id,
      };
    } catch (error) {
      console.error('Error al añadir recomendación:', error);
      return {
        success: false,
        error: 'Error al añadir recomendación',
      };
    }
  }
  
  /**
   * Actualiza el estado de una recomendación
   */
  export async function updateRecommendation(
    companyId: string,
    reportId: string,
    recommendationId: string,
    updates: {
      status?: string;
      evidence?: string;
      comments?: string;
      updatedBy: string;
    }
  ) {
    try {
      const recommendationRef = doc(
        db, 
        `companies/${companyId}/reports/${reportId}/recommendations/${recommendationId}`
      );
      
      // Verificar si la recomendación existe
      const recommendationSnap = await getDoc(recommendationRef);
      if (!recommendationSnap.exists()) {
        return {
          success: false,
          error: 'Recomendación no encontrada',
        };
      }
      
      const currentData = recommendationSnap.data();
      const previousStatus = currentData.status;
      
      // Preparar datos para actualizar
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      // Si se está completando, agregar fecha de completado
      if (updates.status === 'Completado' && previousStatus !== 'Completado') {
        updateData.completedAt = serverTimestamp();
        updateData.completedBy = updates.updatedBy;
      }
      
      // Actualizar recomendación
      await updateDoc(recommendationRef, updateData);
      
      // Registrar actividad
      if (updates.status && updates.status !== previousStatus) {
        await addDoc(
          collection(db, `companies/${companyId}/reports/${reportId}/activities`),
          {
            timestamp: serverTimestamp(),
            actorId: updates.updatedBy,
            actionType: 'recommendation_status_change',
            description: `Estado de recomendación cambiado de ${previousStatus} a ${updates.status}`,
            visibleToReporter: false,
          }
        );
      }

      // Si se completa, notificar a los administradores
if (updates.status === 'Completado') {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      const reportData = reportSnap.data();
      const userResult = await getUserProfileById(companyId, currentData.assignedTo);
      
      if (userResult.success) {
        // Buscar todos los administradores
        const usersRef = collection(db, `companies/${companyId}/users`);
        const q = query(usersRef, where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Notificar a cada administrador
          querySnapshot.docs.forEach(async (adminDoc) => {
            const adminData = adminDoc.data();
            
            await createNotification(companyId, {
              recipient: adminData.email,
              type: 'recommendation_completed',
              title: `Recomendación completada: ${currentData.action}`,
              content: `
                <p>La siguiente recomendación ha sido completada:</p>
                <ul>
                  <li>Recomendación: ${currentData.action}</li>
                  <li>Código de denuncia: ${reportData.code}</li>
                  <li>Responsable: ${userResult.profile.displayName}</li>
                </ul>
                <p>Puede revisar la evidencia y detalles en el sistema.</p>
              `,
              reportId,
              reportCode: reportData.code,
              recommendationId,
              userId: adminDoc.id
            });
          });
        }
      }
    }
  } catch (notificationError) {
    console.error('Error al notificar completado de recomendación:', notificationError);
  }
}
      
      // Comprobar si todas las recomendaciones están completadas
      const allRecommendationsRef = collection(db, `companies/${companyId}/reports/${reportId}/recommendations`);
      const allRecommendationsSnap = await getDocs(allRecommendationsRef);
      
      let allCompleted = true;
      allRecommendationsSnap.forEach(doc => {
        const data = doc.data();
        if (doc.id === recommendationId) {
          if (updates.status !== 'Completado') allCompleted = false;
        } else {
          if (data.status !== 'Completado') allCompleted = false;
        }
      });
      
      // Si todas están completadas, actualizar estado de la denuncia a "Cerrada"
      if (allCompleted && allRecommendationsSnap.size > 0) {
        const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
        const reportSnap = await getDoc(reportRef);
        if (reportSnap.exists()) {
          const reportData = reportSnap.data();
          if (reportData.status === 'En Seguimiento') {
            await updateDoc(reportRef, {
              status: 'Cerrada',
              updatedAt: serverTimestamp(),
            });
            
            // Actualizar estadísticas
            await updateReportStats(companyId, 'En Seguimiento', 'Cerrada');
            
            // Registrar cambio de estado
            await addDoc(
              collection(db, `companies/${companyId}/reports/${reportId}/activities`),
              {
                timestamp: serverTimestamp(),
                actorId: updates.updatedBy,
                actionType: 'statusChange',
                description: 'Estado cambiado a: Cerrada',
                previousStatus: 'En Seguimiento',
                newStatus: 'Cerrada',
                visibleToReporter: true,
                comment: 'Todas las recomendaciones han sido completadas',
              }
            );
      
      // Notificar cierre al denunciante (si no es anónimo)
      try {
        if (!reportData.reporter?.isAnonymous && reportData.reporter?.contactInfo?.email) {
      await notifyReportClosed(
      companyId,
      reportId,
      reportData.code,
      reportData.reporter.contactInfo.email
    );
  }
  } catch (notificationError) {
  console.error('Error al notificar cierre al denunciante:', notificationError);
  }

      }
    }
  }
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error al actualizar recomendación:', error);
      return {
        success: false,
        error: 'Error al actualizar recomendación',
      };
    }
  }
  
  /**
   * Obtiene las denuncias en estado de seguimiento
   */
  export async function getReportsInFollowUp(
    companyId: string,
    userRole?: string | null,
    userId?: string | null
  ) {
    try {
      // VERIFICACIÓN CRÍTICA DE AISLAMIENTO DE DATOS:
      // Si es admin pero NO super_admin, SOLO puede ver su propia compañía
      if (userRole === 'admin' && userId) {
        // Obtener el perfil del usuario para verificar a qué compañía pertenece
        try {
          const userRef = doc(db, `companies/${companyId}/users/${userId}`);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            // Si el usuario pertenece a otra compañía, bloquear el acceso
            if (userData.company && userData.company !== companyId) {
              console.error(`⚠️ ALERTA DE SEGURIDAD: Usuario admin ${userId} intentó acceder a compañía ${companyId} pero pertenece a ${userData.company}`);
              return {
                success: false,
                error: 'No tiene permiso para acceder a los datos de esta compañía',
                reports: []
              };
            }
          }
        } catch (error) {
          console.error('Error al verificar el perfil del usuario:', error);
          // En caso de error, permitimos continuar pero con un warning
          console.warn('No se pudo verificar el aislamiento multi-tenant, se permite acceso con precaución');
        }
      }

      const reportsRef = collection(db, `companies/${companyId}/reports`);
      const q = query(
        reportsRef,
        where('status', 'in', ['Resuelta', 'En Seguimiento']),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: true, reports: [] };
      }
      
      // Procesar los documentos para obtener los datos
      const reports = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const reportId = doc.id;
        
        // Obtener recomendaciones para cada denuncia
        const recommendationsRef = collection(db, `companies/${companyId}/reports/${reportId}/recommendations`);
        const recommendationsSnap = await getDocs(recommendationsRef);
        const recommendations = recommendationsSnap.docs.map(rec => ({
          id: rec.id,
          ...rec.data(),
        }));
        
        // Si hay un investigador asignado, obtener su nombre
        let assignedToName = undefined;
        if (data.assignedTo) {
          const userResult = await getUserProfileById(companyId, data.assignedTo);
          if (userResult.success) {
            assignedToName = userResult.profile.displayName;
          }
        }
        
        return {
          id: reportId,
          ...data,
          assignedToName,
          recommendations,
          progress: calculateProgress(recommendations),
        };
      }));
      
      return {
        success: true,
        reports,
      };
    } catch (error) {
      console.error('Error al obtener denuncias en seguimiento:', error);
      return {
        success: false,
        error: 'Error al obtener denuncias en seguimiento',
      };
    }
  }
  
  /**
 * Obtiene las recomendaciones para una denuncia específica con nombres de usuarios
 */
export async function getRecommendations(companyId: string, reportId: string) {
  try {
    console.log('Obteniendo recomendaciones para:', { companyId, reportId });
    const recommendationsRef = collection(db, `companies/${companyId}/reports/${reportId}/recommendations`);
    
    // Ordenar por fecha de creación (descendente)
    const q = query(recommendationsRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No se encontraron recomendaciones');
      return { success: true, recommendations: [] };
    }
    
    // Convertir documentos a formato usable y añadir nombres a los IDs
    const recommendations = await Promise.all(querySnapshot.docs.map(async doc => {
      const data = doc.data();
      
      // Buscar el nombre del responsable si solo tenemos su ID
      let assignedToName = data.assignedTo;
      if (typeof data.assignedTo === 'string' && data.assignedTo.length > 0) {
        try {
          // Si parece ser un ID de usuario, buscar su nombre
          if (data.assignedTo.length > 10) { // Los IDs suelen ser bastante largos
            const userResult = await getUserProfileById(companyId, data.assignedTo);
            if (userResult.success && userResult.profile) {
              assignedToName = userResult.profile.displayName || userResult.profile.email || data.assignedTo;
            }
          }
        } catch (error) {
          console.error('Error al buscar nombre de usuario:', error);
          // Si hay error, mantener el valor original
        }
      }

      // Buscar el nombre del creador si tenemos su ID
      let createdByName = data.createdBy || 'Sistema';
      if (typeof data.createdBy === 'string' && data.createdBy.length > 10) {
        try {
          const userResult = await getUserProfileById(companyId, data.createdBy);
          if (userResult.success && userResult.profile) {
            createdByName = userResult.profile.displayName || userResult.profile.email || data.createdBy;
          }
        } catch (error) {
          console.error('Error al buscar nombre de creador:', error);
        }
      }
      
      // Añadir nombres resueltos al objeto de recomendación
      return {
        id: doc.id,
        ...data,
        assignedToName, // Añadir nombre resuelto
        assignedToId: data.assignedTo, // Mantener el ID original
        createdByName, // Añadir nombre del creador resuelto
      };
    }));
    
    console.log(`Recomendaciones encontradas: ${recommendations.length}`);
    return { success: true, recommendations };
  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
    return {
      success: false,
      error: 'Error al obtener las recomendaciones',
    };
  }
}

  /**
   * Calcular el porcentaje de progreso basado en recomendaciones completadas
   */
  function calculateProgress(recommendations: any[]) {
    if (!recommendations || recommendations.length === 0) {
      return 0;
    }
    
    const total = recommendations.length;
    const completed = recommendations.filter(rec => rec.status === 'Completado').length;
    
    return Math.round((completed / total) * 100);
  }

/**
 * Elimina una denuncia y todos sus datos asociados
 * Esta función es solo para administradores
 * @param companyId ID de la empresa
 * @param reportId ID del reporte a eliminar
 * @returns Resultado de la operación
 */
export async function deleteReport(
  companyId: string,
  reportId: string,
  userRole?: string | null,
  userId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!companyId || !reportId) {
      console.error('deleteReport: missing parameters', { companyId, reportId });
      return {
        success: false,
        error: 'Parámetros incompletos para eliminar la denuncia'
      };
    }

    // VERIFICACIÓN CRÍTICA DE AISLAMIENTO DE DATOS:
    // Si es admin pero NO super_admin, SOLO puede ver su propia compañía
    if (userRole === 'admin' && userId) {
      // Obtener el perfil del usuario para verificar a qué compañía pertenece
      try {
        const userRef = doc(db, `companies/${companyId}/users/${userId}`);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          // Si el usuario pertenece a otra compañía, bloquear el acceso
          if (userData.company && userData.company !== companyId) {
            console.error(`⚠️ ALERTA DE SEGURIDAD: Usuario admin ${userId} intentó eliminar denuncia de compañía ${companyId} pero pertenece a ${userData.company}`);
            return {
              success: false,
              error: 'No tiene permiso para eliminar datos de esta compañía'
            };
          }
        }
      } catch (error) {
        console.error('Error al verificar el perfil del usuario:', error);
        // En caso de error, RECHAZAMOS LA OPERACIÓN por seguridad
        return {
          success: false,
          error: 'Error de seguridad al verificar permisos. Operación abortada.'
        };
      }
    }

    console.log(`Intentando eliminar denuncia: companies/${companyId}/reports/${reportId}`);
    
    // Obtener la denuncia primero para verificar su existencia y datos
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      console.error(`La denuncia ${reportId} no existe`);
      return {
        success: false,
        error: 'La denuncia no existe'
      };
    }
    
    // Recopilar información para actualizar estadísticas
    const reportData = reportSnap.data();
    const status = reportData.status || 'unknown';
    const category = reportData.category || 'unknown';
    
    // 1. Eliminar todas las subcollecciones
    // 1.1 Eliminar evidencias
    const evidencesSnapshot = await getDocs(
      collection(db, `companies/${companyId}/reports/${reportId}/evidence`)
    );
    for (const evidenceDoc of evidencesSnapshot.docs) {
      await deleteDoc(evidenceDoc.ref);
    }
    
    // 1.2 Eliminar acusados
    const accusedSnapshot = await getDocs(
      collection(db, `companies/${companyId}/reports/${reportId}/accused`)
    );
    for (const accusedDoc of accusedSnapshot.docs) {
      await deleteDoc(accusedDoc.ref);
    }
    
    // 1.3 Eliminar actividades
    const activitiesSnapshot = await getDocs(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`)
    );
    for (const activityDoc of activitiesSnapshot.docs) {
      await deleteDoc(activityDoc.ref);
    }
    
    // 1.4 Eliminar comunicaciones
    const communicationsSnapshot = await getDocs(
      collection(db, `companies/${companyId}/reports/${reportId}/communications`)
    );
    for (const communicationDoc of communicationsSnapshot.docs) {
      await deleteDoc(communicationDoc.ref);
    }
    
    // 1.5 Eliminar recomendaciones
    const recommendationsSnapshot = await getDocs(
      collection(db, `companies/${companyId}/reports/${reportId}/recommendations`)
    );
    for (const recommendationDoc of recommendationsSnapshot.docs) {
      await deleteDoc(recommendationDoc.ref);
    }
    
    // 2. Finalmente, eliminar la denuncia principal
    await deleteDoc(reportRef);
    
    // 3. Actualizar estadísticas (decrementar)
    try {
      const statsRef = doc(db, `companies/${companyId}/stats/reports`);
      
      await updateDoc(statsRef, {
        totalReports: increment(-1),
        [`byStatus.${status}`]: increment(-1),
        [`byCategory.${category}`]: increment(-1),
        updated: serverTimestamp(),
      });
    } catch (statsError) {
      // No fallar si hay error al actualizar estadísticas
      console.error('Error al actualizar estadísticas:', statsError);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar denuncia:', error);
    return {
      success: false,
      error: 'Error al eliminar la denuncia'
    };
  }
}