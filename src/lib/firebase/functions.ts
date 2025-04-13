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
// pero maneja el caso donde functions no esté disponible
export const safeCallFunction = async (functionName: string, data: any) => {
  try {
    const callFunction = httpsCallable(functions, functionName);
    return await callFunction(data);
  } catch (error) {
    console.error(`Error al llamar a la función ${functionName}:`, error);
    return { data: { success: false, error: 'Error al llamar a la función' } };
  }
};

export { functions };