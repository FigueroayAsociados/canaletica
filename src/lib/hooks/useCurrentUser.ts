// src/lib/hooks/useCurrentUser.ts

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserProfileById } from '@/lib/services/userService';
import { useCompany } from '@/lib/hooks';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
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
  const { companyId } = useCompany();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!currentUser) {
        setProfile(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      let targetCompanyId = companyId;

      // Verificar si estamos en una subdomain específica y usamos el companyId equivocado
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const hostParts = hostname.split('.');
        const subdomain = hostParts[0].toLowerCase();

        // Si el subdomain es un nombre de empresa pero no coincide con el companyId actual
        if (subdomain !== 'www' &&
            subdomain !== 'localhost' &&
            subdomain !== 'canaletica' &&
            subdomain !== 'canaletic' &&
            subdomain !== 'default' &&
            subdomain !== targetCompanyId) {
          console.warn(`*** CORRECCIÓN DE SEGURIDAD: Detectado posible mismatch entre subdominio ${subdomain} y companyId=${targetCompanyId}, priorizando subdominio ***`);
          targetCompanyId = subdomain;
        }
      }

      try {
        // Primero verificar si es un super admin
        const superAdminRef = doc(db, `super_admins/${currentUser.uid}`);
        const superAdminSnap = await getDoc(superAdminRef);

        if (superAdminSnap.exists()) {
          // Es un super admin
          setIsSuperAdmin(true);

          // Crear un perfil con todos los privilegios
          setProfile({
            displayName: currentUser.displayName || 'Super Administrador',
            email: currentUser.email || '',
            role: 'super_admin',
            isActive: true,
            permissions: ['*'], // El comodín indica acceso total
            createdAt: new Date()  // Usar Date en lugar de serverTimestamp para el perfil local
          });

          setIsLoading(false);
          return;
        }

        // Si no es super admin, obtener perfil normal
        console.log(`[useCurrentUser] Buscando perfil para UID ${currentUser.uid} en compañía ${targetCompanyId}`);
        const result = await getUserProfileById(targetCompanyId, currentUser.uid);

        if (result.success && result.profile) {
          console.log(`[useCurrentUser] Perfil encontrado para ${currentUser.uid} en compañía ${targetCompanyId}`);
          setProfile(result.profile);
          setIsSuperAdmin(false);
        } else {
          console.log(`[useCurrentUser] No se encontró perfil para ${currentUser.uid} en compañía ${targetCompanyId}`);

          // Si no se encuentra en targetCompanyId, intentar en mvc específicamente
          if (targetCompanyId !== 'mvc') {
            console.log(`[useCurrentUser] Intentando buscar en mvc como último recurso`);
            const mvcResult = await getUserProfileById('mvc', currentUser.uid);

            if (mvcResult.success && mvcResult.profile) {
              console.log(`[useCurrentUser] Encontrado perfil en compañía mvc`);
              setProfile(mvcResult.profile);
              setIsSuperAdmin(false);
              return;
            }
          }

          setError('Usuario no tiene perfil en el sistema. Contacte al administrador.');
          setProfile(null);
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error('Error al cargar perfil de usuario:', error);
        setError('Error al cargar perfil de usuario');
        setProfile(null);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserProfile();
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

  return {
    uid: currentUser?.uid || '',
    email: currentUser?.email,
    profile,
    isAdmin,
    isInvestigator,
    isSuperAdmin,
    isLoading,
    error,
    hasPermission,
  };
}