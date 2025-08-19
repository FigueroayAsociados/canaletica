// src/lib/services/karinProcessService.ts
// Servicio unificado para gestión del proceso Ley Karin
// REEMPLAZA: KarinTimeline, KarinStageManager, KarinDeadlinesTimeline, UnifiedKarinController

import { 
  KarinProcessStage, 
  KarinDeadline, 
  DEFAULT_KARIN_DEADLINES,
  DeadlineStatus 
} from '@/types/report';
import { addBusinessDays, BusinessDayType } from '@/lib/utils/dateUtils';
import { isAfter, isBefore, format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

// Flujo de etapas correcto según normativa Ley Karin N° 21.643
const KARIN_STAGE_FLOW: Record<KarinProcessStage, KarinProcessStage | null> = {
  'reception': 'subsanation', // Puede ir a subsanación si falta información
  'subsanation': 'precautionary_measures', // Tras subsanación, medidas de resguardo
  'precautionary_measures': 'dt_notification', // Notificar a DT
  'dt_notification': 'investigation', // Iniciar investigación
  'investigation': 'investigation_extension', // Prórroga (opcional) o directo a finalización
  'investigation_extension': 'report_creation', // Tras prórroga, crear informe
  'report_creation': 'report_approval', // Aprobar informe
  'report_approval': 'dt_submission', // Enviar a DT
  'dt_submission': 'dt_resolution', // DT se pronuncia
  'dt_resolution': 'measures_adoption', // Adoptar medidas
  'measures_adoption': 'sanctions', // Aplicar sanciones
  'sanctions': 'final_closure', // Cierre final
  'final_closure': null // Proceso terminado
};

// Etapas que pueden ser saltadas según las circunstancias
const OPTIONAL_STAGES: KarinProcessStage[] = [
  'subsanation', // Solo si la denuncia requiere subsanación
  'investigation_extension', // Solo si se solicita prórroga
  'sanctions' // Solo si se aplican sanciones
];

interface KarinProcessContext {
  reportId: string;
  companyId: string;
  currentStage: KarinProcessStage;
  receptionDate: string;
  requiresSubsanation: boolean;
  isDirectToDT: boolean; // Derivación directa a DT (Art. 4° CT)
  extensionRequested: boolean;
}

/**
 * Servicio unificado para gestión completa del proceso Ley Karin
 */
export class KarinProcessService {
  
  /**
   * Calcula todos los plazos aplicables para un caso específico
   */
  static calculateApplicableDeadlines(context: KarinProcessContext): KarinDeadline[] {
    const applicableDeadlines: KarinDeadline[] = [];
    const baseDate = new Date(context.receptionDate);

    // Determinar qué plazos aplican según el contexto
    DEFAULT_KARIN_DEADLINES.forEach((deadlineTemplate, index) => {
      const shouldInclude = this.shouldIncludeDeadline(deadlineTemplate, context);
      
      if (shouldInclude) {
        const deadline = this.createDeadlineInstance(
          deadlineTemplate, 
          context, 
          baseDate,
          `${context.reportId}-deadline-${index}`
        );
        applicableDeadlines.push(deadline);
      }
    });

    return applicableDeadlines.sort((a, b) => 
      new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );
  }

  /**
   * Determina si un plazo debe incluirse según el contexto del caso
   */
  private static shouldIncludeDeadline(
    deadline: Partial<KarinDeadline>, 
    context: KarinProcessContext
  ): boolean {
    // Si es derivación directa a DT, saltarse investigación interna
    if (context.isDirectToDT && deadline.associatedStage === 'investigation') {
      return false;
    }

    // Subsanación solo si se requiere
    if (deadline.associatedStage === 'subsanation' && !context.requiresSubsanation) {
      return false;
    }

    // Prórroga solo si se solicita
    if (deadline.associatedStage === 'investigation_extension' && !context.extensionRequested) {
      return false;
    }

    return true;
  }

  /**
   * Crea una instancia específica de deadline con fechas calculadas
   */
  private static createDeadlineInstance(
    template: Partial<KarinDeadline>,
    context: KarinProcessContext,
    baseDate: Date,
    id: string
  ): KarinDeadline {
    const startDate = this.calculateStartDate(template, context, baseDate);
    const endDate = this.calculateEndDate(template, startDate);

    return {
      id,
      name: template.name!,
      description: template.description!,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      businessDays: template.businessDays!,
      calendarDays: template.calendarDays,
      status: this.calculateDeadlineStatus(endDate),
      daysRemaining: this.calculateDaysRemaining(endDate, template.businessDays!, template.calendarDays),
      isLegalRequirement: template.isLegalRequirement!,
      legalReference: template.legalReference,
      associatedStage: template.associatedStage!,
      priority: template.priority!,
      notificationsEnabled: true
    };
  }

  /**
   * Calcula fecha de inicio según el tipo de plazo
   */
  private static calculateStartDate(
    template: Partial<KarinDeadline>,
    context: KarinProcessContext,
    baseDate: Date
  ): Date {
    switch (template.associatedStage) {
      case 'subsanation':
      case 'precautionary_measures':
      case 'dt_notification':
        return baseDate; // Desde recepción

      case 'investigation':
        // Si hay subsanación, desde subsanación; sino desde recepción
        if (context.requiresSubsanation) {
          return addBusinessDays(baseDate, 5, BusinessDayType.ADMINISTRATIVE);
        }
        return baseDate;

      case 'investigation_extension':
        // Desde 30 días después del inicio de investigación
        return addBusinessDays(baseDate, 30, BusinessDayType.ADMINISTRATIVE);

      case 'dt_submission':
        // Desde finalización de investigación (30 o 60 días según prórroga)
        const investigationDays = context.extensionRequested ? 60 : 30;
        return addBusinessDays(baseDate, investigationDays, BusinessDayType.ADMINISTRATIVE);

      case 'measures_adoption':
        // 15 días CORRIDOS desde pronunciamiento DT (o desde vencimiento si no hay pronunciamiento)
        const dtDeadline = addBusinessDays(baseDate, 32, BusinessDayType.ADMINISTRATIVE); // 2 días envío + 30 días pronunciamiento
        return dtDeadline;

      default:
        return baseDate;
    }
  }

  /**
   * Calcula fecha de vencimiento según tipo de días
   */
  private static calculateEndDate(
    template: Partial<KarinDeadline>,
    startDate: Date
  ): Date {
    // Si especifica días corridos, usar días de calendario
    if (template.calendarDays && template.calendarDays > 0) {
      return addDays(startDate, template.calendarDays);
    }

    // Por defecto usar días hábiles administrativos
    return addBusinessDays(startDate, template.businessDays!, BusinessDayType.ADMINISTRATIVE);
  }

  /**
   * Calcula estado del plazo según fecha actual
   */
  private static calculateDeadlineStatus(endDate: Date): DeadlineStatus {
    const now = new Date();
    const warningDate = addDays(endDate, -2); // Alerta 2 días antes

    if (isAfter(now, endDate)) {
      return 'overdue';
    } else if (isAfter(now, warningDate)) {
      return 'warning';
    } else {
      return 'active';
    }
  }

  /**
   * Calcula días restantes considerando tipo de días
   */
  private static calculateDaysRemaining(
    endDate: Date, 
    businessDays: number, 
    calendarDays?: number
  ): number {
    const now = new Date();
    
    if (isAfter(now, endDate)) {
      return 0;
    }

    // Si son días corridos, calcular diferencia simple
    if (calendarDays && calendarDays > 0) {
      return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Para días hábiles, usar utilidad específica
    // TODO: Implementar cálculo de días hábiles restantes
    return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene la siguiente etapa válida del proceso
   */
  static getNextStage(
    currentStage: KarinProcessStage, 
    context: Partial<KarinProcessContext>
  ): KarinProcessStage | null {
    let nextStage = KARIN_STAGE_FLOW[currentStage];

    // Saltar etapas opcionales según contexto
    while (nextStage && this.shouldSkipStage(nextStage, context)) {
      nextStage = KARIN_STAGE_FLOW[nextStage];
    }

    return nextStage;
  }

  /**
   * Determina si una etapa debe ser saltada
   */
  private static shouldSkipStage(
    stage: KarinProcessStage, 
    context: Partial<KarinProcessContext>
  ): boolean {
    switch (stage) {
      case 'subsanation':
        return !context.requiresSubsanation;
      
      case 'investigation_extension':
        return !context.extensionRequested;
      
      case 'investigation':
        return context.isDirectToDT === true;
      
      default:
        return false;
    }
  }

  /**
   * Valida si se puede avanzar a la siguiente etapa
   */
  static canAdvanceToNextStage(
    currentStage: KarinProcessStage,
    deadlines: KarinDeadline[]
  ): { canAdvance: boolean; reason?: string; pendingDeadlines?: KarinDeadline[] } {
    const currentStageDeadlines = deadlines.filter(d => 
      d.associatedStage === currentStage && 
      d.isLegalRequirement &&
      d.status !== 'completed'
    );

    if (currentStageDeadlines.length > 0) {
      return {
        canAdvance: false,
        reason: 'Hay plazos legales pendientes para la etapa actual',
        pendingDeadlines: currentStageDeadlines
      };
    }

    return { canAdvance: true };
  }

  /**
   * Calcula el progreso general del proceso (0-100%)
   */
  static calculateProcessProgress(
    currentStage: KarinProcessStage,
    deadlines: KarinDeadline[]
  ): number {
    const allStages = Object.keys(KARIN_STAGE_FLOW);
    const currentStageIndex = allStages.indexOf(currentStage);
    const completedDeadlines = deadlines.filter(d => d.status === 'completed').length;
    const totalDeadlines = deadlines.length;

    // Progreso basado en etapa (70%) + progreso de plazos completados (30%)
    const stageProgress = (currentStageIndex / allStages.length) * 70;
    const deadlineProgress = totalDeadlines > 0 ? (completedDeadlines / totalDeadlines) * 30 : 0;

    return Math.round(stageProgress + deadlineProgress);
  }

  /**
   * Obtiene alertas críticas del proceso
   */
  static getCriticalAlerts(deadlines: KarinDeadline[]): Array<{
    type: 'overdue' | 'warning' | 'critical';
    message: string;
    deadline: KarinDeadline;
  }> {
    const alerts: Array<{
      type: 'overdue' | 'warning' | 'critical';
      message: string;
      deadline: KarinDeadline;
    }> = [];

    deadlines.forEach(deadline => {
      if (deadline.status === 'overdue' && deadline.isLegalRequirement) {
        alerts.push({
          type: 'overdue',
          message: `Plazo vencido: ${deadline.name}`,
          deadline
        });
      } else if (deadline.status === 'warning' && deadline.priority === 'high') {
        alerts.push({
          type: 'warning',
          message: `Plazo próximo a vencer: ${deadline.name}`,
          deadline
        });
      }
    });

    return alerts.sort((a, b) => {
      const priority = { 'overdue': 3, 'critical': 2, 'warning': 1 };
      return priority[b.type] - priority[a.type];
    });
  }

  /**
   * Genera resumen ejecutivo del estado del proceso
   */
  static generateExecutiveSummary(
    context: KarinProcessContext,
    deadlines: KarinDeadline[]
  ): {
    currentStage: string;
    progress: number;
    nextDeadline: KarinDeadline | null;
    criticalAlerts: number;
    estimatedCompletionDate: string;
    complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
  } {
    const progress = this.calculateProcessProgress(context.currentStage, deadlines);
    const alerts = this.getCriticalAlerts(deadlines);
    const nextDeadline = deadlines.find(d => d.status === 'active') || null;
    
    // Estimar fecha de finalización (último deadline activo)
    const lastDeadline = deadlines[deadlines.length - 1];
    const estimatedCompletionDate = lastDeadline ? 
      format(new Date(lastDeadline.endDate), 'dd \'de\' MMMM \'de\' yyyy', { locale: es }) : 
      'No determinada';

    // Estado de cumplimiento
    let complianceStatus: 'compliant' | 'at_risk' | 'non_compliant' = 'compliant';
    if (alerts.some(a => a.type === 'overdue')) {
      complianceStatus = 'non_compliant';
    } else if (alerts.some(a => a.type === 'warning')) {
      complianceStatus = 'at_risk';
    }

    return {
      currentStage: this.getStageDisplayName(context.currentStage),
      progress,
      nextDeadline,
      criticalAlerts: alerts.length,
      estimatedCompletionDate,
      complianceStatus
    };
  }

  /**
   * Obtiene nombre amigable para mostrar en UI
   */
  static getStageDisplayName(stage: KarinProcessStage): string {
    const stageNames: Record<KarinProcessStage, string> = {
      'reception': 'Recepción de Denuncia',
      'subsanation': 'Subsanación',
      'precautionary_measures': 'Medidas de Resguardo',
      'dt_notification': 'Notificación a DT',
      'investigation': 'Investigación Interna',
      'investigation_extension': 'Prórroga de Investigación',
      'report_creation': 'Creación de Informe',
      'report_approval': 'Aprobación de Informe',
      'dt_submission': 'Remisión a DT',
      'dt_resolution': 'Pronunciamiento DT',
      'measures_adoption': 'Adopción de Medidas',
      'sanctions': 'Aplicación de Sanciones',
      'final_closure': 'Cierre Final'
    };

    return stageNames[stage] || stage;
  }
}

export default KarinProcessService;