// src/lib/services/userService.ts

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    DocumentReference,
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/config';
  
  import { UserRole } from '@/lib/utils/constants/index';

export interface UserProfile {
    displayName: string;
    email: string;
    role: UserRole;
    createdAt: Date | any;  // Timestamp de Firestore
    updatedAt?: Date | any; // Timestamp de Firestore
    lastLogin?: Date | any; // Timestamp de Firestore
    permissions?: string[];
    photoURL?: string;
    phoneNumber?: string;
    department?: string;
    position?: string;
    isActive?: boolean;
  }
  
  /**
   * Crea un perfil de usuario en Firestore
   */
  export async function createUserProfile(
    companyId: string,
    userId: string,
    userData: UserProfile
  ) {
    try {
      const userRef = doc(db, `companies/${companyId}/users`, userId);
      
      // Verificar si el usuario ya existe
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        console.warn('El perfil de usuario ya existe, actualizando...');
        return updateUserProfile(companyId, userId, userData);
      }
      
      // Añadir campos adicionales
      const dataToSave = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      };
      
      await setDoc(userRef, dataToSave);
      
      return {
        success: true,
        userId,
      };
    } catch (error) {
      console.error('Error al crear perfil de usuario:', error);
      return {
        success: false,
        error: 'Error al crear perfil de usuario',
      };
    }
  }
  
  /**
   * Obtiene un perfil de usuario por su ID
   */
  export async function getUserProfileById(companyId: string, userId: string) {
    try {
      // Verificar si estamos en un subdominio específico para asegurar que coincida con companyId
      // EXCEPCIÓN: No aplicar override en panel super-admin
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const isSuperAdminPanel = pathname.startsWith('/super-admin');
        
        // Si NO estamos en el panel super-admin, aplicar verificación de seguridad
        if (!isSuperAdminPanel) {
          const hostname = window.location.hostname;
          const hostParts = hostname.split('.');
          const subdomain = hostParts[0]?.toLowerCase();
          
          // Si estamos en un subdominio específico (no www, localhost, canaletica, canaletic)
          if (subdomain && 
              subdomain !== 'www' && 
              subdomain !== 'localhost' && 
              subdomain !== 'canaletic' && 
              subdomain !== 'canaletica' &&
              subdomain !== 'default' &&
              subdomain !== companyId) {
            
            console.warn(`Subdomain (${subdomain}) no coincide con companyId (${companyId}). Se utilizará el subdominio para mayor seguridad.`);
            companyId = subdomain; // Por seguridad, usar el subdominio para asegurar aislamiento de datos
          }
        } else {
          console.log(`[SUPER-ADMIN] Skipping subdomain override for super-admin panel. Using companyId: ${companyId}`);
        }
      }
      
      // NOTA: Se ha eliminado el código especial para mvc por motivos de seguridad
      // Los usuarios deben estar en su propia compañía, no debemos buscar en otras compañías
      
      // Buscar en la compañía solicitada
      const userRef = doc(db, `companies/${companyId}/users`, userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return {
          success: true,
          userId,
          profile: userSnap.data() as UserProfile,
          companyId
        };
      } else {
        // NO BUSCAMOS EN OTRAS COMPAÑÍAS - Esto genera problemas de seguridad
        // Los usuarios deben estar en su propia compañía
        /* CÓDIGO ELIMINADO POR SEGURIDAD:
        if (companyId !== 'mvc') {
          const mvcUserRef = doc(db, `companies/mvc/users`, userId);
          const mvcUserSnap = await getDoc(mvcUserRef);

          if (mvcUserSnap.exists()) {
            return {
              success: true,
              userId,
              profile: mvcUserSnap.data() as UserProfile,
              companyId: 'mvc'
            };
          }
        }*/

        return {
          success: false,
          error: 'Usuario no encontrado',
        };
      }
    } catch (error) {
      console.error('Error al obtener perfil de usuario:', error);
      return {
        success: false,
        error: 'Error al obtener perfil de usuario',
      };
    }
  }
  
  /**
   * Obtiene un perfil de usuario por su correo electrónico
   */
  export async function getUserProfileByEmail(companyId: string, email: string) {
    try {
      if (!email) {
        return {
          success: false,
          error: 'Email no proporcionado',
        };
      }

      // Verificar si estamos en un subdominio específico para asegurar que coincida con companyId
      // EXCEPCIÓN: No aplicar override en panel super-admin
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const isSuperAdminPanel = pathname.startsWith('/super-admin');
        
        // Si NO estamos en el panel super-admin, aplicar verificación de seguridad
        if (!isSuperAdminPanel) {
          const hostname = window.location.hostname;
          const hostParts = hostname.split('.');
          const subdomain = hostParts[0]?.toLowerCase();
          
          // Si estamos en un subdominio específico (no www, localhost, canaletica, canaletic)
          if (subdomain && 
              subdomain !== 'www' && 
              subdomain !== 'localhost' && 
              subdomain !== 'canaletic' && 
              subdomain !== 'canaletica' &&
              subdomain !== 'default' &&
              subdomain !== companyId) {
            
            console.warn(`Subdomain (${subdomain}) no coincide con companyId (${companyId}). Se utilizará el subdominio para mayor seguridad.`);
            companyId = subdomain; // Por seguridad, usar el subdominio para asegurar aislamiento de datos
          }
        } else {
          console.log(`[SUPER-ADMIN] Skipping subdomain override for getUserProfileByEmail. Using companyId: ${companyId}`);
        }
      }
      
      // NOTA: Se ha eliminado el código especial para mvc por motivos de seguridad

      // Verificar primero si existe la colección de super_admins
      try {
        // Buscar si el usuario es super admin
        const superAdminsRef = collection(db, 'super_admins');
        const superAdminQ = query(superAdminsRef, where('email', '==', email));
        const superAdminSnapshot = await getDocs(superAdminQ);
        
        if (!superAdminSnapshot.empty) {
          const superAdminDoc = superAdminSnapshot.docs[0];
          const superAdminData = superAdminDoc.data();
          
          // Crear un perfil especial para super admin
          return {
            success: true,
            userId: superAdminDoc.id,
            profile: {
              displayName: superAdminData.displayName || 'Super Administrador',
              email: email,
              role: 'super_admin',
              isActive: true,
              permissions: ['*'], // Todos los permisos
              createdAt: superAdminData.createdAt,
              updatedAt: superAdminData.updatedAt
            } as UserProfile,
            isSuperAdmin: true
          };
        }
      } catch (superAdminError) {
        console.warn('Error al verificar super_admins:', superAdminError);
        // Continuar con la búsqueda normal si falla la verificación de super_admin
      }
      
      // Buscar en la compañía actual
      const usersRef = collection(db, `companies/${companyId}/users`);
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return {
          success: true,
          userId: userDoc.id,
          profile: userDoc.data() as UserProfile,
        };
      } else {
        // Intentar buscar en todas las compañías
        const companiesRef = collection(db, 'companies');
        const companiesSnapshot = await getDocs(companiesRef);
        
        for (const companyDoc of companiesSnapshot.docs) {
          const otherCompanyId = companyDoc.id;
          if (otherCompanyId === companyId) continue;
          
          const otherUsersRef = collection(db, `companies/${otherCompanyId}/users`);
          const otherQ = query(otherUsersRef, where('email', '==', email));
          const otherQuerySnapshot = await getDocs(otherQ);
          
          if (!otherQuerySnapshot.empty) {
            const userDoc = otherQuerySnapshot.docs[0];
            return {
              success: true,
              userId: userDoc.id,
              profile: userDoc.data() as UserProfile,
              companyId: otherCompanyId
            };
          }
        }
        
        return {
          success: false,
          error: 'Usuario no encontrado en ninguna compañía',
        };
      }
    } catch (error) {
      console.error('Error al obtener perfil de usuario por email:', error);
      return {
        success: false,
        error: 'Error al obtener perfil de usuario',
      };
    }
  }
  
  /**
   * Actualiza un perfil de usuario
   */
  export async function updateUserProfile(
    companyId: string,
    userId: string,
    updates: Partial<UserProfile>
  ) {
    try {
      const userRef = doc(db, `companies/${companyId}/users`, userId);
      
      // Verificar si el usuario existe
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'Usuario no encontrado',
        };
      }
      
      // Añadir timestamp de actualización
      const updatedData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(userRef, updatedData);
      
      return {
        success: true,
        userId,
      };
    } catch (error) {
      console.error('Error al actualizar perfil de usuario:', error);
      return {
        success: false,
        error: 'Error al actualizar perfil de usuario',
      };
    }
  }
  
  /**
   * Actualiza la marca de tiempo del último inicio de sesión
   */
  export async function updateLastLogin(companyId: string, userId: string) {
    try {
      const userRef = doc(db, `companies/${companyId}/users`, userId);
      
      // Verificar si el usuario existe
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        console.warn(`Usuario ${userId} no encontrado en compañía ${companyId} para actualizar último login`);
        return {
          success: false,
          error: 'Usuario no encontrado',
        };
      }
      
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      });
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error al actualizar último inicio de sesión:', error);
      return {
        success: false,
        error: 'Error al actualizar último inicio de sesión',
      };
    }
  }
  
  /**
   * Desactiva un usuario
   */
  export async function deactivateUser(companyId: string, userId: string) {
    try {
      const userRef = doc(db, `companies/${companyId}/users`, userId);
      await updateDoc(userRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      return {
        success: false,
        error: 'Error al desactivar usuario',
      };
    }
  }
  
  /**
   * Obtiene todos los usuarios activos de una empresa
   */
  export async function getAllActiveUsers(
  companyId: string,
  userRole?: string | null,
  userId?: string | null
) {
  // Verificar aislamiento de datos para usuarios no super_admin
  if (userRole && userRole !== 'super_admin' && userId) {
    try {
      const userRef = doc(db, `companies/${companyId}/users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        // Verificar que el usuario pertenezca a esta compañía
        if (userData.company && userData.company !== companyId) {
          console.error(`⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} intentó acceder a usuarios de compañía ${companyId} pero pertenece a ${userData.company}`);
          return {
            success: false,
            error: 'No tiene permiso para acceder a los usuarios de esta compañía',
            users: []
          };
        }
      }
    } catch (error) {
      console.error('Error al verificar el perfil del usuario:', error);
      console.warn('No se pudo verificar el aislamiento multi-tenant, se permite acceso con precaución');
    }
  }
    try {
      const usersRef = collection(db, `companies/${companyId}/users`);
      const q = query(usersRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as UserProfile,
      }));
      
      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error('Error al obtener usuarios activos:', error);
      return {
        success: false,
        error: 'Error al obtener usuarios activos',
      };
    }
  }
  
  /**
   * Obtiene todos los usuarios con un rol específico
   */
  export async function getUsersByRole(
  companyId: string,
  role: string,
  userRole?: string | null,
  userId?: string | null
) {
  // Verificar aislamiento de datos para usuarios no super_admin
  if (userRole && userRole !== 'super_admin' && userId) {
    try {
      const userRef = doc(db, `companies/${companyId}/users/${userId}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        // Verificar que el usuario pertenezca a esta compañía
        if (userData.company && userData.company !== companyId) {
          console.error(`⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} intentó acceder a usuarios por rol en compañía ${companyId} pero pertenece a ${userData.company}`);
          return {
            success: false,
            error: 'No tiene permiso para acceder a los usuarios de esta compañía',
            users: []
          };
        }
      }
    } catch (error) {
      console.error('Error al verificar el perfil del usuario:', error);
      console.warn('No se pudo verificar el aislamiento multi-tenant, se permite acceso con precaución');
    }
  }
    try {
      const usersRef = collection(db, `companies/${companyId}/users`);
      const q = query(
        usersRef,
        where('role', '==', role),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as UserProfile,
      }));
      
      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error('Error al obtener usuarios por rol:', error);
      return {
        success: false,
        error: 'Error al obtener usuarios por rol',
      };
    }
  }
  
  /**
   * Verifica si un usuario existe
   */
  export async function userExists(companyId: string, userId: string) {
    try {
      const userRef = doc(db, `companies/${companyId}/users`, userId);
      const userDoc = await getDoc(userRef);
      return userDoc.exists();
    } catch (error) {
      console.error('Error al verificar si el usuario existe:', error);
      return false;
    }
  }
  
  /**
   * Verifica si un email ya está en uso
   */
  export async function emailExists(companyId: string, email: string) {
    try {
      const usersRef = collection(db, `companies/${companyId}/users`);
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar si el email existe:', error);
      return false;
    }
  }
  
  /**
   * Busca a qué compañía pertenece un usuario por su UID
   * @param userId ID del usuario a buscar
   * @returns Objeto con la información de la compañía encontrada o null si no se encuentra
   */
  export async function findUserCompany(userId: string): Promise<{ 
    success: boolean; 
    companyId?: string; 
    companyName?: string;
    error?: string;
  }> {
    try {
      // Primero verificar si es super admin
      const superAdminRef = doc(db, `super_admins/${userId}`);
      const superAdminSnap = await getDoc(superAdminRef);
      
      if (superAdminSnap.exists()) {
        return {
          success: true,
          companyId: 'super_admin'
        };
      }
      
      // Buscar en todas las compañías
      const companiesRef = collection(db, 'companies');
      const companiesSnapshot = await getDocs(companiesRef);
      
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        
        // Buscar el usuario en esta compañía
        const userRef = doc(db, `companies/${companyId}/users/${userId}`);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          return {
            success: true,
            companyId: companyId,
            companyName: companyDoc.data().name || companyId
          };
        }
      }
      
      // Si no se encontró en ninguna compañía
      return {
        success: false,
        error: 'Usuario no encontrado en ninguna compañía'
      };
    } catch (error) {
      console.error('Error al buscar compañía del usuario:', error);
      return {
        success: false,
        error: 'Error al buscar compañía del usuario'
      };
    }
  }