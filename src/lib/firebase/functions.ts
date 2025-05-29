// src/lib/firebase/functions.ts

import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { app } from './config';

// Inicializar Firebase Functions
const functions = getFunctions(app);

// Si estamos en desarrollo, conectar al emulador de funciones
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.warn('Error al conectar con el emulador de funciones:', error);
  }
}

// Esta función segura llama a una función de Firebase Cloud Functions,
// pero maneja varios casos de error comunes, incluyendo CSP y problemas de red
export const safeCallFunction = async (functionName: string, data: any) => {
  try {
    // Verificar si las funciones están disponibles antes de intentar llamar
    if (!functions) {
      console.error(`Firebase functions no está disponible para llamar a ${functionName}`);
      return { data: { success: false, error: 'Servicio de funciones no disponible' } };
    }
    
    // Intentar llamar a la función
    const callFunction = httpsCallable(functions, functionName);
    return await callFunction(data);
  } catch (error: any) {
    // Manejar errores específicos con mensajes más descriptivos
    if (error.message && error.message.includes('Content Security Policy')) {
      console.error(`Error de CSP al llamar a la función ${functionName}:`, error);
      throw new Error(`Content Security Policy bloqueó la llamada a la función ${functionName}. Por favor, contacte al administrador.`);
    } else if (error.code === 'unavailable' || error.code === 'internal') {
      console.error(`Error de red al llamar a la función ${functionName}:`, error);
      return { data: { success: false, error: 'Error de conexión con el servidor. Por favor, verifique su conexión a internet.' } };
    } else if (error.code === 'unauthenticated') {
      console.error(`Error de autenticación al llamar a la función ${functionName}:`, error);
      return { data: { success: false, error: 'Sesión expirada. Por favor, inicie sesión nuevamente.' } };
    } else {
      console.error(`Error al llamar a la función ${functionName}:`, error);
      return { data: { success: false, error: 'Error al llamar a la función', details: error.message } };
    }
  }
};

export { functions };