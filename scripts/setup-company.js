/**
 * Script para configurar una nueva empresa en el sistema
 * Uso: node scripts/setup-company.js <companyId> <companyName>
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

// Obtener los argumentos
const companyId = process.argv[2];
const companyName = process.argv[3] || 'Empresa sin nombre';

if (!companyId) {
  console.error('Error: Debe proporcionar un ID de empresa.');
  console.log('Uso: node scripts/setup-company.js <companyId> <companyName>');
  process.exit(1);
}

// Crear la empresa
async function setupCompany() {
  try {
    // Verificar si la empresa ya existe
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();
    
    if (companyDoc.exists) {
      console.error(`Error: La empresa con ID '${companyId}' ya existe.`);
      process.exit(1);
    }
    
    // Crear las configuraciones básicas de la empresa
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Configuración general
    await db.doc(`companies/${companyId}/settings/general`).set({
      companyName,
      createdAt: timestamp,
      updatedAt: timestamp,
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      isActive: true
    });
    
    // Crear roles predeterminados
    const rolesData = [
      { name: 'Admin', value: 'admin', description: 'Administrador con acceso completo' },
      { name: 'Investigador', value: 'investigator', description: 'Puede gestionar investigaciones' },
      { name: 'Usuario', value: 'user', description: 'Usuario básico' }
    ];
    
    for (const role of rolesData) {
      await db.collection(`companies/${companyId}/roles`).add({
        ...role,
        createdAt: timestamp,
        updatedAt: timestamp,
        isSystem: true
      });
    }
    
    // Crear categorías predeterminadas
    const categoriesData = [
      { name: 'Prevención de Delitos', value: 'modelo_prevencion', description: 'Denuncias relacionadas con el modelo de prevención de delitos' },
      { name: 'Ley Karin', value: 'ley_karin', description: 'Denuncias relacionadas con acoso laboral o sexual' },
      { name: 'Reglamento Interno', value: 'reglamento_interno', description: 'Denuncias relacionadas con el reglamento interno' },
      { name: 'Políticas y Códigos', value: 'politicas_codigos', description: 'Denuncias relacionadas con incumplimiento de políticas o códigos' },
      { name: 'Represalias', value: 'represalias', description: 'Denuncias de represalias' },
      { name: 'Otros', value: 'otros', description: 'Otras denuncias' }
    ];
    
    for (const category of categoriesData) {
      await db.collection(`companies/${companyId}/categories`).add({
        ...category,
        createdAt: timestamp,
        updatedAt: timestamp,
        isSystem: true
      });
    }
    
    console.log(`✅ Empresa '${companyName}' (${companyId}) creada exitosamente`);
    console.log('✅ Configuración general creada');
    console.log('✅ Roles predeterminados creados');
    console.log('✅ Categorías predeterminadas creadas');
    
    console.log('\nRecuerde que ahora necesita:');
    console.log('1. Crear al menos un usuario administrador para esta empresa');
    console.log('2. Configurar cualquier personalización adicional');
    console.log('3. Acceder usando el parámetro ?company=' + companyId + ' en la URL');
    
  } catch (error) {
    console.error('Error al configurar la empresa:', error);
    process.exit(1);
  }
}

// Ejecutar la función
setupCompany();