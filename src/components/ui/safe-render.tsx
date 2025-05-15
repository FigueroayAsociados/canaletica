'use client';

// src/components/ui/safe-render.tsx

import React from 'react';
import { logger } from '@/lib/utils/logger';

/**
 * Interfaz para el perfil de usuario
 */
export interface UserProfile {
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  isActive?: boolean;
  companyId?: string;
  photoURL?: string;
  createdAt?: Date | { seconds: number; nanoseconds: number };
  lastLogin?: Date | { seconds: number; nanoseconds: number };
  permissions?: string[];
}

/**
 * Componente de utilidad que renderiza condicionalmente su contenido
 * solo cuando la condición proporcionada es verdadera.
 * 
 * Ayuda a prevenir errores del tipo:
 * "Cannot read property 'x' of undefined" (Error React #130)
 * 
 * @param {boolean} condition - La condición que determina si se renderiza el contenido
 * @param {React.ReactNode} children - El contenido a renderizar si la condición es verdadera
 * @param {React.ReactNode} fallback - El contenido a renderizar si la condición es falsa (opcional)
 * @returns {React.ReactElement} El contenido renderizado o fallback
 */
export function SafeRender({
  condition,
  children,
  fallback = null
}: {
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (condition) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}

/**
 * Función para detectar si el usuario es super admin basado en su rol
 * @param profile Perfil de usuario
 * @returns true si el usuario es super admin
 */
export const isSuperAdminByRole = (profile: UserProfile | null): boolean => {
  if (!profile) {
    logger.debug('Perfil de usuario no disponible para verificar super admin', 
      null, 
      { prefix: 'safe-render' }
    );
    return false;
  }
  
  return profile.role === 'super_admin';
};