/**
 * Script para consolidar categorías y subcategorías en la colección 'default'
 * Uso: node scripts/migrate-categories.js
 */

const admin = require('firebase-admin');
let serviceAccount;

try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  console.error('Error: Archivo serviceAccountKey.json no encontrado.');
  console.log('Por favor, siga estos pasos:');
  console.log('1. Vaya a la consola de Firebase: https://console.firebase.google.com/');
  console.log('2. Seleccione su proyecto');
  console.log('3. Vaya a Configuración del proyecto > Cuentas de servicio');
  console.log('4. Genere una nueva clave privada');
  console.log('5. Guarde el archivo JSON generado como "scripts/serviceAccountKey.json"');
  process.exit(1);
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const targetCompanyId = 'default';

// Función principal
async function consolidateCategories() {
  try {
    console.log('Buscando todas las colecciones de empresas en Firebase...');
    
    // Obtener todas las colecciones de empresas
    const companiesRef = db.collection('companies');
    const companiesSnapshot = await companiesRef.get();
    
    if (companiesSnapshot.empty) {
      console.log('No se encontraron colecciones de empresas.');
      return;
    }
    
    console.log(`\nSe encontraron ${companiesSnapshot.size} colecciones de empresas.`);
    
    // Lista de colecciones distintas a 'default' con categorías
    const sourceCompanies = [];
    
    // Verificar cada colección de empresas
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      if (companyId === targetCompanyId) {
        console.log(`- ${companyId} (destino de consolidación)`);
        continue;
      }
      
      // Verificar si esta colección tiene categorías
      const categoriesRef = db.collection(`companies/${companyId}/categories`);
      const categoriesSnapshot = await categoriesRef.get();
      
      if (!categoriesSnapshot.empty) {
        console.log(`- ${companyId} (contiene ${categoriesSnapshot.size} categorías)`);
        sourceCompanies.push(companyId);
      } else {
        console.log(`- ${companyId} (sin categorías)`);
      }
    }
    
    if (sourceCompanies.length === 0) {
      console.log('\nNo se encontraron colecciones de empresas con categorías para migrar.');
      return;
    }
    
    console.log(`\nSe encontraron ${sourceCompanies.length} colecciones con categorías para migrar a 'default'.`);
    console.log('Iniciando migración...\n');
    
    // Migrar categorías de cada colección
    for (const sourceCompanyId of sourceCompanies) {
      console.log(`\n=== Migrando datos de ${sourceCompanyId} a ${targetCompanyId} ===\n`);
      await migrateCompanyData(sourceCompanyId, targetCompanyId);
    }
    
    console.log('\n✅ Consolidación completada exitosamente.');
    console.log('\nIMPORTANTE: Ahora todas las categorías están en la colección "default".');
    console.log('La función normalizeCompanyId() ha sido actualizada para garantizar que todas las');
    console.log('operaciones utilicen esta colección, evitando la dispersión de datos.');
    
  } catch (error) {
    console.error('Error durante la consolidación:', error);
  }
}

// Función para migrar datos de una empresa a otra
async function migrateCompanyData(sourceCompanyId, targetCompanyId) {
  try {
    // 1. Migrar categorías
    const categoriesRef = db.collection(`companies/${sourceCompanyId}/categories`);
    const categoriesSnapshot = await categoriesRef.get();
    
    console.log(`Migrando ${categoriesSnapshot.size} categorías de ${sourceCompanyId}...`);
    
    for (const doc of categoriesSnapshot.docs) {
      const categoryData = doc.data();
      const categoryId = doc.id;
      
      console.log(`- Categoría: ${categoryData.name} (${categoryId})`);
      
      // Comprobar si la categoría ya existe en el destino
      const targetCategoryRef = db.doc(`companies/${targetCompanyId}/categories/${categoryId}`);
      const targetCategorySnapshot = await targetCategoryRef.get();
      
      if (targetCategorySnapshot.exists) {
        console.log(`  Ya existe en el destino. Verificando si necesita actualización...`);
        
        const targetData = targetCategorySnapshot.data();
        const needsUpdate = (
          targetData.name !== categoryData.name ||
          targetData.description !== categoryData.description ||
          targetData.isActive !== categoryData.isActive ||
          targetData.isKarinLaw !== categoryData.isKarinLaw ||
          targetData.order !== categoryData.order
        );
        
        if (needsUpdate) {
          console.log(`  Actualizando información en el destino...`);
          await targetCategoryRef.update({
            ...categoryData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          console.log(`  No requiere actualización.`);
        }
      } else {
        console.log(`  Creando en el destino...`);
        await targetCategoryRef.set({
          ...categoryData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    // 2. Migrar subcategorías
    const subcategoriesRef = db.collection(`companies/${sourceCompanyId}/subcategories`);
    const subcategoriesSnapshot = await subcategoriesRef.get();
    
    console.log(`\nMigrando ${subcategoriesSnapshot.size} subcategorías de ${sourceCompanyId}...`);
    
    for (const doc of subcategoriesSnapshot.docs) {
      const subcategoryData = doc.data();
      const subcategoryId = doc.id;
      
      // Obtener el nombre de la categoría padre para mostrar mejor información
      let categoryName = subcategoryData.categoryId;
      try {
        const categoryRef = db.doc(`companies/${targetCompanyId}/categories/${subcategoryData.categoryId}`);
        const categorySnap = await categoryRef.get();
        if (categorySnap.exists) {
          categoryName = categorySnap.data().name;
        }
      } catch (e) {
        // Ignorar errores al obtener el nombre de la categoría
      }
      
      console.log(`- Subcategoría: ${subcategoryData.name} (${subcategoryId}) - Categoría: ${categoryName}`);
      
      // Comprobar si la subcategoría ya existe en el destino
      const targetSubcategoryRef = db.doc(`companies/${targetCompanyId}/subcategories/${subcategoryId}`);
      const targetSubcategorySnapshot = await targetSubcategoryRef.get();
      
      if (targetSubcategorySnapshot.exists) {
        console.log(`  Ya existe en el destino. Verificando si necesita actualización...`);
        
        const targetData = targetSubcategorySnapshot.data();
        const needsUpdate = (
          targetData.name !== subcategoryData.name ||
          targetData.description !== subcategoryData.description ||
          targetData.isActive !== subcategoryData.isActive ||
          targetData.order !== subcategoryData.order
        );
        
        if (needsUpdate) {
          console.log(`  Actualizando información en el destino...`);
          await targetSubcategoryRef.update({
            ...subcategoryData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          console.log(`  No requiere actualización.`);
        }
      } else {
        console.log(`  Creando en el destino...`);
        await targetSubcategoryRef.set({
          ...subcategoryData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    console.log(`\n✅ Migración de ${sourceCompanyId} completada.`);
    
  } catch (error) {
    console.error(`Error al migrar datos de ${sourceCompanyId}:`, error);
  }
}

// Ejecutar la función principal
consolidateCategories();