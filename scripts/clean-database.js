/**
 * Script para limpiar la base de datos y preparar para implementación multi-tenant
 * 
 * Este script elimina todas las empresas y sus datos relacionados
 * excepto los usuarios super administradores.
 * 
 * Uso: node scripts/clean-database.js
 */

const { initializeFirebaseAdmin } = require('./utils/service-account-check');
const firebase = initializeFirebaseAdmin();

if (!firebase) {
  process.exit(1);
}

const { admin, db } = firebase;

async function deleteCollection(collectionPath, batchSize = 500) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, batchSize, resolve, reject);
  });
}

async function deleteQueryBatch(query, batchSize, resolve, reject) {
  try {
    const snapshot = await query.get();

    // Si no hay documentos, terminamos
    if (snapshot.size === 0) {
      resolve();
      return;
    }

    // Crear un batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Ejecutar el batch
    await batch.commit();

    // Obtener el último documento procesado
    const last = snapshot.docs[snapshot.docs.length - 1];

    // Recursión: continuar con el siguiente batch
    const nextQuery = query.startAfter(last.id);
    process.nextTick(() => {
      deleteQueryBatch(nextQuery, batchSize, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

async function cleanDatabase() {
  console.log('Iniciando limpieza de la base de datos...');

  try {
    // 1. Obtener todas las empresas
    const companiesSnapshot = await db.collection('companies').get();
    console.log(`Encontradas ${companiesSnapshot.size} empresas para eliminar.`);

    // 2. Para cada empresa, eliminar sus subcolecciones
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      console.log(`\nProcesando empresa: ${companyId}`);

      // Colecciones a eliminar para cada empresa
      const collections = [
        'categories',
        'subcategories',
        'reports',
        'users',
        'settings',
        'comments',
        'notifications',
        'files'
      ];

      // Eliminar cada colección
      for (const collection of collections) {
        const collectionPath = `companies/${companyId}/${collection}`;
        console.log(`  Eliminando colección: ${collectionPath}`);
        await deleteCollection(collectionPath);
      }

      // Eliminar documento principal de la empresa
      console.log(`  Eliminando documento principal de la empresa: ${companyId}`);
      await companyDoc.ref.delete();
    }

    console.log('\nLimpieza completada con éxito.');
    console.log('La base de datos está lista para la implementación multi-tenant.');
    console.log('\nA continuación, deberás:');
    console.log('1. Modificar la función normalizeCompanyId() para habilitar multi-tenant');
    console.log('2. Redesplegar la aplicación');
    console.log('3. Crear una nueva empresa de prueba');

  } catch (error) {
    console.error('Error durante la limpieza:', error);
    process.exit(1);
  }
}

// Confirmar antes de ejecutar
console.log('¡ADVERTENCIA! Este script eliminará TODOS los datos de empresas y denuncias.');
console.log('Los datos eliminados NO se pueden recuperar.');
console.log('Si estás seguro de continuar, presiona cualquier tecla...');
console.log('O presiona Ctrl+C para cancelar.');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', async () => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  
  await cleanDatabase();
  process.exit(0);
});