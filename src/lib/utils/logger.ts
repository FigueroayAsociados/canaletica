/**
 * Sistema de logging estructurado para CanalEtica
 * Reemplaza los console.log directos con un sistema que puede desactivarse en producción
 */

// Determinar si estamos en modo desarrollo o producción
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

// Configuración del logger
const config = {
  // Solo mostrar logs en desarrollo por defecto
  showLogs: isDevelopment,
  // Nivel mínimo de logs a mostrar (debug | info | warn | error)
  level: isDevelopment ? 'debug' : 'warn',
};

// Interfaz para parámetros adicionales
interface LogOptions {
  // Añadir un prefijo al mensaje
  prefix?: string;
  // Tags para categorizar logs
  tags?: string[];
}

/**
 * Logger estructurado para la aplicación
 */
export const logger = {
  /**
   * Registra un mensaje de depuración (solo visible en desarrollo)
   */
  debug: (message: string, data?: any, options?: LogOptions) => {
    if (!config.showLogs || !['debug'].includes(config.level)) return;
    console.log(
      `%c[DEBUG]${options?.prefix ? ` [${options.prefix}]` : ''}${options?.tags ? ` [${options.tags.join(', ')}]` : ''}`,
      'color: #6c757d',
      message,
      data !== undefined ? data : ''
    );
  },

  /**
   * Registra un mensaje informativo
   */
  info: (message: string, data?: any, options?: LogOptions) => {
    if (!config.showLogs || !['debug', 'info'].includes(config.level)) return;
    console.log(
      `%c[INFO]${options?.prefix ? ` [${options.prefix}]` : ''}${options?.tags ? ` [${options.tags.join(', ')}]` : ''}`,
      'color: #0d6efd',
      message,
      data !== undefined ? data : ''
    );
  },

  /**
   * Registra una advertencia
   */
  warn: (message: string, data?: any, options?: LogOptions) => {
    if (!config.showLogs || !['debug', 'info', 'warn'].includes(config.level)) return;
    console.warn(
      `%c[WARN]${options?.prefix ? ` [${options.prefix}]` : ''}${options?.tags ? ` [${options.tags.join(', ')}]` : ''}`,
      'color: #ffc107',
      message,
      data !== undefined ? data : ''
    );
  },

  /**
   * Registra un error
   */
  error: (message: string, error?: any, options?: LogOptions) => {
    if (!config.showLogs || !['debug', 'info', 'warn', 'error'].includes(config.level)) return;
    console.error(
      `%c[ERROR]${options?.prefix ? ` [${options.prefix}]` : ''}${options?.tags ? ` [${options.tags.join(', ')}]` : ''}`,
      'color: #dc3545',
      message,
      error !== undefined ? error : ''
    );
  },

  /**
   * Registra una operación de Firebase
   */
  firebase: (operation: string, path: string, data?: any) => {
    if (!config.showLogs || !['debug', 'info'].includes(config.level)) return;
    console.log(
      `%c[FIREBASE] [${operation}]`,
      'color: #ff9800',
      path,
      data !== undefined ? data : ''
    );
  },

  /**
   * Configura las opciones del logger
   */
  configure: (options: Partial<typeof config>) => {
    Object.assign(config, options);
  },
};