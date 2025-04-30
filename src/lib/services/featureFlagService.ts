// src/lib/services/featureFlagService.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { normalizeCompanyId } from '@/lib/utils/helpers';

// Interfaz para feature flags
export interface FeatureFlags {
  // Core features
  modulesEnabled: boolean;      // Sistema modular habilitado
  aiEnabled: boolean;           // Funcionalidades de IA habilitadas
  
  // Módulos específicos
  karinModuleEnabled: boolean;  // Módulo Ley Karin
  mpdModuleEnabled: boolean;    // Módulo MPD (Modelo de Prevención)
  cyberModuleEnabled: boolean;  // Módulo de Ciberseguridad
  dataModuleEnabled: boolean;   // Módulo de Protección de Datos
  publicAdminModuleEnabled: boolean; // Módulo de Administración Pública
  
  // Interfaz y UX
  newUiEnabled: boolean;        // Nueva interfaz de usuario
  dashboardV2Enabled: boolean;  // Nueva versión del dashboard
  
  // Características específicas
  emailNotificationsEnabled: boolean; // Notificaciones por correo
  riskAnalysisEnabled: boolean;      // Análisis de riesgo
  
  // Campos de metadatos
  updatedAt?: any;
  updatedBy?: string;
}

// Valores predeterminados para los feature flags
const DEFAULT_FEATURE_FLAGS: Omit<FeatureFlags, 'updatedAt' | 'updatedBy'> = {
  // Core features - desactivadas por defecto
  modulesEnabled: false,
  aiEnabled: false,
  
  // Módulos - solo Karin activado por defecto
  karinModuleEnabled: true,
  mpdModuleEnabled: false,
  cyberModuleEnabled: false,
  dataModuleEnabled: false,
  publicAdminModuleEnabled: false,
  
  // UI/UX - desactivadas por defecto
  newUiEnabled: false,
  dashboardV2Enabled: false,
  
  // Características específicas
  emailNotificationsEnabled: true,
  riskAnalysisEnabled: false
};

/**
 * Obtiene los feature flags de una empresa
 */
export async function getFeatureFlags(companyId: string): Promise<{ 
  success: boolean; 
  features?: FeatureFlags; 
  error?: string 
}> {
  try {
    // Normalizar ID para entorno de desarrollo
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    const flagsRef = doc(db, `companies/${normalizedCompanyId}/settings/features`);
    const flagsSnap = await getDoc(flagsRef);
    
    if (flagsSnap.exists()) {
      return {
        success: true,
        features: flagsSnap.data() as FeatureFlags,
      };
    }
    
    // Si no existe configuración, devolver valores predeterminados
    return {
      success: true,
      features: {
        ...DEFAULT_FEATURE_FLAGS,
        updatedAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error al obtener feature flags:', error);
    return {
      success: false,
      error: 'Error al obtener configuración de funcionalidades'
    };
  }
}

/**
 * Inicializa los feature flags para una empresa
 */
export async function initializeFeatureFlags(
  companyId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    // Verificar si ya existen feature flags
    const flagsRef = doc(db, `companies/${normalizedCompanyId}/settings/features`);
    const flagsSnap = await getDoc(flagsRef);
    
    if (flagsSnap.exists()) {
      console.log(`Los feature flags para ${normalizedCompanyId} ya existen.`);
      return { success: true };
    }
    
    // Crear nuevos feature flags con valores predeterminados
    await setDoc(flagsRef, {
      ...DEFAULT_FEATURE_FLAGS,
      updatedAt: serverTimestamp(),
      updatedBy: userId || 'system'
    });
    
    console.log(`Feature flags para ${normalizedCompanyId} inicializados.`);
    return { success: true };
  } catch (error) {
    console.error('Error al inicializar feature flags:', error);
    return {
      success: false,
      error: 'Error al inicializar configuración de funcionalidades'
    };
  }
}

/**
 * Actualiza un feature flag específico
 */
export async function updateFeatureFlag(
  companyId: string,
  featureName: keyof FeatureFlags,
  enabled: boolean,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    // Verificar que el feature name es válido
    if (!(featureName in DEFAULT_FEATURE_FLAGS)) {
      return {
        success: false,
        error: `Feature '${featureName}' no es válido`
      };
    }
    
    const flagsRef = doc(db, `companies/${normalizedCompanyId}/settings/features`);
    
    await updateDoc(flagsRef, {
      [featureName]: enabled,
      updatedAt: serverTimestamp(),
      updatedBy: userId || 'system'
    });
    
    return { success: true };
  } catch (error) {
    console.error(`Error al actualizar feature '${featureName}':`, error);
    return {
      success: false,
      error: `Error al actualizar feature '${featureName}'`
    };
  }
}

/**
 * Actualiza múltiples feature flags a la vez
 */
export async function updateMultipleFeatureFlags(
  companyId: string,
  updates: Partial<FeatureFlags>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    const flagsRef = doc(db, `companies/${normalizedCompanyId}/settings/features`);
    
    // Asegurarse de que actualicemos solo los feature flags válidos
    const allowedUpdates: Record<string, any> = {};
    
    // Filtrar solo los campos que son feature flags
    for (const key in updates) {
      if (key in DEFAULT_FEATURE_FLAGS) {
        allowedUpdates[key] = updates[key as keyof FeatureFlags];
      }
    }
    
    // Añadir metadata
    allowedUpdates.updatedAt = serverTimestamp();
    allowedUpdates.updatedBy = userId || 'system';
    
    await updateDoc(flagsRef, allowedUpdates);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar feature flags:', error);
    return {
      success: false,
      error: 'Error al actualizar configuración de funcionalidades'
    };
  }
}