// Archivo de índice para exportar todos los hooks personalizados
// Esto simplifica las importaciones en otros archivos

// IMPORTANTE: No importar useCurrentUser, useAlerts, useFeatureFlags, useReporting
// desde este archivo para evitar dependencias circulares.
// En su lugar, importarlos directamente desde sus archivos correspondientes.

// Hooks de autenticación
export * from './useAuth';
// export * from './useCurrentUser'; // Importar directamente

// Hooks de reportes
export * from './useReports';
// export * from './useReporting'; // Importar directamente

// Hooks de configuración
export * from './useConfig';

// Hooks de documentos
export * from './useDocuments';

// Hook adaptador para CompanyContext
export * from './useCompany'; // Restaurado por compatibilidad