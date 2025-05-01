// src/lib/services/alertService.ts

import { getFeatureFlags } from '@/lib/services/featureFlagService';
import { normalizeCompanyId } from '@/lib/utils/helpers';
import { 
  addDoc,
  collection, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  serverTimestamp, 
  updateDoc, 
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Tipos de alertas inteligentes
 */
export type AlertType = 
  | 'deadline'      // Alerta de plazo próximo a vencer
  | 'risk'          // Alerta de riesgo detectado
  | 'pattern'       // Alerta de patrón detectado
  | 'compliance'    // Alerta de cumplimiento normativo
  | 'suggestion'    // Sugerencia de mejora
  | 'system';       // Alerta de sistema

/**
 * Niveles de urgencia para alertas
 */
export type AlertUrgency = 'high' | 'medium' | 'low';

/**
 * Estado de la alerta
 */
export type AlertStatus = 'new' | 'viewed' | 'dismissed' | 'actioned';

/**
 * Interfaz para alertas inteligentes
 */
export interface SmartAlert {
  id?: string;
  type: AlertType;
  title: string;
  description: string;
  urgency: AlertUrgency;
  status: AlertStatus;
  createdAt: Timestamp | Date;
  viewedAt?: Timestamp | Date;
  dismissedAt?: Timestamp | Date;
  actionedAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  userId?: string;
  relatedReportId?: string;
  relatedEntityId?: string;
  actionRequired: boolean;
  actionText?: string;
  actionLink?: string;
  metadata?: Record<string, any>;
}

/**
 * Parámetros para buscar alertas
 */
export interface GetAlertsParams {
  userId?: string;
  status?: AlertStatus | AlertStatus[];
  type?: AlertType | AlertType[];
  urgency?: AlertUrgency | AlertUrgency[];
  includeExpired?: boolean;
  limit?: number;
}

/**
 * Servicio para gestionar alertas inteligentes
 */
export const alertService = {
  /**
   * Obtiene las alertas para un usuario o empresa
   */
  async getAlerts(
    companyId: string,
    params: GetAlertsParams = {}
  ): Promise<{ success: boolean; alerts?: SmartAlert[]; error?: string }> {
    try {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      
      // Crear referencia a la colección de alertas
      const alertsRef = collection(db, `companies/${normalizedCompanyId}/alerts`);
      
      // Construir consulta con filtros
      let q = query(alertsRef);
      
      // Filtrar por usuario si se especifica
      if (params.userId) {
        q = query(q, where('userId', '==', params.userId));
      }
      
      // Filtrar por estado
      if (params.status) {
        if (Array.isArray(params.status)) {
          q = query(q, where('status', 'in', params.status));
        } else {
          q = query(q, where('status', '==', params.status));
        }
      }
      
      // Filtrar por tipo
      if (params.type) {
        if (Array.isArray(params.type)) {
          q = query(q, where('type', 'in', params.type));
        } else {
          q = query(q, where('type', '==', params.type));
        }
      }
      
      // Filtrar por urgencia
      if (params.urgency) {
        if (Array.isArray(params.urgency)) {
          q = query(q, where('urgency', 'in', params.urgency));
        } else {
          q = query(q, where('urgency', '==', params.urgency));
        }
      }
      
      // No incluir alertas expiradas por defecto
      if (!params.includeExpired) {
        const now = new Date();
        q = query(q, where('expiresAt', '>', now));
      }
      
      // Ordenar por fecha de creación descendente
      q = query(q, orderBy('createdAt', 'desc'));
      
      // Limitar resultados si se especifica
      if (params.limit) {
        q = query(q, limit(params.limit));
      }
      
      // Ejecutar consulta
      const querySnapshot = await getDocs(q);
      
      // Mapear resultados
      const alerts: SmartAlert[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as SmartAlert;
        alerts.push({
          ...data,
          id: doc.id
        });
      });
      
      return {
        success: true,
        alerts
      };
    } catch (error) {
      console.error('Error al obtener alertas:', error);
      return {
        success: false,
        error: 'Error al obtener alertas'
      };
    }
  },
  
  /**
   * Crea una nueva alerta inteligente
   */
  async createAlert(
    companyId: string,
    alert: Omit<SmartAlert, 'id' | 'createdAt' | 'status'>
  ): Promise<{ success: boolean; alertId?: string; error?: string }> {
    try {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      
      // Referencia a la colección de alertas
      const alertsRef = collection(db, `companies/${normalizedCompanyId}/alerts`);
      
      // Preparar datos de la alerta
      const alertData: Omit<SmartAlert, 'id'> = {
        ...alert,
        status: 'new',
        createdAt: serverTimestamp() as unknown as Timestamp
      };
      
      // Crear documento
      const docRef = await addDoc(alertsRef, alertData);
      
      return {
        success: true,
        alertId: docRef.id
      };
    } catch (error) {
      console.error('Error al crear alerta:', error);
      return {
        success: false,
        error: 'Error al crear alerta'
      };
    }
  },
  
  /**
   * Actualiza el estado de una alerta
   */
  async updateAlertStatus(
    companyId: string,
    alertId: string,
    status: AlertStatus
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      
      // Referencia al documento
      const alertRef = doc(db, `companies/${normalizedCompanyId}/alerts/${alertId}`);
      
      // Datos a actualizar
      const updateData: Partial<SmartAlert> = {
        status
      };
      
      // Añadir timestamp según el estado
      if (status === 'viewed') {
        updateData.viewedAt = serverTimestamp() as unknown as Timestamp;
      } else if (status === 'dismissed') {
        updateData.dismissedAt = serverTimestamp() as unknown as Timestamp;
      } else if (status === 'actioned') {
        updateData.actionedAt = serverTimestamp() as unknown as Timestamp;
      }
      
      // Actualizar documento
      await updateDoc(alertRef, updateData);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error al actualizar estado de alerta:', error);
      return {
        success: false,
        error: 'Error al actualizar estado de alerta'
      };
    }
  },
  
  /**
   * Elimina una alerta
   */
  async deleteAlert(
    companyId: string,
    alertId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      
      // Referencia al documento
      const alertRef = doc(db, `companies/${normalizedCompanyId}/alerts/${alertId}`);
      
      // Eliminar documento
      await deleteDoc(alertRef);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error al eliminar alerta:', error);
      return {
        success: false,
        error: 'Error al eliminar alerta'
      };
    }
  },
  
  /**
   * Marca todas las alertas de un usuario como vistas
   */
  async markAllAsViewed(
    companyId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      
      // Referencia a la colección
      const alertsRef = collection(db, `companies/${normalizedCompanyId}/alerts`);
      
      // Consulta para obtener alertas no vistas del usuario
      const q = query(
        alertsRef,
        where('userId', '==', userId),
        where('status', '==', 'new')
      );
      
      // Ejecutar consulta
      const querySnapshot = await getDocs(q);
      
      // Actualizar cada documento
      const updatePromises = querySnapshot.docs.map(doc => {
        const alertRef = doc.ref;
        return updateDoc(alertRef, {
          status: 'viewed',
          viewedAt: serverTimestamp()
        });
      });
      
      // Esperar a que todas las actualizaciones se completen
      await Promise.all(updatePromises);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error al marcar alertas como vistas:', error);
      return {
        success: false,
        error: 'Error al marcar alertas como vistas'
      };
    }
  },
  
  /**
   * Generar alertas inteligentes basadas en datos de la plataforma
   * 
   * Esta función simula lo que haría un proceso automatizado de análisis
   * y generación de alertas basado en patrones, plazos, etc.
   */
  async generateSmartAlerts(
    companyId: string
  ): Promise<{ success: boolean; generatedCount?: number; error?: string }> {
    try {
      const normalizedCompanyId = normalizeCompanyId(companyId);
      
      // Esta es una implementación simulada
      // En un entorno real, esta función analizaría datos en tiempo real
      
      // Alertas de ejemplo para demostración
      const sampleAlerts: Omit<SmartAlert, 'id' | 'createdAt' | 'status'>[] = [
        {
          type: 'deadline',
          title: 'Plazo próximo a vencer: Investigación REP-2022-005',
          description: 'La investigación REP-2022-005 (Caso Ley Karin) vence en 3 días. Se requiere completar el informe final antes del vencimiento del plazo legal.',
          urgency: 'high',
          actionRequired: true,
          actionText: 'Ver caso',
          actionLink: '/dashboard/investigation/REP-2022-005',
          relatedReportId: 'REP-2022-005',
          userId: 'user-investigator-001',
          expiresAt: new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000) as unknown as Timestamp
        },
        {
          type: 'pattern',
          title: 'Patrón detectado: Incremento en categoría Ley Karin',
          description: 'Se ha detectado un incremento del 35% en denuncias de la categoría Ley Karin en los últimos 30 días. Recomendamos revisar los protocolos de prevención.',
          urgency: 'medium',
          actionRequired: false,
          userId: 'user-admin-001',
          expiresAt: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000) as unknown as Timestamp
        },
        {
          type: 'risk',
          title: 'Riesgo: 3 investigaciones sin asignar',
          description: 'Existen 3 investigaciones sin asignar con más de 48 horas desde su recepción. Se recomienda asignar investigadores para cumplir con los plazos internos.',
          urgency: 'high',
          actionRequired: true,
          actionText: 'Ver denuncias sin asignar',
          actionLink: '/dashboard/reports?status=Nuevo',
          userId: 'user-admin-001',
          expiresAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) as unknown as Timestamp
        },
        {
          type: 'compliance',
          title: 'Reporte trimestral pendiente',
          description: 'El reporte trimestral de cumplimiento normativo debe ser generado y enviado antes del fin de mes. Quedan 10 días para completar esta tarea.',
          urgency: 'medium',
          actionRequired: true,
          actionText: 'Generar reporte',
          actionLink: '/dashboard/reports/stats',
          userId: 'user-admin-001',
          expiresAt: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000) as unknown as Timestamp
        },
        {
          type: 'suggestion',
          title: 'Sugerencia: Actualizar política de acoso',
          description: 'Basado en los casos recientes, recomendamos actualizar la política de acoso laboral para incluir ejemplos más claros y procedimientos actualizados.',
          urgency: 'low',
          actionRequired: false,
          userId: 'user-admin-001',
          expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000) as unknown as Timestamp
        }
      ];
      
      // Crear las alertas de ejemplo
      const createPromises = sampleAlerts.map(alert => 
        this.createAlert(companyId, alert)
      );
      
      // Esperar a que todas las creaciones se completen
      await Promise.all(createPromises);
      
      return {
        success: true,
        generatedCount: sampleAlerts.length
      };
    } catch (error) {
      console.error('Error al generar alertas inteligentes:', error);
      return {
        success: false,
        error: 'Error al generar alertas inteligentes'
      };
    }
  }
};

export default alertService;