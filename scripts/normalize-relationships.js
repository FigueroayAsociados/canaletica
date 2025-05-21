// scripts/normalize-relationships.js
// Script para normalizar las opciones de relaciones en todas las empresas

// Importaciones
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
try {
  // Intenta buscar una configuración local primero
  const serviceAccountPath = path.join(__dirname, 'canaletica-firebase-adminsdk.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin inicializado con credenciales locales');
  } else {
    // Si no hay configuración local, usa las variables de entorno (para CI/CD)
    admin.initializeApp();
    console.log('Firebase Admin inicializado con credenciales de entorno');
  }
} catch (error) {
  console.error('Error al inicializar Firebase Admin:', error);
  process.exit(1);
}

// Definir las opciones de relación estándar
const standardRelationships = [
  { name: 'Empleado', value: 'empleado', description: 'Persona que trabaja en la empresa', isActive: true, order: 0 },
  { name: 'Proveedor', value: 'proveedor', description: 'Empresa o persona que provee bienes o servicios', isActive: true, order: 1 },
  { name: 'Cliente', value: 'cliente', description: 'Persona o empresa que recibe nuestros servicios', isActive: true, order: 2 },
  { name: 'Contratista', value: 'contratista', description: 'Persona contratada para un proyecto específico', isActive: true, order: 3 },
  { name: 'Otro', value: 'otro', description: 'Otra relación no especificada', isActive: true, order: 4 }
];

// Función para normalizar las opciones de una empresa
async function normalizeCompanyRelationships(companyId) {
  try {
    const db = admin.firestore();
    
    console.log(`Normalizando opciones para compañía: ${companyId}`);
    
    // Ruta a la colección de opciones de relación
    const optionsPath = `companies/${companyId}/formOptions/relationships/values`;
    
    // Eliminar opciones existentes
    const optionsSnapshot = await db.collection(optionsPath).get();
    
    const batch = db.batch();
    
    // Marcar todas las opciones existentes como eliminadas
    optionsSnapshot.forEach((doc) => {
      console.log(`Eliminando opción existente: ${doc.id} - ${doc.data().name}`);
      batch.delete(doc.ref);
    });
    
    // Crear nuevas opciones estandarizadas
    standardRelationships.forEach((relationship) => {
      const newDocRef = db.collection(optionsPath).doc();
      console.log(`Creando nueva opción estándar: ${relationship.name}`);
      batch.set(newDocRef, {
        ...relationship,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    // Ejecutar el batch
    await batch.commit();
    console.log(`Normalización completada para compañía: ${companyId}`);
    return true;
  } catch (error) {
    console.error(`Error al normalizar opciones para compañía ${companyId}:`, error);
    return false;
  }
}

// Función principal
async function main() {
  try {
    const db = admin.firestore();
    
    // Obtener todas las compañías
    const companiesSnapshot = await db.collection('companies').get();
    
    if (companiesSnapshot.empty) {
      console.log('No se encontraron compañías en la base de datos.');
      return;
    }
    
    console.log(`Se encontraron ${companiesSnapshot.size} compañías.`);
    
    // Procesar cada compañía
    const promises = [];
    companiesSnapshot.forEach((doc) => {
      const companyId = doc.id;
      const companyName = doc.data().name || 'Nombre no disponible';
      
      console.log(`Procesando compañía: ${companyName} (${companyId})`);
      promises.push(normalizeCompanyRelationships(companyId));
    });
    
    // Esperar a que se completen todas las operaciones
    const results = await Promise.all(promises);
    
    // Contar éxitos y fallos
    const successes = results.filter(r => r === true).length;
    const failures = results.filter(r => r === false).length;
    
    console.log('\n--- RESUMEN ---');
    console.log(`Total de compañías procesadas: ${results.length}`);
    console.log(`Éxitos: ${successes}`);
    console.log(`Fallos: ${failures}`);
    
    if (failures > 0) {
      console.log('\nATENCIÓN: Algunas compañías no pudieron ser normalizadas. Revise los logs para más detalles.');
    } else {
      console.log('\nTodas las compañías fueron normalizadas correctamente.');
    }
    
  } catch (error) {
    console.error('Error en la ejecución principal:', error);
  } finally {
    // Cerrar la aplicación de Firebase Admin
    await admin.app().delete();
  }
}

// Ejecutar la función principal
main().catch(console.error);