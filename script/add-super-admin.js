// script/add-super-admin.js
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Cargar variables desde .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    acc[key] = value;
    return acc;
  }, {});

// Configurar Firebase Admin SDK
let adminCredential;
if (env.FIREBASE_ADMIN_KEY) {
  try {
    const credentialJSON = Buffer.from(
      env.FIREBASE_ADMIN_KEY,
      'base64'
    ).toString('utf8');
    adminCredential = JSON.parse(credentialJSON);
  } catch (error) {
    console.error('Error al decodificar credenciales de Firebase Admin:', error);
    process.exit(1);
  }
} else {
  console.error('FIREBASE_ADMIN_KEY no está definida en las variables de entorno');
  process.exit(1);
}

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(adminCredential),
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();

// Función para agregar un super admin
async function addSuperAdmin() {
  try {
    // Obtener el UID del administrador desde las variables de entorno
    const adminUID = env.NEXT_PUBLIC_ADMIN_UIDS;
    
    if (!adminUID) {
      console.error('NEXT_PUBLIC_ADMIN_UIDS no está definido en .env.local');
      process.exit(1);
    }

    // Verificar si el usuario existe en Authentication
    try {
      const userRecord = await admin.auth().getUser(adminUID);
      console.log(`Usuario encontrado: ${userRecord.email}`);

      // Añadir a la colección super_admins en Firestore
      await db.collection('super_admins').doc(adminUID).set({
        email: userRecord.email,
        displayName: userRecord.displayName || 'Super Administrador',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      });

      console.log(`Super admin ${userRecord.email} configurado correctamente`);
    } catch (error) {
      console.error('Error al verificar usuario en Authentication:', error);
      
      // Si no podemos obtener el usuario por UID, intentamos crear un documento basado en la información que tenemos
      console.log('Intentando crear entrada de superadmin basada en UID...');
      
      await db.collection('super_admins').doc(adminUID).set({
        email: 'ricardofigueroa@fentisa.cl', // Puedes ajustar esto si conoces el correo
        displayName: 'Super Administrador',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      });
      
      console.log(`Super admin configurado con UID ${adminUID}`);
    }
  } catch (error) {
    console.error('Error al configurar super admin:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar función
addSuperAdmin();