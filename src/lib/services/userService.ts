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
      // DIAGNÓSTICO DE USER PROFILES
      console.log(`
      📊📊📊 DIAGNÓSTICO getUserProfileById 📊📊📊
      UserId: ${userId}
      CompanyId recibido: ${companyId}
      Hostname: ${typeof window !== 'undefined' ? window.location.hostname : 'N/A'}
      Path: ${typeof window !== 'undefined' ? window.location.pathname : 'N/A'}
      📊📊📊 FIN DIAGNÓSTICO 📊📊📊
      `);

      // PASO 1: SIEMPRE verificar primero si hay un perfil en la colección mvc para este usuario
      // Esto es una solución específica para el caso del usuario mvc
      console.log(`Verificando primero si existe un perfil en la compañía mvc (independientemente del companyId)`);
      const mvcUserRef = doc(db, `companies/mvc/users`, userId);
      const mvcUserSnap = await getDoc(mvcUserRef);

      if (mvcUserSnap.exists()) {
        console.log(`🔍 HALLAZGO: Se encontró un perfil para el usuario ${userId} en la compañía mvc`);

        // Si el usuario tiene un perfil en mvc pero estamos usando otro companyId,
        // y estamos en el subdominio mvc, usar mvc
        if (companyId !== 'mvc') {
          if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const subdomain = hostname.split('.')[0];

            if (subdomain === 'mvc') {
              console.log(`⚠️ Estamos en subdominio mvc pero usando companyId=${companyId}, forzando a mvc`);
              return {
                success: true,
                userId,
                profile: mvcUserSnap.data() as UserProfile,
                companyId: 'mvc'
              };
            }
          }
        }
      }

      // Caso especial para mvc: Verificar primero si estamos en la URL de mvc
      // Esta es una solución de emergencia hasta que se solucione el problema de manera permanente
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const hostParts = hostname.split('.');
        const subdomain = hostParts[0];

        // Si estamos en el subdominio mvc pero no estamos usando companyId="mvc"
        if (subdomain === 'mvc' && companyId !== 'mvc') {
          console.log(`*** HOTFIX [getUserProfileById]: Detectado subdominio mvc pero companyId=${companyId}, forzando companyId=mvc ***`);
          companyId = 'mvc'; // Forzar el uso de la compañía "mvc"
        }
      }

      console.log(`[getUserProfileById] Buscando usuario con ID ${userId} en compañía ${companyId}`);
      const userRef = doc(db, `companies/${companyId}/users`, userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        console.log(`[getUserProfileById] Usuario con ID ${userId} encontrado en compañía ${companyId}`);
        return {
          success: true,
          userId,
          profile: userSnap.data() as UserProfile,
          companyId
        };
      } else {
        console.log(`[getUserProfileById] Usuario con ID ${userId} no encontrado en compañía ${companyId}`);

        // Si el ID de compañía no es "mvc", intentar buscar específicamente en "mvc"
        if (companyId !== 'mvc') {
          console.log(`[getUserProfileById] Intentando buscar usuario en compañía "mvc"`);
          const mvcUserRef = doc(db, `companies/mvc/users`, userId);
          const mvcUserSnap = await getDoc(mvcUserRef);

          if (mvcUserSnap.exists()) {
            console.log(`[getUserProfileById] Usuario encontrado en compañía "mvc"`);
            return {
              success: true,
              userId,
              profile: mvcUserSnap.data() as UserProfile,
              companyId: 'mvc'
            };
          }
        }

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

      // SOLUCIÓN PERMANENTE PARA MVC
      // Si el email es mvc@canaletica.cl, SIEMPRE buscar en la compañía mvc
      // Esto corrige el problema de autenticación para este usuario específico
      // mientras se resuelve el problema más general de multi-tenancy
      if (email.toLowerCase() === 'mvc@canaletica.cl') {
        // Loguear información para diagnóstico
        console.log(`
        🚨🚨🚨 IMPORTANTE 🚨🚨🚨
        Email detectado: mvc@canaletica.cl
        CompanyId recibido: ${companyId}
        Forzando companyId=mvc
        Hostname: ${typeof window !== 'undefined' ? window.location.hostname : 'N/A'}
        Ruta: ${typeof window !== 'undefined' ? window.location.pathname : 'N/A'}
        🚨🚨🚨 FIN INFORMACIÓN 🚨🚨🚨
        `);

        // Siempre usar mvc para este usuario específico
        companyId = 'mvc';
      }

      // La solución anterior para subdominios se mantiene como respaldo
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const hostParts = hostname.split('.');
        const subdomain = hostParts[0];

        // Si estamos en el subdominio mvc pero no estamos usando companyId="mvc"
        if (subdomain === 'mvc' && companyId !== 'mvc') {
          console.log(`*** HOTFIX: Detectado subdominio mvc pero companyId=${companyId}, forzando companyId=mvc ***`);
          companyId = 'mvc'; // Forzar el uso de la compañía "mvc"
        }
      }

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
      console.log(`Buscando usuario ${email} en compañía ${companyId}`);
      const usersRef = collection(db, `companies/${companyId}/users`);
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        console.log(`Usuario ${email} encontrado en compañía ${companyId}`);
        return {
          success: true,
          userId: userDoc.id,
          profile: userDoc.data() as UserProfile,
        };
      } else {
        console.log(`Usuario con email ${email} no encontrado en compañía ${companyId}`);

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
            console.log(`Usuario encontrado en otra compañía: ${otherCompanyId}`);
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
  export async function getAllActiveUsers(companyId: string) {
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
  export async function getUsersByRole(companyId: string, role: string) {
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