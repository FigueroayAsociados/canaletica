#!/usr/bin/env node

/**
 * Script para añadir un super administrador directamente a las colecciones necesarias
 * 
 * Uso: 
 * 1. Tener configurado el archivo .env.local con FIREBASE_ADMIN_KEY
 * 2. Ejecutar: node scripts/add-super-admin.js EMAIL
 * 
 * Ejemplo: node scripts/add-super-admin.js admin@example.com
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

// Leer credenciales desde .env.local
let adminCredential;
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.startsWith('FIREBASE_ADMIN_KEY=')) {
        const base64Key = line.substring('FIREBASE_ADMIN_KEY='.length).trim();
        try {
          const jsonStr = Buffer.from(base64Key, 'base64').toString('utf8');
          adminCredential = JSON.parse(jsonStr);
          console.log('✅ Credenciales de Firebase Admin cargadas correctamente');
        } catch (e) {
          console.error('❌ Error decodificando credenciales de Firebase Admin:', e);
          process.exit(1);
        }
      }
    }
  }
} catch (error) {
  console.error('❌ Error cargando credenciales:', error);
  process.exit(1);
}

if (!adminCredential) {
  console.error('❌ No se encontraron credenciales de Firebase Admin en .env.local');
  console.log('Por favor, crea un archivo .env.local con FIREBASE_ADMIN_KEY');
  process.exit(1);
}

// Obtener el email de línea de comandos
const email = process.argv[2];

if (!email) {
  console.error('❌ Debes proporcionar un email como argumento');
  console.log('Uso: node scripts/add-super-admin.js EMAIL');
  process.exit(1);
}

// Inicializar Firebase Admin
initializeApp({
  credential: cert(adminCredential)
});

const db = getFirestore();
const auth = getAuth();

async function main() {
  try {
    console.log(`🔍 Buscando usuario con email: ${email}`);
    
    // Intentar encontrar el usuario por email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`✅ Usuario encontrado: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❓ Usuario no encontrado. Creando nuevo usuario...');
        
        // Generar una contraseña temporal aleatoria
        const tempPassword = Math.random().toString(36).substring(2, 10) + 
                             Math.random().toString(36).substring(2, 10);
        
        // Crear el usuario en Firebase Auth
        userRecord = await auth.createUser({
          email: email,
          password: tempPassword,
          displayName: 'Super Admin',
        });
        
        console.log(`✅ Usuario creado con UID: ${userRecord.uid}`);
        console.log(`⚠️ Contraseña temporal generada: ${tempPassword}`);
        console.log('⚠️ IMPORTANTE: Guarda esta contraseña y cámbiala después del primer inicio de sesión');
      } else {
        throw error;
      }
    }
    
    // Verificar si el usuario ya es super_admin
    const superAdminRef = db.doc(`super_admins/${userRecord.uid}`);
    const superAdminDoc = await superAdminRef.get();
    
    if (superAdminDoc.exists) {
      console.log('✅ El usuario ya está configurado como super_admin');
    } else {
      // Añadir a la colección super_admins
      await superAdminRef.set({
        email: email,
        displayName: userRecord.displayName || 'Super Admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Usuario añadido a la colección super_admins');
    }
    
    // Verificar/Crear perfil en companies/default/users
    const userProfileRef = db.doc(`companies/default/users/${userRecord.uid}`);
    const userProfileDoc = await userProfileRef.get();
    
    if (userProfileDoc.exists) {
      // Actualizar el rol a admin
      await userProfileRef.update({
        role: 'admin',
        updatedAt: new Date(),
        isActive: true
      });
      console.log('✅ Perfil de usuario actualizado a rol admin');
    } else {
      // Crear perfil
      await userProfileRef.set({
        email: email,
        displayName: userRecord.displayName || 'Super Admin',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });
      console.log('✅ Perfil de usuario creado en companies/default/users');
    }
    
    console.log('\n✅✅✅ Operación completada con éxito ✅✅✅');
    console.log(`El usuario ${email} (${userRecord.uid}) ahora es super administrador`);
    console.log('\nPuedes añadir este UID a .env.local:');
    console.log(`NEXT_PUBLIC_ADMIN_UIDS=${userRecord.uid}`);
    
  } catch (error) {
    console.error('❌ Error durante la operación:', error);
    process.exit(1);
  }
}

main();