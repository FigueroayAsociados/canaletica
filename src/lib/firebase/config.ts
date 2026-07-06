// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Solo en el cliente, se utilizan variables de entorno públicas
// En un entorno de producción, esto debería implementarse a través de Cloud Functions 
// o API Routes con sistema de autorización para proteger las credenciales
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics and other Firebase services
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// getAuth() valida la API key y LANZA 'auth/invalid-api-key' si falta.
// Durante el build (recolección de páginas) puede no haber variables de
// entorno, lo que rompía la compilación en Vercel. Inicializamos auth solo
// cuando hay API key; en tiempo de ejecución siempre está presente.
const auth = firebaseConfig.apiKey
  ? getAuth(app)
  : (undefined as unknown as ReturnType<typeof getAuth>);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Si estamos en desarrollo, conectar al emulador de funciones
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.warn('Error al conectar con el emulador de funciones:', error);
  }
}

export { app, auth, db, storage, analytics, functions };