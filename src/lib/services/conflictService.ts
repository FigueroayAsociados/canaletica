// src/lib/services/conflictService.ts

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { normalizeCompanyId } from '@/lib/utils/helpers';
import { logger } from '@/lib/utils/logger';

// Interfaz para conflictos de interés
export interface ConflictOfInterest {
  id: string;
  name: string;
  description: string;
  affectedArea: string;
  severity: 'low' | 'medium' | 'high';
  isActive: boolean;
  mitigationSteps: string;
  reportDate: Date | null;
  resolvedDate: Date | null;
  status: 'pending' | 'in_review' | 'mitigated' | 'resolved';
  reportedBy: string;
  assignedTo: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Obtiene todos los conflictos de interés
 */
export async function getConflictsOfInterest(
  companyId: string,
  filters?: { status?: string, severity?: string }
): Promise<{ success: boolean; conflicts?: ConflictOfInterest[]; error?: string }> {
  try {
    // Normalizar ID para entorno de desarrollo
    const normalizedCompanyId = normalizeCompanyId(companyId);
    logger.info(`Obteniendo conflictos de interés para companyId=${normalizedCompanyId} (original: ${companyId})`, null, { prefix: 'getConflictsOfInterest' });
    
    const conflictsRef = collection(db, `companies/${normalizedCompanyId}/conflictsOfInterest`);
    
    // Construir la consulta con filtros si se proporcionan
    let q = query(conflictsRef, orderBy('createdAt', 'desc'));
    
    if (filters) {
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters.severity) {
        q = query(q, where('severity', '==', filters.severity));
      }
    }
    
    const querySnapshot = await getDocs(q);
    const conflicts: ConflictOfInterest[] = [];
    
    logger.info(`Encontrados ${querySnapshot.size} conflictos de interés en companies/${normalizedCompanyId}/conflictsOfInterest`, null, { prefix: 'getConflictsOfInterest' });
    
    querySnapshot.forEach((doc) => {
      const conflictData = doc.data();
      conflicts.push({
        id: doc.id,
        ...conflictData,
        reportDate: conflictData.reportDate ? new Date(conflictData.reportDate.toDate()) : null,
        resolvedDate: conflictData.resolvedDate ? new Date(conflictData.resolvedDate.toDate()) : null,
      } as ConflictOfInterest);
      
      logger.debug(`Conflicto cargado: ${conflictData.name} (ID: ${doc.id}, Estatus: ${conflictData.status})`, null, { prefix: 'getConflictsOfInterest' });
    });
    
    return {
      success: true,
      conflicts
    };
  } catch (error) {
    logger.error('Error al obtener conflictos de interés', error);
    return {
      success: false,
      error: 'Error al obtener los conflictos de interés'
    };
  }
}

/**
 * Obtiene un conflicto de interés específico por su ID
 */
export async function getConflictOfInterest(
  companyId: string,
  conflictId: string
): Promise<{ success: boolean; conflict?: ConflictOfInterest; error?: string }> {
  try {
    // Normalizar ID para entorno de desarrollo
    const normalizedCompanyId = normalizeCompanyId(companyId);
    logger.info(`Obteniendo conflicto de interés con ID ${conflictId} para companyId=${normalizedCompanyId}`, null, { prefix: 'getConflictOfInterest' });
    
    const conflictRef = doc(db, `companies/${normalizedCompanyId}/conflictsOfInterest/${conflictId}`);
    const conflictSnap = await getDoc(conflictRef);
    
    if (!conflictSnap.exists()) {
      return {
        success: false,
        error: 'El conflicto de interés no existe'
      };
    }
    
    const conflictData = conflictSnap.data();
    
    return {
      success: true,
      conflict: {
        id: conflictSnap.id,
        ...conflictData,
        reportDate: conflictData.reportDate ? new Date(conflictData.reportDate.toDate()) : null,
        resolvedDate: conflictData.resolvedDate ? new Date(conflictData.resolvedDate.toDate()) : null,
      } as ConflictOfInterest
    };
  } catch (error) {
    logger.error(`Error al obtener conflicto de interés con ID ${conflictId}`, error);
    return {
      success: false,
      error: 'Error al obtener el conflicto de interés'
    };
  }
}

/**
 * Crea un nuevo conflicto de interés
 */
export async function createConflictOfInterest(
  companyId: string,
  conflictData: Omit<ConflictOfInterest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; conflictId?: string; error?: string }> {
  try {
    // Normalizar ID para entorno de desarrollo
    const normalizedCompanyId = normalizeCompanyId(companyId);
    logger.info(`Creando conflicto de interés para companyId=${normalizedCompanyId}`, null, { prefix: 'createConflictOfInterest' });
    
    const conflictsRef = collection(db, `companies/${normalizedCompanyId}/conflictsOfInterest`);
    
    const dataToSave = {
      ...conflictData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(conflictsRef, dataToSave);
    
    logger.info(`Conflicto de interés creado con ID ${docRef.id}`, null, { prefix: 'createConflictOfInterest' });
    
    return {
      success: true,
      conflictId: docRef.id
    };
  } catch (error) {
    logger.error('Error al crear conflicto de interés', error);
    return {
      success: false,
      error: 'Error al crear el conflicto de interés'
    };
  }
}

/**
 * Actualiza un conflicto de interés existente
 */
export async function updateConflictOfInterest(
  companyId: string,
  conflictId: string,
  updates: Partial<Omit<ConflictOfInterest, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalizar ID para entorno de desarrollo
    const normalizedCompanyId = normalizeCompanyId(companyId);
    logger.info(`Actualizando conflicto de interés con ID ${conflictId} para companyId=${normalizedCompanyId}`, null, { prefix: 'updateConflictOfInterest' });
    
    const conflictRef = doc(db, `companies/${normalizedCompanyId}/conflictsOfInterest/${conflictId}`);
    
    // Verificar si el conflicto existe
    const conflictSnap = await getDoc(conflictRef);
    if (!conflictSnap.exists()) {
      return {
        success: false,
        error: 'El conflicto de interés no existe'
      };
    }
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(conflictRef, updatedData);
    
    logger.info(`Conflicto de interés con ID ${conflictId} actualizado exitosamente`, null, { prefix: 'updateConflictOfInterest' });
    
    return { success: true };
  } catch (error) {
    logger.error(`Error al actualizar conflicto de interés con ID ${conflictId}`, error);
    return {
      success: false,
      error: 'Error al actualizar el conflicto de interés'
    };
  }
}

/**
 * Elimina un conflicto de interés
 */
export async function deleteConflictOfInterest(
  companyId: string,
  conflictId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalizar ID para entorno de desarrollo
    const normalizedCompanyId = normalizeCompanyId(companyId);
    logger.info(`Eliminando conflicto de interés con ID ${conflictId} para companyId=${normalizedCompanyId}`, null, { prefix: 'deleteConflictOfInterest' });
    
    const conflictRef = doc(db, `companies/${normalizedCompanyId}/conflictsOfInterest/${conflictId}`);
    
    // Verificar si el conflicto existe
    const conflictSnap = await getDoc(conflictRef);
    if (!conflictSnap.exists()) {
      return {
        success: false,
        error: 'El conflicto de interés no existe'
      };
    }
    
    await deleteDoc(conflictRef);
    
    logger.info(`Conflicto de interés con ID ${conflictId} eliminado exitosamente`, null, { prefix: 'deleteConflictOfInterest' });
    
    return { success: true };
  } catch (error) {
    logger.error(`Error al eliminar conflicto de interés con ID ${conflictId}`, error);
    return {
      success: false,
      error: 'Error al eliminar el conflicto de interés'
    };
  }
}