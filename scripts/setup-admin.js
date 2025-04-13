#!/usr/bin/env node

/**
 * Script para configurar usuarios administradores iniciales en Firestore
 * Esto debe ejecutarse después de crear la estructura inicial de la base de datos
 * 
 * Uso: 
 * 1. Asegúrate de tener las variables de entorno correctas en .env.local
 * 2. Ejecuta: node scripts/setup-admin.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuración inicial
let adminCredential;
let adminUids = [];

// Interfaz para lectura de consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para leer las credenciales de Firebase Admin
function loadCredentials() {
  try {
    // Intentar cargar de .env.local primero
    const envPath = path.resolve(process.cwd(), '.env.local');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        // Buscar FIREBASE_ADMIN_KEY
        if (line.startsWith('FIREBASE_ADMIN_KEY=')) {
          const base64Key = line.substring('FIREBASE_ADMIN_KEY='.length).trim();
          try {
            const jsonStr = Buffer.from(base64Key, 'base64').toString('utf8');
            adminCredential = JSON.parse(jsonStr);
            console.log('✅ Credenciales de Firebase Admin cargadas desde .env.local');
          } catch (e) {
            console.error('❌ Error decodificando credenciales de Firebase Admin:', e);
          }
        }
        
        // Buscar NEXT_PUBLIC_ADMIN_UIDS
        if (line.startsWith('NEXT_PUBLIC_ADMIN_UIDS=')) {
          const uids = line.substring('NEXT_PUBLIC_ADMIN_UIDS='.length).trim();
          adminUids = uids.split(',').map(uid => uid.trim()).filter(uid => uid);
          if (adminUids.length > 0) {
            console.log(`✅ UIDs de administradores cargados: ${adminUids.join(', ')}`);
          }
        }
      }
    } else {
      console.warn('⚠️ No se encontró archivo .env.local');
    }
    
    // Si no se pudo cargar automáticamente, solicitar ruta al archivo
    if (!adminCredential) {
      return new Promise((resolve) => {
        rl.question('Ingresa la ruta al archivo de credenciales de Firebase Admin JSON: ', (filePath) => {
          try {
            const absolutePath = path.resolve(process.cwd(), filePath);
            const fileContent = fs.readFileSync(absolutePath, 'utf8');
            adminCredential = JSON.parse(fileContent);
            console.log('✅ Credenciales cargadas correctamente');
            resolve();
          } catch (error) {
            console.error('❌ Error cargando credenciales:', error);
            process.exit(1);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error general cargando credenciales:', error);
    process.exit(1);
  }
}

// Función para configurar administradores
async function setupAdmins() {
  try {
    // Inicializar Firebase Admin
    if (!adminCredential) {
      console.error('❌ No se pudieron cargar las credenciales de Firebase Admin');
      process.exit(1);
    }
    
    initializeApp({
      credential: cert(adminCredential)
    });
    
    const db = getFirestore();
    const auth = getAuth();
    
    // Verificar si hay UIDs de administradores para configurar
    if (adminUids.length === 0) {
      return new Promise((resolve) => {
        rl.question('Ingresa los UIDs de administradores separados por comas: ', (input) => {
          adminUids = input.split(',').map(uid => uid.trim()).filter(uid => uid);
          if (adminUids.length === 0) {
            console.error('❌ No se proporcionaron UIDs de administradores');
            process.exit(1);
          }
          console.log(`✅ UIDs de administradores a configurar: ${adminUids.join(', ')}`);
          resolve();
        });
      });
    }
    
    // Obtener información de cada administrador y configurarlos
    console.log('🔄 Configurando administradores en Firebase...');
    
    for (const uid of adminUids) {
      try {
        // 1. Verificar que el usuario existe
        const userRecord = await auth.getUser(uid);
        console.log(`✓ Usuario encontrado: ${userRecord.email} (${uid})`);
        
        // 2. Añadirlo a la colección de super_admins
        await db.doc(`super_admins/${uid}`).set({
          email: userRecord.email,
          displayName: userRecord.displayName || 'Admin',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // 3. Verificar/Crear perfil en companies/default/users
        const userSnapshot = await db.doc(`companies/default/users/${uid}`).get();
        
        if (!userSnapshot.exists) {
          // Crear perfil si no existe
          await db.doc(`companies/default/users/${uid}`).set({
            email: userRecord.email,
            displayName: userRecord.displayName || 'Admin',
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
          });
          console.log(`✅ Perfil de administrador creado para ${userRecord.email}`);
        } else {
          // Actualizar el rol a admin si ya existe
          await db.doc(`companies/default/users/${uid}`).update({
            role: 'admin',
            updatedAt: new Date()
          });
          console.log(`✅ Perfil de administrador actualizado para ${userRecord.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error configurando administrador ${uid}:`, error);
      }
    }
    
    console.log('✅ Configuración de administradores completada');
    
  } catch (error) {
    console.error('❌ Error en configuración:', error);
  } finally {
    rl.close();
  }
}

// Ejecución principal
async function main() {
  try {
    await loadCredentials();
    await setupAdmins();
    console.log('✅ Proceso completado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  }
}

main();