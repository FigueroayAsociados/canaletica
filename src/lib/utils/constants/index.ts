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

// Detectar si estamos en entorno de Vercel Preview
export const isVercelPreview = typeof window !== 'undefined' && 
  window.location.hostname.includes('vercel.app') &&
  (window.location.hostname.startsWith('canaletica-') || 
   window.location.hostname.includes('-ricardo-figueroas-projects-'));

// Si estamos en Vercel Preview, añadir cualquier UID actual como admin para facilitar pruebas
if (isVercelPreview && typeof window !== 'undefined') {
  // Esta función se ejecutará solo en el cliente
  console.info('🔧 ENTORNO VERCEL PREVIEW DETECTADO: Habilitando modo de prueba para cualquier usuario autenticado');
}

// Compañía por defecto
export const DEFAULT_COMPANY_ID = 'default';

// Información de contacto
export const SUPPORT_EMAIL = 'soporte@canaletica.cl';
export const COMPANY_DOMAIN = 'canaletica.cl';

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