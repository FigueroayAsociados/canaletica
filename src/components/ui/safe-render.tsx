'use client';

// src/components/ui/safe-render.tsx

import React from 'react';

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
 */
export const isSuperAdminByRole = (profile: any): boolean => {
  return profile?.role === 'super_admin';
};