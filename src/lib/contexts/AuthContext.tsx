'use client';

// src/lib/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserCredential,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfileByEmail, updateLastLogin } from '@/lib/services/userService';
import { DEFAULT_COMPANY_ID, UserRole, ADMIN_UIDS } from '@/lib/utils/constants/index';
import { UserProfile } from '@/lib/services/userService';
import { logger } from '@/lib/utils/logger';
import { CompanyContext } from './CompanyContext';
import { useCompanyDetection } from '@/lib/utils/companyDetection';

type AuthContextType = {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string) => Promise<UserCredential>;
  loginAnonymously: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  userRole: UserRole | null;
  companyId: string;
  // Nuevas funciones de super admin
  isSuperAdmin: () => boolean;
  switchCompany: (targetCompanyId: string) => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Asegurarse de que userRole use el enum correcto importado de constants/index.ts
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Obtener la información de la empresa desde el contexto
  const companyContext = useContext(CompanyContext);
  
  // Usar el hook de detección de compañía como respaldo
  // (cuando estamos en un Provider que no puede acceder a CompanyContext)
  const { normalizedId: detectedCompanyId } = useCompanyDetection();

  // Determinar el companyId actual
  // Prioridad cambiada: detectado > context > localStorage > default
  // Esto evita warnings de subdominios porque usa detección directa
  const initialCompanyId = typeof window !== 'undefined'
    ? (detectedCompanyId || companyContext?.companyId || localStorage.getItem('selectedCompanyId') || DEFAULT_COMPANY_ID)
    : DEFAULT_COMPANY_ID;

  logger.info(`AuthContext: initialCompanyId = ${initialCompanyId}`, null, { prefix: 'AuthContext' });
  
  const [companyId, setCompanyId] = useState<string>(initialCompanyId);

  async function login(email: string, password: string) {
    try {
      // Usar el companyId detectado directamente para mayor precisión
      const loginCompanyId = detectedCompanyId || companyId;

      logger.info(`Intentando login con email: ${email} en compañía: ${loginCompanyId}`, null,
        { prefix: 'AuthContext.login' });

      const result = await signInWithEmailAndPassword(auth, email, password);

      // Obtener el perfil del usuario y actualizar el último inicio de sesión
      const userProfileResult = await getUserProfileByEmail(loginCompanyId, email);

      if (userProfileResult.success && userProfileResult.profile) {
        // Si es superadmin, no actualizar el último login ya que puede no tener perfil en la compañía
        if (userProfileResult.isSuperAdmin) {
          logger.info('Super administrador detectado, omitiendo actualización de último login', null,
            { prefix: 'AuthContext.login' });
        } else {
          // Para usuarios normales, actualizar el último login
          await updateLastLogin(loginCompanyId, result.user.uid);
        }
      } else {
        logger.error(`Perfil de usuario no encontrado en compañía ${loginCompanyId}`, userProfileResult.error,
          { prefix: 'AuthContext.login' });
        // Podríamos lanzar un error aquí o manejarlo de otra forma
      }

      return result;
    } catch (error) {
      logger.error('Error en login', error, { prefix: 'AuthContext.login' });
      throw error;
    }
  }

  function signup(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function loginAnonymously() {
    return signInAnonymously(auth);
  }

  function logout() {
    setUserProfile(null);
    setUserRole(null);
    return signOut(auth);
  }

  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  function updateUserEmail(email: string) {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    return updateEmail(currentUser, email);
  }

  function updateUserPassword(password: string) {
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }
    return updatePassword(currentUser, password);
  }
  
  // Verificar si el usuario actual es super admin
  function isSuperAdmin() {
    if (!currentUser) return false;
    
    // Primero verificar la lista ADMIN_UIDS (método rápido)
    if (ADMIN_UIDS.includes(currentUser.uid)) {
      return true;
    }
    
    // Si no está en la lista, verificar el rol del perfil de usuario (si existe)
    if (userProfile && userProfile.role === UserRole.SUPER_ADMIN) {
      return true;
    }
    
    // Por defecto, no es super admin
    return false;
  }
  
  // Cambiar entre empresas (solo para super admin)
  async function switchCompany(targetCompanyId: string) {
    // Verificar si es super admin
    if (!isSuperAdmin()) {
      logger.warn('Intento de cambio de empresa por un usuario no autorizado', null, 
        { prefix: 'AuthContext', userId: currentUser?.uid });
      return false;
    }
    
    try {
      // Guardar selección en localStorage para persistencia
      localStorage.setItem('selectedCompanyId', targetCompanyId);
      
      // Actualizar contexto
      setCompanyId(targetCompanyId);
      
      // Recargar perfil de usuario con la nueva empresa
      await refreshUserProfile();
      
      logger.info(`Empresa cambiada a: ${targetCompanyId}`, null, 
        { prefix: 'AuthContext', userId: currentUser?.uid });
      
      return true;
    } catch (error) {
      logger.error('Error al cambiar de empresa', error, 
        { prefix: 'AuthContext', userId: currentUser?.uid });
      return false;
    }
  }
  
  // Recargar el perfil del usuario
  async function refreshUserProfile() {
    if (!currentUser || !currentUser.email) return;

    try {
      // Usar detección directa para el companyId más preciso
      const refreshCompanyId = detectedCompanyId || companyId;

      logger.info(`Recargando perfil para ${currentUser.email} en compañía ${refreshCompanyId}`, null,
        { prefix: 'AuthContext', userId: currentUser?.uid });

      const userProfileResult = await getUserProfileByEmail(refreshCompanyId, currentUser.email);

      if (userProfileResult.success && userProfileResult.profile) {
        logger.info(`Perfil encontrado para ${currentUser.email} con rol ${userProfileResult.profile.role}`, null,
          { prefix: 'AuthContext', userId: currentUser?.uid });
        setUserProfile(userProfileResult.profile);
        setUserRole(userProfileResult.profile.role as UserRole);
      } else if (userProfileResult.isSuperAdmin) {
        // Si es super admin pero no tiene perfil en la empresa actual
        // establecer perfil mínimo con rol super admin
        logger.info(`Super Admin sin perfil en ${refreshCompanyId}, creando perfil básico`, null,
          { prefix: 'AuthContext', userId: currentUser?.uid });
        setUserProfile({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Super Admin',
          role: UserRole.SUPER_ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          company: refreshCompanyId
        });
        setUserRole(UserRole.SUPER_ADMIN);
      } else {
        // Si no hay perfil y no es super admin, limpiar
        logger.warn(`Usuario ${currentUser.email} no tiene perfil en compañía ${refreshCompanyId}`, null,
          { prefix: 'AuthContext', userId: currentUser?.uid });
        setUserProfile(null);
        setUserRole(null);
      }
    } catch (error) {
      logger.error('Error al recargar perfil de usuario', error,
        { prefix: 'AuthContext', userId: currentUser?.uid });
      // No cambiamos el estado para mantener lo que ya teníamos
    }
  }

  // Modo demo controlado por variable de entorno
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  
  // REMOVIDO: Efecto para actualizar companyId desde CompanyContext
  // Ahora priorizamos la detección directa de subdominios para evitar warnings
  // useEffect(() => {
  //   if (companyContext && companyContext.companyId && companyContext.companyId !== companyId) {
  //     logger.info(`Actualizando companyId en AuthContext de ${companyId} a ${companyContext.companyId}`, null,
  //       { prefix: 'AuthContext' });
  //     setCompanyId(companyContext.companyId);
  //   }
  // }, [companyContext, companyId]);

  useEffect(() => {
    // Verificar si el modo demo está activo
    if (DEMO_MODE) {
      logger.warn('Modo DEMO activado: usando usuario demo', null, { prefix: 'AuthContext' });

      // Crear un objeto user demo
      const demoUser = {
        uid: 'demo-user-123',
        email: 'demo@canaletica.com',
        displayName: 'Usuario Demo',
        // Otros campos necesarios
        emailVerified: true,
        isAnonymous: false,
        getIdToken: () => Promise.resolve('fake-token-for-demo-123456'),
        // Métodos básicos simulados
        delete: () => Promise.resolve(),
        reload: () => Promise.resolve(),
        toJSON: () => ({ uid: 'demo-user-123' }),
      } as unknown as User;

      // Crear un perfil demo con permisos de super admin
      const demoProfile = {
        uid: 'demo-user-123',
        email: 'demo@canaletica.com',
        displayName: 'Super Usuario Demo',
        role: UserRole.SUPER_ADMIN, // Acceso total para demo
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        company: companyId
      } as UserProfile;

      // Establecer los estados con los valores demo
      setCurrentUser(demoUser);
      setUserProfile(demoProfile);
      setUserRole(UserRole.SUPER_ADMIN); // Acceso total para demo
      setLoading(false);
      return;
    }

    // Comportamiento normal (no demo)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Obtener el perfil del usuario de Firestore
          // Solo intentar obtener el perfil si el usuario tiene un email
          if (user.email) {
            // Usar detección directa para mayor precisión de companyId
            const currentCompanyId = detectedCompanyId || companyId;
            logger.info(`Cargando perfil para ${user.email} en compañía ${currentCompanyId}`, null,
              { prefix: 'AuthContext' });

            const userProfileResult = await getUserProfileByEmail(currentCompanyId, user.email);

            if (userProfileResult.success && userProfileResult.profile) {
              // Verificar si el usuario es un super admin definido por UID
              if (ADMIN_UIDS.includes(user.uid)) {
                logger.info(`Usuario ${user.email} es un SUPER_ADMIN por UID`, null, { prefix: 'AuthContext' });
                // Garantizar que siempre tenga acceso como SUPER_ADMIN independientemente del perfil
                const superAdminProfile = {
                  ...userProfileResult.profile,
                  role: UserRole.SUPER_ADMIN
                };
                setUserProfile(superAdminProfile);
                setUserRole(UserRole.SUPER_ADMIN);
              } else {
                // Usuario normal, usar su rol asignado
                setUserProfile(userProfileResult.profile);
                setUserRole(userProfileResult.profile.role);
              }
            } else {
              logger.error(`Error al cargar perfil de usuario en compañía ${currentCompanyId}:`, userProfileResult.error);
              setUserProfile(null);
              setUserRole(null);
            }
          } else {
            // Usuario sin email (posiblemente anónimo)
            logger.info('Usuario sin email detectado', null, { prefix: 'AuthContext' });
            setUserProfile(null);
            setUserRole(null);
          }
        } catch (error) {
          logger.error('Error al cargar datos de usuario:', error);
          setUserProfile(null);
          setUserRole(null);
        }
      } else {
        setUserProfile(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, DEMO_MODE]);

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    signup,
    loginAnonymously,
    logout,
    resetPassword,
    updateUserEmail,
    updateUserPassword,
    userRole,
    companyId,
    // Nuevas funciones
    isSuperAdmin,
    switchCompany,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}