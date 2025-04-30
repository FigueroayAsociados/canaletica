/**
 * Script para crear un usuario administrador para una empresa específica
 * Uso: node scripts/add-company-admin.js <companyId> <email> <displayName>
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();
const auth = getAuth();

// Obtener los argumentos
const companyId = process.argv[2];
const email = process.argv[3];
const displayName = process.argv[4] || email.split('@')[0];

if (!companyId || !email) {
  console.error('Error: Debe proporcionar un ID de empresa y un email.');
  console.log('Uso: node scripts/add-company-admin.js <companyId> <email> <displayName>');
  process.exit(1);
}

// Crear usuario administrador
async function createCompanyAdmin() {
  try {
    // Verificar si la empresa existe
    const companySettingsRef = db.doc(`companies/${companyId}/settings/general`);
    const companySettingsDoc = await companySettingsRef.get();
    
    if (!companySettingsDoc.exists) {
      console.error(`Error: La empresa con ID '${companyId}' no existe.`);
      console.log('Cree primero la empresa usando scripts/setup-company.js');
      process.exit(1);
    }

    const companySettings = companySettingsDoc.data();
    console.log(`Creando administrador para la empresa: ${companySettings.companyName} (${companyId})`);
    
    // Verificar si el usuario ya existe en Firebase Auth
    let uid;
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
      console.log(`Usuario ya existe en Firebase Auth con UID: ${uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Crear nuevo usuario
        const newUser = await auth.createUser({
          email,
          displayName,
          emailVerified: false,
          password: Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + '!'
        });
        uid = newUser.uid;
        console.log(`Nuevo usuario creado en Firebase Auth con UID: ${uid}`);
        console.log('⚠️ Se ha generado una contraseña aleatoria. El usuario debe usar "Olvidé mi contraseña" para establecer su propia contraseña.');
      } else {
        throw error;
      }
    }
    
    // Verificar si ya existe un perfil para este usuario en esta empresa
    const userProfileRef = db.doc(`companies/${companyId}/users/${uid}`);
    const userProfileDoc = await userProfileRef.get();
    
    if (userProfileDoc.exists) {
      const userData = userProfileDoc.data();
      if (userData.role === 'admin') {
        console.error(`Error: El usuario ${email} ya es administrador en esta empresa.`);
        process.exit(1);
      } else {
        // Actualizar el rol a administrador
        await userProfileRef.update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Usuario ${email} actualizado a administrador en la empresa ${companyId}`);
      }
    } else {
      // Crear nuevo perfil de usuario
      await userProfileRef.set({
        uid,
        email,
        displayName,
        role: 'admin',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Usuario ${email} creado como administrador en la empresa ${companyId}`);
    }
    
    console.log('\nRecuerde:');
    console.log('1. El usuario debe iniciar sesión con su email');
    console.log('2. Si es un usuario nuevo, debe usar "Olvidé mi contraseña" para establecer su contraseña');
    console.log('3. Para acceder a la empresa, use el parámetro ?company=' + companyId + ' en la URL');
    
  } catch (error) {
    console.error('Error al crear administrador:', error);
    process.exit(1);
  }
}

// Ejecutar la función
createCompanyAdmin();