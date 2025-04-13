// src/lib/firebase/admin.ts
// Este archivo solo debe importarse desde páginas API o rutas de servidor

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Función que verifica si estamos en el lado del servidor
const isServer = () => typeof window === 'undefined';

// Inicializa la app solo en el servidor
const initAdminApp = () => {
  if (!isServer()) {
    throw new Error('Firebase Admin solo debe inicializarse en el servidor');
  }

  // Verificar si ya hay apps inicializadas
  if (getApps().length === 0) {
    // Obtiene la credencial desde la variable de entorno
    // Asegúrate de que FIREBASE_ADMIN_KEY sea una versión en base64 del JSON de la cuenta de servicio
    let adminCredential;
    if (process.env.FIREBASE_ADMIN_KEY) {
      try {
        const credentialJSON = Buffer.from(
          process.env.FIREBASE_ADMIN_KEY,
          'base64'
        ).toString('utf8');
        adminCredential = JSON.parse(credentialJSON);
      } catch (error) {
        console.error('Error al decodificar credenciales de Firebase Admin:', error);
        throw new Error('Configuración de Firebase Admin inválida');
      }
    } else {
      throw new Error('FIREBASE_ADMIN_KEY no está definida en las variables de entorno');
    }

    // Inicializa la aplicación con las credenciales
    initializeApp({
      credential: cert(adminCredential),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
};

// Funciones para obtener servicios con inicialización perezosa
export const getAdminFirestore = () => {
  if (!isServer()) {
    throw new Error('Firebase Admin solo debe usarse en el servidor');
  }
  initAdminApp();
  return getFirestore();
};

export const getAdminAuth = () => {
  if (!isServer()) {
    throw new Error('Firebase Admin solo debe usarse en el servidor');
  }
  initAdminApp();
  return getAuth();
};

export const getAdminStorage = () => {
  if (!isServer()) {
    throw new Error('Firebase Admin solo debe usarse en el servidor');
  }
  initAdminApp();
  return getStorage();
};

// No exportamos una instancia directamente para evitar inicializaciones no deseadas