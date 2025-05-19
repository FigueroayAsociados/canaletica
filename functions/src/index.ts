// functions/src/index.ts

// Importaciones para Functions v2
import * as functions from 'firebase-functions';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';

// Otras importaciones
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as logger from 'firebase-functions/logger';

// Inicializar la aplicación de Firebase Admin
admin.initializeApp();

// Definir secretos y variables de entorno
const emailUser = defineString('EMAIL_USER', { default: 'notificaciones@canaletica.cl' });
const emailPassword = defineSecret('EMAIL_PASSWORD'); 
const adminUids = defineString('ADMIN_UIDS', { default: 'gQcbPQTW03MlhRXquvkH6YHO4Pp2,M4K2AxpY8kOGjnUvvUYgfWfgalF3' });

// Variable para almacenar el transporte de correo
let mailTransport: nodemailer.Transporter;

/**
 * Función interna para configurar el transporte de correo
 */
function setupMailTransport() {
  try {
    // Usar variables de entorno
    const user = emailUser.value();
    const password = emailPassword.value();
    
    mailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: password
      },
      // Configuración adicional para mayor compatibilidad con Gmail
      tls: {
        rejectUnauthorized: false
      }
    });
    logger.info("Transporte de correo configurado correctamente");
    logger.info(`Usando cuenta de correo: ${user}`);
    return true;
  } catch (error) {
    logger.error("Error al configurar el transporte de correo:", error);
    return false;
  }
}

/**
 * Interfaz para los datos de email
 */
interface EmailData {
  notificationId: string;
  companyId: string;
}

/**
 * Función interna para enviar un correo electrónico
 */
async function sendEmailInternal(data: EmailData) {
  try {
    const { notificationId, companyId } = data;
    
    if (!notificationId || !companyId) {
      logger.error("Datos incompletos para enviar email", { notificationId, companyId });
      return { success: false, error: 'Datos incompletos' };
    }

    // Configurar el transporte de correo si no está configurado
    if (!mailTransport && !setupMailTransport()) {
      logger.error("Transporte de correo no configurado");
      return { success: false, error: 'Servicio de correo no configurado' };
    }

    // Obtener la notificación de Firestore
    const notificationRef = admin.firestore()
      .collection(`companies/${companyId}/notifications`)
      .doc(notificationId);
    
    const notificationSnap = await notificationRef.get();
    
    if (!notificationSnap.exists) {
      logger.error("Notificación no encontrada", { notificationId });
      return { success: false, error: 'Notificación no encontrada' };
    }

    const notification = notificationSnap.data();
    
    if (!notification || notification.status === 'sent') {
      logger.error("Notificación ya enviada o inválida", { notificationId, status: notification?.status });
      return { success: false, error: 'Notificación ya enviada o inválida' };
    }

    // Obtener la configuración de correo de la compañía
    const companyRef = admin.firestore().collection('companies').doc(companyId);
    const companySnap = await companyRef.get();
    
    if (!companySnap.exists) {
      logger.error("Compañía no encontrada", { companyId });
      return { success: false, error: 'Compañía no encontrada' };
    }

    const company = companySnap.data();
    
    // Configurar el correo
    const mailOptions = {
      from: `"${company?.name || 'Canal de Denuncias'}" <${emailUser.value()}>`,
      to: notification.recipient,
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <header style="background-color: #1976d2; padding: 20px; color: white; text-align: center;">
            <h1 style="margin: 0;">${company?.name || 'Canal de Denuncias'}</h1>
          </header>
          <main style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            ${notification.content}
          </main>
          <footer style="padding: 15px; background-color: #f5f5f5; font-size: 12px; text-align: center; color: #666;">
            <p>Este es un mensaje automático, por favor no responda a este correo.</p>
            <p>&copy; ${new Date().getFullYear()} ${company?.name || 'Canal de Denuncias'} - Todos los derechos reservados</p>
          </footer>
        </div>
      `,
    };

    logger.info("Enviando correo", { to: notification.recipient, subject: notification.title });

    // Enviar el correo
    await mailTransport.sendMail(mailOptions);
    logger.info("Correo enviado exitosamente", { to: notification.recipient });

    // Actualizar el estado de la notificación
    await notificationRef.update({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    logger.error("Error al enviar correo:", error);
    
    // Intentar actualizar la notificación como fallida si es posible
    try {
      if (data.notificationId && data.companyId) {
        await admin.firestore()
          .collection(`companies/${data.companyId}/notifications`)
          .doc(data.notificationId)
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
      }
    } catch (updateError) {
      logger.error("Error al actualizar estado de notificación:", updateError);
    }
    
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

/**
 * Función para enviar un correo electrónico basado en una notificación de Firestore
 * Expuesta como función HTTP callable
 */
export const sendEmail = onCall(
  { 
    secrets: [emailPassword],
    region: 'southamerica-east1',
  }, 
  async (request) => {
    const data = request.data as EmailData;
    return sendEmailInternal(data);
  }
);

/**
 * Función programada para verificar recomendaciones próximas a vencer diariamente
 */
export const checkRecommendationsDueSoon = onSchedule(
  {
    schedule: '0 9 * * *', // 9 AM todos los días
    timeZone: 'America/Santiago', // Hora de Chile
    secrets: [emailPassword],
    region: 'southamerica-east1',
  },
  async (event) => {
    // Asegurarse de cargar las variables de entorno
    logger.info("Iniciando verificación de recomendaciones próximas a vencer");
    try {
      const db = admin.firestore();
      const companies = await db.collection('companies').get();
      logger.info("Ejecutando verificación de recomendaciones próximas a vencer");

      for (const company of companies.docs) {
        const companyId = company.id;
        logger.info(`Procesando compañía: ${companyId}`);

        // Buscar todas las recomendaciones con estado pendiente o en progreso
        const recommendationsSnapshot = await db.collectionGroup('recommendations')
          .where('status', 'in', ['Pendiente', 'En Progreso'])
          .get();

        logger.info(`Encontradas ${recommendationsSnapshot.size} recomendaciones activas`);

        for (const recDoc of recommendationsSnapshot.docs) {
          // Verificar que la recomendación pertenece a esta compañía
          const recPath = recDoc.ref.path;
          if (!recPath.includes(`companies/${companyId}/`)) continue;

          const recommendation = recDoc.data();
          
          // Si no tiene fecha límite, continuar con la siguiente
          if (!recommendation.dueDate) continue;
          
          const dueDate = recommendation.dueDate.toDate();
          const today = new Date();
          
          // Calcular días hasta vencimiento
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          
          // Si faltan 3 días o 1 día para vencer, enviar recordatorio
          if (daysUntilDue === 3 || daysUntilDue === 1) {
            logger.info(`Recomendación próxima a vencer en ${daysUntilDue} días: ${recDoc.id}`);
            
            // Obtener información del responsable
            const userRef = db.collection(`companies/${companyId}/users`).doc(recommendation.assignedTo);
            const userSnap = await userRef.get();
            
            if (!userSnap.exists) {
              logger.warn(`Responsable no encontrado: ${recommendation.assignedTo}`);
              continue;
            }
            
            const userData = userSnap.data();
            if (!userData) {
              logger.warn(`Datos de usuario no encontrados para ${recommendation.assignedTo}`);
              continue;
            }
            
            // Extraer ID del reporte de la ruta
            const reportIdMatch = recPath.match(/reports\/([^\/]+)/);
            if (!reportIdMatch) {
              logger.warn(`No se pudo extraer ID del reporte de la ruta: ${recPath}`);
              continue;
            }
            
            const reportId = reportIdMatch[1];
            const reportRef = db.collection(`companies/${companyId}/reports`).doc(reportId);
            const reportSnap = await reportRef.get();
            
            if (!reportSnap.exists) {
              logger.warn(`Reporte no encontrado: ${reportId}`);
              continue;
            }
            
            const reportData = reportSnap.data();
            if (!reportData) {
              logger.warn(`Datos de reporte no encontrados para ${reportId}`);
              continue;
            }
            
            // Crear notificación de recordatorio
            const notificationRef = db.collection(`companies/${companyId}/notifications`).doc();
            await notificationRef.set({
              recipient: userData.email,
              type: 'recommendation_due_soon',
              title: `Recordatorio: Recomendación próxima a vencer (${daysUntilDue} días)`,
              content: `
                <p>Le recordamos que tiene una recomendación próxima a vencer:</p>
                <ul>
                  <li>Recomendación: ${recommendation.action}</li>
                  <li>Código de denuncia: ${reportData.code}</li>
                  <li>Fecha límite: <strong>${dueDate.toLocaleDateString('es-CL')}</strong> (${daysUntilDue} días restantes)</li>
                </ul>
                <p>Por favor, complete la implementación de esta recomendación antes de la fecha límite.</p>
              `,
              reportId,
              reportCode: reportData.code,
              recommendationId: recDoc.id,
              userId: recommendation.assignedTo,
              status: 'pending',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            logger.info(`Notificación de recordatorio creada: ${notificationRef.id}`);
            
            // Enviar el correo
            try {
              // Llamar a la función interna directamente
              await sendEmailInternal({
                notificationId: notificationRef.id,
                companyId
              });
              logger.info(`Correo de recordatorio enviado para recomendación: ${recDoc.id}`);
            } catch (emailError) {
              logger.error(`Error al enviar recordatorio para recomendación ${recDoc.id}:`, emailError);
            }
          }
        }
      }
      
      logger.info("Verificación de recomendaciones próximas a vencer completada");
    } catch (error) {
      logger.error("Error al verificar recomendaciones próximas a vencer:", error);
    }
  }
);

/**
 * Función programada para verificar recomendaciones vencidas diariamente
 */
export const checkOverdueRecommendations = onSchedule(
  {
    schedule: '0 10 * * *', // 10 AM todos los días
    timeZone: 'America/Santiago', // Hora de Chile
    secrets: [emailPassword],
    region: 'southamerica-east1',
  },
  async (event) => {
    // Asegurarse de cargar las variables de entorno
    logger.info("Iniciando verificación de recomendaciones vencidas");
    try {
      const db = admin.firestore();
      const companies = await db.collection('companies').get();
      logger.info("Ejecutando verificación de recomendaciones vencidas");

      for (const company of companies.docs) {
        const companyId = company.id;
        logger.info(`Procesando compañía: ${companyId}`);
        
        // Buscar todas las recomendaciones con estado pendiente o en progreso
        const recommendationsSnapshot = await db.collectionGroup('recommendations')
          .where('status', 'in', ['Pendiente', 'En Progreso'])
          .get();

        logger.info(`Encontradas ${recommendationsSnapshot.size} recomendaciones activas`);

        for (const recDoc of recommendationsSnapshot.docs) {
          // Verificar que la recomendación pertenece a esta compañía
          const recPath = recDoc.ref.path;
          if (!recPath.includes(`companies/${companyId}/`)) continue;

          const recommendation = recDoc.data();
          
          // Si no tiene fecha límite, continuar con la siguiente
          if (!recommendation.dueDate) continue;
          
          const dueDate = recommendation.dueDate.toDate();
          const today = new Date();
          
          // Verificar si está vencida
          if (dueDate < today) {
            // Calcular días de retraso
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
            
            // Solo notificar si está vencida por 1, 3, 7 o 14 días (para no enviar diariamente)
            if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue === 7 || daysOverdue === 14 || daysOverdue % 14 === 0) {
              logger.info(`Recomendación vencida hace ${daysOverdue} días: ${recDoc.id}`);
              
              // Obtener información del responsable
              const userRef = db.collection(`companies/${companyId}/users`).doc(recommendation.assignedTo);
              const userSnap = await userRef.get();
              
              if (!userSnap.exists) {
                logger.warn(`Responsable no encontrado: ${recommendation.assignedTo}`);
                continue;
              }
              
              const userData = userSnap.data();
              if (!userData) {
                logger.warn(`Datos de usuario no encontrados para ${recommendation.assignedTo}`);
                continue;
              }
              
              // Extraer ID del reporte de la ruta
              const reportIdMatch = recPath.match(/reports\/([^\/]+)/);
              if (!reportIdMatch) {
                logger.warn(`No se pudo extraer ID del reporte de la ruta: ${recPath}`);
                continue;
              }
              
              const reportId = reportIdMatch[1];
              const reportRef = db.collection(`companies/${companyId}/reports`).doc(reportId);
              const reportSnap = await reportRef.get();
              
              if (!reportSnap.exists) {
                logger.warn(`Reporte no encontrado: ${reportId}`);
                continue;
              }
              
              const reportData = reportSnap.data();
              if (!reportData) {
                logger.warn(`Datos de reporte no encontrados para ${reportId}`);
                continue;
              }
              
              // 1. Notificar al responsable
              const notificationRef = db.collection(`companies/${companyId}/notifications`).doc();
              await notificationRef.set({
                recipient: userData.email,
                type: 'recommendation_overdue',
                title: `⚠️ ALERTA: Recomendación vencida (${daysOverdue} días de retraso)`,
                content: `
                  <p>La siguiente recomendación ha vencido y requiere su atención inmediata:</p>
                  <ul>
                    <li>Recomendación: ${recommendation.action}</li>
                    <li>Código de denuncia: ${reportData.code}</li>
                    <li>Fecha límite: <strong>${dueDate.toLocaleDateString('es-CL')}</strong> (vencida hace ${daysOverdue} días)</li>
                  </ul>
                  <p>Por favor, actualice el estado de esta recomendación o solicite una extensión del plazo.</p>
                `,
                reportId,
                reportCode: reportData.code,
                recommendationId: recDoc.id,
                userId: recommendation.assignedTo,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              
              logger.info(`Notificación de vencimiento creada para responsable: ${notificationRef.id}`);
              
              // Enviar el correo al responsable
              try {
                await sendEmailInternal({
                  notificationId: notificationRef.id,
                  companyId
                });
                logger.info(`Correo de vencimiento enviado al responsable para recomendación: ${recDoc.id}`);
              } catch (emailError) {
                logger.error(`Error al enviar notificación de vencimiento al responsable para recomendación ${recDoc.id}:`, emailError);
              }
              
              // 2. Notificar a los administradores
              const usersSnapshot = await db.collection(`companies/${companyId}/users`)
                .where('role', '==', 'admin')
                .get();
              
              logger.info(`Notificando a ${usersSnapshot.size} administradores`);
              
              for (const adminDoc of usersSnapshot.docs) {
                const adminData = adminDoc.data();
                if (!adminData) {
                  logger.warn(`Datos de administrador no encontrados para ${adminDoc.id}`);
                  continue;
                }
                
                const adminNotificationRef = db.collection(`companies/${companyId}/notifications`).doc();
                await adminNotificationRef.set({
                  recipient: adminData.email,
                  type: 'recommendation_overdue',
                  title: `⚠️ ALERTA: Recomendación vencida (${daysOverdue} días de retraso)`,
                  content: `
                    <p>La siguiente recomendación ha vencido y requiere atención:</p>
                    <ul>
                      <li>Recomendación: ${recommendation.action}</li>
                      <li>Código de denuncia: ${reportData.code}</li>
                      <li>Fecha límite: <strong>${dueDate.toLocaleDateString('es-CL')}</strong> (vencida hace ${daysOverdue} días)</li>
                      <li>Responsable: ${userData.displayName || 'No especificado'}</li>
                    </ul>
                    <p>Se ha notificado al responsable, pero puede ser necesaria su intervención.</p>
                  `,
                  reportId,
                  reportCode: reportData.code,
                  recommendationId: recDoc.id,
                  userId: adminDoc.id,
                  status: 'pending',
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                // Enviar el correo al administrador
                try {
                  await sendEmailInternal({
                    notificationId: adminNotificationRef.id,
                    companyId
                  });
                  logger.info(`Correo de vencimiento enviado al administrador ${adminDoc.id} para recomendación: ${recDoc.id}`);
                } catch (emailError) {
                  logger.error(`Error al enviar notificación de vencimiento al administrador ${adminDoc.id} para recomendación ${recDoc.id}:`, emailError);
                }
              }
            }
          }
        }
      }
      
      logger.info("Verificación de recomendaciones vencidas completada");
    } catch (error) {
      logger.error("Error al verificar recomendaciones vencidas:", error);
    }
  }
);

/**
 * Función para enviar notificación cuando se crea una nueva denuncia
 */
export const onReportCreated = onDocumentCreated(
  {
    document: 'companies/{companyId}/reports/{reportId}',
    secrets: [emailPassword],
    region: 'southamerica-west1',
  },
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        logger.error("No hay datos del documento creado");
        return;
      }

      const reportData = snapshot.data();
      const companyId = event.params.companyId;
      const reportId = event.params.reportId;
      
      logger.info(`Nueva denuncia creada: ${reportId}`, { companyId });
      
      // Si no hay código, no podemos enviar notificación
      if (!reportData.code) {
        logger.error('Reporte creado sin código:', reportId);
        return;
      }
      
      // 1. Notificar al denunciante (si no es anónimo y proporcionó correo)
      if (!reportData.reporter?.isAnonymous && reportData.reporter?.contactInfo?.email) {
        logger.info(`Notificando al denunciante: ${reportData.reporter.contactInfo.email}`);
        
        const emailNotificationRef = admin.firestore()
          .collection(`companies/${companyId}/notifications`)
          .doc();
          
        await emailNotificationRef.set({
          recipient: reportData.reporter.contactInfo.email,
          type: 'new_report',
          title: 'Su denuncia ha sido registrada exitosamente',
          content: `
            <p>Su denuncia ha sido registrada exitosamente en nuestro sistema.</p>
            <p>Código de seguimiento: <strong>${reportData.code}</strong></p>
            <p>Recuerde guardar este código para consultar el estado de su denuncia.</p>
            <p>Gracias por ayudarnos a mantener la transparencia y ética en nuestra organización.</p>
          `,
          reportId,
          reportCode: reportData.code,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Enviar correo al denunciante
        try {
          await sendEmailInternal({
            notificationId: emailNotificationRef.id,
            companyId
          });
          logger.info(`Correo enviado al denunciante para reporte: ${reportId}`);
        } catch (error) {
          logger.error('Error al enviar notificación al denunciante:', error);
        }
      }
      
      // 2. Notificar a los administradores
      const usersSnapshot = await admin.firestore()
        .collection(`companies/${companyId}/users`)
        .where('role', '==', 'admin')
        .get();
        
      if (!usersSnapshot.empty) {
        logger.info(`Notificando a ${usersSnapshot.size} administradores sobre nueva denuncia`);
        
        for (const adminDoc of usersSnapshot.docs) {
          const adminData = adminDoc.data();
          
          // Título especial para Ley Karin por su urgencia
          const title = reportData.isKarinLaw 
            ? '⚠️ URGENTE: Nueva denuncia Ley Karin recibida' 
            : 'Nueva denuncia recibida';
            
          const adminNotificationRef = admin.firestore()
            .collection(`companies/${companyId}/notifications`)
            .doc();
            
          await adminNotificationRef.set({
            recipient: adminData.email,
            type: 'new_report',
            title,
            content: `
              <p>Se ha registrado una nueva denuncia en el sistema:</p>
              <ul>
                <li>Código: <strong>${reportData.code}</strong></li>
                <li>Categoría: ${reportData.category}</li>
                ${reportData.isKarinLaw ? '<li><strong>Denuncia Ley Karin: Requiere atención prioritaria</strong></li>' : ''}
              </ul>
              <p>Por favor, revise la denuncia para asignarla a un investigador.</p>
            `,
            reportId,
            reportCode: reportData.code,
            userId: adminDoc.id,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          // Enviar correo al administrador
          try {
            await sendEmailInternal({
              notificationId: adminNotificationRef.id,
              companyId
            });
            logger.info(`Correo enviado al administrador ${adminDoc.id} para reporte: ${reportId}`);
          } catch (error) {
            logger.error(`Error al enviar notificación al administrador ${adminDoc.id}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error en onReportCreated:', error);
    }
  }
);

/**
 * Función para enviar notificación cuando se asigna un investigador a una denuncia
 */
export const onReportAssigned = onDocumentUpdated(
  {
    document: 'companies/{companyId}/reports/{reportId}',
    secrets: [emailPassword],
    region: 'southamerica-east1',
  },
  async (event) => {
    try {
      if (!event.data) {
        logger.error("No hay datos del documento actualizado");
        return;
      }
      
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();
      const companyId = event.params.companyId;
      const reportId = event.params.reportId;
      
      // Verificar si se ha asignado o cambiado el investigador
      if (afterData.assignedTo && beforeData.assignedTo !== afterData.assignedTo) {
        logger.info(`Investigador asignado/cambiado en reporte ${reportId}: ${afterData.assignedTo}`);
        
        // Obtener la información del investigador
        const userRef = admin.firestore()
          .collection(`companies/${companyId}/users`)
          .doc(afterData.assignedTo);
          
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
          logger.error('Investigador no encontrado:', afterData.assignedTo);
          return;
        }
        
        const userData = userSnap.data();
        if (!userData) {
          logger.error('Datos de investigador no encontrados:', afterData.assignedTo);
          return;
        }
        
        // Título especial para Ley Karin por su urgencia
        const title = afterData.isKarinLaw 
          ? '⚠️ URGENTE: Nueva denuncia Ley Karin asignada' 
          : 'Nueva denuncia asignada';
          
        const notificationRef = admin.firestore()
          .collection(`companies/${companyId}/notifications`)
          .doc();
          
        await notificationRef.set({
          recipient: userData.email,
          type: 'report_assigned',
          title,
          content: `
            <p>Se le ha asignado una nueva denuncia para investigación:</p>
            <ul>
              <li>Código: <strong>${afterData.code}</strong></li>
              <li>Categoría: ${afterData.category}</li>
              ${afterData.isKarinLaw ? '<li><strong>Denuncia Ley Karin: Requiere atención prioritaria de 5 días hábiles</strong></li>' : ''}
            </ul>
            <p>Por favor, revise la denuncia y comience el proceso de investigación a la brevedad.</p>
          `,
          reportId,
          reportCode: afterData.code,
          userId: afterData.assignedTo,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Enviar correo al investigador
        try {
          await sendEmailInternal({
            notificationId: notificationRef.id,
            companyId
          });
          logger.info(`Correo enviado al investigador ${afterData.assignedTo} para reporte: ${reportId}`);
        } catch (error) {
          logger.error('Error al enviar notificación al investigador:', error);
        }
      }
    } catch (error) {
      logger.error('Error en onReportAssigned:', error);
    }
  }
);

/**
 * Función de inicialización que se ejecuta cuando se accede a la primera página
 * Esta función asegura que la estructura básica de datos esté en su lugar
 */
export const initializeDefaultStructure = onRequest(
  {
    region: 'southamerica-east1'
  }, 
  async (request, response) => {
  try {
    logger.info("Inicializando estructura de datos por defecto");
    
    // Verificar si ya existe la empresa default
    const defaultCompanyRef = admin.firestore().doc("companies/default");
    const defaultCompany = await defaultCompanyRef.get();
    
    if (!defaultCompany.exists) {
      // Crear la empresa default
      await defaultCompanyRef.set({
        name: "Canal Etica",
        description: "Empresa predeterminada para formularios públicos",
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info("Empresa default creada");
    }
    
    // Verificar y crear configuración general
    const configRef = admin.firestore().doc("companies/default/settings/general");
    const configDoc = await configRef.get();
    
    if (!configDoc.exists) {
      await configRef.set({
        companyName: "Canal Etica",
        primaryColor: "#FF7E1D",
        secondaryColor: "#4D4D4D",
        emailNotifications: true,
        defaultLanguage: "es",
        retentionPolicy: 365,
        slaForRegular: 30,
        slaForKarin: 10,
        notifications: {
          notifyNewReport: true,
          notifyStatusChange: true,
          notifyNewComment: true,
          notifyDueDate: true
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info("Configuración general creada");
    }
    
    // Verificar y crear opciones de relaciones
    const relationsRef = admin.firestore().collection("companies/default/formOptions/relationships/values");
    const relationsSnapshot = await relationsRef.get();
    
    if (relationsSnapshot.empty) {
      const defaultRelationships = [
        { name: "Empleado", value: "empleado", description: "Persona que trabaja en la empresa", isActive: true, order: 0 },
        { name: "Proveedor", value: "proveedor", description: "Empresa o persona que provee bienes o servicios", isActive: true, order: 1 },
        { name: "Cliente", value: "cliente", description: "Persona o empresa que recibe nuestros servicios", isActive: true, order: 2 },
        { name: "Contratista", value: "contratista", description: "Persona contratada para un proyecto específico", isActive: true, order: 3 },
        { name: "Otro", value: "otro", description: "Otra relación no especificada", isActive: true, order: 4 }
      ];
      
      const batch = admin.firestore().batch();
      
      defaultRelationships.forEach((rel) => {
        const docRef = relationsRef.doc();
        batch.set(docRef, {
          ...rel,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      logger.info("Opciones de relaciones creadas");
    }
    
    // Verificar y crear opciones de frecuencias
    const frequenciesRef = admin.firestore().collection("companies/default/formOptions/frequencies/values");
    const frequenciesSnapshot = await frequenciesRef.get();
    
    if (frequenciesSnapshot.empty) {
      const defaultFrequencies = [
        { name: "Única vez", value: "unica", description: "Evento aislado", isActive: true, order: 0 },
        { name: "Ocasional", value: "ocasional", description: "Varias veces sin un patrón claro", isActive: true, order: 1 },
        { name: "Reiterada", value: "reiterada", description: "Se repite con regularidad", isActive: true, order: 2 },
        { name: "Sistemática", value: "sistematica", description: "Constante y deliberada", isActive: true, order: 3 }
      ];
      
      const batch = admin.firestore().batch();
      
      defaultFrequencies.forEach((freq) => {
        const docRef = frequenciesRef.doc();
        batch.set(docRef, {
          ...freq,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      logger.info("Opciones de frecuencias creadas");
    }
    
    response.json({
      success: true,
      message: "Estructura de datos inicializada correctamente"
    });
    
  } catch (error) {
    logger.error("Error al inicializar estructura:", error);
    response.status(500).json({
      success: false,
      error: "Error al inicializar estructura de datos"
    });
  }
});

/**
 * Función para eliminar una empresa y todos sus datos
 */
export const deleteCompanyAndData = onCall(
  {
    secrets: [emailPassword],
    region: 'southamerica-east1',
  },
  async (request) => {
    try {
      // Verificar autenticación
      if (!request.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'El usuario debe estar autenticado para realizar esta operación'
        );
      }

      // Verificar datos
      const { companyId } = request.data;
      if (!companyId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Se requiere el ID de la empresa a eliminar'
        );
      }

      logger.info(`Iniciando eliminación de la empresa ${companyId}`);

      // Verificar que el usuario es superadmin
      const callerUid = request.auth.uid;
      const adminUidsValue = adminUids.value();
      const adminUidsArray = adminUidsValue.split(',');

      if (!adminUidsArray.includes(callerUid)) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Solo los administradores super_admin pueden eliminar empresas'
        );
      }

      // Verificar que la empresa existe
      const companyRef = admin.firestore().collection('companies').doc(companyId);
      const company = await companyRef.get();

      if (!company.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'La empresa no existe'
        );
      }

      // Comprobar si la empresa está activa
      const companyData = company.data();
      if (companyData?.isActive) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'La empresa debe estar desactivada antes de eliminarla'
        );
      }

      // Lista de colecciones a eliminar
      const collectionsToDelete = [
        'users',
        'reports',
        'categories',
        'subcategories',
        'messageTemplates',
        'roles',
        'integrations',
        'notifications',
        'investigations',
        'findings',
        'recommendations',
        'tasks'
      ];

      // Añadir settings y sus documentos
      collectionsToDelete.push('settings');

      // Eliminar todas las subcollecciones
      for (const collectionName of collectionsToDelete) {
        const collection = admin.firestore().collection(`companies/${companyId}/${collectionName}`);
        const documents = await collection.get();

        logger.info(`Eliminando ${documents.size} documentos de ${collectionName}`);

        // Batch delete - permite eliminar hasta 500 documentos por lote
        const batchSize = 450; // límite de seguridad
        const batches = [];
        let batch = admin.firestore().batch();
        let operationCount = 0;

        for (const doc of documents.docs) {
          // Para documentos de report, eliminar también sus subcollecciones
          if (collectionName === 'reports') {
            // Eliminar mensajes del reporte
            const messagesCol = admin.firestore()
              .collection(`companies/${companyId}/reports/${doc.id}/messages`);
            const messages = await messagesCol.get();
            
            for (const msgDoc of messages.docs) {
              batch.delete(msgDoc.ref);
              operationCount++;
              
              if (operationCount >= batchSize) {
                batches.push(batch);
                batch = admin.firestore().batch();
                operationCount = 0;
              }
            }

            // Eliminar archivos del reporte
            const filesCol = admin.firestore()
              .collection(`companies/${companyId}/reports/${doc.id}/files`);
            const files = await filesCol.get();
            
            for (const fileDoc of files.docs) {
              batch.delete(fileDoc.ref);
              operationCount++;
              
              if (operationCount >= batchSize) {
                batches.push(batch);
                batch = admin.firestore().batch();
                operationCount = 0;
              }
            }

            // Eliminar recomendaciones del reporte
            const recommCol = admin.firestore()
              .collection(`companies/${companyId}/reports/${doc.id}/recommendations`);
            const recommendations = await recommCol.get();
            
            for (const recDoc of recommendations.docs) {
              batch.delete(recDoc.ref);
              operationCount++;
              
              if (operationCount >= batchSize) {
                batches.push(batch);
                batch = admin.firestore().batch();
                operationCount = 0;
              }
            }
          }

          // Eliminar el documento principal
          batch.delete(doc.ref);
          operationCount++;
          
          if (operationCount >= batchSize) {
            batches.push(batch);
            batch = admin.firestore().batch();
            operationCount = 0;
          }
        }

        // Ejecutar el último batch si tiene operaciones
        if (operationCount > 0) {
          batches.push(batch);
        }

        // Ejecutar todos los batches
        for (const currentBatch of batches) {
          await currentBatch.commit();
        }
      }

      // Finalmente eliminar el documento de la empresa
      await companyRef.delete();
      logger.info(`Empresa ${companyId} eliminada con éxito`);

      return { success: true, message: 'Empresa eliminada con éxito' };
    } catch (error) {
      logger.error('Error al eliminar empresa:', error);

      // Si el error ya es un HttpsError, lo pasamos directamente
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // De lo contrario, creamos un nuevo error
      throw new functions.https.HttpsError(
        'internal',
        'Error al eliminar la empresa: ' + (error as Error).message
      );
    }
  }
);