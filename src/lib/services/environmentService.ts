// src/lib/services/environmentService.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { normalizeCompanyId } from '@/lib/utils/helpers';

// Tipos de entorno disponibles
export type EnvironmentType = 'development' | 'demo' | 'production';

// Configuración de entorno
export interface EnvironmentConfig {
  type: EnvironmentType;
  isProduction: boolean;
  demoDataEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Valores predeterminados para cada tipo de entorno
const DEFAULT_ENVIRONMENT_CONFIGS: Record<EnvironmentType, Omit<EnvironmentConfig, 'createdAt' | 'updatedAt'>> = {
  development: {
    type: 'development',
    isProduction: false,
    demoDataEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: 'Sistema en mantenimiento programado'
  },
  demo: {
    type: 'demo',
    isProduction: false,
    demoDataEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: 'Sistema de demostración en mantenimiento'
  },
  production: {
    type: 'production',
    isProduction: true,
    demoDataEnabled: false,
    maintenanceMode: false,
    maintenanceMessage: 'Sistema en mantenimiento programado'
  }
};

/**
 * Obtiene la configuración de entorno de una empresa
 */
export async function getEnvironmentConfig(companyId: string): Promise<{ 
  success: boolean; 
  config?: EnvironmentConfig; 
  error?: string 
}> {
  try {
    // Normalizar ID para entorno de desarrollo
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    const envRef = doc(db, `companies/${normalizedCompanyId}/settings/environment`);
    const envSnap = await getDoc(envRef);
    
    if (envSnap.exists()) {
      return {
        success: true,
        config: envSnap.data() as EnvironmentConfig,
      };
    }
    
    // Si no existe configuración, devolver valores predeterminados (asumimos producción)
    return {
      success: true,
      config: {
        ...DEFAULT_ENVIRONMENT_CONFIGS.production,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error al obtener configuración de entorno:', error);
    return {
      success: false,
      error: 'Error al obtener configuración de entorno'
    };
  }
}

/**
 * Inicializa la configuración de entorno para una empresa
 */
export async function initializeEnvironmentConfig(
  companyId: string, 
  envType: EnvironmentType = 'production'
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    // Verificar si ya existe configuración
    const envRef = doc(db, `companies/${normalizedCompanyId}/settings/environment`);
    const envSnap = await getDoc(envRef);
    
    if (envSnap.exists()) {
      console.log(`La configuración de entorno para ${normalizedCompanyId} ya existe.`);
      return { success: true };
    }
    
    // Crear nueva configuración con valores predeterminados
    const defaultConfig = DEFAULT_ENVIRONMENT_CONFIGS[envType];
    await setDoc(envRef, {
      ...defaultConfig,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Configuración de entorno para ${normalizedCompanyId} inicializada como ${envType}.`);
    return { success: true };
  } catch (error) {
    console.error('Error al inicializar configuración de entorno:', error);
    return {
      success: false,
      error: 'Error al inicializar configuración de entorno'
    };
  }
}

/**
 * Actualiza la configuración de entorno de una empresa
 */
export async function updateEnvironmentConfig(
  companyId: string,
  updates: Partial<EnvironmentConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    const envRef = doc(db, `companies/${normalizedCompanyId}/settings/environment`);
    
    // Asegurarse de que actualicemos solo los campos permitidos
    const allowedUpdates: Record<string, any> = {};
    const allowedFields = [
      'type', 'isProduction', 'demoDataEnabled', 
      'maintenanceMode', 'maintenanceMessage'
    ];
    
    // Filtrar solo los campos permitidos
    for (const field of allowedFields) {
      if (field in updates) {
        allowedUpdates[field] = updates[field as keyof EnvironmentConfig];
      }
    }
    
    // Añadir timestamp de actualización
    allowedUpdates.updatedAt = serverTimestamp();
    
    await updateDoc(envRef, allowedUpdates);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar configuración de entorno:', error);
    return {
      success: false,
      error: 'Error al actualizar configuración de entorno'
    };
  }
}

/**
 * Configura el modo de mantenimiento para una empresa
 */
export async function setMaintenanceMode(
  companyId: string,
  enabled: boolean,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await updateEnvironmentConfig(companyId, {
      maintenanceMode: enabled,
      maintenanceMessage: message
    });
  } catch (error) {
    console.error('Error al configurar modo de mantenimiento:', error);
    return {
      success: false,
      error: 'Error al configurar modo de mantenimiento'
    };
  }
}