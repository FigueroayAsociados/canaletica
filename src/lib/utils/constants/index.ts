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

// Estados de informes en español (compatibilidad con legacy)
export enum ReportStatusSpanish {
  NUEVO = 'Nuevo',
  ADMITIDA = 'Admitida',
  ASIGNADA = 'Asignada',
  PENDIENTE = 'Pendiente',
  EN_SEGUIMIENTO = 'En Seguimiento',
  RESUELTA = 'Resuelta',
  CERRADA = 'Cerrada'
}

// Estados de revisión
export enum ReviewStatus {
  NEEDS_REVIEW = 'needs_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_CHANGES = 'needs_changes'
}

// Estados de recomendaciones
export enum RecommendationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  VERIFIED = 'verified'
}

// Estados de procesamiento
export enum ProcessingStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// Estados de archivos
export enum FileStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error'
}

// Valores por defecto para nuevos usuarios
export const DEFAULT_USER_VALUES = {
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};