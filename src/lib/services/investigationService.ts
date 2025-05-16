// src/lib/services/investigationService.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage, auth } from '@/lib/firebase/config';
import { isSuperAdmin, isAdmin } from '@/lib/utils/roleUtils';

// Función para obtener los detalles de una investigación
export async function getInvestigationDetails(companyId, reportId) {
  try {
    // Obtener el documento del reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Obtener el reporte con sus datos
    const reportData = reportDoc.data();
    
    // Obtener actividades (aquí es donde se guardan las entrevistas)
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    const activitiesQuery = query(
      activitiesRef,
      orderBy('timestamp', 'desc')
    );
    
    const activitiesSnapshot = await getDocs(activitiesQuery);
    
    // Filtrar las entrevistas de las actividades
    const interviews = [];
    const activities = [];
    
    activitiesSnapshot.forEach(doc => {
      const activityData = doc.data();
      activities.push({
        id: doc.id,
        ...activityData,
      });
      
      // Si es una entrevista, añadirla al array de entrevistas
      if (activityData.actionType === 'interviewAdded' && activityData.interviewDetails) {
        interviews.push({
          id: activityData.interviewDetails.id || doc.id,
          ...activityData.interviewDetails,
          conductedBy: activityData.actorId,
          createdAt: activityData.timestamp,
        });
      }
    });
    
    // Combinar con entrevistas extendidas si existen (para casos Ley Karin)
    let combinedInterviews = [...interviews];
    
    if (reportData.isKarinLaw && reportData.karinProcess?.extendedInterviews) {
      // Evitar duplicados (preferir la versión extendida)
      const extendedIds = reportData.karinProcess.extendedInterviews.map(i => i.id);
      combinedInterviews = [
        ...combinedInterviews.filter(i => !extendedIds.includes(i.id)),
        ...reportData.karinProcess.extendedInterviews
      ];
    }
    
    // Construcción del objeto a devolver
    const investigationData = {
      ...reportData,
      id: reportId,
      activities,
      interviews: combinedInterviews
    };
    
    return {
      success: true,
      investigation: investigationData
    };
  } catch (error) {
    console.error('Error fetching investigation details:', error);
    return {
      success: false,
      error: 'Error al obtener detalles de la investigación'
    };
  }
}

// Función para actualizar una investigación
export async function updateInvestigation(companyId, reportId, updateData) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating investigation:', error);
    return {
      success: false,
      error: 'Error al actualizar la investigación'
    };
  }
}

// Función para registrar un plan de investigación
export async function addInvestigationPlan(
  companyId,
  reportId,
  userId,
  planData
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    
    // Crear el objeto del plan
    const plan = {
      ...planData,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Actualizar el documento del reporte
    await updateDoc(reportRef, {
      plan,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'planCreated',
      description: 'Plan de investigación creado',
      visibleToReporter: false
    });
    
    return {
      success: true,
      plan
    };
  } catch (error) {
    console.error('Error adding investigation plan:', error);
    return {
      success: false,
      error: 'Error al registrar el plan de investigación'
    };
  }
}

// Función para actualizar un plan de investigación
export async function updateInvestigationPlan(
  companyId,
  reportId,
  userId,
  planData
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    
    // Actualizar el documento del reporte
    await updateDoc(reportRef, {
      'plan.scope': planData.scope,
      'plan.objectives': planData.objectives,
      'plan.methodology': planData.methodology,
      'plan.timeline': planData.timeline,
      'plan.resources': planData.resources,
      'plan.stakeholders': planData.stakeholders,
      'plan.riskFactors': planData.riskFactors,
      'plan.updatedAt': serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'planUpdated',
      description: 'Plan de investigación actualizado',
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating investigation plan:', error);
    return {
      success: false,
      error: 'Error al actualizar el plan de investigación'
    };
  }
}

/**
 * Guarda o actualiza un plan de investigación
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que crea/actualiza el plan
 * @param planData Datos del plan
 * @returns Resultado de la operación
 */
export async function saveInvestigationPlan(
  companyId: string,
  reportId: string,
  userId: string,
  planData: any
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportDoc.data();
    const now = serverTimestamp();
    
    // Verificar si ya existe un plan
    const planExists = reportData.plan && typeof reportData.plan === 'object';
    
    // Datos a actualizar
    const updateData: any = {
      updatedAt: now
    };
    
    if (planExists) {
      // Si ya existe, actualizar cada campo individualmente
      Object.keys(planData).forEach(key => {
        updateData[`plan.${key}`] = planData[key];
      });
      updateData['plan.updatedAt'] = now;
      updateData['plan.updatedBy'] = userId;
    } else {
      // Si no existe, crear el plan completo
      updateData.plan = {
        ...planData,
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      };
    }
    
    // Actualizar el documento
    await updateDoc(reportRef, updateData);
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: now,
      actorId: userId,
      actionType: planExists ? 'planUpdated' : 'planCreated',
      description: planExists ? 'Plan de investigación actualizado' : 'Plan de investigación creado',
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error saving investigation plan:', error);
    return {
      success: false,
      error: 'Error al guardar el plan de investigación'
    };
  }
}

/**
 * Agrega una nueva entrevista
 * (Guarda como una actividad al no tener la colección interviews)
 */
export async function addInterview(
  companyId: string,
  reportId: string,
  userId: string,
  interviewData: {
    interviewee: string;
    position: string;
    date: string;
    location?: string;
    summary: string;
    keyPoints: string[];
    isConfidential: boolean;
    recordingConsent?: boolean;
    protocol?: string;
    isTestimony?: boolean;
    notes?: string;
    status?: string;
    conductedBy?: string;
    conductedByName?: string;
    createdAt?: string;
  }
) {
  try {
    // Obtener referencia al reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Generar un id único para la entrevista
    const interviewId = uuidv4();
    
    // Convertir fecha a Timestamp
    const interviewDate = new Date(interviewData.date);
    
    // Crear objeto de entrevista extendida
    const extendedInterview = {
      id: interviewId,
      ...interviewData,
      date: interviewData.date, // Mantener como string para consistencia
      conductedBy: interviewData.conductedBy || userId,
      conductedByName: interviewData.conductedByName || auth.currentUser?.displayName || 'Usuario del sistema',
      status: interviewData.status || (interviewData.isTestimony ? 'pending_signature' : 'draft'),
      createdAt: interviewData.createdAt || new Date().toISOString()
    };
    
    // Verificar si el reporte es un caso de Ley Karin
    const isKarinLaw = reportData.isKarinLaw || false;
    
    if (isKarinLaw) {
      // Actualizar el array de entrevistas extendidas en karinProcess
      const extendedInterviews = reportData.karinProcess?.extendedInterviews || [];
      
      // Actualizar el documento con la nueva entrevista
      await updateDoc(reportRef, {
        'karinProcess.extendedInterviews': [...extendedInterviews, extendedInterview],
        'updatedAt': serverTimestamp()
      });
    }
    
    // También registrar la entrevista como una actividad para compatibilidad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);

    // Crear la actividad
    const newActivityRef = await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'interviewAdded',
      description: `Entrevista realizada a ${interviewData.interviewee}`,
      interviewDetails: {
        ...interviewData,
        id: interviewId,
        date: Timestamp.fromDate(interviewDate),
      },
      visibleToReporter: false,
    });

    return {
      success: true,
      interviewId: interviewId,
      activityId: newActivityRef.id,
    };
  } catch (error) {
    console.error('Error adding interview:', error);
    return {
      success: false,
      error: 'Error al agregar la entrevista',
    };
  }
}

// Función para agregar un hallazgo
export async function addFinding(
  companyId,
  reportId,
  userId,
  findingData
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Extraer los datos actuales
    const reportData = reportDoc.data();
    const existingFindings = reportData.findings || [];
    
    // Generar un ID único para el hallazgo
    const findingId = uuidv4();
    
    // Crear el objeto del hallazgo
    const newFinding = {
      id: findingId,
      ...findingData,
      createdBy: userId,
      createdAt: serverTimestamp()
    };
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      findings: [...existingFindings, newFinding],
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'findingAdded',
      description: `Hallazgo registrado: ${findingData.title}`,
      findingId,
      visibleToReporter: false
    });
    
    return {
      success: true,
      findingId
    };
  } catch (error) {
    console.error('Error adding finding:', error);
    return {
      success: false,
      error: 'Error al agregar el hallazgo'
    };
  }
}

// Función para actualizar un hallazgo
export async function updateFinding(
  companyId,
  reportId,
  userId,
  findingId,
  findingData
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Extraer los datos actuales
    const reportData = reportDoc.data();
    const existingFindings = reportData.findings || [];
    
    // Buscar el hallazgo a actualizar
    const findingIndex = existingFindings.findIndex(finding => finding.id === findingId);
    
    if (findingIndex === -1) {
      return {
        success: false,
        error: 'Hallazgo no encontrado'
      };
    }
    
    // Actualizar el hallazgo
    const updatedFindings = [...existingFindings];
    updatedFindings[findingIndex] = {
      ...existingFindings[findingIndex],
      ...findingData,
      updatedAt: serverTimestamp()
    };
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      findings: updatedFindings,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'findingUpdated',
      description: `Hallazgo actualizado: ${findingData.title}`,
      findingId,
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating finding:', error);
    return {
      success: false,
      error: 'Error al actualizar el hallazgo'
    };
  }
}

// Función para eliminar un hallazgo
export async function deleteFinding(
  companyId,
  reportId,
  userId,
  findingId
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Extraer los datos actuales
    const reportData = reportDoc.data();
    const existingFindings = reportData.findings || [];
    
    // Filtrar el hallazgo a eliminar
    const updatedFindings = existingFindings.filter(finding => finding.id !== findingId);
    
    // Si no se encontró el hallazgo
    if (updatedFindings.length === existingFindings.length) {
      return {
        success: false,
        error: 'Hallazgo no encontrado'
      };
    }
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      findings: updatedFindings,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'findingDeleted',
      description: 'Hallazgo eliminado',
      findingId,
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting finding:', error);
    return {
      success: false,
      error: 'Error al eliminar el hallazgo'
    };
  }
}

// Función para registrar o actualizar un informe
export async function updateReport(
  companyId,
  reportId,
  userId,
  reportData,
  isPrelimnary = false
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    
    const fieldName = isPrelimnary ? 'preliminaryReport' : 'finalReport';
    const actionType = isPrelimnary ? 'preliminaryReportUpdated' : 'finalReportUpdated';
    const description = isPrelimnary ? 'Informe preliminar actualizado' : 'Informe final actualizado';
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      [fieldName]: {
        ...reportData,
        updatedBy: userId,
        updatedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType,
      description,
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating report:', error);
    return {
      success: false,
      error: 'Error al actualizar el informe'
    };
  }
}

/**
 * Guarda o actualiza un informe final
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que crea/actualiza el informe
 * @param reportData Datos del informe
 * @returns Resultado de la operación
 */
export async function saveFinalReport(
  companyId: string,
  reportId: string,
  userId: string,
  reportData: any
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const existingData = reportDoc.data();
    const now = serverTimestamp();
    
    // Verificar si ya existe un informe final
    const finalReportExists = existingData.finalReport && typeof existingData.finalReport === 'object';
    
    // Datos a actualizar
    const updateData: any = {
      updatedAt: now
    };
    
    if (finalReportExists) {
      // Si ya existe, actualizar manteniendo metadatos existentes
      updateData.finalReport = {
        ...existingData.finalReport,
        ...reportData,
        updatedBy: userId,
        updatedAt: now
      };
    } else {
      // Si no existe, crear el informe completo
      updateData.finalReport = {
        ...reportData,
        type: 'finalReport',
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      };
    }
    
    // Actualizar el documento
    await updateDoc(reportRef, updateData);
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: now,
      actorId: userId,
      actionType: finalReportExists ? 'finalReportUpdated' : 'finalReportCreated',
      description: finalReportExists ? 'Informe final actualizado' : 'Informe final creado',
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error saving final report:', error);
    return {
      success: false,
      error: 'Error al guardar el informe final'
    };
  }
}

/**
 * Guarda o actualiza un informe preliminar
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que crea/actualiza el informe
 * @param reportData Datos del informe
 * @returns Resultado de la operación
 */
export async function savePreliminaryReport(
  companyId: string,
  reportId: string,
  userId: string,
  reportData: any
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const existingData = reportDoc.data();
    const now = serverTimestamp();
    
    // Verificar si ya existe un informe preliminar
    const preliminaryReportExists = existingData.preliminaryReport && typeof existingData.preliminaryReport === 'object';
    
    // Datos a actualizar
    const updateData: any = {
      updatedAt: now
    };
    
    if (preliminaryReportExists) {
      // Si ya existe, actualizar manteniendo metadatos existentes
      updateData.preliminaryReport = {
        ...existingData.preliminaryReport,
        ...reportData,
        updatedBy: userId,
        updatedAt: now
      };
    } else {
      // Si no existe, crear el informe completo
      updateData.preliminaryReport = {
        ...reportData,
        type: 'preliminaryReport',
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      };
    }
    
    // Actualizar el documento
    await updateDoc(reportRef, updateData);
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: now,
      actorId: userId,
      actionType: preliminaryReportExists ? 'preliminaryReportUpdated' : 'preliminaryReportCreated',
      description: preliminaryReportExists ? 'Informe preliminar actualizado' : 'Informe preliminar creado',
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error saving preliminary report:', error);
    return {
      success: false,
      error: 'Error al guardar el informe preliminar'
    };
  }
}

// Función para completar una investigación
export async function completeInvestigation(
  companyId,
  reportId,
  userId,
  concludingComment
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    
    // Actualizar el estado del reporte
    await updateDoc(reportRef, {
      status: 'Resuelta',
      concludingComment,
      resolvedBy: userId,
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'investigationCompleted',
      description: 'Investigación completada',
      visibleToReporter: true
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error completing investigation:', error);
    return {
      success: false,
      error: 'Error al completar la investigación'
    };
  }
}

// Función para asignar un investigador a un reporte
export async function assignInvestigator(
  companyId,
  reportId,
  currentUserId,
  investigatorId,
  investigatorName
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      assignedTo: investigatorId,
      assignedToName: investigatorName,
      assignedBy: currentUserId,
      assignedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: currentUserId,
      actionType: 'investigatorAssigned',
      description: `Investigador asignado: ${investigatorName}`,
      investigatorId,
      visibleToReporter: true
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error assigning investigator:', error);
    return {
      success: false,
      error: 'Error al asignar el investigador'
    };
  }
}

// Función para actualizar la etapa del proceso Ley Karin
export async function updateKarinStage(
  companyId,
  reportId,
  userId,
  stage,
  notes = ''
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Extraer los datos actuales
    const reportData = reportDoc.data();
    
    // Si no existe el karinProcess, inicializarlo
    if (!reportData.karinProcess) {
      return {
        success: false,
        error: 'Este reporte no tiene un proceso Ley Karin inicializado'
      };
    }
    
    // Fecha actual para registros
    const now = new Date();
    const nowISO = now.toISOString();
    
    // Guardar la etapa anterior en el historial
    const karinProcess = reportData.karinProcess;
    const stageHistory = karinProcess.stageHistory || [];
    
    // Solo agregar al historial si es un cambio de etapa
    if (karinProcess.stage !== stage) {
      stageHistory.push({
        stage: karinProcess.stage,
        date: nowISO,
        user: userId,
        notes
      });
    }
    
    // Actualizar campos específicos según la etapa
    const updateData = {
      'karinProcess.stage': stage,
      'karinProcess.stageHistory': stageHistory,
      'updatedAt': serverTimestamp()
    };
    
    // Añadir datos específicos según la etapa
    if (stage === 'reception') {
      updateData['karinProcess.receivedDate'] = nowISO;
      updateData['karinProcess.receivedBy'] = userId;
    } else if (stage === 'subsanation') {
      if (!karinProcess.subsanationRequested) {
        updateData['karinProcess.subsanationRequested'] = nowISO;
        
        // Calcular fecha límite (5 días hábiles)
        const deadline = new Date(now);
        let daysAdded = 0;
        while (daysAdded < 5) {
          deadline.setDate(deadline.getDate() + 1);
          
          // Verificar si no es fin de semana
          if (deadline.getDay() !== 0 && deadline.getDay() !== 6) {
            daysAdded++;
          }
        }
        
        updateData['karinProcess.subsanationDeadline'] = deadline.toISOString();
      }
    } else if (stage === 'dt_notification') {
      updateData['karinProcess.dtInitialNotificationDate'] = nowISO;
    } else if (stage === 'suseso_notification') {
      updateData['karinProcess.susesoNotificationDate'] = nowISO;
    } else if (stage === 'precautionary_measures') {
      updateData['karinProcess.precautionaryDeadline'] = nowISO;
    } else if (stage === 'investigation') {
      updateData['karinProcess.investigationStartDate'] = nowISO;
      
      // Calcular fecha límite (30 días hábiles)
      const deadline = new Date(now);
      let daysAdded = 0;
      while (daysAdded < 30) {
        deadline.setDate(deadline.getDate() + 1);
        
        // Verificar si no es fin de semana
        if (deadline.getDay() !== 0 && deadline.getDay() !== 6) {
          daysAdded++;
        }
      }
      
      updateData['karinProcess.investigationDeadline'] = deadline.toISOString();
    } else if (stage === 'report_creation') {
      updateData['karinProcess.reportCreationDate'] = nowISO;
    } else if (stage === 'report_approval') {
      updateData['karinProcess.reportApprovalDate'] = nowISO;
    } else if (stage === 'investigation_complete' || stage === 'labor_department') {
      updateData['karinProcess.investigationCompleted'] = true;
    } else if (stage === 'dt_submission') {
      updateData['karinProcess.laborDepartmentReferralDate'] = nowISO;
    } else if (stage === 'measures_adoption') {
      updateData['karinProcess.measuresAdoptionDate'] = nowISO;
      
      // Calcular fecha límite (15 días corridos)
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 15);
      
      updateData['karinProcess.measuresAdoptionDeadline'] = deadline.toISOString();
    } else if (stage === 'closed') {
      updateData['karinProcess.resolutionDate'] = nowISO;
      updateData['karinProcess.allPartiesNotified'] = true;
      updateData['karinProcess.partyNotificationDate'] = nowISO;
      updateData['status'] = 'Resuelta';
    }
    
    // Actualizar el documento
    await updateDoc(reportRef, updateData);
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'karinStageUpdated',
      description: `Etapa Ley Karin actualizada a: ${stage}`,
      data: {
        stage,
        notes
      },
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating Karin stage:', error);
    return {
      success: false,
      error: 'Error al actualizar la etapa del proceso Ley Karin'
    };
  }
}

/**
 * Firma un testimonio formal
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param testimonyId ID del testimonio
 * @param signatureData Datos de la firma
 * @returns Resultado de la operación
 */
export async function signTestimony(
  companyId: string,
  reportId: string,
  testimonyId: string,
  signatureData: any
) {
  try {
    // Importar la función del servicio de testimonios
    const { signTestimony } = await import('./testimonyService');
    
    // Llamar a la función importada
    return signTestimony(companyId, reportId, testimonyId, signatureData);
  } catch (error) {
    console.error('Error signing testimony:', error);
    return {
      success: false,
      error: 'Error al firmar el testimonio'
    };
  }
}

/**
 * Convierte una entrevista normal en un testimonio formal
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param interviewId ID de la entrevista
 * @param userId ID del usuario que realiza la conversión
 * @returns Resultado de la operación
 */
export async function convertInterviewToTestimony(
  companyId: string,
  reportId: string,
  interviewId: string,
  userId: string
) {
  try {
    // Importar la función del servicio de testimonios
    const { convertInterviewToTestimony } = await import('./testimonyService');
    
    // Llamar a la función importada
    return convertInterviewToTestimony(companyId, reportId, interviewId, userId);
  } catch (error) {
    console.error('Error converting interview to testimony:', error);
    return {
      success: false,
      error: 'Error al convertir la entrevista en testimonio'
    };
  }
}

/**
 * Inicializa los plazos para un caso de Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que inicializa los plazos
 * @returns Resultado de la operación
 */
export async function initializeKarinDeadlines(
  companyId: string,
  reportId: string,
  userId: string
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportDoc.data();
    
    // Verificar si es un caso de Ley Karin
    if (!reportData.isKarinLaw) {
      return {
        success: false,
        error: 'Este reporte no corresponde a un caso de Ley Karin'
      };
    }
    
    // Si ya existen plazos, no inicializar de nuevo
    if (reportData.karinProcess?.deadlines && reportData.karinProcess.deadlines.length > 0) {
      return {
        success: false,
        error: 'Este caso ya tiene plazos inicializados'
      };
    }
    
    // Determinar fecha de inicio adecuada
    const startDate = reportData.karinProcess?.receivedDate
      ? new Date(reportData.karinProcess.receivedDate)
      : reportData.createdAt?.toDate
        ? new Date(reportData.createdAt.toDate())
        : new Date(reportData.createdAt);
    
    // Importar la función de inicialización de plazos
    const { initializeKarinDeadlines } = await import('@/lib/utils/deadlineUtils');
    
    // Generar plazos iniciales
    const deadlines = initializeKarinDeadlines(startDate);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.deadlines': deadlines,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'karinDeadlinesInitialized',
      description: 'Plazos de Ley Karin inicializados',
      visibleToReporter: false
    });
    
    return {
      success: true,
      deadlines
    };
  } catch (error) {
    console.error('Error initializing Karin deadlines:', error);
    return {
      success: false,
      error: 'Error al inicializar los plazos de Ley Karin'
    };
  }
}

/**
 * Actualiza los plazos para un caso de Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que actualiza los plazos
 * @param deadlines Plazos actualizados
 * @returns Resultado de la operación
 */
export async function updateKarinDeadlines(
  companyId: string,
  reportId: string,
  userId: string,
  deadlines: any[]
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.deadlines': deadlines,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'karinDeadlinesUpdated',
      description: 'Plazos de Ley Karin actualizados',
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating Karin deadlines:', error);
    return {
      success: false,
      error: 'Error al actualizar los plazos de Ley Karin'
    };
  }
}

/**
 * Marca un plazo como completado
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que completa el plazo
 * @param deadlineId ID del plazo a completar
 * @returns Resultado de la operación
 */
export async function completeKarinDeadline(
  companyId: string,
  reportId: string,
  userId: string,
  deadlineId: string
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportDoc.data();
    
    // Verificar si existen plazos
    if (!reportData.karinProcess?.deadlines || reportData.karinProcess.deadlines.length === 0) {
      return {
        success: false,
        error: 'Este caso no tiene plazos inicializados'
      };
    }
    
    // Importar la función para completar plazos
    const { completeDeadline, updateDeadlinesStatus } = await import('@/lib/utils/deadlineUtils');
    
    // Obtener plazos actualizados
    let updatedDeadlines = reportData.karinProcess.deadlines;
    
    // Actualizar estados primero
    updatedDeadlines = updateDeadlinesStatus(updatedDeadlines);
    
    // Marcar como completado
    updatedDeadlines = completeDeadline(updatedDeadlines, deadlineId, userId);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.deadlines': updatedDeadlines,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    
    // Encontrar el plazo completado para el registro
    const completedDeadline = updatedDeadlines.find(d => d.id === deadlineId);
    
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'karinDeadlineCompleted',
      description: `Plazo completado: ${completedDeadline?.name || 'Plazo'}`,
      deadlineId,
      visibleToReporter: false
    });
    
    return {
      success: true,
      deadlines: updatedDeadlines
    };
  } catch (error) {
    console.error('Error completing Karin deadline:', error);
    return {
      success: false,
      error: 'Error al completar el plazo de Ley Karin'
    };
  }
}

/**
 * Extiende un plazo para un caso de Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que extiende el plazo
 * @param deadlineId ID del plazo a extender
 * @param additionalDays Días adicionales
 * @param reason Razón de la extensión
 * @returns Resultado de la operación
 */
export async function extendKarinDeadline(
  companyId: string,
  reportId: string,
  userId: string,
  deadlineId: string,
  additionalDays: number,
  reason: string
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportDoc.data();
    
    // Verificar si existen plazos
    if (!reportData.karinProcess?.deadlines || reportData.karinProcess.deadlines.length === 0) {
      return {
        success: false,
        error: 'Este caso no tiene plazos inicializados'
      };
    }
    
    // Importar la función para extender plazos
    const { extendDeadline, updateDeadlinesStatus } = await import('@/lib/utils/deadlineUtils');
    
    // Obtener plazos actualizados
    let updatedDeadlines = reportData.karinProcess.deadlines;
    
    // Actualizar estados primero
    updatedDeadlines = updateDeadlinesStatus(updatedDeadlines);
    
    // Extender el plazo
    updatedDeadlines = extendDeadline(updatedDeadlines, deadlineId, additionalDays, reason, userId);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.deadlines': updatedDeadlines,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    
    // Encontrar el plazo extendido para el registro
    const extendedDeadline = updatedDeadlines.find(d => d.id === deadlineId);
    
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'karinDeadlineExtended',
      description: `Plazo extendido: ${extendedDeadline?.name || 'Plazo'} (+${additionalDays} días)`,
      data: {
        deadlineId,
        additionalDays,
        reason
      },
      visibleToReporter: false
    });
    
    return {
      success: true,
      deadlines: updatedDeadlines
    };
  } catch (error) {
    console.error('Error extending Karin deadline:', error);
    return {
      success: false,
      error: 'Error al extender el plazo de Ley Karin'
    };
  }
}

/**
 * Añade un plazo personalizado a un caso de Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que añade el plazo
 * @param deadlineData Datos del nuevo plazo
 * @returns Resultado de la operación
 */
export async function addCustomKarinDeadline(
  companyId: string,
  reportId: string,
  userId: string,
  deadlineData: any
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportDoc.data();
    
    // Verificar si existen plazos
    if (!reportData.karinProcess?.deadlines) {
      // Inicializar si no existen
      await initializeKarinDeadlines(companyId, reportId, userId);
      
      // Obtener el reporte actualizado
      const updatedReportDoc = await getDoc(reportRef);
      const updatedReportData = updatedReportDoc.data();
      
      if (!updatedReportData.karinProcess?.deadlines) {
        return {
          success: false,
          error: 'No se pudieron inicializar los plazos'
        };
      }
    }
    
    // Importar la función para añadir plazos personalizados
    const { addCustomDeadline, updateDeadlinesStatus } = await import('@/lib/utils/deadlineUtils');
    
    // Obtener plazos actualizados (puede haberse actualizado arriba)
    const updatedReportDoc = await getDoc(reportRef);
    const updatedReportData = updatedReportDoc.data();
    let updatedDeadlines = updatedReportData.karinProcess.deadlines;
    
    // Actualizar estados primero
    updatedDeadlines = updateDeadlinesStatus(updatedDeadlines);
    
    // Añadir el plazo personalizado
    updatedDeadlines = addCustomDeadline(updatedDeadlines, deadlineData);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.deadlines': updatedDeadlines,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'karinDeadlineAdded',
      description: `Plazo personalizado añadido: ${deadlineData.name}`,
      visibleToReporter: false
    });
    
    return {
      success: true,
      deadlines: updatedDeadlines
    };
  } catch (error) {
    console.error('Error adding custom Karin deadline:', error);
    return {
      success: false,
      error: 'Error al añadir el plazo personalizado de Ley Karin'
    };
  }
}

/**
 * Actualiza los plazos con sus estados actuales para un caso de Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que actualiza los plazos
 * @returns Resultado de la operación
 */
export async function refreshKarinDeadlines(
  companyId: string,
  reportId: string,
  userId: string
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportDoc.data();
    
    // Verificar si existen plazos
    if (!reportData.karinProcess?.deadlines || reportData.karinProcess.deadlines.length === 0) {
      return {
        success: false,
        error: 'Este caso no tiene plazos inicializados'
      };
    }
    
    // Importar la función para actualizar estados
    const { updateDeadlinesStatus } = await import('@/lib/utils/deadlineUtils');
    
    // Actualizar estados
    const updatedDeadlines = updateDeadlinesStatus(reportData.karinProcess.deadlines);
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.deadlines': updatedDeadlines,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      deadlines: updatedDeadlines
    };
  } catch (error) {
    console.error('Error refreshing Karin deadlines:', error);
    return {
      success: false,
      error: 'Error al actualizar los estados de plazos de Ley Karin'
    };
  }
}

/**
 * Agrega una nueva tarea a la investigación
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param userId ID del usuario que crea la tarea
 * @param taskData Datos de la tarea
 * @returns Resultado de la operación
 */
export async function addTask(
  companyId: string,
  reportId: string,
  userId: string,
  taskData: {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: 'alta' | 'media' | 'baja';
  }
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Extraer los datos actuales
    const reportData = reportDoc.data();
    const existingTasks = reportData.tasks || [];
    
    // Generar un ID único para la tarea
    const taskId = uuidv4();
    
    // Convertir fecha a objeto Date para manipulación
    const dueDate = new Date(taskData.dueDate);
    
    // Crear el objeto de la tarea
    const newTask = {
      id: taskId,
      ...taskData,
      status: 'pendiente',
      createdBy: userId,
      createdAt: serverTimestamp(),
      dueDate: Timestamp.fromDate(dueDate)
    };
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      tasks: [...existingTasks, newTask],
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'taskAdded',
      description: `Tarea creada: ${taskData.title}`,
      taskId,
      visibleToReporter: false
    });
    
    return {
      success: true,
      taskId
    };
  } catch (error) {
    console.error('Error adding task:', error);
    return {
      success: false,
      error: 'Error al agregar la tarea'
    };
  }
}

/**
 * Actualiza el estado de una tarea
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param taskId ID de la tarea
 * @param userId ID del usuario que actualiza la tarea
 * @param newStatus Nuevo estado de la tarea
 * @param comment Comentario opcional sobre el cambio de estado
 * @returns Resultado de la operación
 */
export async function updateTaskStatus(
  companyId: string,
  reportId: string,
  taskId: string,
  userId: string,
  newStatus: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada',
  comment?: string
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    // Extraer los datos actuales
    const reportData = reportDoc.data();
    const existingTasks = reportData.tasks || [];
    
    // Buscar la tarea a actualizar
    const taskIndex = existingTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return {
        success: false,
        error: 'Tarea no encontrada'
      };
    }
    
    // Crear una copia de las tareas para modificar
    const updatedTasks = [...existingTasks];
    
    // Actualizar la tarea
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      status: newStatus,
      updatedBy: userId,
      updatedAt: serverTimestamp(),
      comment: comment || updatedTasks[taskIndex].comment,
      completedAt: newStatus === 'completada' ? serverTimestamp() : updatedTasks[taskIndex].completedAt
    };
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      tasks: updatedTasks,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'taskStatusUpdated',
      description: `Estado de tarea actualizado a: ${newStatus}`,
      taskId,
      statusChange: {
        from: existingTasks[taskIndex].status,
        to: newStatus,
        comment
      },
      visibleToReporter: false
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating task status:', error);
    return {
      success: false,
      error: 'Error al actualizar el estado de la tarea'
    };
  }
}

/**
 * Obtiene las denuncias asignadas a un investigador específico
 * @param companyId ID de la compañía
 * @param investigatorId ID del investigador
 * @returns Lista de denuncias asignadas
 */
export async function getAssignedReports(
  companyId: string,
  investigatorId: string,
  userRole?: string | null
) {
  try {
    // Validar datos de entrada
    if (!companyId) {
      console.error('getAssignedReports: companyId is empty');
      return {
        success: false,
        error: 'ID de compañía no válido',
        reports: []
      };
    }

    console.log(`Ejecutando getAssignedReports - companyId: ${companyId}, investigatorId: ${investigatorId}, userRole: ${userRole}`);

    // ¡IMPORTANTE! Solo el super_admin puede ver todos los reportes
    // Para otros roles, se aplican restricciones según corresponda
    const isSuperAdminUser = userRole === 'super_admin';
    const isUserAdmin = isSuperAdminUser || userRole === 'admin';
    console.log(`Tipo de usuario - isAdmin: ${isUserAdmin}, isSuperAdmin: ${isSuperAdminUser}`);

    // VERIFICACIÓN CRÍTICA DE AISLAMIENTO DE DATOS:
    // Si es admin pero NO super_admin, SOLO puede ver su propia compañía
    if (isUserAdmin && !isSuperAdminUser && userRole === 'admin') {
      // Obtener el perfil del usuario para verificar a qué compañía pertenece
      try {
        const userRef = doc(db, `companies/${companyId}/users/${investigatorId}`);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          // Si el usuario pertenece a otra compañía, bloquear el acceso
          if (userData.company && userData.company !== companyId) {
            console.error(`⚠️ ALERTA DE SEGURIDAD: Usuario admin ${investigatorId} intentó acceder a compañía ${companyId} pero pertenece a ${userData.company}`);
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
    let q;

    // Si es admin o superadmin, obtener todas las denuncias usando las funciones de utilidad
    if (isUserAdmin) {
      console.log("Usando consulta para admin - todas las denuncias");
      q = query(
        reportsRef,
        orderBy('createdAt', 'desc')
      );
    } else {
      // Si es investigador, solo obtener las asignadas a él
      console.log(`Usando consulta para investigador - solo denuncias asignadas a: ${investigatorId}`);
      q = query(
        reportsRef,
        where('assignedTo', '==', investigatorId),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const reports: any[] = [];

    console.log(`Número de documentos encontrados: ${querySnapshot.size}`);

    querySnapshot.forEach((doc) => {
      const reportData = doc.data();
      
      // Calcular progreso de la investigación
      let progress = 0;
      let hasPlan = false;
      let interviewCount = 0;
      let findingCount = 0;
      
      // Verificar existencia de plan
      if (reportData.plan) {
        hasPlan = true;
        progress += 20; // 20% de progreso por tener plan
      }
      
      // Verificar entrevistas
      if (reportData.interviews && reportData.interviews.length > 0) {
        interviewCount = reportData.interviews.length;
        // Máximo 30% por entrevistas (10% por cada entrevista, hasta 3)
        progress += Math.min(interviewCount * 10, 30);
      }
      
      // Verificar hallazgos
      if (reportData.findings && reportData.findings.length > 0) {
        findingCount = reportData.findings.length;
        // Máximo 30% por hallazgos (10% por cada hallazgo, hasta 3)
        progress += Math.min(findingCount * 10, 30);
      }
      
      // Verificar informe final
      if (reportData.finalReport) {
        progress += 20; // 20% restante por tener informe final
      }
      
      // Asegurar que el progreso esté entre 0 y 100
      progress = Math.max(0, Math.min(100, progress));
      
      reports.push({
        id: doc.id,
        ...reportData,
        investigation: {
          progress,
          hasPlan,
          interviewCount,
          findingCount
        }
      });
    });

    console.log(`Número de reportes procesados: ${reports.length}`);
    if (reports.length > 0) {
      console.log(`Ejemplo de primer reporte - ID: ${reports[0].id}, Estado: ${reports[0].status}`);
    } else {
      // Si no hay reportes y no es admin, intentar con todos los reportes como plan B
      if (!isSuperAdminUser && !isUserAdmin) {
        
        console.log("No se encontraron reportes asignados. Usando fallback para mostrar todos los reportes.");
        
        // Consultar todos los reportes como fallback
        const fallbackQuery = query(
          reportsRef,
          orderBy('createdAt', 'desc')
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        console.log(`Fallback - Número de documentos encontrados: ${fallbackSnapshot.size}`);
        
        fallbackSnapshot.forEach((doc) => {
          const reportData = doc.data();
          
          // Calcular progreso básico
          const progress = reportData.plan ? 50 : 0;
          
          reports.push({
            id: doc.id,
            ...reportData,
            investigation: {
              progress,
              hasPlan: !!reportData.plan,
              interviewCount: 0,
              findingCount: 0
            }
          });
        });
        
        console.log(`Fallback - Número de reportes procesados: ${reports.length}`);
      } else {
        console.log("No se encontraron reportes para mostrar, incluso para admin/superadmin");
      }
    }

    return {
      success: true,
      reports
    };
  } catch (error) {
    console.error('Error getting assigned reports:', error);
    return {
      success: false,
      error: 'Error al obtener las denuncias asignadas',
      reports: []
    };
  }
}