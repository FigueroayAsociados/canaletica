// functions/src/alt-index.js
// Versión alternativa en JavaScript puro que omite errores de TypeScript

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const logger = require("firebase-functions/logger");

// Inicializar la aplicación de Firebase Admin
admin.initializeApp();

// Configurar transporte de nodemailer
let mailTransport;

try {
  mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: functions.config().email?.user,
      pass: functions.config().email?.password
    }
  });
  logger.info("Transporte de correo configurado correctamente");
} catch (error) {
  logger.error("Error al configurar el transporte de correo:", error);
}

// Función para enviar un correo electrónico
exports.sendEmail = functions.https.onCall(async (data, context) => {
  try {
    const { notificationId, companyId } = data;
    
    if (!notificationId || !companyId) {
      logger.error("Datos incompletos para enviar email", { notificationId, companyId });
      return { success: false, error: 'Datos incompletos' };
    }

    // Verificar si el transporte de correo está configurado
    if (!mailTransport) {
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
      from: `"${company?.name || 'Canal de Denuncias'}" <${functions.config().email?.user}>`,
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
            error: error.message || 'Error desconocido'
          });
      }
    } catch (updateError) {
      logger.error("Error al actualizar estado de notificación:", updateError);
    }
    
    return { success: false, error: error.message || 'Error desconocido' };
  }
});