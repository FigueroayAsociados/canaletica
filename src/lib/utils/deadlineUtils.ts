// src/lib/utils/deadlineUtils.ts
import { KarinDeadline, DeadlineStatus, DEFAULT_KARIN_DEADLINES } from '@/types/report';
import { 
  isBusinessDay, 
  addBusinessDays, 
  getBusinessDaysCount, 
  calculateDeadline, 
  checkDeadlineStatus 
} from './dateUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Inicializa todos los plazos legales para un caso de Ley Karin
 * @param startDate Fecha de inicio del caso (generalmente fecha de recepción)
 * @returns Array de plazos con fechas calculadas
 */
export function initializeKarinDeadlines(startDate: Date): KarinDeadline[] {
  const deadlines: KarinDeadline[] = [];
  
  // Convertir la fecha de inicio a string ISO para consistencia
  const startDateStr = startDate.toISOString();
  
  // Para cada plazo predefinido, calcular fechas y crear objeto completo
  DEFAULT_KARIN_DEADLINES.forEach(deadlineTemplate => {
    // Manejo especial para adopción de medidas que es en días corridos
    let endDate: Date;
    if (deadlineTemplate.name === 'Adopción de medidas') {
      // 15 días corridos (no hábiles)
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 15);
    } else {
      // Añadir días hábiles según corresponda
      endDate = addBusinessDays(startDate, deadlineTemplate.businessDays);
    }
    
    // Crear el plazo completo
    const deadline: KarinDeadline = {
      id: uuidv4(),
      name: deadlineTemplate.name,
      description: deadlineTemplate.description,
      startDate: startDateStr,
      endDate: endDate.toISOString(),
      businessDays: deadlineTemplate.businessDays,
      status: 'ok', // Estado inicial
      daysRemaining: getBusinessDaysCount(new Date(), endDate),
      isLegalRequirement: deadlineTemplate.isLegalRequirement,
      legalReference: deadlineTemplate.legalReference,
      associatedStage: deadlineTemplate.associatedStage,
      priority: deadlineTemplate.priority || 'medium',
      notificationsEnabled: true,
      progressPercentage: 0
    };
    
    deadlines.push(deadline);
  });
  
  return deadlines;
}

/**
 * Actualiza el estado de todos los plazos
 * @param deadlines Array de plazos a actualizar
 * @returns Array de plazos con estado actualizado
 */
export function updateDeadlinesStatus(deadlines: KarinDeadline[]): KarinDeadline[] {
  const now = new Date();
  
  return deadlines.map(deadline => {
    // Validar que el deadline tenga propiedades esenciales
    if (!deadline || !deadline.id || !deadline.endDate) {
      console.warn('Deadline inválido encontrado:', deadline);
      return deadline; // Devolver el deadline tal como está para evitar errores
    }
    
    // Si ya está completado, mantener ese estado
    if (deadline.status === 'completed') {
      return deadline;
    }
    
    // Si está prorrogado, utilizar la fecha original o la fecha final
    const endDate = new Date(deadline.isExtended && deadline.originalEndDate ? deadline.originalEndDate : deadline.endDate);
    
    // Para deadlines en días corridos (adopción de medidas)
    if (deadline.name === 'Adopción de medidas') {
      const timeDiff = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      let status: DeadlineStatus = 'ok';
      if (now > endDate) {
        status = 'expired';
      } else if (daysRemaining <= 1) {
        status = 'critical';
      } else if (daysRemaining <= 3) {
        status = 'warning';
      }
      
      return {
        ...deadline,
        status,
        daysRemaining: daysRemaining ?? 0
      };
    }
    
    // Para todos los demás plazos en días hábiles
    const status = checkDeadlineStatus(endDate, 3);
    
    return {
      ...deadline,
      status: status.status as DeadlineStatus,
      daysRemaining: status.daysRemaining ?? 0
    };
  });
}

/**
 * Marca un plazo como completado
 * @param deadlines Array de plazos
 * @param deadlineId ID del plazo a marcar como completado
 * @param userId ID del usuario que completó el plazo
 * @returns Array de plazos actualizado
 */
export function completeDeadline(
  deadlines: KarinDeadline[], 
  deadlineId: string, 
  userId: string
): KarinDeadline[] {
  return deadlines.map(deadline => {
    if (deadline.id === deadlineId) {
      return {
        ...deadline,
        status: 'completed',
        completedDate: new Date().toISOString(),
        completedBy: userId,
        progressPercentage: 100
      };
    }
    return deadline;
  });
}

/**
 * Extiende un plazo añadiendo más días
 * @param deadlines Array de plazos
 * @param deadlineId ID del plazo a extender
 * @param additionalDays Días adicionales
 * @param reason Razón de la extensión
 * @param approvedBy ID del usuario que aprobó la extensión
 * @returns Array de plazos actualizado
 */
export function extendDeadline(
  deadlines: KarinDeadline[],
  deadlineId: string,
  additionalDays: number,
  reason: string,
  approvedBy: string
): KarinDeadline[] {
  return deadlines.map(deadline => {
    if (deadline.id === deadlineId) {
      const originalEndDate = new Date(deadline.endDate);
      let newEndDate: Date;
      
      // Manejo especial para días corridos vs días hábiles
      if (deadline.name === 'Adopción de medidas') {
        newEndDate = new Date(originalEndDate);
        newEndDate.setDate(newEndDate.getDate() + additionalDays);
      } else {
        newEndDate = addBusinessDays(originalEndDate, additionalDays);
      }
      
      return {
        ...deadline,
        endDate: newEndDate.toISOString(),
        isExtended: true,
        originalEndDate: originalEndDate.toISOString(),
        extensionReason: reason,
        extensionApprovedBy: approvedBy,
        status: 'extended'
      };
    }
    return deadline;
  });
}

/**
 * Actualiza el progreso de un plazo
 * @param deadlines Array de plazos
 * @param deadlineId ID del plazo a actualizar
 * @param progressPercentage Porcentaje de progreso (0-100)
 * @returns Array de plazos actualizado
 */
export function updateDeadlineProgress(
  deadlines: KarinDeadline[],
  deadlineId: string,
  progressPercentage: number
): KarinDeadline[] {
  return deadlines.map(deadline => {
    if (deadline.id === deadlineId) {
      return {
        ...deadline,
        progressPercentage: Math.min(100, Math.max(0, progressPercentage))
      };
    }
    return deadline;
  });
}

/**
 * Registra el envío de una notificación para un plazo
 * @param deadlines Array de plazos
 * @param deadlineId ID del plazo
 * @param recipientId ID del destinatario
 * @param notificationType Tipo de notificación
 * @returns Array de plazos actualizado
 */
export function registerDeadlineNotification(
  deadlines: KarinDeadline[],
  deadlineId: string,
  recipientId: string,
  notificationType: 'email' | 'system' | 'sms'
): KarinDeadline[] {
  return deadlines.map(deadline => {
    if (deadline.id === deadlineId) {
      const notificationsSent = deadline.notificationsSent || [];
      
      return {
        ...deadline,
        notificationsSent: [
          ...notificationsSent,
          {
            date: new Date().toISOString(),
            recipient: recipientId,
            type: notificationType
          }
        ]
      };
    }
    return deadline;
  });
}

/**
 * Filtra plazos por estado
 * @param deadlines Array de plazos
 * @param status Estado a filtrar
 * @returns Array de plazos filtrados
 */
export function filterDeadlinesByStatus(
  deadlines: KarinDeadline[],
  status: DeadlineStatus
): KarinDeadline[] {
  return deadlines.filter(deadline => deadline.status === status);
}

/**
 * Obtiene plazos próximos a vencer (warning o critical)
 * @param deadlines Array de plazos
 * @returns Array de plazos próximos a vencer
 */
export function getUpcomingDeadlines(deadlines: KarinDeadline[]): KarinDeadline[] {
  return deadlines.filter(deadline => 
    deadline.status === 'warning' || deadline.status === 'critical'
  );
}

/**
 * Obtiene plazos vencidos
 * @param deadlines Array de plazos
 * @returns Array de plazos vencidos
 */
export function getExpiredDeadlines(deadlines: KarinDeadline[]): KarinDeadline[] {
  return deadlines.filter(deadline => deadline.status === 'expired');
}

/**
 * Obtiene plazos para una etapa específica
 * @param deadlines Array de plazos
 * @param stage Etapa del proceso
 * @returns Array de plazos de la etapa
 */
export function getDeadlinesForStage(
  deadlines: KarinDeadline[],
  stage: string
): KarinDeadline[] {
  return deadlines.filter(deadline => deadline.associatedStage === stage);
}

/**
 * Actualiza notas de un plazo
 * @param deadlines Array de plazos
 * @param deadlineId ID del plazo
 * @param notes Notas nuevas
 * @returns Array de plazos actualizado
 */
export function updateDeadlineNotes(
  deadlines: KarinDeadline[],
  deadlineId: string,
  notes: string
): KarinDeadline[] {
  return deadlines.map(deadline => {
    if (deadline.id === deadlineId) {
      return {
        ...deadline,
        notes
      };
    }
    return deadline;
  });
}

/**
 * Añade un nuevo plazo personalizado 
 * @param deadlines Array de plazos existentes
 * @param newDeadline Nuevo plazo a añadir
 * @returns Array de plazos actualizado
 */
export function addCustomDeadline(
  deadlines: KarinDeadline[],
  newDeadline: Partial<KarinDeadline>
): KarinDeadline[] {
  // Validar campos requeridos
  if (!newDeadline.name || !newDeadline.startDate || !newDeadline.businessDays) {
    throw new Error('Se requieren nombre, fecha de inicio y días hábiles para crear un plazo');
  }
  
  const startDate = new Date(newDeadline.startDate);
  const endDate = newDeadline.businessDays === 0 
    ? startDate // Si es 0, usar la misma fecha
    : addBusinessDays(startDate, newDeadline.businessDays);
  
  const fullDeadline: KarinDeadline = {
    id: uuidv4(),
    name: newDeadline.name,
    description: newDeadline.description || 'Plazo personalizado',
    startDate: newDeadline.startDate,
    endDate: endDate.toISOString(),
    businessDays: newDeadline.businessDays,
    status: 'ok',
    daysRemaining: getBusinessDaysCount(new Date(), endDate),
    isLegalRequirement: newDeadline.isLegalRequirement || false,
    legalReference: newDeadline.legalReference,
    associatedStage: newDeadline.associatedStage || 'investigation',
    priority: newDeadline.priority || 'medium',
    notificationsEnabled: newDeadline.notificationsEnabled || false,
    progressPercentage: 0
  };
  
  return [...deadlines, fullDeadline];
}

/**
 * Calcula el próximo plazo crítico
 * @param deadlines Array de plazos
 * @returns Plazo más próximo a vencer o null si no hay ninguno
 */
export function getNextCriticalDeadline(deadlines: KarinDeadline[]): KarinDeadline | null {
  // Filtrar solo plazos activos (no completados ni expirados)
  const activeDeadlines = deadlines.filter(d => 
    d.status !== 'completed' && d.status !== 'expired'
  );
  
  if (activeDeadlines.length === 0) {
    return null;
  }
  
  // Ordenar por días restantes (ascendente)
  return activeDeadlines.sort((a, b) => {
    // Usar 0 si daysRemaining es undefined
    const aDays = a.daysRemaining ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.daysRemaining ?? Number.MAX_SAFE_INTEGER;
    return aDays - bDays;
  })[0];
}

/**
 * Genera un reporte resumido del estado de los plazos
 * @param deadlines Array de plazos
 * @returns Objeto con estadísticas de plazos
 */
export function generateDeadlinesReport(deadlines: KarinDeadline[]) {
  const total = deadlines.length;
  const completed = deadlines.filter(d => d.status === 'completed').length;
  const expired = deadlines.filter(d => d.status === 'expired').length;
  const critical = deadlines.filter(d => d.status === 'critical').length;
  const warning = deadlines.filter(d => d.status === 'warning').length;
  const extended = deadlines.filter(d => d.status === 'extended').length;
  const ok = deadlines.filter(d => d.status === 'ok').length;
  const nextDeadline = getNextCriticalDeadline(deadlines);
  
  return {
    total,
    completed,
    expired,
    critical,
    warning,
    extended,
    ok,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    complianceRate: total > 0 ? Math.round(((completed + ok) / total) * 100) : 0, 
    nextDeadline
  };
}