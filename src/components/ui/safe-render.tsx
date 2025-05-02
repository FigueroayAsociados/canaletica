'use client';

import React from 'react';

/**
 * Componente de utilidad que renderiza su contenido solo cuando la condición es verdadera
 * Ayuda a prevenir errores de renderizado por props undefined o null
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
 */
export const isSuperAdminByRole = (profile: any): boolean => {
  return profile?.role === 'super_admin';
};