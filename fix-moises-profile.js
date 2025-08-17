// Script para crear/verificar el perfil de Moises
// Ejecutar: node -r esbuild-register fix-moises-profile.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Configuración de Firebase (usar las mismas variables de entorno)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, 
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixMoisesProfile() {
  try {
    const userId = 'HXcGSgwIcTQo9s81uSebeVmUMai2';
    const companyId = 'mvc';
    
    console.log('🔍 Verificando perfil de Moises...');
    
    // Verificar si el perfil existe
    const userRef = doc(db, `companies/${companyId}/users`, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log('✅ El perfil ya existe:');
      console.log(JSON.stringify(userSnap.data(), null, 2));
      return;
    }
    
    console.log('❌ El perfil no existe. Creándolo...');
    
    // Datos del perfil de Moises
    const profileData = {
      displayName: 'Moises Richard',
      email: 'mrichard@figueroayasociados.cl',
      role: 'investigator',
      isActive: true,
      department: 'Investigación',
      position: 'Investigador',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Crear el perfil
    await setDoc(userRef, profileData);
    console.log('✅ Perfil creado exitosamente');
    
    // Verificar que se creó
    const verifySnap = await getDoc(userRef);
    if (verifySnap.exists()) {
      console.log('✅ Verificación exitosa. Datos guardados:');
      console.log(JSON.stringify(verifySnap.data(), null, 2));
    } else {
      console.error('❌ Error: No se pudo verificar la creación');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
console.log('🚀 Iniciando script para crear perfil de Moises...');
fixMoisesProfile().then(() => {
  console.log('🏁 Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});