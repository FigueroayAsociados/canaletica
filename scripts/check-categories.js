/**
 * Script para verificar categorías en la colección default
 * Uso: node scripts/check-categories.js
 */

const admin = require('firebase-admin');
let serviceAccount;

try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  console.error('Error: Archivo serviceAccountKey.json no encontrado.');
  process.exit(1);
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const companyId = 'default';

async function checkCategories() {
  try {
    console.log(`\nVerificando categorías en la colección companies/${companyId}/categories\n`);
    
    // Obtener todas las categorías
    const categoriesRef = db.collection(`companies/${companyId}/categories`);
    const categoriesSnapshot = await categoriesRef.get();
    
    if (categoriesSnapshot.empty) {
      console.log('❌ No se encontraron categorías en la colección default');
      return;
    }
    
    console.log(`✅ Se encontraron ${categoriesSnapshot.size} categorías en la colección default:`);
    
    // Mostrar todas las categorías
    for (const doc of categoriesSnapshot.docs) {
      const categoryData = doc.data();
      console.log(`- ${categoryData.name} (ID: ${doc.id}, Activa: ${categoryData.isActive})`);
      
      // Obtener subcategorías para esta categoría
      const subcategoriesRef = db.collection(`companies/${companyId}/subcategories`);
      const subcategoriesSnapshot = await subcategoriesRef.where('categoryId', '==', doc.id).get();
      
      if (!subcategoriesSnapshot.empty) {
        console.log(`  Subcategorías (${subcategoriesSnapshot.size}):`);
        for (const subcatDoc of subcategoriesSnapshot.docs) {
          const subcatData = subcatDoc.data();
          console.log(`  - ${subcatData.name} (ID: ${subcatDoc.id}, Activa: ${subcatData.isActive})`);
        }
      } else {
        console.log('  No tiene subcategorías');
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Error al verificar categorías:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la función
checkCategories();