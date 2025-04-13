// src/lib/utils/constants/index.ts

// Admin UIDs - Para propósitos de desarrollo/testing en entorno local
// Agregar algunos UIDs temporales para desarrollo hasta implementar la colección super_admins
export const ADMIN_UIDS = process.env.NEXT_PUBLIC_ADMIN_UIDS 
  ? process.env.NEXT_PUBLIC_ADMIN_UIDS.split(',') 
  : [
      // UIDs confirmados
      'XjNEBVYlHraTehR9ObKawHuUffm1', // rfigueroaf@gmail.com (Super Admin)
      // Puedes agregar más UIDs aquí si es necesario
    ];

// Compañía por defecto
export const DEFAULT_COMPANY_ID = 'default';

// Roles de usuario
export enum UserRole {
  ADMIN = 'admin',
  INVESTIGATOR = 'investigator',
  USER = 'user',
  SUPER_ADMIN = 'super_admin' // Rol especial con acceso total
}

// Estados de informes
export enum ReportStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  INVESTIGATION = 'investigation',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

// Valores por defecto para nuevos usuarios
export const DEFAULT_USER_VALUES = {
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};