// src/lib/services/initializeDefaultOptions.ts

import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { FormOptionValue } from './configService';

/**
 * Inicializa las opciones de formulario para la empresa default
 * Este script se debe ejecutar desde la consola del navegador en el entorno de desarrollo
 */
export async function initializeDefaultOptions() {
  const companyId = 'default';

  // Verificar si ya existen opciones
  async function checkOptionsExist(optionType: string): Promise<boolean> {
    const optionsRef = collection(db, `companies/${companyId}/formOptions/${optionType}/values`);
    const snapshot = await getDocs(optionsRef);
    return !snapshot.empty;
  }
  
  // 1. Relaciones con la empresa
  const relationshipsExist = await checkOptionsExist('relationships');
  if (!relationshipsExist) {
    console.log('Inicializando opciones de relaciones con la empresa...');
    const relationshipsRef = collection(db, `companies/${companyId}/formOptions/relationships/values`);
    const defaultRelationships = [
      { name: 'Empleado', value: 'empleado', description: 'Persona que trabaja en la empresa', isActive: true, order: 0 },
      { name: 'Proveedor', value: 'proveedor', description: 'Empresa o persona que provee bienes o servicios', isActive: true, order: 1 },
      { name: 'Cliente', value: 'cliente', description: 'Persona o empresa que recibe nuestros servicios', isActive: true, order: 2 },
      { name: 'Contratista', value: 'contratista', description: 'Persona contratada para un proyecto específico', isActive: true, order: 3 },
      { name: 'Otro', value: 'otro', description: 'Otra relación no especificada', isActive: true, order: 4 }
    ];
    
    for (const relationship of defaultRelationships) {
      await addDoc(relationshipsRef, {
        ...relationship,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    console.log('Opciones de relaciones inicializadas correctamente.');
  } else {
    console.log('Las opciones de relaciones ya existen.');
  }
  
  // 2. Frecuencias de conducta
  const frequenciesExist = await checkOptionsExist('frequencies');
  if (!frequenciesExist) {
    console.log('Inicializando opciones de frecuencias de conducta...');
    const frequenciesRef = collection(db, `companies/${companyId}/formOptions/frequencies/values`);
    const defaultFrequencies = [
      { name: 'Única vez', value: 'unica', description: 'Evento aislado', isActive: true, order: 0 },
      { name: 'Ocasional', value: 'ocasional', description: 'Varias veces sin un patrón claro', isActive: true, order: 1 },
      { name: 'Reiterada', value: 'reiterada', description: 'Se repite con regularidad', isActive: true, order: 2 },
      { name: 'Sistemática', value: 'sistematica', description: 'Constante y deliberada', isActive: true, order: 3 }
    ];
    
    for (const frequency of defaultFrequencies) {
      await addDoc(frequenciesRef, {
        ...frequency,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    console.log('Opciones de frecuencias inicializadas correctamente.');
  } else {
    console.log('Las opciones de frecuencias ya existen.');
  }
  
  console.log('Proceso de inicialización completado.');
}

// Para ejecutar desde la consola del navegador:
// import { initializeDefaultOptions } from '@/lib/services/initializeDefaultOptions';
// initializeDefaultOptions();