// src/types/karinDeadlines.ts

import { DeadlineAlertLevel } from '@/lib/services/karinDeadlinesService';

/**
 * Etapas del proceso de Ley Karin
 */
export enum KarinProcessStage {
  COMPLAINT_FILED = 'complaint_filed',         // Interposición de denuncia
  RECEPTION = 'reception',                    // Recepción de denuncia
  SUBSANATION = 'subsanation',                // Subsanación de denuncia
  DT_NOTIFICATION = 'dt_notification',        // Notificación a DT
  SUSESO_NOTIFICATION = 'suseso_notification', // Notificación a SUSESO/Mutualidad
  PRECAUTIONARY_MEASURES = 'precautionary_measures', // Medidas precautorias
  DECISION_TO_INVESTIGATE = 'decision_to_investigate', // Decisión de investigar
  INVESTIGATION = 'investigation',            // Investigación
  REPORT_CREATION = 'report_creation',        // Creación de informe preliminar
  REPORT_APPROVAL = 'report_approval',        // Revisión interna del informe
  INVESTIGATION_COMPLETE = 'investigation_complete', // Investigación completa
  FINAL_REPORT = 'final_report',              // Creación de informe final
  DT_SUBMISSION = 'dt_submission',            // Envío formal a DT
  DT_RESOLUTION = 'dt_resolution',            // Resolución de la DT
  MEASURES_ADOPTION = 'measures_adoption',    // Adopción de medidas
  SANCTIONS = 'sanctions',                    // Sanciones
  THIRD_PARTY = 'third_party',                // Caso con terceros
  SUBCONTRACTING = 'subcontracting',          // Régimen de subcontratación
  CLOSED = 'closed'                           // Caso cerrado
}

/**
 * Interfaz para un plazo legal de Ley Karin
 */
export interface KarinLegalDeadline {
  stage: string;                // Etapa del proceso
  days: number;                 // Días de plazo
  description: string;          // Descripción del plazo
  nextAction: string;           // Próxima acción a realizar
  article: string;              // Artículo de la ley
  extendable?: boolean;         // Si se puede extender
  maxExtensionDays?: number;    // Máximo de días de extensión
  externalEntity?: boolean;     // Si depende de entidad externa
  calendarDays?: boolean;       // Si son días calendario (no hábiles)
}

/**
 * Interfaz para información detallada de un plazo
 */
export interface DeadlineInfo {
  stage: string;                  // Etapa del proceso
  stageInfo?: KarinLegalDeadline; // Información del plazo legal
  deadline?: Date;                // Fecha límite
  hasDeadline: boolean;           // Si tiene fecha límite
  daysRemaining?: number;         // Días restantes
  isOverdue?: boolean;            // Si está vencido
  alertLevel?: DeadlineAlertLevel; // Nivel de alerta
  isCalendarDays?: boolean;       // Si son días calendario
  extension?: number;             // Días de extensión
  totalDays?: number;             // Total de días (original + extensión)
  baseDays?: number;              // Días base (sin extensión)
  message?: string;               // Mensaje para mostrar
  nextAction?: string;            // Próxima acción a realizar
  article?: string;               // Artículo de la ley
  isCurrentStage?: boolean;       // Si es la etapa actual
}

/**
 * Interfaz para solicitud de extensión de plazo
 */
export interface DeadlineExtensionRequest {
  id?: string;                     // ID de la solicitud
  reportId: string;                // ID del reporte
  companyId: string;               // ID de la compañía
  stage: string;                   // Etapa del proceso
  currentDeadline: Date;           // Fecha límite actual
  requestedDays: number;           // Días solicitados
  justification: string;           // Justificación
  requestedBy: {                   // Solicitante
    uid: string;
    name: string;
    role: string;
  };
  status: 'pending' | 'approved' | 'rejected'; // Estado
  createdAt?: any;                 // Fecha de creación
  approvedBy?: {                   // Aprobador
    uid: string;
    name: string;
    role: string;
  };
  approvalDate?: Date;             // Fecha de aprobación
  newDeadline?: Date;              // Nueva fecha límite
  comments?: string;               // Comentarios adicionales
}

/**
 * Interfaz para alerta de plazo
 */
export interface DeadlineAlert {
  id?: string;                     // ID de la alerta
  reportId: string;                // ID del reporte
  companyId: string;               // ID de la compañía
  stage: string;                   // Etapa del proceso
  deadline: Date;                  // Fecha límite
  level: DeadlineAlertLevel;       // Nivel de alerta
  recipients: string[];            // Destinatarios (UIDs)
  triggerDate: Date;               // Fecha de disparo
  title: string;                   // Título
  message: string;                 // Mensaje
  sent: boolean;                   // Si fue enviada
  sentDate?: Date;                 // Fecha de envío
  cancelled?: boolean;             // Si fue cancelada
  cancelledAt?: Date;              // Fecha de cancelación
}