// src/lib/services/notificationService.ts

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions, safeCallFunction } from '@/lib/firebase/functions';

/**
 * Interfaz para las notificaciones
 */
export interface Notification {
  recipient: string; // Email del destinatario
  type: NotificationType; // Tipo de notificación
  title: string; // Título de la notificación
  content: string; // Contenido de la notificación
  reportId?: string; // ID de la denuncia relacionada (opcional)
  reportCode?: string; // Código de la denuncia (opcional)
  recommendationId?: string; // ID de la recomendación (opcional)
  userId?: string; // ID del usuario relacionado (opcional)
  status: 'pending' | 'sent' | 'failed'; // Estado de la notificación
}

/**
 * Tipos de notificaciones soportadas
 */
export type NotificationType = 
  | 'new_report' // Nueva denuncia creada
  | 'report_assigned' // Denuncia asignada a un investigador
  | 'report_status_updated' // Estado de denuncia actualizado
  | 'report_message' // Nuevo mensaje en una denuncia
  | 'recommendation_created' // Nueva recomendación creada
  | 'recommendation_due_soon' // Recomendación próxima a vencer
  | 'recommendation_overdue' // Recomendación vencida
  | 'recommendation_completed' // Recomendación completada
  | 'report_closed' // Denuncia cerrada
  | 'password_reset'; // Restablecimiento de contraseña

/**
 * Crea una notificación en Firestore y envía el correo electrónico
 * @param companyId ID de la compañía
 * @param notification Datos de la notificación
 * @returns Resultado de la operación
 */
export async function createNotification(companyId: string, notification: Omit<Notification, 'status'>) {
  try {
    // Para diagnóstico, verificar si tenemos permisos antes de proceder
    console.log(`Intentando crear notificación para ${notification.recipient}`);
    
    // Agregamos manejo de errores más detallado
    try {
      // Agregar la notificación a Firestore
      const notificationData = {
        ...notification,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, `companies/${companyId}/notifications`),
        notificationData
      );
      
      console.log(`Notificación creada con ID: ${docRef.id}`);

      // Intentar enviar el correo electrónico usando la función segura
      try {
        const result = await safeCallFunction('sendEmail', {
          notificationId: docRef.id,
          companyId,
        });

        if (result.data && result.data.success) {
          return { 
            success: true, 
            notificationId: docRef.id 
          };
        } else {
          console.warn(`Error en función sendEmail: ${JSON.stringify(result.data)}`);
          return { 
            success: false, 
            error: 'Error al enviar el correo electrónico', 
            notificationId: docRef.id 
          };
        }
      } catch (emailError) {
        console.error('Error al enviar correo:', emailError);
        return { 
          success: true, // Consideramos éxito parcial - se creó la notificación pero falló el email
          error: 'Error al enviar el correo electrónico, pero la notificación fue creada', 
          notificationId: docRef.id 
        };
      }
    } catch (firestoreError) {
      console.error('Error específico en Firestore:', firestoreError);
      throw firestoreError; // Re-lanzar para manejarlo en el bloque catch externo
    }
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return {
      success: false,
      error: 'Error al crear la notificación'
    };
  }
}

/**
 * Envía una notificación al denunciante cuando se crea una denuncia
 * @param companyId ID de la compañía
 * @param reportId ID de la denuncia
 * @param reportCode Código visible de la denuncia
 * @param recipientEmail Email del denunciante
 * @returns Resultado de la operación
 */
export async function notifyReportCreated(
  companyId: string, 
  reportId: string, 
  reportCode: string, 
  recipientEmail: string
) {
  // Obtener la configuración de la compañía para usar el nombre correcto
  const companyDoc = await getDoc(doc(db, `companies/${companyId}`));
  const companyName = companyDoc.exists() ? companyDoc.data().name : 'Canal de Denuncias';

  // Crear la notificación
  return await createNotification(companyId, {
    recipient: recipientEmail,
    type: 'new_report',
    title: `Nueva denuncia registrada en ${companyName}`,
    content: `
      <p>Su denuncia ha sido registrada exitosamente en nuestro sistema.</p>
      <p>Código de seguimiento: <strong>${reportCode}</strong></p>
      <p>Recuerde guardar este código para consultar el estado de su denuncia.</p>
      <p>Gracias por ayudarnos a mantener la transparencia y ética en nuestra organización.</p>
    `,
    reportId,
    reportCode
  });
}

/**
 * Notifica a los administradores cuando se crea una nueva denuncia
 * @param companyId ID de la compañía
 * @param reportId ID de la denuncia
 * @param reportCode Código visible de la denuncia
 * @param category Categoría de la denuncia
 * @param isKarinLaw Si es una denuncia relacionada a Ley Karin
 * @returns Resultado de la operación
 */
export async function notifyAdminsNewReport(
  companyId: string, 
  reportId: string, 
  reportCode: string, 
  category: string,
  isKarinLaw: boolean
) {
  try {
    // Buscar todos los usuarios con rol de administrador
    const usersRef = collection(db, `companies/${companyId}/users`);
    const q = query(usersRef, where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'No se encontraron administradores' };
    }

    // Notificar a cada administrador
    const notifications = querySnapshot.docs.map(async (userDoc) => {
      const adminData = userDoc.data();
      
      // Título especial para Ley Karin por su urgencia
      const title = isKarinLaw 
        ? '⚠️ URGENTE: Nueva denuncia Ley Karin recibida' 
        : 'Nueva denuncia recibida';
      
      return await createNotification(companyId, {
        recipient: adminData.email,
        type: 'new_report',
        title,
        content: `
          <p>Se ha registrado una nueva denuncia en el sistema:</p>
          <ul>
            <li>Código: <strong>${reportCode}</strong></li>
            <li>Categoría: ${category}</li>
            ${isKarinLaw ? '<li><strong>Denuncia Ley Karin: Requiere atención prioritaria</strong></li>' : ''}
          </ul>
          <p>Por favor, revise la denuncia para asignarla a un investigador.</p>
        `,
        reportId,
        reportCode,
        userId: userDoc.id
      });
    });

    // Esperar a que todas las notificaciones se envíen
    await Promise.all(notifications);
    return { success: true };
  } catch (error) {
    console.error('Error al notificar a administradores:', error);
    return { success: false, error: 'Error al notificar a los administradores' };
  }
}

/**
 * Notifica a un investigador cuando se le asigna una denuncia
 * @param companyId ID de la compañía
 * @param reportId ID de la denuncia
 * @param reportCode Código visible de la denuncia
 * @param investigatorId ID del investigador
 * @param investigatorEmail Email del investigador
 * @param category Categoría de la denuncia
 * @param isKarinLaw Si es una denuncia relacionada a Ley Karin
 * @returns Resultado de la operación
 */
export async function notifyInvestigatorAssigned(
  companyId: string, 
  reportId: string, 
  reportCode: string, 
  investigatorId: string,
  investigatorEmail: string,
  category: string,
  isKarinLaw: boolean
) {
  // Título especial para Ley Karin por su urgencia
  const title = isKarinLaw 
    ? '⚠️ URGENTE: Nueva denuncia Ley Karin asignada' 
    : 'Nueva denuncia asignada';

  return await createNotification(companyId, {
    recipient: investigatorEmail,
    type: 'report_assigned',
    title,
    content: `
      <p>Se le ha asignado una nueva denuncia para investigación:</p>
      <ul>
        <li>Código: <strong>${reportCode}</strong></li>
        <li>Categoría: ${category}</li>
        ${isKarinLaw ? '<li><strong>Denuncia Ley Karin: Requiere atención prioritaria de 5 días hábiles</strong></li>' : ''}
      </ul>
      <p>Por favor, revise la denuncia y comience el proceso de investigación a la brevedad.</p>
    `,
    reportId,
    reportCode,
    userId: investigatorId
  });
}

/**
 * Notifica recomendaciones próximas a vencer
 * @param companyId ID de la compañía
 * @param reportId ID de la denuncia
 * @param reportCode Código visible de la denuncia
 * @param recommendationId ID de la recomendación
 * @param action Acción recomendada
 * @param dueDate Fecha límite
 * @param responsibleId ID del responsable
 * @param responsibleEmail Email del responsable
 * @param daysLeft Días restantes
 * @returns Resultado de la operación
 */
export async function notifyRecommendationDueSoon(
  companyId: string, 
  reportId: string, 
  reportCode: string, 
  recommendationId: string,
  action: string,
  dueDate: Date,
  responsibleId: string,
  responsibleEmail: string,
  daysLeft: number
) {
  const formattedDate = dueDate.toLocaleDateString('es-CL');
  
  return await createNotification(companyId, {
    recipient: responsibleEmail,
    type: 'recommendation_due_soon',
    title: `Recordatorio: Recomendación próxima a vencer (${daysLeft} días)`,
    content: `
      <p>Le recordamos que tiene una recomendación próxima a vencer:</p>
      <ul>
        <li>Recomendación: ${action}</li>
        <li>Código de denuncia: ${reportCode}</li>
        <li>Fecha límite: <strong>${formattedDate}</strong> (${daysLeft} días restantes)</li>
      </ul>
      <p>Por favor, complete la implementación de esta recomendación antes de la fecha límite.</p>
    `,
    reportId,
    reportCode,
    recommendationId,
    userId: responsibleId
  });
}

/**
 * Notifica recomendaciones vencidas
 * @param companyId ID de la compañía
 * @param reportId ID de la denuncia
 * @param reportCode Código visible de la denuncia
 * @param recommendationId ID de la recomendación
 * @param action Acción recomendada
 * @param dueDate Fecha límite
 * @param responsibleId ID del responsable
 * @param responsibleEmail Email del responsable
 * @param daysOverdue Días de retraso
 * @returns Resultado de la operación
 */
export async function notifyRecommendationOverdue(
  companyId: string, 
  reportId: string, 
  reportCode: string, 
  recommendationId: string,
  action: string,
  dueDate: Date,
  responsibleId: string,
  responsibleEmail: string,
  daysOverdue: number
) {
  const formattedDate = dueDate.toLocaleDateString('es-CL');
  
  // Notificar al responsable
  const notification = await createNotification(companyId, {
    recipient: responsibleEmail,
    type: 'recommendation_overdue',
    title: `⚠️ ALERTA: Recomendación vencida (${daysOverdue} días de retraso)`,
    content: `
      <p>La siguiente recomendación ha vencido y requiere su atención inmediata:</p>
      <ul>
        <li>Recomendación: ${action}</li>
        <li>Código de denuncia: ${reportCode}</li>
        <li>Fecha límite: <strong>${formattedDate}</strong> (vencida hace ${daysOverdue} días)</li>
      </ul>
      <p>Por favor, actualice el estado de esta recomendación o solicite una extensión del plazo.</p>
    `,
    reportId,
    reportCode,
    recommendationId,
    userId: responsibleId
  });

  // También notificar a los administradores
  await notifyAdminsRecommendationOverdue(
    companyId,
    reportId,
    reportCode,
    recommendationId,
    action,
    dueDate,
    responsibleId,
    daysOverdue
  );

  return notification;
}

/**
 * Notifica a los administradores sobre recomendaciones vencidas
 * @param companyId ID de la compañía
 * @param reportId ID de la denuncia
 * @param reportCode Código visible de la denuncia
 * @param recommendationId ID de la recomendación
 * @param action Acción recomendada
 * @param dueDate Fecha límite
 * @param responsibleId ID del responsable
 * @param daysOverdue Días de retraso
 * @returns Resultado de la operación
 */
async function notifyAdminsRecommendationOverdue(
  companyId: string, 
  reportId: string, 
  reportCode: string, 
  recommendationId: string,
  action: string,
  dueDate: Date,
  responsibleId: string,
  daysOverdue: number
) {
  try {
    // Obtener información del responsable
    const responsibleDoc = await getDoc(doc(db, `companies/${companyId}/users/${responsibleId}`));
    const responsibleName = responsibleDoc.exists() ? responsibleDoc.data().displayName : 'Usuario desconocido';
    
    // Buscar todos los usuarios con rol de administrador
    const usersRef = collection(db, `companies/${companyId}/users`);
    const q = query(usersRef, where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'No se encontraron administradores' };
    }

    const formattedDate = dueDate.toLocaleDateString('es-CL');

    // Notificar a cada administrador
    const notifications = querySnapshot.docs.map(async (userDoc) => {
      const adminData = userDoc.data();
      
      return await createNotification(companyId, {
        recipient: adminData.email,
        type: 'recommendation_overdue',
        title: `⚠️ ALERTA: Recomendación vencida (${daysOverdue} días de retraso)`,
        content: `
          <p>La siguiente recomendación ha vencido y requiere atención:</p>
          <ul>
            <li>Recomendación: ${action}</li>
            <li>Código de denuncia: ${reportCode}</li>
            <li>Fecha límite: <strong>${formattedDate}</strong> (vencida hace ${daysOverdue} días)</li>
            <li>Responsable: ${responsibleName}</li>
          </ul>
          <p>Se ha notificado al responsable, pero puede ser necesaria su intervención.</p>
        `,
        reportId,
        reportCode,
        recommendationId,
        userId: userDoc.id
      });
    });

    // Esperar a que todas las notificaciones se envíen
    await Promise.all(notifications);
    return { success: true };
  } catch (error) {
    console.error('Error al notificar a administradores:', error);
    return { success: false, error: 'Error al notificar a los administradores' };
  }
}

/**
 * Notifica al denunciante cuando se cierra su denuncia
 * @param companyId ID de la compañía
 * @param reportId ID de la denuncia
 * @param reportCode Código visible de la denuncia
 * @param recipientEmail Email del denunciante
 * @returns Resultado de la operación
 */
export async function notifyReportClosed(
  companyId: string,
  reportId: string,
  reportCode: string,
  recipientEmail: string
) {
  // Obtener la configuración de la compañía para usar el nombre correcto
  const companyDoc = await getDoc(doc(db, `companies/${companyId}`));
  const companyName = companyDoc.exists() ? companyDoc.data().name : 'Canal de Denuncias';

  // Crear la notificación
  return await createNotification(companyId, {
    recipient: recipientEmail,
    type: 'report_closed',
    title: `Su denuncia ha sido cerrada - ${companyName}`,
    content: `
      <p>Le informamos que su denuncia con código <strong>${reportCode}</strong> ha sido cerrada satisfactoriamente.</p>
      <p>Todas las recomendaciones derivadas de la investigación han sido implementadas.</p>
      <p>Agradecemos su confianza en nuestro canal de denuncias.</p>
    `,
    reportId,
    reportCode
  });
}