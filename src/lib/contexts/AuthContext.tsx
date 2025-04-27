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
  const [companyId, setCompanyId] = useState<string>(DEFAULT_COMPANY_ID);

  async function login(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Obtener el perfil del usuario y actualizar el último inicio de sesión
      const userProfileResult = await getUserProfileByEmail(companyId, email);
      
      if (userProfileResult.success && userProfileResult.profile) {
        // Si es superadmin, no actualizar el último login ya que puede no tener perfil en la compañía
        if (userProfileResult.isSuperAdmin) {
          console.log('Super administrador detectado, omitiendo actualización de último login');
        } else {
          // Para usuarios normales, actualizar el último login
          await updateLastLogin(companyId, result.user.uid);
        }
      } else {
        console.error('Perfil de usuario no encontrado', userProfileResult.error);
        // Podríamos lanzar un error aquí o manejarlo de otra forma
      }
      
      return result;
    } catch (error) {
      console.error('Error en login:', error);
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

  // Modo demo controlado por variable de entorno
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  
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
            const userProfileResult = await getUserProfileByEmail(companyId, user.email);
            
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
              logger.error('Error al cargar perfil de usuario:', userProfileResult.error);
              setUserProfile(null);
              setUserRole(null);
            }
          } else {
            // Usuario sin email (posiblemente anónimo)
            console.log('Usuario sin email detectado');
            setUserProfile(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error al cargar datos de usuario:', error);
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
  }, [companyId]);

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
    companyId
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}