// src/lib/services/companyService.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Company } from './configService';
import { initializeEnvironmentConfig, EnvironmentType } from './environmentService';
import { initializeFeatureFlags } from './featureFlagService';
import { normalizeCompanyId } from '@/lib/utils/helpers';
import { logger } from '@/lib/utils/logger';

// Interfaz extendida para creación de empresas
export interface CompanyCreateParams {
  id: string;
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  industry?: string;
  maxUsers?: number;
  environment?: EnvironmentType;
}

// Interfaz para filtrado de empresas
export interface CompanyFilters {
  isActive?: boolean;
  environment?: EnvironmentType;
}

/**
 * Verifica si ya existe una empresa con el ID proporcionado
 * Esta función es útil para validar IDs antes de intentar crear empresas
 */
export async function companyIdExists(
  companyId: string
): Promise<{ exists: boolean; normalizedExists?: boolean; error?: string }> {
  try {
    if (!companyId) {
      return { 
        exists: false,
        error: 'ID no proporcionado'
      };
    }

    const normalizedId = normalizeCompanyId(companyId);
    let exists = false;
    let normalizedExists = false;
    
    // Verificar con el ID exacto
    const companyRef = doc(db, `companies/${companyId}`);
    const companySnap = await getDoc(companyRef);
    exists = companySnap.exists();
    
    // Si el ID normalizado es diferente, verificar también con el ID normalizado
    if (companyId !== normalizedId) {
      const normalizedCompanyRef = doc(db, `companies/${normalizedId}`);
      const normalizedCompanySnap = await getDoc(normalizedCompanyRef);
      normalizedExists = normalizedCompanySnap.exists();
    }
    
    return {
      exists,
      normalizedExists: normalizedExists || undefined
    };
  } catch (error) {
    logger.error(`Error al verificar existencia del ID ${companyId}:`, error);
    return {
      exists: false,
      error: 'Error al verificar la existencia de la empresa'
    };
  }
}

/**
 * Obtiene todas las empresas (solo para super admin)
 */
export async function getAllCompanies(
  filters?: CompanyFilters
): Promise<{ success: boolean; companies?: Company[]; error?: string }> {
  try {
    // Verificar si estamos en un entorno de Vercel Preview
    const isVercelPreview = typeof window !== 'undefined' && 
      window.location.hostname.includes('vercel.app') &&
      (window.location.hostname.startsWith('canaletica-') || 
       window.location.hostname.includes('-ricardo-figueroas-projects-'));

    // En entornos de preview, devolver datos simulados para facilitar pruebas
    if (isVercelPreview) {
      logger.info('MODO PREVIEW: Devolviendo empresas simuladas para pruebas', null, { prefix: 'getAllCompanies' });
      
      // Usar el hostname como ID de empresa para entorno de preview
      const previewCompanyId = window.location.hostname.split('.')[0];
      
      // Crear lista de empresas simuladas para preview
      const previewCompanies: Company[] = [
        {
          id: previewCompanyId,
          name: 'Vercel Preview Empresa',
          description: 'Empresa para pruebas en entorno de Vercel Preview',
          isActive: true,
          contactEmail: 'demo@canaletica.cl',
          contactPhone: '+56912345678',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        {
          id: 'default',
          name: 'Empresa Default',
          description: 'Empresa por defecto para pruebas',
          isActive: true,
          contactEmail: 'default@canaletica.cl',
          contactPhone: '+56912345678',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        },
        {
          id: 'demo',
          name: 'Empresa Demo',
          description: 'Empresa de demostración',
          isActive: true,
          contactEmail: 'demo@canaletica.cl',
          contactPhone: '+56912345678',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
      ];
      
      // Aplicar filtros si se especifican
      let filteredCompanies = previewCompanies;
      if (filters) {
        if (filters.isActive !== undefined) {
          filteredCompanies = filteredCompanies.filter(c => c.isActive === filters.isActive);
        }
        
        if (filters.environment) {
          // Simular entorno
          const envMapping: Record<string, EnvironmentType> = {
            'default': 'production',
            'demo': 'demo',
            [previewCompanyId]: 'development'
          };
          
          filteredCompanies = filteredCompanies.filter(c => 
            envMapping[c.id] === filters.environment
          );
        }
      }
      
      return { success: true, companies: filteredCompanies };
    }
    
    // Comportamiento normal para entornos de producción
    const companiesRef = collection(db, 'companies');
    
    // Construir query con filtros
    let companiesQuery = query(companiesRef);
    
    if (filters) {
      if (filters.isActive !== undefined) {
        companiesQuery = query(companiesQuery, where('isActive', '==', filters.isActive));
      }
      
      if (filters.environment) {
        companiesQuery = query(
          companiesQuery, 
          where('environment', '==', filters.environment)
        );
      }
    }
    
    const companiesSnapshot = await getDocs(companiesQuery);
    
    if (companiesSnapshot.empty) {
      return { success: true, companies: [] };
    }
    
    // Mapear documentos a objetos de empresa
    const companies = companiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        industry: data.industry,
        maxUsers: data.maxUsers,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Company;
    });
    
    return { success: true, companies };
  } catch (error) {
    logger.error('Error al obtener todas las empresas:', error);
    return {
      success: false,
      error: 'Error al obtener la lista de empresas'
    };
  }
}

/**
 * Obtiene una empresa por su ID
 */
export async function getCompanyById(
  companyId: string
): Promise<{ success: boolean; company?: Company; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    const companyRef = doc(db, `companies/${normalizedCompanyId}`);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return {
        success: false,
        error: 'Empresa no encontrada'
      };
    }
    
    const data = companySnap.data();
    
    const company: Company = {
      id: companySnap.id,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      industry: data.industry,
      maxUsers: data.maxUsers,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    
    return { success: true, company };
  } catch (error) {
    logger.error(`Error al obtener empresa con ID ${companyId}:`, error);
    return {
      success: false,
      error: 'Error al obtener información de la empresa'
    };
  }
}

/**
 * Crea una nueva empresa con todas las configuraciones necesarias
 */
export async function createCompany(
  params: CompanyCreateParams,
  creatorId: string
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  try {
    // IMPORTANTE: Para creación de empresas, usamos el ID proporcionado sin normalizar
    // Esta es una excepción a la regla general de normalización durante el desarrollo
    const companyId = params.id.trim().toLowerCase();
    
    // Verificar si ya existe una empresa con ese ID exacto (sin normalizar)
    // o con el ID normalizado (para compatibilidad con la empresa default)
    const normalizedId = normalizeCompanyId(companyId);
    
    let existingCompany = false;
    
    // Verificar con el ID exacto
    const companyRef = doc(db, `companies/${companyId}`);
    const companySnap = await getDoc(companyRef);
    existingCompany = companySnap.exists();
    
    // Si no existe con el ID exacto pero companyId != normalizedId, verificar también con el ID normalizado
    if (!existingCompany && companyId !== normalizedId) {
      const normalizedCompanyRef = doc(db, `companies/${normalizedId}`);
      const normalizedCompanySnap = await getDoc(normalizedCompanyRef);
      
      // Si existe con el ID normalizado y estamos intentando crear "default", bloquear
      if (normalizedCompanySnap.exists() && companyId === "default") {
        existingCompany = true;
      }
    }
    
    if (existingCompany) {
      return {
        success: false,
        error: `Ya existe una empresa con el ID '${companyId}'`
      };
    }
    
    // Crear documento principal de la empresa
    await setDoc(companyRef, {
      name: params.name,
      description: params.description || '',
      isActive: true,
      contactEmail: params.contactEmail || '',
      contactPhone: params.contactPhone || '',
      address: params.address || '',
      industry: params.industry || '',
      maxUsers: params.maxUsers || 10,
      environment: params.environment || 'production',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: creatorId
    });
    
    // Inicializar configuraciones básicas
    
    // 1. Configuración de entorno
    await initializeEnvironmentConfig(
      companyId, 
      params.environment || 'production'
    );
    
    // 2. Feature flags
    await initializeFeatureFlags(companyId, creatorId);
    
    // 3. Configuración general
    await setDoc(
      doc(db, `companies/${companyId}/settings/general`), 
      {
        companyName: params.name,
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        emailNotifications: true,
        defaultLanguage: 'es',
        retentionPolicy: 365, // días
        slaForRegular: 30,    // días
        slaForKarin: 30,      // días
        updatedAt: serverTimestamp(),
        updatedBy: creatorId
      }
    );
    
    logger.info(`Nueva empresa creada: ${params.name} (${companyId})`);
    
    // NOTA IMPORTANTE: Esto permitirá la creación de empresas con IDs distintos,
    // pero algunas funcionalidades pueden seguir redirigiendo operaciones a 'default'
    // debido a la función normalizeCompanyId(). Para una implementación completa
    // multi-tenant será necesario revisar esa función.
    
    return {
      success: true,
      companyId: companyId
    };
  } catch (error) {
    logger.error('Error al crear nueva empresa:', error);
    return {
      success: false,
      error: 'Error al crear la empresa'
    };
  }
}

/**
 * Actualiza una empresa existente
 */
export async function updateCompany(
  companyId: string,
  updates: Partial<Company>,
  updaterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    // Verificar que la empresa existe
    const companyRef = doc(db, `companies/${normalizedCompanyId}`);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return {
        success: false,
        error: 'Empresa no encontrada'
      };
    }
    
    // Campos que se pueden actualizar
    const allowedUpdates: Record<string, any> = {};
    const allowedFields = [
      'name', 'description', 'isActive', 'contactEmail', 
      'contactPhone', 'address', 'industry', 'maxUsers'
    ];
    
    // Filtrar solo los campos permitidos
    for (const field of allowedFields) {
      if (field in updates) {
        allowedUpdates[field] = updates[field as keyof Company];
      }
    }
    
    // Añadir metadata
    allowedUpdates.updatedAt = serverTimestamp();
    allowedUpdates.updatedBy = updaterId;
    
    await updateDoc(companyRef, allowedUpdates);
    
    // Si se actualizó el nombre, actualizarlo también en la configuración general
    if ('name' in updates) {
      const generalConfigRef = doc(db, `companies/${normalizedCompanyId}/settings/general`);
      await updateDoc(generalConfigRef, {
        companyName: updates.name,
        updatedAt: serverTimestamp(),
        updatedBy: updaterId
      });
    }
    
    logger.info(`Empresa actualizada: ${normalizedCompanyId}`);
    
    return { success: true };
  } catch (error) {
    logger.error(`Error al actualizar empresa ${companyId}:`, error);
    return {
      success: false,
      error: 'Error al actualizar la empresa'
    };
  }
}

/**
 * Activa o desactiva una empresa
 */
export async function setCompanyActiveStatus(
  companyId: string,
  isActive: boolean,
  updaterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await updateCompany(
      companyId,
      { isActive },
      updaterId
    );
  } catch (error) {
    logger.error(`Error al cambiar estado de empresa ${companyId}:`, error);
    return {
      success: false,
      error: 'Error al cambiar estado de la empresa'
    };
  }
}

/**
 * Configura una empresa para demostración
 */
export async function setupDemoCompany(
  companyId: string = 'demo',
  creatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Crear la empresa de demo si no existe
    const createResult = await createCompany(
      {
        id: companyId,
        name: 'Canaletica Demo',
        description: 'Empresa para demostración del sistema',
        environment: 'demo'
      },
      creatorId
    );
    
    if (!createResult.success && createResult.error !== `Ya existe una empresa con el ID '${companyId}'`) {
      return createResult;
    }
    
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    // Configurar feature flags específicos para demo
    await updateMultipleFeatureFlags(
      normalizedCompanyId,
      {
        modulesEnabled: true,
        karinModuleEnabled: true,
        mpdModuleEnabled: true,
        cyberModuleEnabled: true
      },
      creatorId
    );
    
    // TODO: Cargar datos de ejemplo para demostración
    // Esta función se implementará en futuras versiones
    
    logger.info(`Empresa de demostración configurada: ${normalizedCompanyId}`);
    
    return { success: true };
  } catch (error) {
    logger.error('Error al configurar empresa de demostración:', error);
    return {
      success: false,
      error: 'Error al configurar empresa de demostración'
    };
  }
}

// Función auxiliar para importar desde featureFlagService sin crear dependencia circular
async function updateMultipleFeatureFlags(
  companyId: string,
  updates: Record<string, boolean>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    const flagsRef = doc(db, `companies/${normalizedCompanyId}/settings/features`);
    
    // Asegurarse de que actualicemos solo los feature flags válidos
    const allowedUpdates: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: userId || 'system'
    };
    
    await updateDoc(flagsRef, allowedUpdates);
    
    return { success: true };
  } catch (error) {
    logger.error('Error al actualizar feature flags:', error);
    return {
      success: false,
      error: 'Error al actualizar configuración de funcionalidades'
    };
  }
}