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
  orderBy,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { getReportById, updateReportStatus } from './reportService';
import { getUserProfileById } from './userService';

/**
 * Obtiene las denuncias asignadas a un investigador o todas si es admin
 */
export async function getAssignedReports(companyId: string, userId: string) {
  console.log('getAssignedReports - Inicio', { companyId, userId });
  try {
    // Primero verificamos si el usuario es administrador
    const userProfileResult = await getUserProfileById(companyId, userId);
    const isAdmin = userProfileResult.success && userProfileResult.profile?.role === 'admin';
    console.log('Usuario es admin:', isAdmin);

    const reportsRef = collection(db, `companies/${companyId}/reports`);
    let q;

    if (isAdmin) {
      // Si es admin, obtener todas las denuncias que están en proceso de investigación
      q = query(
        reportsRef,
        where('status', 'in', ['Asignada', 'En Investigación', 'Pendiente Información', 'En Evaluación']),
        orderBy('createdAt', 'desc')
      );
      console.log('Consultando todas las denuncias en investigación para admin');
    } else {
      // Si es investigador, solo obtener las asignadas a él
      q = query(
        reportsRef,
        where('assignedTo', '==', userId),
        orderBy('createdAt', 'desc')
      );
      console.log('Consultando denuncias asignadas para investigador');
    }

    console.log('Ejecutando query Firestore...');
    const querySnapshot = await getDocs(q);
    console.log(`Query completada - ${querySnapshot.size} documentos encontrados`);

    if (querySnapshot.empty) {
      console.log('No se encontraron documentos');
      return { success: true, reports: [] };
    }

    // Procesar los documentos para obtener datos adicionales
    const reports = await Promise.all(querySnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const reportId = doc.id;
      console.log(`Procesando reporte: ${reportId}`);

      // Si el reporte tiene un investigador asignado, obtener su nombre
      let assignedToName = null;
      if (data.assignedTo) {
        const investigatorProfile = await getUserProfileById(companyId, data.assignedTo);
        if (investigatorProfile.success) {
          assignedToName = investigatorProfile.profile.displayName;
        }
      }

      // Obtener actividades para evaluar progreso de investigación
      const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
      const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
      const activitiesSnapshot = await getDocs(activitiesQuery);

      // Verificar actividades relacionadas con investigación
      const activities = activitiesSnapshot.docs.map(doc => doc.data());
      const hasPlan = activities.some(a => a.actionType === 'planCreated' || a.actionType === 'planUpdated');
      const interviewCount = activities.filter(a => a.actionType === 'interviewAdded').length;
      const findingCount = activities.filter(a => a.actionType === 'findingAdded').length;
      const hasFinalReport = activities.some(a => a.actionType === 'reportCreated' || a.actionType === 'reportUpdated');

      console.log(`Actividades encontradas - Plan: ${hasPlan}, Entrevistas: ${interviewCount}, Hallazgos: ${findingCount}, Informe final: ${hasFinalReport}`);

      // Verificar si hay acusados
      const accusedRef = collection(db, `companies/${companyId}/reports/${reportId}/accused`);
      const accusedSnapshot = await getDocs(accusedRef);
      const accusedCount = accusedSnapshot.size;

      // Obtener testigos
      const witnessesRef = collection(db, `companies/${companyId}/reports/${reportId}/witnesses`);
      const witnessesSnapshot = await getDocs(witnessesRef);
      const witnessCount = witnessesSnapshot.size;

      // Calcular progreso basado en estado y actividades
      const progress = calculateInvestigationProgress(
        data.status,
        hasPlan,
        interviewCount,
        findingCount,
        hasFinalReport
      );

      console.log(`Progreso calculado: ${progress}%`);

      const processedReport = {
        id: reportId,
        ...data,
        assignedToName,
        investigation: {
          hasPlan,
          interviewCount,
          findingCount,
          accusedCount,
          witnessCount,
          hasFinalReport,
          progress
        }
      };

      console.log(`Reporte procesado: ${reportId}`, processedReport.investigation);
      return processedReport;
    }));

    console.log(`Todos los reportes procesados: ${reports.length}`);
    return { success: true, reports };
  } catch (error) {
    console.error('ERROR en getAssignedReports:', error);
    return {
      success: false,
      error: 'Error al obtener las denuncias asignadas',
    };
  }
}

/**
 * Obtiene todas las investigaciones (para administradores)
 */
export async function getAllInvestigations(companyId: string) {
  try {
    const reportsRef = collection(db, `companies/${companyId}/reports`);
    const q = query(
      reportsRef,
      where('status', 'in', ['Asignada', 'En Investigación', 'Pendiente Información', 'En Evaluación']),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { success: true, investigations: [] };
    }

    // Procesar los documentos y obtener información adicional
    const investigations = await Promise.all(querySnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const reportId = doc.id;

      // Obtener el nombre del investigador asignado
      let investigatorName = 'No asignado';
      if (data.assignedTo) {
        const userResult = await getUserProfileById(companyId, data.assignedTo);
        if (userResult.success) {
          investigatorName = userResult.profile.displayName;
        }
      }

      // Obtener actividades para evaluar progreso de investigación
      const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
      const activitiesSnapshot = await getDocs(activitiesRef);

      // Verificar actividades relacionadas con investigación
      const activities = activitiesSnapshot.docs.map(doc => doc.data());
      const hasPlan = activities.some(a => a.actionType === 'planCreated' || a.actionType === 'planUpdated');
      const interviewCount = activities.filter(a => a.actionType === 'interviewAdded').length;
      const findingCount = activities.filter(a => a.actionType === 'findingAdded').length;
      const hasFinalReport = activities.some(a => a.actionType === 'reportCreated' || a.actionType === 'reportUpdated');

      // Calcular progreso
      const progress = calculateInvestigationProgress(
        data.status,
        hasPlan,
        interviewCount,
        findingCount,
        hasFinalReport
      );

      return {
        id: reportId,
        ...data,
        investigatorName,
        hasPlan,
        interviewCount,
        findingCount,
        hasReport: hasFinalReport,
        progress
      };
    }));

    return { success: true, investigations };
  } catch (error) {
    console.error('Error getting all investigations:', error);
    return {
      success: false,
      error: 'Error al obtener las investigaciones',
    };
  }
}

/**
 * Obtiene los detalles de una investigación específica
 */
export async function getInvestigationDetails(companyId: string, reportId: string) {
  try {
    // Obtener los datos de la denuncia
    const reportResult = await getReportById(companyId, reportId);
    if (!reportResult.success) {
      return reportResult;
    }

    // Obtener actividades para reconstruir la investigación
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
    const activitiesSnapshot = await getDocs(activitiesQuery);
    const activities = activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar actividades relacionadas con investigación
    const planActivities = activities.filter(a =>
      a.actionType === 'planCreated' || a.actionType === 'planUpdated'
    );
    const interviewActivities = activities.filter(a =>
      a.actionType === 'interviewAdded'
    );
    const findingActivities = activities.filter(a =>
      a.actionType === 'findingAdded'
    );
    const preliminaryReportActivities = activities.filter(a =>
      a.actionType === 'preliminaryReportCreated' || a.actionType === 'preliminaryReportUpdated'
    );
    const reportActivities = activities.filter(a =>
      a.actionType === 'reportCreated' || a.actionType === 'reportUpdated'
    );

    // Reconstruir plan de investigación (último plan creado o actualizado)
    const plan = planActivities.length > 0 ? {
      id: planActivities[0].id,
      description: planActivities[0].description || 'Plan de investigación',
      timestamp: planActivities[0].timestamp,
      createdBy: planActivities[0].actorId,
      // Puedes agregar más campos si los tienes en tus actividades
    } : null;

    // Reconstruir entrevistas
    const interviews = interviewActivities.map((activity, index) => ({
      id: activity.id || `interview-${index}`,
      interviewee: activity.description.replace('Entrevista realizada a ', ''),
      date: activity.timestamp,
      conductedBy: activity.actorId,
      // Otros campos que puedas tener en tus actividades
    }));

    // Reconstruir hallazgos
    const findings = findingActivities.map((activity, index) => ({
      id: activity.id || `finding-${index}`,
      title: activity.description.replace('Nuevo hallazgo registrado: ', ''),
      createdAt: activity.timestamp,
      createdBy: activity.actorId,
      // Otros campos que puedas tener en tus actividades
    }));

    // Reconstruir informe preliminar
    const preliminaryReport = preliminaryReportActivities.length > 0 ? {
      id: preliminaryReportActivities[0].id,
      summary: preliminaryReportActivities[0].reportDetails?.summary || '',
      safetyMeasures: preliminaryReportActivities[0].reportDetails?.safetyMeasures || '',
      initialAssessment: preliminaryReportActivities[0].reportDetails?.initialAssessment || '',
      nextSteps: preliminaryReportActivities[0].reportDetails?.nextSteps || '',
      timestamp: preliminaryReportActivities[0].timestamp,
      createdBy: preliminaryReportActivities[0].actorId,
      createdAt: preliminaryReportActivities[0].timestamp,
      updatedAt: preliminaryReportActivities[0].timestamp,
    } : null;

    // Reconstruir informe final
    const finalReport = reportActivities.length > 0 ? {
      id: reportActivities[0].id,
      title: 'Informe final de investigación',
      timestamp: reportActivities[0].timestamp,
      createdBy: reportActivities[0].actorId,
      // Otros campos que puedas tener en tus actividades
    } : null;
    // Obtener acusados
    const accusedRef = collection(db, `companies/${companyId}/reports/${reportId}/accused`);
    const accusedSnapshot = await getDocs(accusedRef);
    const accused = accusedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Obtener testigos
    const witnessesRef = collection(db, `companies/${companyId}/reports/${reportId}/witnesses`);
    const witnessesSnapshot = await getDocs(witnessesRef);
    const witnesses = witnessesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      investigation: {
        ...reportResult.report,
        plan,
        interviews,
        findings,
        preliminaryReport,
        finalReport,
        accused,
        witnesses,
        activities: activities.filter(a => !a.visibleToReporter) // Solo actividades internas
      }
    };
  } catch (error) {
    console.error('Error getting investigation details:', error);
    return {
      success: false,
      error: 'Error al obtener los detalles de la investigación',
    };
  }
}

/**
 * Crea o actualiza el plan de investigación
 * (Guarda como una actividad al no tener la colección investigation)
 */
export async function saveInvestigationPlan(
  companyId: string,
  reportId: string,
  userId: string,
  planData: {
    description: string;
    approach: string;
    timeline: string;
    specialConsiderations?: string;
  }
) {
  try {
    // Crear actividad para el plan
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);

    // Verificar si ya existe un plan (buscar actividad de plan)
    const planQuery = query(
      activitiesRef,
      where('actionType', 'in', ['planCreated', 'planUpdated'])
    );
    const planSnapshot = await getDocs(planQuery);
    const isNewPlan = planSnapshot.empty;
    const actionType = isNewPlan ? 'planCreated' : 'planUpdated';

    // Guardar el plan como una actividad con detalles
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: actionType,
      description: 'Plan de investigación ' + (isNewPlan ? 'creado' : 'actualizado'),
      planDetails: planData, // Guardar los detalles del plan en la actividad
      visibleToReporter: false,
    });
    // Si la denuncia está en estado "Asignada", actualizar a "En Investigación"
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists() && reportSnap.data().status === 'Asignada') {
      await updateReportStatus(
        companyId,
        reportId,
        'En Investigación',
        userId,
        'Investigación iniciada con plan establecido'
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving investigation plan:', error);
    return {
      success: false,
      error: 'Error al guardar el plan de investigación',
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
    summary: string;
    keyPoints: string[];
    isConfidential: boolean;
  }
) {
  try {
    // Registrar la entrevista como una actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);

    // Convertir fecha a Timestamp
    const interviewDate = new Date(interviewData.date);

    // Crear la actividad
    const newActivityRef = await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'interviewAdded',
      description: `Entrevista realizada a ${interviewData.interviewee}`,
      interviewDetails: {
        ...interviewData,
        date: Timestamp.fromDate(interviewDate),
      },
      visibleToReporter: false,
    });

    return {
      success: true,
      interviewId: newActivityRef.id,
    };
  } catch (error) {
    console.error('Error adding interview:', error);
    return {
      success: false,
      error: 'Error al agregar la entrevista',
    };
  }
}

/**
 * Registra un hallazgo de la investigación
 * (Guarda como una actividad al no tener la colección findings)
 */
export async function addFinding(
  companyId: string,
  reportId: string,
  userId: string,
  findingData: {
    title: string;
    description: string;
    severity: 'alta' | 'media' | 'baja';
    relatedEvidence: string[];
    conclusion: string;
  }
) {
  try {
    // Registrar el hallazgo como una actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);

    // Crear la actividad
    const newActivityRef = await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'findingAdded',
      description: `Nuevo hallazgo registrado: ${findingData.title}`,
      findingDetails: findingData,
      visibleToReporter: false,
    });

    return {
      success: true,
      findingId: newActivityRef.id,
    };
  } catch (error) {
    console.error('Error adding finding:', error);
    return {
      success: false,
      error: 'Error al registrar el hallazgo',
    };
  }
}

/**
 * Crea o actualiza el informe preliminar de la investigación
 * (Guarda como una actividad al no tener una colección específica)
 */
export async function savePreliminaryReport(
  companyId: string,
  reportId: string,
  userId: string,
  reportData: {
    summary: string;
    safetyMeasures: string;
    initialAssessment: string;
    nextSteps: string;
  }
) {
  try {
    // Registrar el informe como actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);

    // Verificar si ya existe un informe preliminar (buscar actividad)
    const reportQuery = query(
      activitiesRef,
      where('actionType', 'in', ['preliminaryReportCreated', 'preliminaryReportUpdated'])
    );
    const reportSnapshot = await getDocs(reportQuery);
    const isNewReport = reportSnapshot.empty;
    const actionType = isNewReport ? 'preliminaryReportCreated' : 'preliminaryReportUpdated';

    // Guardar como actividad
    const newActivityRef = await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: actionType,
      description: 'Informe preliminar ' + (isNewReport ? 'creado' : 'actualizado'),
      reportDetails: reportData,
      visibleToReporter: false,
    });

    // Si la denuncia está en estado "Asignada", actualizar a "En Investigación"
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists() && reportSnap.data().status === 'Asignada') {
      await updateReportStatus(
        companyId,
        reportId,
        'En Investigación',
        userId,
        'Investigación iniciada con informe preliminar'
      );
    }

    // Si es un caso Ley Karin, actualizar el proceso Karin
    if (reportSnap.exists() && reportSnap.data().isKarinLaw) {
      const karinData = reportSnap.data().karinProcess || {};
      const stageHistory = karinData.stageHistory || [];
      
      // Solo actualizar si no existe la etapa 'preliminaryReport'
      const hasPreliminaryReport = stageHistory.some(h => h.stage === 'preliminaryReport');
      
      if (!hasPreliminaryReport) {
        await updateDoc(reportRef, {
          'karinProcess.stage': 'preliminaryReport',
          'karinProcess.stageHistory': [
            ...stageHistory,
            {
              stage: 'preliminaryReport',
              date: Timestamp.now(),
              user: userId,
              notes: 'Informe preliminar creado para envío a la Dirección del Trabajo'
            }
          ]
        });
      }
    }

    return {
      success: true,
      reportId: newActivityRef.id,
    };
  } catch (error) {
    console.error('Error saving preliminary report:', error);
    return {
      success: false,
      error: 'Error al guardar el informe preliminar',
    };
  }
}

/**
 * Crea o actualiza el informe final de la investigación
 * (Guarda como una actividad al no tener la colección finalReport)
 */
export async function saveFinalReport(
  companyId: string,
  reportId: string,
  userId: string,
  reportData: {
    summary: string;
    methodology: string;
    findings: string;
    conclusions: string;
    recommendations: string;
    isKarinReport: boolean;
  }
) {
  try {
    // Registrar el informe como actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);

    // Verificar si ya existe un informe (buscar actividad)
    const reportQuery = query(
      activitiesRef,
      where('actionType', 'in', ['reportCreated', 'reportUpdated'])
    );
    const reportSnapshot = await getDocs(reportQuery);
    const isNewReport = reportSnapshot.empty;
    const actionType = isNewReport ? 'reportCreated' : 'reportUpdated';

    // Guardar como actividad
    const newActivityRef = await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: actionType,
      description: 'Informe final de investigación ' + (isNewReport ? 'creado' : 'actualizado'),
      reportDetails: reportData,
      visibleToReporter: false,
    });

    // Si la denuncia está en estado "En Investigación", actualizar a "En Evaluación"
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists() && reportSnap.data().status === 'En Investigación') {
      await updateReportStatus(
        companyId,
        reportId,
        'En Evaluación',
        userId,
        'Informe final creado, pendiente de evaluación'
      );
    }

    return {
      success: true,
      reportId: newActivityRef.id,
    };
  } catch (error) {
    console.error('Error saving final report:', error);
    return {
      success: false,
      error: 'Error al guardar el informe final',
    };
  }
}

/**
 * Completa una investigación y cambia su estado a "Resuelta"
 */
export async function completeInvestigation(
  companyId: string,
  reportId: string,
  userId: string,
  conclusion: string
) {
  try {
    // Verificar que existe un informe final (actividad)
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    const reportQuery = query(
      activitiesRef,
      where('actionType', 'in', ['reportCreated', 'reportUpdated'])
    );
    const reportSnapshot = await getDocs(reportQuery);
    if (reportSnapshot.empty) {
      return {
        success: false,
        error: 'No se puede completar la investigación sin un informe final',
      };
    }

    // Obtener el reporte para verificar si es Ley Karin
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    const isKarinLaw = reportSnap.exists() && reportSnap.data().isKarinLaw;

    // Si es Ley Karin, actualizar el estado del proceso Karin
    if (isKarinLaw) {
      const karinData = reportSnap.data().karinProcess || {};
      const stageHistory = karinData.stageHistory || [];
      
      await updateDoc(reportRef, {
        'karinProcess.stage': 'closed',
        'karinProcess.stageHistory': [
          ...stageHistory,
          {
            stage: 'closed',
            date: Timestamp.now(),
            user: userId,
            notes: conclusion
          }
        ]
      });
    }

    // Cambiar el estado de la denuncia a "Resuelta"
    const result = await updateReportStatus(
      companyId,
      reportId,
      'Resuelta',
      userId,
      conclusion
    );

    return result;
  } catch (error) {
    console.error('Error completing investigation:', error);
    return {
      success: false,
      error: 'Error al completar la investigación',
    };
  }
}

/**
 * Actualiza la etapa de un proceso Ley Karin
 */
export async function updateKarinStage(
  companyId: string,
  reportId: string,
  userId: string,
  stage: string,
  notes: string
) {
  try {
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Verificar que sea un caso Ley Karin
    if (!reportData.isKarinLaw) {
      return {
        success: false,
        error: 'Este reporte no es un caso Ley Karin'
      };
    }
    
    // Obtener datos actuales del proceso Karin o inicializar
    const karinProcess = reportData.karinProcess || {};
    const stageHistory = karinProcess.stageHistory || [];
    
    // Preparar datos a actualizar
    const now = Timestamp.now();
    const stageData = {
      stage,
      date: now,
      user: userId,
      notes: notes || ''
    };
    
    // Metadatos adicionales según etapa
    let extraData = {};
    
    if (stage === 'investigation') {
      const startDate = now;
      const deadline = addBusinessDays(startDate.toDate(), 30);
      
      extraData = {
        'karinProcess.investigationStartDate': startDate,
        'karinProcess.investigationDeadline': Timestamp.fromDate(deadline)
      };
    }
    
    // Actualizar datos
    await updateDoc(reportRef, {
      'karinProcess.stage': stage,
      'karinProcess.stageHistory': [...stageHistory, stageData],
      ...extraData
    });
    
    // Registrar actividad
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`),
      {
        timestamp: now,
        actorId: userId,
        actionType: 'karinStageUpdate',
        description: `Etapa Ley Karin actualizada a: ${stage}`,
        stageDetails: stageData,
        visibleToReporter: false,
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar etapa Ley Karin:', error);
    return {
      success: false,
      error: 'Error al actualizar etapa del proceso Ley Karin'
    };
  }
}

// Añadir días hábiles a una fecha (omitiendo fines de semana)
function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let count = 0;
  
  while (count < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // No es sábado ni domingo
      count++;
    }
  }
  
  return result;
}

/**
 * Calcula el porcentaje de progreso de una investigación
 */
/**
 * Añade una nueva tarea a la investigación
 */
export async function addTask(
  companyId: string,
  reportId: string,
  taskData: {
    title: string;
    description: string;
    assignedTo?: string;
    dueDate?: Date;
    priority?: string;
  }
) {
  try {
    const tasksRef = collection(db, `companies/${companyId}/reports/${reportId}/tasks`);
    
    const dataToSave = {
      ...taskData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(tasksRef, dataToSave);
    
    // Registrar actividad
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`),
      {
        timestamp: serverTimestamp(),
        actorId: auth.currentUser?.uid || 'system',
        actionType: 'task_created',
        description: `Nueva tarea creada: ${taskData.title}`,
        visibleToReporter: false
      }
    );
    
    return {
      success: true,
      taskId: docRef.id
    };
  } catch (error) {
    console.error("Error al añadir tarea:", error);
    return {
      success: false,
      error: "Error al añadir la tarea"
    };
  }
}

/**
 * Actualiza el estado de una tarea
 */
export async function updateTaskStatus(
  companyId: string,
  reportId: string,
  taskId: string,
  newStatus: string
) {
  try {
    const taskRef = doc(db, `companies/${companyId}/reports/${reportId}/tasks/${taskId}`);
    
    await updateDoc(taskRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    
    // Registrar actividad
    await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/activities`),
      {
        timestamp: serverTimestamp(),
        actorId: auth.currentUser?.uid || 'system',
        actionType: 'task_updated',
        description: `Estado de la tarea actualizado a: ${newStatus}`,
        visibleToReporter: false
      }
    );
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error al actualizar estado de tarea:", error);
    return {
      success: false,
      error: "Error al actualizar el estado de la tarea"
    };
  }
}

function calculateInvestigationProgress(
  status: string,
  hasPlan: boolean,
  interviewCount: number,
  findingCount: number,
  hasFinalReport: boolean
): number {
  console.log('Calculando progreso:', { status, hasPlan, interviewCount, findingCount, hasFinalReport });

  // Base progress according to status
  let baseProgress = 0;
  switch (status) {
    case 'Asignada':
      baseProgress = 10;
      break;
    case 'En Investigación':
      baseProgress = 30;
      break;
    case 'Pendiente Información':
      baseProgress = 50;
      break;
    case 'En Evaluación':
      baseProgress = 80;
      break;
    case 'Resuelta':
    case 'En Seguimiento':
    case 'Cerrada':
      return 100;
    default:
      baseProgress = 0;
  }

  // Additional progress based on components
  let additionalProgress = 0;
  if (hasPlan) additionalProgress += 10;
  if (interviewCount > 0) additionalProgress += Math.min(interviewCount * 5, 15);
  if (findingCount > 0) additionalProgress += Math.min(findingCount * 5, 15);
  if (hasFinalReport) additionalProgress += 20;

  // Limit progress based on status
  let totalProgress = baseProgress + additionalProgress;
  console.log('Progreso calculado:', { baseProgress, additionalProgress, totalProgress });

  // Cap progress based on status
  switch (status) {
    case 'Asignada':
      return Math.min(totalProgress, 30);
    case 'En Investigación':
      return Math.min(totalProgress, 60);
    case 'Pendiente Información':
      return Math.min(totalProgress, 80);
    case 'En Evaluación':
      return Math.min(totalProgress, 99);
    default:
      return totalProgress;
  }
}