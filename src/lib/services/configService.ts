// src/lib/services/configService.ts

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
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { KarinRiskQuestion, KARIN_RISK_QUESTIONS, KarinRiskFactorType } from '@/types/report';

// Interfaz para empresas
export interface Company {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  industry?: string;
  maxUsers?: number;
  createdAt?: any;
  updatedAt?: any;
}

// Interfaz para notificaciones
export interface NotificationSettings {
  notifyNewReport: boolean;
  notifyStatusChange: boolean;
  notifyNewComment: boolean;
  notifyDueDate: boolean;
}

// Interfaz para la configuración de la empresa
export interface CompanyConfig {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  emailNotifications: boolean;
  defaultLanguage: string;
  retentionPolicy: number;
  slaForRegular: number;
  slaForKarin: number;
  notifications?: NotificationSettings;
  logoUrl?: string;
  updatedAt?: any;
  updatedBy?: string;
}

// Interfaz para categorías personalizables
export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  isKarinLaw?: boolean;
  updatedAt?: any;
}

// Interfaz para subcategorías personalizables
export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  updatedAt?: any;
}

// Interfaz para plantillas de mensajes
export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string; // por ejemplo: 'report_created', 'status_change', etc.
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Interfaz para roles personalizados
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean; // para roles que no se pueden eliminar
  createdAt?: any;
  updatedAt?: any;
}

// Interfaz para elementos de valores de formularios
export interface FormOptionValue {
  id: string;
  name: string;
  value: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

// Interfaz para integraciones externas
export interface ExternalIntegration {
  id: string;
  name: string;
  type: string; // 'email', 'slack', 'teams', etc.
  config: Record<string, any>;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Obtiene la configuración de una empresa
 */
export async function getCompanyConfig(companyId: string): Promise<{ success: boolean; config?: CompanyConfig; error?: string }> {
  try {
    // Usar empresa default si no se proporciona companyId
    if (!companyId || companyId === '') {
      companyId = 'default';
    }
    
    console.log(`Obteniendo configuración para empresa: ${companyId}`);
    
    const configRef = doc(db, `companies/${companyId}/settings/general`);
    
    try {
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        console.log("Configuración encontrada en Firestore");
        return {
          success: true,
          config: configSnap.data() as CompanyConfig,
        };
      } else {
        console.log("No se encontró configuración, usando valores por defecto");
      }
    } catch (firestoreError) {
      console.error("Error específico de Firestore:", firestoreError);
      // Continuar con valores por defecto
    }

    // Si no existe configuración o hubo un error, devolver valores por defecto
    console.log("Retornando configuración por defecto");
    return {
      success: true,
      config: {
        companyName: 'Canal Etica',
        primaryColor: '#FF7E1D',
        secondaryColor: '#4D4D4D',
        emailNotifications: true,
        defaultLanguage: 'es',
        retentionPolicy: 365,
        slaForRegular: 30,
        slaForKarin: 10,
        notifications: {
          notifyNewReport: true,
          notifyStatusChange: true,
          notifyNewComment: true,
          notifyDueDate: true
        }
      },
    };
  } catch (error) {
    console.error('Error general al obtener configuración:', error);
    // Incluso en caso de error general, devolver valores por defecto para no interrumpir el flujo
    return {
      success: true,
      config: {
        companyName: 'Canal Etica',
        primaryColor: '#FF7E1D',
        secondaryColor: '#4D4D4D',
        emailNotifications: true,
        defaultLanguage: 'es',
        retentionPolicy: 365,
        slaForRegular: 30,
        slaForKarin: 10,
        notifications: {
          notifyNewReport: true,
          notifyStatusChange: true,
          notifyNewComment: true,
          notifyDueDate: true
        }
      },
    };
  }
}

/**
 * Guarda la configuración de una empresa
 */
export async function saveCompanyConfig(
  companyId: string,
  userId: string,
  config: CompanyConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const configRef = doc(db, `companies/${companyId}/settings/general`);

    // Añadir metadatos
    const configWithMeta = {
      ...config,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    await setDoc(configRef, configWithMeta);

    return { success: true };
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return {
      success: false,
      error: 'Error al guardar la configuración',
    };
  }
}

/**
 * Sube el logo de la empresa
 */
export async function uploadCompanyLogo(
  companyId: string,
  file: File
): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
  try {
    // Crear referencia en Storage
    const logoRef = ref(storage, `companies/${companyId}/logo`);

    // Subir archivo
    await uploadBytes(logoRef, file);

    // Obtener URL
    const logoUrl = await getDownloadURL(logoRef);

    // Guardar referencia en configuración
    const configRef = doc(db, `companies/${companyId}/settings/general`);
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const currentConfig = configSnap.data();
      await setDoc(configRef, {
        ...currentConfig,
        logoUrl,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      success: true,
      logoUrl,
    };
  } catch (error) {
    console.error('Error al subir logo:', error);
    return {
      success: false,
      error: 'Error al subir el logo de la empresa',
    };
  }
}

// =============================================================
// NUEVAS FUNCIONES PARA GESTIÓN DE CATEGORÍAS Y SUBCATEGORÍAS
// =============================================================

/**
 * Obtiene todas las categorías
 */
export async function getCategories(companyId: string): Promise<{ success: boolean; categories?: Category[]; error?: string }> {
  try {
    const categoriesRef = collection(db, `companies/${companyId}/categories`);
    const q = query(categoriesRef, orderBy('order', 'asc'));
    
    const querySnapshot = await getDocs(q);
    const categories: Category[] = [];
    
    querySnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data()
      } as Category);
    });
    
    return {
      success: true,
      categories
    };
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return {
      success: false,
      error: 'Error al obtener las categorías'
    };
  }
}

/**
 * Crea una nueva categoría
 */
export async function createCategory(
  companyId: string, 
  categoryData: Omit<Category, 'id' | 'updatedAt'>
): Promise<{ success: boolean; categoryId?: string; error?: string }> {
  try {
    const categoriesRef = collection(db, `companies/${companyId}/categories`);
    
    const dataToSave = {
      ...categoryData,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(categoriesRef, dataToSave);
    
    return {
      success: true,
      categoryId: docRef.id
    };
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return {
      success: false,
      error: 'Error al crear la categoría'
    };
  }
}

/**
 * Actualiza una categoría existente
 */
export async function updateCategory(
  companyId: string,
  categoryId: string,
  updates: Partial<Omit<Category, 'id' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const categoryRef = doc(db, `companies/${companyId}/categories/${categoryId}`);
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(categoryRef, updatedData);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return {
      success: false,
      error: 'Error al actualizar la categoría'
    };
  }
}

/**
 * Elimina una categoría
 */
export async function deleteCategory(
  companyId: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Comprobar si hay subcategorías asociadas
    const subcategoriesRef = collection(db, `companies/${companyId}/subcategories`);
    const q = query(subcategoriesRef, where('categoryId', '==', categoryId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return {
        success: false,
        error: 'No se puede eliminar esta categoría porque tiene subcategorías asociadas'
      };
    }
    
    // Comprobar si hay denuncias asociadas a esta categoría
    const reportsRef = collection(db, `companies/${companyId}/reports`);
    const reportsQuery = query(reportsRef, where('category', '==', categoryId));
    const reportsSnapshot = await getDocs(reportsQuery);
    
    if (!reportsSnapshot.empty) {
      return {
        success: false,
        error: 'No se puede eliminar esta categoría porque hay denuncias asociadas a ella'
      };
    }
    
    // Si no hay dependencias, eliminar la categoría
    const categoryRef = doc(db, `companies/${companyId}/categories/${categoryId}`);
    await deleteDoc(categoryRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return {
      success: false,
      error: 'Error al eliminar la categoría'
    };
  }
}

/**
 * Obtiene todas las subcategorías de una categoría
 */
export async function getSubcategories(
  companyId: string, 
  categoryId?: string
): Promise<{ success: boolean; subcategories?: Subcategory[]; error?: string }> {
  try {
    const subcategoriesRef = collection(db, `companies/${companyId}/subcategories`);
    let q;
    
    if (categoryId) {
      q = query(
        subcategoriesRef, 
        where('categoryId', '==', categoryId),
        orderBy('order', 'asc')
      );
    } else {
      q = query(subcategoriesRef, orderBy('categoryId'), orderBy('order', 'asc'));
    }
    
    const querySnapshot = await getDocs(q);
    const subcategories: Subcategory[] = [];
    
    querySnapshot.forEach((doc) => {
      subcategories.push({
        id: doc.id,
        ...doc.data()
      } as Subcategory);
    });
    
    return {
      success: true,
      subcategories
    };
  } catch (error) {
    console.error('Error al obtener subcategorías:', error);
    return {
      success: false,
      error: 'Error al obtener las subcategorías'
    };
  }
}

/**
 * Crea una nueva subcategoría
 */
export async function createSubcategory(
  companyId: string, 
  subcategoryData: Omit<Subcategory, 'id' | 'updatedAt'>
): Promise<{ success: boolean; subcategoryId?: string; error?: string }> {
  try {
    // Comprobar que la categoría padre existe
    const categoryRef = doc(db, `companies/${companyId}/categories/${subcategoryData.categoryId}`);
    const categorySnap = await getDoc(categoryRef);
    
    if (!categorySnap.exists()) {
      return {
        success: false,
        error: 'La categoría padre no existe'
      };
    }
    
    const subcategoriesRef = collection(db, `companies/${companyId}/subcategories`);
    
    const dataToSave = {
      ...subcategoryData,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(subcategoriesRef, dataToSave);
    
    return {
      success: true,
      subcategoryId: docRef.id
    };
  } catch (error) {
    console.error('Error al crear subcategoría:', error);
    return {
      success: false,
      error: 'Error al crear la subcategoría'
    };
  }
}

/**
 * Actualiza una subcategoría existente
 */
export async function updateSubcategory(
  companyId: string,
  subcategoryId: string,
  updates: Partial<Omit<Subcategory, 'id' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Si se está actualizando la categoría padre, comprobar que existe
    if (updates.categoryId) {
      const categoryRef = doc(db, `companies/${companyId}/categories/${updates.categoryId}`);
      const categorySnap = await getDoc(categoryRef);
      
      if (!categorySnap.exists()) {
        return {
          success: false,
          error: 'La categoría padre no existe'
        };
      }
    }
    
    const subcategoryRef = doc(db, `companies/${companyId}/subcategories/${subcategoryId}`);
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(subcategoryRef, updatedData);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar subcategoría:', error);
    return {
      success: false,
      error: 'Error al actualizar la subcategoría'
    };
  }
}

/**
 * Elimina una subcategoría
 */
export async function deleteSubcategory(
  companyId: string,
  subcategoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Comprobar si hay denuncias asociadas a esta subcategoría
    const reportsRef = collection(db, `companies/${companyId}/reports`);
    const reportsQuery = query(reportsRef, where('subcategory', '==', subcategoryId));
    const reportsSnapshot = await getDocs(reportsQuery);
    
    if (!reportsSnapshot.empty) {
      return {
        success: false,
        error: 'No se puede eliminar esta subcategoría porque hay denuncias asociadas a ella'
      };
    }
    
    // Si no hay dependencias, eliminar la subcategoría
    const subcategoryRef = doc(db, `companies/${companyId}/subcategories/${subcategoryId}`);
    await deleteDoc(subcategoryRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar subcategoría:', error);
    return {
      success: false,
      error: 'Error al eliminar la subcategoría'
    };
  }
}

// =============================================================
// NUEVAS FUNCIONES PARA GESTIÓN DE PLANTILLAS DE MENSAJES
// =============================================================

/**
 * Obtiene todas las plantillas de mensajes
 */
export async function getMessageTemplates(
  companyId: string,
  type?: string
): Promise<{ success: boolean; templates?: MessageTemplate[]; error?: string }> {
  try {
    const templatesRef = collection(db, `companies/${companyId}/messageTemplates`);
    let q;
    
    if (type) {
      q = query(templatesRef, where('type', '==', type), where('isActive', '==', true));
    } else {
      q = query(templatesRef);
    }
    
    const querySnapshot = await getDocs(q);
    const templates: MessageTemplate[] = [];
    
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      } as MessageTemplate);
    });
    
    return {
      success: true,
      templates
    };
  } catch (error) {
    console.error('Error al obtener plantillas de mensajes:', error);
    return {
      success: false,
      error: 'Error al obtener las plantillas de mensajes'
    };
  }
}

/**
 * Crea una nueva plantilla de mensaje
 */
export async function createMessageTemplate(
  companyId: string, 
  templateData: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const templatesRef = collection(db, `companies/${companyId}/messageTemplates`);
    
    const dataToSave = {
      ...templateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(templatesRef, dataToSave);
    
    return {
      success: true,
      templateId: docRef.id
    };
  } catch (error) {
    console.error('Error al crear plantilla de mensaje:', error);
    return {
      success: false,
      error: 'Error al crear la plantilla de mensaje'
    };
  }
}

/**
 * Actualiza una plantilla de mensaje existente
 */
export async function updateMessageTemplate(
  companyId: string,
  templateId: string,
  updates: Partial<Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const templateRef = doc(db, `companies/${companyId}/messageTemplates/${templateId}`);
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(templateRef, updatedData);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar plantilla de mensaje:', error);
    return {
      success: false,
      error: 'Error al actualizar la plantilla de mensaje'
    };
  }
}

/**
 * Elimina una plantilla de mensaje
 */
export async function deleteMessageTemplate(
  companyId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const templateRef = doc(db, `companies/${companyId}/messageTemplates/${templateId}`);
    await deleteDoc(templateRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar plantilla de mensaje:', error);
    return {
      success: false,
      error: 'Error al eliminar la plantilla de mensaje'
    };
  }
}

// =============================================================
// NUEVAS FUNCIONES PARA GESTIÓN DE ROLES PERSONALIZADOS
// =============================================================

/**
 * Obtiene todos los roles personalizados
 */
export async function getCustomRoles(
  companyId: string
): Promise<{ success: boolean; roles?: CustomRole[]; error?: string }> {
  try {
    const rolesRef = collection(db, `companies/${companyId}/roles`);
    const querySnapshot = await getDocs(rolesRef);
    
    const roles: CustomRole[] = [];
    
    querySnapshot.forEach((doc) => {
      roles.push({
        id: doc.id,
        ...doc.data()
      } as CustomRole);
    });
    
    return {
      success: true,
      roles
    };
  } catch (error) {
    console.error('Error al obtener roles personalizados:', error);
    return {
      success: false,
      error: 'Error al obtener los roles personalizados'
    };
  }
}

/**
 * Crea un nuevo rol personalizado
 */
export async function createCustomRole(
  companyId: string, 
  roleData: Omit<CustomRole, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; roleId?: string; error?: string }> {
  try {
    // Comprobar si ya existe un rol con el mismo nombre
    const rolesRef = collection(db, `companies/${companyId}/roles`);
    const q = query(rolesRef, where('name', '==', roleData.name));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return {
        success: false,
        error: 'Ya existe un rol con este nombre'
      };
    }
    
    const dataToSave = {
      ...roleData,
      isSystemRole: false, // Los roles creados por usuario nunca son del sistema
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(rolesRef, dataToSave);
    
    return {
      success: true,
      roleId: docRef.id
    };
  } catch (error) {
    console.error('Error al crear rol personalizado:', error);
    return {
      success: false,
      error: 'Error al crear el rol personalizado'
    };
  }
}

/**
 * Actualiza un rol personalizado existente
 */
export async function updateCustomRole(
  companyId: string,
  roleId: string,
  updates: Partial<Omit<CustomRole, 'id' | 'createdAt' | 'updatedAt' | 'isSystemRole'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que el rol existe y comprobar si es un rol del sistema
    const roleRef = doc(db, `companies/${companyId}/roles/${roleId}`);
    const roleSnap = await getDoc(roleRef);
    
    if (!roleSnap.exists()) {
      return {
        success: false,
        error: 'El rol no existe'
      };
    }
    
    const roleData = roleSnap.data() as CustomRole;
    
    if (roleData.isSystemRole) {
      return {
        success: false,
        error: 'No se pueden modificar los roles del sistema'
      };
    }
    
    // Si se está cambiando el nombre, comprobar que no existe otro con ese nombre
    if (updates.name && updates.name !== roleData.name) {
      const rolesRef = collection(db, `companies/${companyId}/roles`);
      const q = query(rolesRef, where('name', '==', updates.name));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return {
          success: false,
          error: 'Ya existe un rol con este nombre'
        };
      }
    }
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(roleRef, updatedData);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar rol personalizado:', error);
    return {
      success: false,
      error: 'Error al actualizar el rol personalizado'
    };
  }
}

/**
 * Elimina un rol personalizado
 */
export async function deleteCustomRole(
  companyId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que el rol existe y comprobar si es un rol del sistema
    const roleRef = doc(db, `companies/${companyId}/roles/${roleId}`);
    const roleSnap = await getDoc(roleRef);
    
    if (!roleSnap.exists()) {
      return {
        success: false,
        error: 'El rol no existe'
      };
    }
    
    const roleData = roleSnap.data() as CustomRole;
    
    if (roleData.isSystemRole) {
      return {
        success: false,
        error: 'No se pueden eliminar los roles del sistema'
      };
    }
    
    // Comprobar si hay usuarios con este rol
    const usersRef = collection(db, `companies/${companyId}/users`);
    const q = query(usersRef, where('roleId', '==', roleId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return {
        success: false,
        error: 'No se puede eliminar este rol porque hay usuarios asignados a él'
      };
    }
    
    // Si no hay dependencias, eliminar el rol
    await deleteDoc(roleRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar rol personalizado:', error);
    return {
      success: false,
      error: 'Error al eliminar el rol personalizado'
    };
  }
}

// =============================================================
// NUEVAS FUNCIONES PARA GESTIÓN DE INTEGRACIONES EXTERNAS
// =============================================================

/**
 * Obtiene todas las integraciones externas
 */
export async function getExternalIntegrations(
  companyId: string,
  type?: string
): Promise<{ success: boolean; integrations?: ExternalIntegration[]; error?: string }> {
  try {
    const integrationsRef = collection(db, `companies/${companyId}/integrations`);
    let q;
    
    if (type) {
      q = query(integrationsRef, where('type', '==', type));
    } else {
      q = query(integrationsRef);
    }
    
    const querySnapshot = await getDocs(q);
    const integrations: ExternalIntegration[] = [];
    
    querySnapshot.forEach((doc) => {
      integrations.push({
        id: doc.id,
        ...doc.data()
      } as ExternalIntegration);
    });
    
    return {
      success: true,
      integrations
    };
  } catch (error) {
    console.error('Error al obtener integraciones externas:', error);
    return {
      success: false,
      error: 'Error al obtener las integraciones externas'
    };
  }
}

/**
 * Crea una nueva integración externa
 */
export async function createExternalIntegration(
  companyId: string, 
  integrationData: Omit<ExternalIntegration, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; integrationId?: string; error?: string }> {
  try {
    const integrationsRef = collection(db, `companies/${companyId}/integrations`);
    
    const dataToSave = {
      ...integrationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(integrationsRef, dataToSave);
    
    return {
      success: true,
      integrationId: docRef.id
    };
  } catch (error) {
    console.error('Error al crear integración externa:', error);
    return {
      success: false,
      error: 'Error al crear la integración externa'
    };
  }
}

/**
 * Actualiza una integración externa existente
 */
export async function updateExternalIntegration(
  companyId: string,
  integrationId: string,
  updates: Partial<Omit<ExternalIntegration, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const integrationRef = doc(db, `companies/${companyId}/integrations/${integrationId}`);
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(integrationRef, updatedData);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar integración externa:', error);
    return {
      success: false,
      error: 'Error al actualizar la integración externa'
    };
  }
}

/**
 * Elimina una integración externa
 */
export async function deleteExternalIntegration(
  companyId: string,
  integrationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const integrationRef = doc(db, `companies/${companyId}/integrations/${integrationId}`);
    await deleteDoc(integrationRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar integración externa:', error);
    return {
      success: false,
      error: 'Error al eliminar la integración externa'
    };
  }
}

// =============================================================
// FUNCIONES PARA GESTIÓN DE EMPRESAS
// =============================================================

/**
 * Obtiene todas las empresas registradas
 */
export async function getCompanies(): Promise<{ success: boolean; companies?: Company[]; error?: string }> {
  try {
    const companiesRef = collection(db, 'companies');
    const querySnapshot = await getDocs(companiesRef);
    
    const companies: Company[] = [];
    
    querySnapshot.forEach((doc) => {
      companies.push({
        id: doc.id,
        ...doc.data()
      } as Company);
    });
    
    return {
      success: true,
      companies
    };
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    return {
      success: false,
      error: 'Error al obtener las empresas'
    };
  }
}

/**
 * Obtiene la información de una empresa específica
 */
export async function getCompany(companyId: string): Promise<{ success: boolean; company?: Company; error?: string }> {
  try {
    const companyRef = doc(db, `companies/${companyId}`);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return {
        success: false,
        error: 'La empresa no existe'
      };
    }
    
    const company: Company = {
      id: companySnap.id,
      ...companySnap.data()
    } as Company;
    
    return {
      success: true,
      company
    };
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    return {
      success: false,
      error: 'Error al obtener la información de la empresa'
    };
  }
}

/**
 * Crea una nueva empresa
 */
export async function createCompany(
  companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  try {
    // Comprobar si ya existe una empresa con el mismo nombre
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, where('name', '==', companyData.name));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return {
        success: false,
        error: 'Ya existe una empresa con este nombre'
      };
    }
    
    const dataToSave = {
      ...companyData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(companiesRef, dataToSave);
    
    // Inicializar estructura básica de la empresa
    await initializeCompanyStructure(docRef.id);
    
    return {
      success: true,
      companyId: docRef.id
    };
  } catch (error) {
    console.error('Error al crear empresa:', error);
    return {
      success: false,
      error: 'Error al crear la empresa'
    };
  }
}

/**
 * Actualiza la información de una empresa existente
 */
export async function updateCompany(
  companyId: string,
  updates: Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que la empresa existe
    const companyRef = doc(db, `companies/${companyId}`);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return {
        success: false,
        error: 'La empresa no existe'
      };
    }
    
    // Si se está cambiando el nombre, comprobar que no existe otra con ese nombre
    if (updates.name) {
      const currentData = companySnap.data() as Company;
      if (updates.name !== currentData.name) {
        const companiesRef = collection(db, 'companies');
        const q = query(companiesRef, where('name', '==', updates.name));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          return {
            success: false,
            error: 'Ya existe una empresa con este nombre'
          };
        }
      }
    }
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(companyRef, updatedData);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    return {
      success: false,
      error: 'Error al actualizar la empresa'
    };
  }
}

/**
 * Elimina una empresa
 */
export async function deleteCompany(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que la empresa existe
    const companyRef = doc(db, `companies/${companyId}`);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      return {
        success: false,
        error: 'La empresa no existe'
      };
    }
    
    // Comprobar si tiene usuarios
    const usersRef = collection(db, `companies/${companyId}/users`);
    const usersSnapshot = await getDocs(usersRef);
    
    if (!usersSnapshot.empty) {
      return {
        success: false,
        error: 'No se puede eliminar la empresa porque tiene usuarios asociados'
      };
    }
    
    // Comprobar si tiene denuncias
    const reportsRef = collection(db, `companies/${companyId}/reports`);
    const reportsSnapshot = await getDocs(reportsRef);
    
    if (!reportsSnapshot.empty) {
      return {
        success: false,
        error: 'No se puede eliminar la empresa porque tiene denuncias registradas'
      };
    }
    
    // Eliminar la estructura de datos de la empresa
    // Nota: Idealmente, esto se debería hacer con una función recursiva o una función de Firebase Cloud
    // que elimine todas las subcolecciones, pero para simplificar el ejemplo, solo eliminamos la empresa.
    await deleteDoc(companyRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    return {
      success: false,
      error: 'Error al eliminar la empresa'
    };
  }
}

/**
 * Inicializa la estructura básica para una nueva empresa
 */
// Funciones para gestionar opciones de formularios

/**
 * Obtiene los valores para un tipo de opción de formulario
 */
export async function getFormOptions(
  companyId: string,
  optionType: string
): Promise<{ success: boolean; options?: FormOptionValue[]; error?: string }> {
  try {
    // Para formularios públicos, siempre use la empresa default
    if (!companyId || companyId === '') {
      companyId = 'default';
    }
    
    console.log(`Obteniendo opciones de formulario para companyId: ${companyId}, optionType: ${optionType}`);
    
    try {
      const optionsRef = collection(db, `companies/${companyId}/formOptions/${optionType}/values`);
      const q = query(optionsRef, orderBy('order', 'asc'));
      
      const querySnapshot = await getDocs(q);
      const options: FormOptionValue[] = [];
      
      console.log(`Se encontraron ${querySnapshot.size} opciones para ${optionType}`);
      
      querySnapshot.forEach((doc) => {
        options.push({
          id: doc.id,
          ...doc.data()
        } as FormOptionValue);
      });
      
      if (options.length > 0) {
        return {
          success: true,
          options
        };
      }
    } catch (firestoreError) {
      console.error(`Error específico al obtener opciones de ${optionType}:`, firestoreError);
      // Continuar para devolver valores por defecto
    }
    
    // Si no hay opciones o hubo error, devolver valores por defecto
    console.log(`Devolviendo opciones por defecto para ${optionType}`);
    let defaultOptions: FormOptionValue[] = [];
    
    // Opciones por defecto según el tipo
    if (optionType === 'relationships') {
      defaultOptions = [
        { id: '1', name: 'Empleado', value: 'empleado', description: 'Persona que trabaja en la empresa', isActive: true, order: 0 },
        { id: '2', name: 'Proveedor', value: 'proveedor', description: 'Empresa o persona que provee bienes o servicios', isActive: true, order: 1 },
        { id: '3', name: 'Cliente', value: 'cliente', description: 'Persona o empresa que recibe nuestros servicios', isActive: true, order: 2 },
        { id: '4', name: 'Contratista', value: 'contratista', description: 'Persona contratada para un proyecto específico', isActive: true, order: 3 },
        { id: '5', name: 'Otro', value: 'otro', description: 'Otra relación no especificada', isActive: true, order: 4 }
      ];
    } else if (optionType === 'frequencies') {
      defaultOptions = [
        { id: '1', name: 'Única vez', value: 'unica', description: 'Evento aislado', isActive: true, order: 0 },
        { id: '2', name: 'Ocasional', value: 'ocasional', description: 'Varias veces sin un patrón claro', isActive: true, order: 1 },
        { id: '3', name: 'Reiterada', value: 'reiterada', description: 'Se repite con regularidad', isActive: true, order: 2 },
        { id: '4', name: 'Sistemática', value: 'sistematica', description: 'Constante y deliberada', isActive: true, order: 3 }
      ];
    } else if (optionType === 'impacts') {
      defaultOptions = [
        { id: '1', name: 'Económico', value: 'economico', description: 'Impacto en finanzas o recursos económicos', isActive: true, order: 0 },
        { id: '2', name: 'Laboral', value: 'laboral', description: 'Afectación del ambiente o desempeño laboral', isActive: true, order: 1 },
        { id: '3', name: 'Personal', value: 'personal', description: 'Impacto en la salud física o mental', isActive: true, order: 2 },
        { id: '4', name: 'Reputacional', value: 'reputacional', description: 'Afectación a la imagen o reputación', isActive: true, order: 3 },
        { id: '5', name: 'Operacional', value: 'operacional', description: 'Impacto en las operaciones del negocio', isActive: true, order: 4 },
        { id: '6', name: 'Legal', value: 'legal', description: 'Consecuencias legales para la organización', isActive: true, order: 5 },
        { id: '7', name: 'Otro', value: 'otro', description: 'Otro tipo de impacto no especificado', isActive: true, order: 6 }
      ];
    }
    
    return {
      success: true,
      options: defaultOptions
    };
  } catch (error) {
    console.error(`Error general al obtener opciones de ${optionType}:`, error);
    // En caso de error total, devolver un conjunto mínimo de opciones para evitar que se rompa el flujo
    return {
      success: true,
      options: [
        { id: '1', name: 'Empleado', value: 'empleado', description: '', isActive: true, order: 0 },
        { id: '2', name: 'Otro', value: 'otro', description: '', isActive: true, order: 1 }
      ]
    };
  }
}

/**
 * Crea una nueva opción de formulario
 */
export async function createFormOption(
  companyId: string,
  optionType: string,
  optionData: Omit<FormOptionValue, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; optionId?: string; error?: string }> {
  try {
    const optionsRef = collection(db, `companies/${companyId}/formOptions/${optionType}/values`);
    
    const dataToSave = {
      ...optionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(optionsRef, dataToSave);
    
    return {
      success: true,
      optionId: docRef.id
    };
  } catch (error) {
    console.error(`Error al crear opción de ${optionType}:`, error);
    return {
      success: false,
      error: `Error al crear la opción de ${optionType}`
    };
  }
}

/**
 * Actualiza una opción de formulario existente
 */
export async function updateFormOption(
  companyId: string,
  optionType: string,
  optionId: string,
  updates: Partial<Omit<FormOptionValue, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const optionRef = doc(db, `companies/${companyId}/formOptions/${optionType}/values/${optionId}`);
    
    const updatedData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(optionRef, updatedData);
    
    return { success: true };
  } catch (error) {
    console.error(`Error al actualizar opción de ${optionType}:`, error);
    return {
      success: false,
      error: `Error al actualizar la opción de ${optionType}`
    };
  }
}

/**
 * Elimina una opción de formulario
 */
export async function deleteFormOption(
  companyId: string,
  optionType: string,
  optionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const optionRef = doc(db, `companies/${companyId}/formOptions/${optionType}/values/${optionId}`);
    await deleteDoc(optionRef);
    
    return { success: true };
  } catch (error) {
    console.error(`Error al eliminar opción de ${optionType}:`, error);
    return {
      success: false,
      error: `Error al eliminar la opción de ${optionType}`
    };
  }
}

async function initializeCompanyStructure(companyId: string): Promise<void> {
  try {
    // Crear configuración básica
    const configRef = doc(db, `companies/${companyId}/settings/general`);
    await setDoc(configRef, {
      companyName: 'Nueva Empresa',
      primaryColor: '#FF7E1D', // Naranja principal
      secondaryColor: '#4D4D4D', // Gris oscuro
      emailNotifications: true,
      defaultLanguage: 'es',
      retentionPolicy: 365,
      slaForRegular: 30,
      slaForKarin: 10,
      notifications: {
        notifyNewReport: true,
        notifyStatusChange: true,
        notifyNewComment: true,
        notifyDueDate: true
      },
      updatedAt: serverTimestamp()
    });
    
    // Inicializar opciones de formularios
    
    // 1. Relaciones con la empresa
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
    
    // 2. Frecuencias de conducta
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
    
    // 3. Tipos de impacto
    const impactsRef = collection(db, `companies/${companyId}/formOptions/impacts/values`);
    const defaultImpacts = [
      { name: 'Económico', value: 'economico', description: 'Impacto en finanzas o recursos económicos', isActive: true, order: 0 },
      { name: 'Laboral', value: 'laboral', description: 'Afectación del ambiente o desempeño laboral', isActive: true, order: 1 },
      { name: 'Personal', value: 'personal', description: 'Impacto en la salud física o mental', isActive: true, order: 2 },
      { name: 'Reputacional', value: 'reputacional', description: 'Afectación a la imagen o reputación', isActive: true, order: 3 },
      { name: 'Operacional', value: 'operacional', description: 'Impacto en las operaciones del negocio', isActive: true, order: 4 },
      { name: 'Legal', value: 'legal', description: 'Consecuencias legales para la organización', isActive: true, order: 5 },
      { name: 'Otro', value: 'otro', description: 'Otro tipo de impacto no especificado', isActive: true, order: 6 }
    ];
    
    for (const impact of defaultImpacts) {
      await addDoc(impactsRef, {
        ...impact,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    // Se podría agregar aquí más inicialización según sea necesario
  } catch (error) {
    console.error('Error al inicializar estructura de empresa:', error);
    throw error;
  }
}

// ===== Funciones para gestionar preguntas de evaluación de riesgo Ley Karin =====

/**
 * Obtiene las preguntas de evaluación de riesgo para Ley Karin
 */
export async function getKarinRiskQuestions(companyId: string) {
  try {
    // Intentar obtener preguntas personalizadas de la base de datos
    const questionsRef = collection(db, `companies/${companyId}/config/karinrisk/questions`);
    const q = query(questionsRef, orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Si no hay preguntas personalizadas, usar las predefinidas
      console.log("No hay preguntas personalizadas, usando predefinidas");
      
      // Inicializar con las preguntas predefinidas si no existen
      const batch = writeBatch(db);
      
      KARIN_RISK_QUESTIONS.forEach((question, index) => {
        const docRef = doc(questionsRef, question.id as string);
        batch.set(docRef, {
          ...question,
          order: index,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      return {
        success: true,
        questions: KARIN_RISK_QUESTIONS
      };
    }
    
    // Mapear los documentos a objetos KarinRiskQuestion
    const questions = querySnapshot.docs.map(doc => ({
      id: doc.id as KarinRiskFactorType,
      question: doc.data().question,
      description: doc.data().description,
      riskLevel: doc.data().riskLevel
    }));
    
    return {
      success: true,
      questions
    };
  } catch (error) {
    console.error('Error al obtener preguntas de riesgo Karin:', error);
    return {
      success: false,
      error: 'Error al obtener las preguntas de riesgo',
      questions: KARIN_RISK_QUESTIONS // Fallback a preguntas predefinidas
    };
  }
}

/**
 * Guarda una pregunta de evaluación de riesgo para Ley Karin
 */
export async function saveKarinRiskQuestion(companyId: string, question: KarinRiskQuestion) {
  try {
    // Obtener el orden de la pregunta si ya existe, o asignar uno nuevo
    let order = 0;
    
    const questionRef = doc(db, `companies/${companyId}/config/karinrisk/questions/${question.id}`);
    const docSnap = await getDoc(questionRef);
    
    // Si ya existe, mantener su orden actual
    if (docSnap.exists()) {
      order = docSnap.data().order || 0;
    } else {
      // Si es nueva, obtener el máximo orden y sumar 1
      const questionsRef = collection(db, `companies/${companyId}/config/karinrisk/questions`);
      const querySnapshot = await getDocs(questionsRef);
      if (!querySnapshot.empty) {
        const orders = querySnapshot.docs.map(doc => doc.data().order || 0);
        order = Math.max(...orders) + 1;
      }
    }
    
    // Guardar la pregunta
    await setDoc(questionRef, {
      question: question.question,
      description: question.description || '',
      riskLevel: question.riskLevel,
      order,
      updatedAt: serverTimestamp(),
      ...(docSnap.exists() ? {} : { createdAt: serverTimestamp() })
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al guardar pregunta de riesgo Karin:', error);
    return {
      success: false,
      error: 'Error al guardar la pregunta de riesgo'
    };
  }
}

/**
 * Elimina una pregunta de evaluación de riesgo para Ley Karin
 */
export async function deleteKarinRiskQuestion(companyId: string, questionId: KarinRiskFactorType) {
  try {
    // Verificar que no sea una de las preguntas predefinidas
    const isPredefined = KARIN_RISK_QUESTIONS.some(q => q.id === questionId);
    if (isPredefined && !questionId.toString().startsWith('custom_')) {
      return {
        success: false,
        error: 'No se pueden eliminar las preguntas predefinidas del sistema'
      };
    }
    
    const questionRef = doc(db, `companies/${companyId}/config/karinrisk/questions/${questionId}`);
    await deleteDoc(questionRef);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al eliminar pregunta de riesgo Karin:', error);
    return {
      success: false,
      error: 'Error al eliminar la pregunta de riesgo'
    };
  }
}

/**
 * Guarda el orden de las preguntas de evaluación de riesgo para Ley Karin
 */
export async function saveKarinRiskQuestionsOrder(companyId: string, questions: KarinRiskQuestion[]) {
  try {
    const batch = writeBatch(db);
    
    questions.forEach((question, index) => {
      const questionRef = doc(db, `companies/${companyId}/config/karinrisk/questions/${question.id}`);
      batch.update(questionRef, { 
        order: index,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al guardar orden de preguntas:', error);
    return {
      success: false,
      error: 'Error al actualizar el orden de las preguntas'
    };
  }
}