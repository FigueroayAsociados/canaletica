// src/lib/utils/roleUtils.ts

import { UserRole } from './constants';

/**
 * Utilidades para manejo de roles de usuario
 */

/**
 * Verifica si un usuario es Super Admin
 * @param role Rol del usuario
 * @param userId ID del usuario (opcional, para verificaciones adicionales)
 * @returns true si el usuario es Super Admin
 */
export function isSuperAdmin(
  role?: string | null,
  userId?: string | null
): boolean {
  if (!role && !userId) return false;
  
  // Verificación estricta solo por rol - Sin bypass por ID por seguridad
  if (role === UserRole.SUPER_ADMIN || role === 'super_admin') return true;
  
  return false;
}

/**
 * Verifica si un usuario es Admin (incluyendo Super Admin)
 * @param role Rol del usuario
 * @param isSuperAdminUser Indica si el usuario ya ha sido verificado como Super Admin
 * @returns true si el usuario es Admin o Super Admin
 */
export function isAdmin(
  role?: string | null,
  isSuperAdminUser: boolean = false
): boolean {
  if (isSuperAdminUser) return true;
  if (!role) return false;
  
  return role === UserRole.ADMIN || 
         role === 'admin' || 
         isSuperAdmin(role);
}

/**
 * Verifica si un usuario es Investigador (incluyendo Admin y Super Admin)
 * @param role Rol del usuario
 * @param isAdminUser Indica si el usuario ya ha sido verificado como Admin
 * @param isSuperAdminUser Indica si el usuario ya ha sido verificado como Super Admin
 * @returns true si el usuario es Investigador, Admin o Super Admin
 */
export function isInvestigator(
  role?: string | null,
  isAdminUser: boolean = false,
  isSuperAdminUser: boolean = false
): boolean {
  if (isAdminUser || isSuperAdminUser) return true;
  if (!role) return false;
  
  return role === UserRole.INVESTIGATOR || 
         role === 'investigator' || 
         isAdmin(role);
}

/**
 * Obtiene el rol de usuario de manera normalizada según el enum UserRole
 * @param role Rol en formato string
 * @returns Rol normalizado según el enum UserRole, o null si no es válido
 */
export function getNormalizedRole(role?: string | null): UserRole | null {
  if (!role) return null;
  
  const lowerRole = role.toLowerCase();
  
  switch (lowerRole) {
    case 'super_admin':
    case 'superadmin':
      return UserRole.SUPER_ADMIN;
    case 'admin':
    case 'administrator':
      return UserRole.ADMIN;
    case 'investigator':
    case 'investigador':
      return UserRole.INVESTIGATOR;
    case 'user':
    case 'usuario':
      return UserRole.USER;
    default:
      return null;
  }
}

/**
 * Verifica si un usuario tiene un permiso específico
 * @param role Rol del usuario
 * @param permission Permiso a verificar
 * @param permissions Lista de permisos del usuario
 * @param isSuperAdminUser Indica si el usuario ya ha sido verificado como Super Admin
 * @returns true si el usuario tiene el permiso
 */
export function hasPermission(
  role?: string | null,
  permission?: string | null,
  permissions?: string[] | null,
  isSuperAdminUser: boolean = false
): boolean {
  // Si no hay permiso a verificar, no tiene sentido continuar
  if (!permission) return true;
  
  // Superadmins tienen todos los permisos
  if (isSuperAdminUser || isSuperAdmin(role)) return true;
  
  // Los admins tienen todos los permisos
  if (isAdmin(role)) return true;
  
  // Verificar permisos específicos
  return permissions?.includes(permission) ?? false;
}