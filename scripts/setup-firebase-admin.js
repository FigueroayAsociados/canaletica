#!/usr/bin/env node

/**
 * Script para configurar el archivo .env.local con las credenciales de Firebase Admin
 * 
 * Uso: 
 * 1. Colocar el archivo JSON de la cuenta de servicio en la raíz del proyecto
 * 2. Ejecutar: node scripts/setup-firebase-admin.js ruta-al-archivo.json
 * 
 * Ejemplo: node scripts/setup-firebase-admin.js ./serviceAccount.json
 */

const fs = require('fs');
const path = require('path');

// Obtener la ruta al archivo JSON desde los argumentos
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.error('❌ Debes proporcionar la ruta al archivo JSON de la cuenta de servicio');
  console.log('Uso: node scripts/setup-firebase-admin.js ruta-al-archivo.json');
  process.exit(1);
}

// Ruta absoluta al archivo JSON
const absoluteJsonPath = path.resolve(process.cwd(), jsonFilePath);

// Verificar que el archivo existe
if (!fs.existsSync(absoluteJsonPath)) {
  console.error(`❌ El archivo ${absoluteJsonPath} no existe`);
  process.exit(1);
}

try {
  // Leer el archivo JSON
  const jsonContent = fs.readFileSync(absoluteJsonPath, 'utf8');
  
  // Verificar que es un JSON válido
  JSON.parse(jsonContent);
  
  // Convertir a base64
  const base64Content = Buffer.from(jsonContent).toString('base64');
  
  // Ruta al archivo .env.local
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  // Verificar si ya existe .env.local
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Verificar si ya existe FIREBASE_ADMIN_KEY
    if (envContent.includes('FIREBASE_ADMIN_KEY=')) {
      // Reemplazar la línea existente
      envContent = envContent.replace(/FIREBASE_ADMIN_KEY=.*(\r?\n|$)/g, `FIREBASE_ADMIN_KEY=${base64Content}$1`);
    } else {
      // Añadir la variable al final
      envContent += `\n\n# Firebase Admin SDK (añadido automáticamente)\nFIREBASE_ADMIN_KEY=${base64Content}\n`;
    }
  } else {
    // Crear un nuevo archivo .env.local
    envContent = `# Firebase Admin SDK (añadido automáticamente)\nFIREBASE_ADMIN_KEY=${base64Content}\n`;
  }
  
  // Guardar el archivo .env.local
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ FIREBASE_ADMIN_KEY configurada correctamente en .env.local');
  console.log(`Ahora puedes ejecutar: npm run add-admin tu-email@ejemplo.com`);
  
} catch (error) {
  console.error('❌ Error al procesar el archivo JSON:', error);
  process.exit(1);
}