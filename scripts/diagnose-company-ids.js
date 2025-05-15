/**
 * Script de diagnóstico para la normalización de IDs de empresas
 * Este script ayuda a entender cómo funciona el sistema de normalización
 * y facilita la identificación de problemas relacionados con la creación
 * y gestión de empresas en diferentes contextos.
 * 
 * Uso: node scripts/diagnose-company-ids.js [test-id]
 * Ejemplo: node scripts/diagnose-company-ids.js empresa1
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
const DEFAULT_COMPANY_ID = 'default';

// Simular la función normalizeCompanyId
function normalizeCompanyId(companyId) {
  if (!companyId || 
      companyId.startsWith('canaletica-') || 
      companyId.includes('-ricardo-figueroas-projects-')) {
    return DEFAULT_COMPANY_ID;
  }
  
  // Esta es la parte que fuerza todo a 'default'
  if (companyId !== DEFAULT_COMPANY_ID) {
    return DEFAULT_COMPANY_ID;
  }
  
  return DEFAULT_COMPANY_ID;
}

// Función para diagnosticar un ID de empresa
async function diagnoseCompanyId(testId) {
  console.log(`\n=== DIAGNÓSTICO DE ID DE EMPRESA: "${testId}" ===\n`);
  
  // 1. Normalización del ID
  const normalizedId = normalizeCompanyId(testId);
  console.log(`1. Normalización de ID:`);
  console.log(`   - ID original: "${testId}"`);
  console.log(`   - ID normalizado: "${normalizedId}"`);
  console.log(`   - ¿Se modificó el ID? ${testId !== normalizedId ? 'SÍ' : 'NO'}`);
  
  // 2. Verificar existencia con ID original
  let existsWithOriginalId = false;
  try {
    const originalRef = db.doc(`companies/${testId}`);
    const originalSnap = await originalRef.get();
    existsWithOriginalId = originalSnap.exists;
    
    console.log(`\n2. Verificación con ID original "${testId}":`);
    console.log(`   - ¿Existe empresa? ${existsWithOriginalId ? 'SÍ' : 'NO'}`);
    
    if (existsWithOriginalId) {
      const data = originalSnap.data();
      console.log(`   - Nombre: ${data.name || 'No disponible'}`);
      console.log(`   - Descripción: ${data.description || 'No disponible'}`);
      console.log(`   - Activa: ${data.isActive !== undefined ? data.isActive : 'No disponible'}`);
    }
  } catch (error) {
    console.log(`   - Error al verificar con ID original: ${error.message}`);
  }
  
  // 3. Verificar existencia con ID normalizado
  let existsWithNormalizedId = false;
  if (testId !== normalizedId) {
    try {
      const normalizedRef = db.doc(`companies/${normalizedId}`);
      const normalizedSnap = await normalizedRef.get();
      existsWithNormalizedId = normalizedSnap.exists;
      
      console.log(`\n3. Verificación con ID normalizado "${normalizedId}":`);
      console.log(`   - ¿Existe empresa? ${existsWithNormalizedId ? 'SÍ' : 'NO'}`);
      
      if (existsWithNormalizedId) {
        const data = normalizedSnap.data();
        console.log(`   - Nombre: ${data.name || 'No disponible'}`);
        console.log(`   - Descripción: ${data.description || 'No disponible'}`);
        console.log(`   - Activa: ${data.isActive !== undefined ? data.isActive : 'No disponible'}`);
      }
    } catch (error) {
      console.log(`   - Error al verificar con ID normalizado: ${error.message}`);
    }
  }
  
  // 4. Verificar configuración en settings/general
  console.log(`\n4. Verificación de configuración en settings/general:`);
  
  // Con ID original
  try {
    const originalConfigRef = db.doc(`companies/${testId}/settings/general`);
    const originalConfigSnap = await originalConfigRef.get();
    
    console.log(`   - Con ID original "${testId}":`);
    console.log(`   - ¿Existe configuración? ${originalConfigSnap.exists ? 'SÍ' : 'NO'}`);
    
    if (originalConfigSnap.exists) {
      const data = originalConfigSnap.data();
      console.log(`   - Nombre de empresa: ${data.companyName || 'No disponible'}`);
      console.log(`   - Color primario: ${data.primaryColor || 'No disponible'}`);
    }
  } catch (error) {
    console.log(`   - Error al verificar configuración con ID original: ${error.message}`);
  }
  
  // Con ID normalizado (si es diferente)
  if (testId !== normalizedId) {
    try {
      const normalizedConfigRef = db.doc(`companies/${normalizedId}/settings/general`);
      const normalizedConfigSnap = await normalizedConfigRef.get();
      
      console.log(`\n   - Con ID normalizado "${normalizedId}":`);
      console.log(`   - ¿Existe configuración? ${normalizedConfigSnap.exists ? 'SÍ' : 'NO'}`);
      
      if (normalizedConfigSnap.exists) {
        const data = normalizedConfigSnap.data();
        console.log(`   - Nombre de empresa: ${data.companyName || 'No disponible'}`);
        console.log(`   - Color primario: ${data.primaryColor || 'No disponible'}`);
      }
    } catch (error) {
      console.log(`   - Error al verificar configuración con ID normalizado: ${error.message}`);
    }
  }
  
  // 5. Verificar otras colecciones relevantes (categorías, usuarios)
  console.log(`\n5. Verificación de colecciones relevantes:`);
  
  // Categorías con ID original
  try {
    const originalCategoriesRef = db.collection(`companies/${testId}/categories`);
    const originalCategoriesSnap = await originalCategoriesRef.get();
    
    console.log(`   - Categorías con ID original "${testId}":`);
    console.log(`   - ¿Existen categorías? ${!originalCategoriesSnap.empty ? 'SÍ' : 'NO'}`);
    console.log(`   - Cantidad: ${originalCategoriesSnap.size}`);
  } catch (error) {
    console.log(`   - Error al verificar categorías con ID original: ${error.message}`);
  }
  
  // Categorías con ID normalizado (si es diferente)
  if (testId !== normalizedId) {
    try {
      const normalizedCategoriesRef = db.collection(`companies/${normalizedId}/categories`);
      const normalizedCategoriesSnap = await normalizedCategoriesRef.get();
      
      console.log(`\n   - Categorías con ID normalizado "${normalizedId}":`);
      console.log(`   - ¿Existen categorías? ${!normalizedCategoriesSnap.empty ? 'SÍ' : 'NO'}`);
      console.log(`   - Cantidad: ${normalizedCategoriesSnap.size}`);
    } catch (error) {
      console.log(`   - Error al verificar categorías con ID normalizado: ${error.message}`);
    }
  }
  
  // 6. Diagnóstico y recomendaciones
  console.log('\n=== DIAGNÓSTICO Y RECOMENDACIONES ===\n');
  
  if (existsWithOriginalId) {
    console.log(`✅ La empresa con ID "${testId}" existe en la colección.`);
  } else if (existsWithNormalizedId) {
    console.log(`⚠️ La empresa no existe con el ID "${testId}", pero existe con el ID normalizado "${normalizedId}".`);
    console.log(`   Esto es esperado durante la fase de desarrollo debido a la función normalizeCompanyId().`);
  } else {
    console.log(`❌ La empresa no existe ni con el ID original ni con el ID normalizado.`);
  }
  
  console.log('\nConsejos para resolver problemas:');
  
  if (testId === DEFAULT_COMPANY_ID) {
    console.log(`1. Está utilizando el ID predeterminado "${DEFAULT_COMPANY_ID}".`);
    console.log('   • Esto es normal para la empresa principal durante el desarrollo.');
    console.log('   • Todas las operaciones se dirigen a esta colección por defecto.');
  } else {
    console.log(`1. Está utilizando un ID personalizado "${testId}".`);
    console.log(`   • Durante el desarrollo, la función normalizeCompanyId() redirige a "${DEFAULT_COMPANY_ID}".`);
    console.log('   • Esto puede causar confusión al crear y acceder a empresas.');
  }
  
  console.log('\n2. Recomendaciones específicas:');
  
  if (existsWithOriginalId && !existsWithNormalizedId) {
    console.log(`   • La empresa existe solo con el ID "${testId}".`);
    console.log('   • Es posible que se haya creado usando la versión modificada de createCompany().');
    console.log('   • Para acceder a los datos, algunas funciones pueden requerir ajustes adicionales.');
  } else if (!existsWithOriginalId && existsWithNormalizedId) {
    console.log(`   • La empresa solo existe con el ID normalizado "${normalizedId}".`);
    console.log('   • Esto es el comportamiento estándar durante la fase de desarrollo.');
    console.log(`   • Para crear una empresa con ID "${testId}", se requiere una versión modificada de createCompany().`);
  } else if (existsWithOriginalId && existsWithNormalizedId) {
    console.log(`   • La empresa existe tanto con el ID original como normalizado.`);
    console.log('   • Esto puede causar problemas de coherencia de datos.');
    console.log('   • Considere consolidar los datos o revisar la lógica de normalización.');
  } else {
    console.log('   • No existe ninguna empresa con el ID proporcionado.');
    console.log('   • Para crear una nueva empresa, use la función createCompany() desde el panel de administración.');
  }
  
  console.log('\n3. Para una solución completa:');
  console.log('   • Revise la implementación de normalizeCompanyId() en src/lib/utils/helpers.ts');
  console.log('   • Para la fase de desarrollo, considere un enfoque híbrido que permita operaciones específicas por empresa');
  console.log('   • Para producción, modifique la función para mantener los IDs originales');
  console.log('   • Consulte scripts/README-MIGRACION.md para entender el contexto completo');
}

// Función principal
async function main() {
  const testId = process.argv[2] || 'test-company-id';
  
  try {
    await diagnoseCompanyId(testId);
    process.exit(0);
  } catch (error) {
    console.error('Error en el diagnóstico:', error);
    process.exit(1);
  }
}

main();