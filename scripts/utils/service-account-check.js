/**
 * Módulo de utilidad para verificar y cargar las credenciales de Firebase Admin
 */

const fs = require('fs');
const path = require('path');

function checkServiceAccount() {
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('Error: Archivo serviceAccountKey.json no encontrado.');
      console.log('Por favor, siga estos pasos:');
      console.log('1. Vaya a la consola de Firebase: https://console.firebase.google.com/');
      console.log('2. Seleccione su proyecto');
      console.log('3. Vaya a Configuración del proyecto > Cuentas de servicio');
      console.log('4. Genere una nueva clave privada');
      console.log('5. Guarde el archivo JSON generado como "scripts/serviceAccountKey.json"');
      return null;
    }
    
    return require(serviceAccountPath);
  } catch (error) {
    console.error('Error al cargar el archivo de credenciales:', error);
    return null;
  }
}

function initializeFirebaseAdmin() {
  const admin = require('firebase-admin');
  
  const serviceAccount = checkServiceAccount();
  if (!serviceAccount) {
    return null;
  }
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  return {
    admin,
    db: admin.firestore(),
    auth: admin.auth(),
    FieldValue: admin.firestore.FieldValue
  };
}

module.exports = {
  checkServiceAccount,
  initializeFirebaseAdmin
};