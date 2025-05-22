// src/lib/services/karinDeadlinesService.ts

import { 
  addBusinessDays, 
  getBusinessDaysCount, 
  isBusinessDay,
  BusinessDayType,
  CHILEAN_HOLIDAYS
} from '@/lib/utils/dateUtils';

import { db } from '@/lib/firebase/config';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Tipos de alertas para plazos
 */
export enum DeadlineAlertLevel {
  NONE = 'none',         // Sin alerta
  INFO = 'info',         // Informativo (>10 días)
  WARNING = 'warning',   // Advertencia (5-10 días)
  URGENT = 'urgent',     // Urgente (2-5 días)
  CRITICAL = 'critical', // Crítico (<2 días)
  OVERDUE = 'overdue'    // Vencido
}

/**
 * Plazos legales para las diferentes etapas de Ley Karin
 */
export const KARIN_LEGAL_DEADLINES = {
  reception: {
    days: 0, // Inmediato
    description: 'Recepción inmediata de la denuncia',
    nextAction: 'Implementar medidas precautorias',
    article: 'Art. 3, Ley Karin'
  },
  subsanation: {
    days: 5,
    description: 'Plazo para subsanar información faltante',
    nextAction: 'Completar información requerida',
    article: 'Art. 4, Ley Karin'
  },
  dt_notification: {
    days: 3,
    description: 'Notificación a Dirección del Trabajo',
    nextAction: 'Enviar notificación oficial',
    article: 'Art. 5, Ley Karin'
  },
  suseso_notification: {
    days: 5,
    description: 'Notificación a SUSESO/Mutualidad',
    nextAction: 'Enviar notificación oficial',
    article: 'Art. 5, Ley Karin'
  },
  precautionary_measures: {
    days: 3,
    description: 'Implementación de medidas precautorias',
    nextAction: 'Definir e implementar medidas',
    article: 'Art. 6, Ley Karin'
  },
  investigation: {
    days: 30,
    description: 'Investigación completa',
    nextAction: 'Conducir investigación y preparar informe',
    article: 'Art. 8, Ley Karin',
    extendable: true,
    maxExtensionDays: 30
  },
  dt_submission: {
    days: 2,
    description: 'Envío de expediente a DT',
    nextAction: 'Enviar expediente completo',
    article: 'Art. 10, Ley Karin'
  },
  dt_resolution: {
    days: 30,
    description: 'Resolución de la DT',
    nextAction: 'Esperar pronunciamiento',
    article: 'Art. 11, Ley Karin',
    externalEntity: true
  },
  measures_adoption: {
    days: 15,
    description: 'Adopción de medidas ordenadas',
    nextAction: 'Implementar medidas requeridas',
    article: 'Art. 12, Ley Karin',
    calendarDays: true // Usa días calendario, no hábiles
  }
};

/**
 * Interfaz para representar un feriado regional
 */
interface RegionalHoliday {
  date: string;       // Formato YYYY-MM-DD
  description: string;
  regions: string[];  // Códigos de región (RM, V, etc.)
}

/**
 * Feriados regionales en Chile
 * (Esta lista debe actualizarse anualmente)
 */
const REGIONAL_HOLIDAYS: RegionalHoliday[] = [
  {
    date: '2024-05-16',
    description: 'Día de San José de Coquimbo',
    regions: ['IV']
  },
  {
    date: '2024-07-07',
    description: 'San Pedro en Valparaíso',
    regions: ['V']
  },
  {
    date: '2024-10-27',
    description: 'Aniversario Punta Arenas',
    regions: ['XII']
  }
];

/**
 * Interfaz para solicitud de extensión de plazo
 */
export interface DeadlineExtensionRequest {
  reportId: string;
  companyId: string;
  stage: string;
  currentDeadline: Date;
  requestedDays: number;
  justification: string;
  requestedBy: {
    uid: string;
    name: string;
    role: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  approvedBy?: {
    uid: string;
    name: string;
    role: string;
  };
  approvalDate?: Date;
  newDeadline?: Date;
}

/**
 * Interfaz para configuración de alerta de plazo
 */
export interface DeadlineAlert {
  reportId: string;
  companyId: string;
  stage: string;
  deadline: Date;
  level: DeadlineAlertLevel;
  recipients: string[]; // UIDs de los destinatarios
  triggerDate: Date;    // Cuándo se debe enviar la alerta
  title: string;
  message: string;
  sent: boolean;
  sentDate?: Date;
}

/**
 * Verifica si una fecha es un feriado regional en una región específica
 * @param date Fecha a verificar
 * @param region Código de región (opcional)
 * @returns true si es feriado regional, false en caso contrario
 */
export function isRegionalHoliday(date: Date, region?: string): boolean {
  const dateString = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  const holiday = REGIONAL_HOLIDAYS.find(h => h.date === dateString);
  
  if (!holiday) return false;
  
  // Si no se especifica región, o la región está en la lista del feriado
  return !region || holiday.regions.includes(region);
}

/**
 * Verifica si una fecha es un día hábil, considerando feriados regionales
 * @param date Fecha a verificar
 * @param type Tipo de día hábil (administrativo o laboral)
 * @param region Código de región (opcional)
 * @returns true si es día hábil, false en caso contrario
 */
export function isAdvancedBusinessDay(
  date: Date, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE,
  region?: string
): boolean {
  const dayOfWeek = date.getDay();
  
  // Verificar si es feriado nacional
  if (CHILEAN_HOLIDAYS.includes(date.toISOString().split('T')[0])) {
    return false;
  }
  
  // Verificar si es feriado regional
  if (isRegionalHoliday(date, region)) {
    return false;
  }
  
  if (type === BusinessDayType.ADMINISTRATIVE) {
    // Días hábiles administrativos: lunes (1) a viernes (5)
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  } else {
    // Días hábiles laborales/judiciales: lunes (1) a sábado (6)
    return dayOfWeek >= 1 && dayOfWeek <= 6;
  }
}

/**
 * Añade un número específico de días hábiles a una fecha, considerando feriados regionales
 * @param date Fecha inicial
 * @param days Número de días hábiles a añadir
 * @param type Tipo de día hábil (administrativo o laboral)
 * @param region Código de región (opcional)
 * @returns Nueva fecha con los días hábiles añadidos
 */
export function addAdvancedBusinessDays(
  date: Date, 
  days: number, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE,
  region?: string
): Date {
  let result = new Date(date);
  let count = 0;
  
  // Si days es 0, devolver la misma fecha
  if (days === 0) return result;
  
  // Si days es negativo, restar días hábiles
  if (days < 0) {
    const absDays = Math.abs(days);
    let countBack = 0;
    
    while (countBack < absDays) {
      result.setDate(result.getDate() - 1);
      if (isAdvancedBusinessDay(result, type, region)) {
        countBack++;
      }
    }
    
    return result;
  }
  
  // Añadir días hábiles normalmente
  while (count < days) {
    result.setDate(result.getDate() + 1);
    if (isAdvancedBusinessDay(result, type, region)) {
      count++;
    }
  }
  
  return result;
}

/**
 * Calcula el número de días hábiles entre dos fechas, considerando feriados regionales
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @param type Tipo de día hábil (administrativo o laboral)
 * @param region Código de región (opcional)
 * @returns Número de días hábiles entre las dos fechas
 */
export function getAdvancedBusinessDaysCount(
  startDate: Date, 
  endDate: Date, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE,
  region?: string
): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  
  while (curDate <= endDate) {
    if (isAdvancedBusinessDay(curDate, type, region)) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  
  return count;
}

/**
 * Calcula la fecha límite para una etapa específica del proceso de Ley Karin
 * @param startDate Fecha de inicio
 * @param stage Etapa del proceso
 * @param region Código de región (opcional)
 * @param extension Días adicionales por extensión de plazo (opcional)
 * @returns Fecha límite
 */
export function calculateKarinDeadline(
  startDate: Date,
  stage: string,
  region?: string,
  extension: number = 0
): Date {
  // Verificar si la etapa existe en los plazos legales
  if (!(stage in KARIN_LEGAL_DEADLINES)) {
    console.warn(`Etapa "${stage}" no encontrada en plazos legales de Ley Karin`);
    return startDate; // Devolver la misma fecha si la etapa no existe
  }
  
  const { days, calendarDays } = KARIN_LEGAL_DEADLINES[stage];
  const totalDays = days + extension;
  
  // Si se usan días calendario (no hábiles)
  if (calendarDays) {
    const result = new Date(startDate);
    result.setDate(result.getDate() + totalDays);
    return result;
  }
  
  // Usar días hábiles por defecto
  return addAdvancedBusinessDays(
    startDate,
    totalDays,
    BusinessDayType.ADMINISTRATIVE,
    region
  );
}

/**
 * Determina el nivel de alerta para un plazo
 * @param currentDate Fecha actual
 * @param deadline Fecha límite
 * @param type Tipo de día hábil (administrativo o laboral)
 * @param region Código de región (opcional)
 * @returns Nivel de alerta
 */
export function getDeadlineAlertLevel(
  currentDate: Date,
  deadline: Date,
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE,
  region?: string
): DeadlineAlertLevel {
  // Si la fecha actual es posterior a la fecha límite, está vencido
  if (currentDate > deadline) {
    return DeadlineAlertLevel.OVERDUE;
  }
  
  // Calcular días hábiles restantes
  const daysRemaining = getAdvancedBusinessDaysCount(currentDate, deadline, type, region);
  
  // Determinar nivel de alerta según días restantes
  if (daysRemaining < 2) {
    return DeadlineAlertLevel.CRITICAL;
  } else if (daysRemaining < 5) {
    return DeadlineAlertLevel.URGENT;
  } else if (daysRemaining < 10) {
    return DeadlineAlertLevel.WARNING;
  } else {
    return DeadlineAlertLevel.INFO;
  }
}

/**
 * Obtiene información detallada sobre un plazo
 * @param startDate Fecha de inicio
 * @param stage Etapa del proceso
 * @param region Código de región (opcional)
 * @param extension Días adicionales por extensión de plazo (opcional)
 * @returns Información detallada del plazo
 */
export function getDeadlineInfo(
  startDate: Date,
  stage: string,
  region?: string,
  extension: number = 0
) {
  const currentDate = new Date();
  
  // Si la etapa no existe en los plazos legales
  if (!(stage in KARIN_LEGAL_DEADLINES)) {
    return {
      stage,
      hasDeadline: false,
      message: 'Etapa sin plazo legal definido'
    };
  }
  
  const stageInfo = KARIN_LEGAL_DEADLINES[stage];
  const deadline = calculateKarinDeadline(startDate, stage, region, extension);
  
  // Si usa días calendario
  if (stageInfo.calendarDays) {
    const timeDiff = deadline.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const alertLevel = daysRemaining < 0 
      ? DeadlineAlertLevel.OVERDUE
      : daysRemaining < 2 
        ? DeadlineAlertLevel.CRITICAL
        : daysRemaining < 5 
          ? DeadlineAlertLevel.URGENT
          : daysRemaining < 10 
            ? DeadlineAlertLevel.WARNING
            : DeadlineAlertLevel.INFO;
    
    return {
      stage,
      stageInfo,
      deadline,
      hasDeadline: true,
      daysRemaining,
      isOverdue: daysRemaining < 0,
      alertLevel,
      isCalendarDays: true,
      extension,
      totalDays: stageInfo.days + extension,
      baseDays: stageInfo.days,
      message: daysRemaining < 0
        ? `Vencido hace ${Math.abs(daysRemaining)} días calendario`
        : `${daysRemaining} días calendario restantes`,
      nextAction: stageInfo.nextAction,
      article: stageInfo.article
    };
  }
  
  // Para días hábiles
  const daysRemaining = getAdvancedBusinessDaysCount(
    currentDate,
    deadline,
    BusinessDayType.ADMINISTRATIVE,
    region
  );
  
  const alertLevel = getDeadlineAlertLevel(
    currentDate,
    deadline,
    BusinessDayType.ADMINISTRATIVE,
    region
  );
  
  return {
    stage,
    stageInfo,
    deadline,
    hasDeadline: true,
    daysRemaining,
    isOverdue: alertLevel === DeadlineAlertLevel.OVERDUE,
    alertLevel,
    isCalendarDays: false,
    extension,
    totalDays: stageInfo.days + extension,
    baseDays: stageInfo.days,
    message: alertLevel === DeadlineAlertLevel.OVERDUE
      ? `Vencido hace ${getAdvancedBusinessDaysCount(deadline, currentDate, BusinessDayType.ADMINISTRATIVE, region)} días hábiles`
      : `${daysRemaining} días hábiles restantes`,
    nextAction: stageInfo.nextAction,
    article: stageInfo.article
  };
}

/**
 * Solicita una extensión de plazo para una etapa de investigación Ley Karin
 * @param extensionRequest Datos de la solicitud de extensión
 * @returns Resultado de la operación
 */
export async function requestDeadlineExtension(
  extensionRequest: DeadlineExtensionRequest
) {
  try {
    // Verificar que la etapa permita extensiones
    const stage = extensionRequest.stage;
    if (!(stage in KARIN_LEGAL_DEADLINES) || !KARIN_LEGAL_DEADLINES[stage].extendable) {
      return {
        success: false,
        error: `La etapa "${stage}" no permite extensiones de plazo`
      };
    }
    
    // Verificar que no exceda la extensión máxima permitida
    const maxExtension = KARIN_LEGAL_DEADLINES[stage].maxExtensionDays || 0;
    if (extensionRequest.requestedDays > maxExtension) {
      return {
        success: false,
        error: `La extensión solicitada (${extensionRequest.requestedDays} días) excede el máximo permitido (${maxExtension} días)`
      };
    }
    
    // Crear la solicitud en Firestore
    const extensionRef = collection(
      db, 
      `companies/${extensionRequest.companyId}/reports/${extensionRequest.reportId}/deadline_extensions`
    );
    
    // Agregar timestamps
    const requestData = {
      ...extensionRequest,
      createdAt: serverTimestamp(),
      status: 'pending'
    };
    
    // Guardar la solicitud
    const docRef = await addDoc(extensionRef, requestData);
    
    return {
      success: true,
      extensionId: docRef.id,
      message: 'Solicitud de extensión creada exitosamente'
    };
  } catch (error) {
    console.error('Error al solicitar extensión de plazo:', error);
    return {
      success: false,
      error: 'Error al procesar la solicitud de extensión'
    };
  }
}

/**
 * Aprueba o rechaza una solicitud de extensión de plazo
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param extensionId ID de la solicitud de extensión
 * @param approval Datos de la aprobación
 * @returns Resultado de la operación
 */
export async function processDeadlineExtension(
  companyId: string,
  reportId: string,
  extensionId: string,
  approval: {
    approved: boolean;
    approvedBy: {
      uid: string;
      name: string;
      role: string;
    };
    comments?: string;
  }
) {
  try {
    // Obtener la solicitud
    const extensionRef = doc(
      db,
      `companies/${companyId}/reports/${reportId}/deadline_extensions/${extensionId}`
    );
    const extensionSnap = await getDoc(extensionRef);
    
    if (!extensionSnap.exists()) {
      return {
        success: false,
        error: 'Solicitud de extensión no encontrada'
      };
    }
    
    const extensionData = extensionSnap.data() as DeadlineExtensionRequest;
    
    // Si ya fue procesada, no permitir cambios
    if (extensionData.status !== 'pending') {
      return {
        success: false,
        error: `La solicitud ya fue ${extensionData.status === 'approved' ? 'aprobada' : 'rechazada'}`
      };
    }
    
    // Actualizar la solicitud con el resultado
    const updateData: any = {
      status: approval.approved ? 'approved' : 'rejected',
      approvedBy: approval.approvedBy,
      approvalDate: new Date(),
      comments: approval.comments || ''
    };
    
    // Si fue aprobada, calcular la nueva fecha límite
    if (approval.approved) {
      // Obtener la fecha límite actual
      const currentDeadline = new Date(extensionData.currentDeadline);
      
      // Calcular la nueva fecha límite
      const newDeadline = addAdvancedBusinessDays(
        currentDeadline,
        extensionData.requestedDays,
        BusinessDayType.ADMINISTRATIVE
      );
      
      updateData.newDeadline = newDeadline;
      
      // Actualizar el reporte con la nueva fecha límite
      const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        const reportData = reportSnap.data();
        
        // Actualizar la fecha límite de la etapa correspondiente
        const karinProcess = reportData.karinProcess || {};
        const deadlineFieldName = `${extensionData.stage}Deadline`;
        
        await updateDoc(reportRef, {
          [`karinProcess.${deadlineFieldName}`]: newDeadline,
          [`karinProcess.extensionApproved`]: true,
          [`karinProcess.extensionDays`]: extensionData.requestedDays,
          [`karinProcess.extensionJustification`]: extensionData.justification,
          [`karinProcess.extensionApprovedBy`]: approval.approvedBy.name,
          [`karinProcess.extensionApprovalDate`]: new Date()
        });
      }
    }
    
    // Guardar los cambios en la solicitud
    await updateDoc(extensionRef, updateData);
    
    return {
      success: true,
      message: approval.approved 
        ? 'Solicitud de extensión aprobada' 
        : 'Solicitud de extensión rechazada',
      newDeadline: updateData.newDeadline
    };
  } catch (error) {
    console.error('Error al procesar extensión de plazo:', error);
    return {
      success: false,
      error: 'Error al procesar la solicitud de extensión'
    };
  }
}

/**
 * Configura alertas escalonadas para un plazo
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param stage Etapa del proceso
 * @param deadline Fecha límite
 * @param recipients Destinatarios de las alertas (UIDs)
 * @returns Resultado de la operación
 */
export async function setupDeadlineAlerts(
  companyId: string,
  reportId: string,
  stage: string,
  deadline: Date,
  recipients: string[]
) {
  try {
    // Verificar parámetros
    if (!companyId || !reportId || !stage || !deadline) {
      return {
        success: false,
        error: 'Parámetros incompletos para configurar alertas'
      };
    }
    
    // Eliminar alertas existentes para esta etapa
    const alertsRef = collection(db, `companies/${companyId}/reports/${reportId}/deadline_alerts`);
    const existingAlertsQuery = query(alertsRef, where('stage', '==', stage), where('sent', '==', false));
    const existingAlertsSnap = await getDocs(existingAlertsQuery);
    
    // Eliminar alertas existentes (puede ser mejorado con una operación batch)
    const deletePromises = existingAlertsSnap.docs.map(doc => 
      updateDoc(doc.ref, { cancelled: true, cancelledAt: new Date() })
    );
    await Promise.all(deletePromises);
    
    // Configurar nuevas alertas
    const alerts: DeadlineAlert[] = [];
    const today = new Date();
    const stageInfo = KARIN_LEGAL_DEADLINES[stage] || {};
    
    // Alerta con 10 días de anticipación
    if (getAdvancedBusinessDaysCount(today, deadline, BusinessDayType.ADMINISTRATIVE) > 10) {
      const triggerDate = addAdvancedBusinessDays(deadline, -10, BusinessDayType.ADMINISTRATIVE);
      alerts.push({
        reportId,
        companyId,
        stage,
        deadline,
        level: DeadlineAlertLevel.INFO,
        recipients,
        triggerDate,
        title: `Recordatorio: ${stageInfo.description || stage}`,
        message: `Quedan 10 días hábiles para completar la etapa "${stageInfo.description || stage}". Próxima acción: ${stageInfo.nextAction || 'Completar la etapa'}`,
        sent: false
      });
    }
    
    // Alerta con 5 días de anticipación
    if (getAdvancedBusinessDaysCount(today, deadline, BusinessDayType.ADMINISTRATIVE) > 5) {
      const triggerDate = addAdvancedBusinessDays(deadline, -5, BusinessDayType.ADMINISTRATIVE);
      alerts.push({
        reportId,
        companyId,
        stage,
        deadline,
        level: DeadlineAlertLevel.WARNING,
        recipients,
        triggerDate,
        title: `Advertencia: ${stageInfo.description || stage}`,
        message: `Quedan 5 días hábiles para completar la etapa "${stageInfo.description || stage}". Próxima acción: ${stageInfo.nextAction || 'Completar la etapa'}`,
        sent: false
      });
    }
    
    // Alerta con 2 días de anticipación
    if (getAdvancedBusinessDaysCount(today, deadline, BusinessDayType.ADMINISTRATIVE) > 2) {
      const triggerDate = addAdvancedBusinessDays(deadline, -2, BusinessDayType.ADMINISTRATIVE);
      alerts.push({
        reportId,
        companyId,
        stage,
        deadline,
        level: DeadlineAlertLevel.URGENT,
        recipients,
        triggerDate,
        title: `¡Urgente! ${stageInfo.description || stage}`,
        message: `Quedan solo 2 días hábiles para completar la etapa "${stageInfo.description || stage}". ¡Acción inmediata requerida! ${stageInfo.nextAction || 'Completar la etapa'}`,
        sent: false
      });
    }
    
    // Alerta en el día límite
    if (getAdvancedBusinessDaysCount(today, deadline, BusinessDayType.ADMINISTRATIVE) >= 0) {
      alerts.push({
        reportId,
        companyId,
        stage,
        deadline,
        level: DeadlineAlertLevel.CRITICAL,
        recipients,
        triggerDate: deadline,
        title: `¡ÚLTIMO DÍA! ${stageInfo.description || stage}`,
        message: `Hoy es el último día para completar la etapa "${stageInfo.description || stage}". El plazo vence hoy. ${stageInfo.nextAction || 'Completar la etapa'} de inmediato.`,
        sent: false
      });
    }
    
    // Guardar las alertas en Firestore
    const savePromises = alerts.map(alert => addDoc(alertsRef, alert));
    await Promise.all(savePromises);
    
    return {
      success: true,
      message: `${alerts.length} alertas configuradas para la etapa "${stage}"`,
      alerts
    };
  } catch (error) {
    console.error('Error al configurar alertas de plazo:', error);
    return {
      success: false,
      error: 'Error al configurar las alertas de plazo'
    };
  }
}

/**
 * Obtiene todas las solicitudes de extensión de plazo para un reporte
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @returns Lista de solicitudes de extensión
 */
export async function getDeadlineExtensions(
  companyId: string,
  reportId: string
) {
  try {
    // Obtener las solicitudes de extensión
    const extensionsRef = collection(
      db, 
      `companies/${companyId}/reports/${reportId}/deadline_extensions`
    );
    const extensionsQuery = query(extensionsRef, orderBy('createdAt', 'desc'));
    const extensionsSnap = await getDocs(extensionsQuery);
    
    // Procesar los resultados
    const extensions = extensionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      success: true,
      extensions
    };
  } catch (error) {
    console.error('Error al obtener extensiones de plazo:', error);
    return {
      success: false,
      error: 'Error al obtener las solicitudes de extensión',
      extensions: []
    };
  }
}

/**
 * Obtiene todas las alertas de plazo para un reporte
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @param includeSent Incluir alertas ya enviadas
 * @returns Lista de alertas de plazo
 */
export async function getDeadlineAlerts(
  companyId: string,
  reportId: string,
  includeSent: boolean = false
) {
  try {
    // Obtener las alertas
    const alertsRef = collection(
      db, 
      `companies/${companyId}/reports/${reportId}/deadline_alerts`
    );
    
    let alertsQuery;
    if (includeSent) {
      alertsQuery = query(alertsRef, orderBy('triggerDate', 'asc'));
    } else {
      alertsQuery = query(alertsRef, where('sent', '==', false), orderBy('triggerDate', 'asc'));
    }
    
    const alertsSnap = await getDocs(alertsQuery);
    
    // Procesar los resultados
    const alerts = alertsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      success: true,
      alerts
    };
  } catch (error) {
    console.error('Error al obtener alertas de plazo:', error);
    return {
      success: false,
      error: 'Error al obtener las alertas de plazo',
      alerts: []
    };
  }
}

/**
 * Actualiza todos los plazos de un reporte de Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte
 * @returns Resultado de la operación
 */
export async function updateAllKarinDeadlines(
  companyId: string,
  reportId: string
) {
  try {
    // Obtener el reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'Reporte no encontrado'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Verificar que sea un reporte de Ley Karin
    if (!reportData.isKarinLaw) {
      return {
        success: false,
        error: 'El reporte no corresponde a Ley Karin'
      };
    }
    
    // Obtener los datos de proceso Karin
    const karinProcess = reportData.karinProcess || {};
    const currentStage = karinProcess.stage || 'complaint_filed';
    
    // Inicializar datos a actualizar
    const updateData: any = {};
    
    // Actualizar plazos según cada etapa
    Object.keys(KARIN_LEGAL_DEADLINES).forEach(stage => {
      // Obtener fecha inicial para esta etapa
      let startDate;
      
      switch (stage) {
        case 'reception':
          // La fecha de recepción es la fecha de creación del reporte
          startDate = reportData.createdAt?.toDate?.() || new Date(reportData.createdAt);
          break;
          
        case 'subsanation':
          // La fecha de inicio es cuando se solicitó la subsanación
          startDate = karinProcess.subsanationRequested 
            ? new Date(karinProcess.subsanationRequested)
            : null;
          break;
          
        case 'dt_notification':
        case 'suseso_notification':
        case 'precautionary_measures':
          // Inician desde la recepción de la denuncia
          startDate = karinProcess.receivedDate 
            ? new Date(karinProcess.receivedDate)
            : reportData.createdAt?.toDate?.() || new Date(reportData.createdAt);
          break;
          
        case 'investigation':
          // Inicia desde la decisión de investigar
          startDate = karinProcess.decisionToInvestigateDate
            ? new Date(karinProcess.decisionToInvestigateDate)
            : karinProcess.investigationStartDate
              ? new Date(karinProcess.investigationStartDate)
              : null;
          break;
          
        case 'dt_submission':
          // Inicia desde la finalización de la investigación
          startDate = karinProcess.investigationCompleteDate
            ? new Date(karinProcess.investigationCompleteDate)
            : null;
          break;
          
        case 'dt_resolution':
          // Inicia desde el envío del expediente a la DT
          startDate = karinProcess.laborDepartmentReferralDate
            ? new Date(karinProcess.laborDepartmentReferralDate)
            : null;
          break;
          
        case 'measures_adoption':
          // Inicia desde la resolución de la DT
          startDate = karinProcess.laborDepartmentResponseDate
            ? new Date(karinProcess.laborDepartmentResponseDate)
            : null;
          break;
          
        default:
          startDate = null;
      }
      
      // Si hay fecha de inicio, calcular la fecha límite
      if (startDate) {
        // Verificar si hay extensión aprobada para esta etapa
        const extensionDays = 
          stage === 'investigation' && karinProcess.extensionApproved
            ? karinProcess.extensionDays || 0
            : 0;
        
        // Calcular la fecha límite
        const deadline = calculateKarinDeadline(startDate, stage, undefined, extensionDays);
        
        // Guardar la fecha límite
        updateData[`karinProcess.${stage}Deadline`] = deadline;
      }
    });
    
    // Actualizar el reporte con los nuevos plazos
    await updateDoc(reportRef, updateData);
    
    // Configurar alertas para la etapa actual
    const currentDeadlineField = `${currentStage}Deadline`;
    if (updateData[`karinProcess.${currentDeadlineField}`]) {
      // Obtener los destinatarios de las alertas (asignados al caso e investigadores)
      const recipients = [];
      
      if (reportData.assignedTo) {
        recipients.push(reportData.assignedTo);
      }
      
      // Agregar investigadores adicionales si existen
      if (reportData.investigators && Array.isArray(reportData.investigators)) {
        reportData.investigators.forEach((investigator: any) => {
          if (investigator.uid && !recipients.includes(investigator.uid)) {
            recipients.push(investigator.uid);
          }
        });
      }
      
      // Configurar alertas para la etapa actual
      if (recipients.length > 0) {
        await setupDeadlineAlerts(
          companyId,
          reportId,
          currentStage,
          updateData[`karinProcess.${currentDeadlineField}`],
          recipients
        );
      }
    }
    
    return {
      success: true,
      message: 'Plazos actualizados correctamente',
      updatedDeadlines: updateData
    };
  } catch (error) {
    console.error('Error al actualizar plazos:', error);
    return {
      success: false,
      error: 'Error al actualizar los plazos del reporte'
    };
  }
}