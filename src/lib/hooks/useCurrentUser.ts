// src/lib/hooks/useCurrentUser.ts

import { useState, useEffect, useContext } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserProfileById } from '@/lib/services/userService';
import { CompanyContext } from '@/lib/contexts/CompanyContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface UserProfile {
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions?: string[];
  photoURL?: string;
  department?: string;
  position?: string;
  createdAt: any;
  updatedAt?: any;
  lastLogin?: any;
}

interface CurrentUser {
  uid: string;
  email: string | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isInvestigator: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
}

/**
 * Hook personalizado para obtener el usuario actual con su perfil
 */
export function useCurrentUser(): CurrentUser {
  const { currentUser } = useAuth();
  const companyContext = useContext(CompanyContext);
  
  // Obtener la compañía directamente del contexto con manejo de errores
  const getCompanyId = () => {
    try {
      if (companyContext && companyContext.companyId) {
        console.log(`[useCurrentUser] Obtenido companyId desde Context: ${companyContext.companyId}`);
        return companyContext.companyId;
      }
    } catch (error) {
      console.error('[useCurrentUser] Error al acceder a CompanyContext:', error);
    }
    
    // Intentar detectar el subdominio directamente como fallback
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost') {
        const hostParts = hostname.split('.');
        const subdomain = hostParts[0].toLowerCase();

        if (subdomain !== 'www' &&
            subdomain !== 'canaletic' &&
            subdomain !== 'canaletica' &&
            hostParts.length > 1) {
          console.warn(`[useCurrentUser] Fallback: usando subdominio "${subdomain}" detectado de URL`);
          return subdomain;
        }
      }
    }
    
    return 'default';
  };
  
  const companyIdFromContext = getCompanyId();

  const [companyId] = useState<string>(companyIdFromContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
    const isMountedRef = { current: true };
    
    async function fetchUserProfile() {
      // Si no hay usuario, limpiar estado y salir
      if (!currentUser) {
        console.log('[useCurrentUser] No hay usuario autenticado');
        if (isMountedRef.current) {
          setProfile(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
        return;
      }
      
      // Verificar que uid exista
      if (!currentUser.uid) {
        console.error('[useCurrentUser] Usuario autenticado sin UID válido');
        if (isMountedRef.current) {
          setError('Error de autenticación: ID de usuario no disponible');
          setProfile(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
        return;
      }
      
      try {
        // Determinar la compañía correcta
        let targetCompanyId = companyId;
        
        // Verificar subdominio como medida de seguridad
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          const hostParts = hostname.split('.');
          const subdomain = hostParts[0]?.toLowerCase();
          
          // Si es un subdominio específico diferente al companyId actual
          if (subdomain && 
              subdomain !== 'www' &&
              subdomain !== 'localhost' &&
              subdomain !== 'canaletica' &&
              subdomain !== 'canaletic' &&
              subdomain !== 'default' &&
              subdomain !== targetCompanyId) {
            console.warn(`*** CORRECCIÓN DE SEGURIDAD: Detectado subdominio ${subdomain} diferente de companyId=${targetCompanyId} ***`);
            targetCompanyId = subdomain;
          }
        }
        
        // Verificar si es super admin
        const superAdminRef = doc(db, `super_admins/${currentUser.uid}`);
        const superAdminSnap = await getDoc(superAdminRef);
        
        if (superAdminSnap.exists()) {
          if (isMountedRef.current) {
            setIsSuperAdmin(true);
            setProfile({
              displayName: currentUser.displayName || 'Super Administrador',
              email: currentUser.email || '',
              role: 'super_admin',
              isActive: true,
              permissions: ['*'],
              createdAt: new Date()
            });
            setIsLoading(false);
          }
          return;
        }
        
        // Buscar perfil de usuario normal
        console.log(`[useCurrentUser] Buscando perfil para UID ${currentUser.uid} en ${targetCompanyId}`);
        const result = await getUserProfileById(targetCompanyId, currentUser.uid);
        
        if (result.success && result.profile) {
          if (isMountedRef.current) {
            setProfile(result.profile);
            setIsSuperAdmin(false);
          }
        } else {
          // El perfil no se encuentra en esta compañía
          // Buscar en qué compañía está el usuario para redirigir
          console.warn(`No se encontró perfil para UID ${currentUser.uid} en compañía ${targetCompanyId}`);
          
          // Importar findUserCompany de forma dinámica para evitar problemas de dependencias circulares
          const { findUserCompany } = await import('@/lib/services/userService');
          
          // Buscar a qué compañía pertenece este usuario
          const companyResult = await findUserCompany(currentUser.uid);
          
          if (companyResult.success && companyResult.companyId) {
            // Si encontramos la compañía y estamos en el cliente, redirigir al subdominio correcto
            if (typeof window !== 'undefined' && companyResult.companyId !== 'super_admin') {
              const currentHostname = window.location.hostname;
              
              // Verificar si estamos en un subdominio que no coincide con la compañía del usuario
              if (!currentHostname.startsWith(companyResult.companyId + '.')) {
                // Mostrar mensaje más descriptivo
                if (isMountedRef.current) {
                  setError(`Redirigiendo al subdominio correcto: ${companyResult.companyId}.canaletic.app`);
                }
                
                // Construir la URL del subdominio correcto
                const protocol = window.location.protocol;
                const path = window.location.pathname;
                const search = window.location.search;
                const newUrl = `${protocol}//${companyResult.companyId}.canaletic.app${path}${search}`;
                
                console.log(`🔄 Redirigiendo a: ${newUrl}`);
                
                // Redirigir después de un breve retraso para permitir que se muestre el mensaje
                setTimeout(() => {
                  window.location.href = newUrl;
                }, 1500);
                
                return;
              }
            }
          }
          
          // Si no se pudo redirigir o no se encontró la compañía, mostrar error
          if (isMountedRef.current) {
            setError('Usuario no tiene perfil en el sistema o está intentando acceder desde un dominio incorrecto');
            setProfile(null);
            setIsSuperAdmin(false);
          }
        }
      } catch (error) {
        console.error('Error al cargar perfil de usuario:', error);
        if (isMountedRef.current) {
          setError('Error al cargar perfil de usuario');
          setProfile(null);
          setIsSuperAdmin(false);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }
    
    fetchUserProfile();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [currentUser, companyId]);

  // Determinar los roles del usuario
  // Si es super admin, también tiene los roles de admin e investigador
  const isAdmin = (isSuperAdmin || profile?.role === 'admin') && (isSuperAdmin || profile?.isActive);
  const isInvestigator = (isSuperAdmin || profile?.role === 'investigator') && (isSuperAdmin || profile?.isActive);

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (permission: string): boolean => {
    // Super admins tienen todos los permisos
    if (isSuperAdmin) return true;
    
    if (!profile || !profile.isActive) return false;
    
    // Administradores tienen todos los permisos
    if (profile.role === 'admin') return true;
    
    // Verificar permisos específicos
    return profile.permissions?.includes(permission) ?? false;
  };

  // Asegurar que uid no sea undefined
  const safeUid = currentUser ? currentUser.uid : '';
  
  return {
    uid: safeUid,
    email: currentUser?.email || null,
    profile,
    isAdmin,
    isInvestigator,
    isSuperAdmin,
    isLoading,
    error,
    hasPermission,
  };
}