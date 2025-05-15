// src/lib/utils/dateUtils.ts

/**
 * Utilidades para manejo de fechas, incluyendo formateo, 
 * cálculo de días hábiles y manipulación de fechas
 */

/**
 * Tipos de días hábiles
 */
export enum BusinessDayType {
  /**
   * Día hábil laboral/judicial (lunes a sábado, sin festivos)
   */
  WORKING = 'working',
  
  /**
   * Día hábil administrativo (lunes a viernes, sin festivos)
   */
  ADMINISTRATIVE = 'administrative'
}

// Lista de feriados chilenos (actualizar cada año)
// Formato: 'AAAA-MM-DD'
export const CHILEAN_HOLIDAYS = [
  // 2025
  '2025-01-01', // Año Nuevo
  '2025-04-18', // Viernes Santo
  '2025-04-19', // Sábado Santo
  '2025-05-01', // Día del Trabajo
  '2025-05-21', // Día de las Glorias Navales
  '2025-06-29', // San Pedro y San Pablo
  '2025-07-16', // Virgen del Carmen
  '2025-08-15', // Asunción de la Virgen
  '2025-09-18', // Independencia Nacional
  '2025-09-19', // Fiestas Patrias
  '2025-10-12', // Encuentro de Dos Mundos
  '2025-10-31', // Día de las Iglesias Evangélicas
  '2025-11-01', // Día de Todos los Santos
  '2025-12-08', // Inmaculada Concepción
  '2025-12-25', // Navidad
  // 2024
  '2024-01-01', // Año Nuevo
  '2024-03-29', // Viernes Santo
  '2024-03-30', // Sábado Santo
  '2024-05-01', // Día del Trabajo
  '2024-05-21', // Día de las Glorias Navales
  '2024-06-29', // San Pedro y San Pablo
  '2024-07-16', // Virgen del Carmen
  '2024-08-15', // Asunción de la Virgen
  '2024-09-18', // Independencia Nacional
  '2024-09-19', // Fiestas Patrias
  '2024-10-12', // Encuentro de Dos Mundos
  '2024-10-31', // Día de las Iglesias Evangélicas
  '2024-11-01', // Día de Todos los Santos
  '2024-12-08', // Inmaculada Concepción
  '2024-12-25', // Navidad
];

/**
 * Convierte un valor de fecha (que puede ser Timestamp, Date, string, etc.) a un objeto Date
 * @param date Valor a convertir
 * @returns Objeto Date o null si el valor es inválido
 */
export function toDate(date: any): Date | null {
  if (!date) return null;
  
  try {
    // Si es un Timestamp de Firestore con método toDate()
    if (date.toDate && typeof date.toDate === 'function') {
      return new Date(date.toDate());
    }
    
    // Si ya es un objeto Date
    if (date instanceof Date) {
      return date;
    }
    
    // Si es un string o número, intentar convertir a Date
    return new Date(date);
  } catch (error) {
    console.error('Error converting to Date:', error);
    return null;
  }
}

/**
 * Formatea una fecha en formato chileno (DD/MM/YYYY)
 * @param date Fecha a formatear
 * @param includeTime Si se debe incluir la hora (default: false)
 * @returns Fecha formateada
 */
export function formatChileanDate(date: Date, includeTime: boolean = false): string {
  if (!date) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  const datePart = `${day}/${month}/${year}`;
  
  if (!includeTime) {
    return datePart;
  }
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * Convierte una fecha en formato chileno (DD/MM/YYYY) a objeto Date
 * @param dateString Fecha en formato chileno (DD/MM/YYYY)
 * @returns Objeto Date
 */
export function parseChileanDate(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }
  
  // Aceptar tanto formato DD/MM/YYYY como DD-MM-YYYY
  const parts = dateString.split(/[\/\-]/);
  
  if (parts.length !== 3) {
    console.error('Formato de fecha inválido. Debe ser DD/MM/YYYY o DD-MM-YYYY');
    return new Date();
  }
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-11
  const year = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

/**
 * Verifica si una fecha es un feriado en Chile
 * @param date Fecha a verificar
 * @returns true si es feriado, false en caso contrario
 */
export function isChileanHoliday(date: Date): boolean {
  const dateString = date.toISOString().split('T')[0]; // Formato AAAA-MM-DD
  return CHILEAN_HOLIDAYS.includes(dateString);
}

/**
 * Calcula si una fecha es un día hábil según el tipo especificado
 * @param date Fecha a verificar
 * @param type Tipo de día hábil (administrativo o laboral/judicial)
 * @returns true si es día hábil, false en caso contrario
 */
export function isBusinessDay(
  date: Date, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE
): boolean {
  const dayOfWeek = date.getDay();
  
  if (isChileanHoliday(date)) {
    return false;
  }
  
  if (type === BusinessDayType.ADMINISTRATIVE) {
    // Días hábiles administrativos: lunes (1) a viernes (5)
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  } else {
    // Días hábiles laborales/judiciales: lunes (1) a sábado (6)
    return dayOfWeek >= 1 && dayOfWeek <= 6;
  }
}

/**
 * Añade un número específico de días hábiles a una fecha
 * @param date Fecha inicial
 * @param days Número de días hábiles a añadir
 * @param type Tipo de día hábil (administrativo o laboral/judicial)
 * @returns Nueva fecha con los días hábiles añadidos
 */
export function addBusinessDays(
  date: Date, 
  days: number, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE
): Date {
  let result = new Date(date);
  let count = 0;
  
  while (count < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result, type)) {
      count++;
    }
  }
  
  return result;
}

/**
 * Calcula el número de días hábiles entre dos fechas
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @param type Tipo de día hábil (administrativo o laboral/judicial)
 * @returns Número de días hábiles entre las dos fechas
 */
export function getBusinessDaysCount(
  startDate: Date, 
  endDate: Date, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE
): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  
  while (curDate <= endDate) {
    if (isBusinessDay(curDate, type)) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  
  return count;
}

/**
 * Calcula la fecha límite en días hábiles a partir de una fecha
 * @param startDate Fecha de inicio
 * @param businessDays Número de días hábiles
 * @param type Tipo de día hábil (administrativo o laboral/judicial)
 * @returns Fecha límite
 */
export function calculateDeadline(
  startDate: Date, 
  businessDays: number, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE
): Date {
  return addBusinessDays(startDate, businessDays, type);
}

/**
 * Verifica si una fecha límite está próxima a vencer o ya venció
 * @param deadline Fecha límite
 * @param type Tipo de día hábil (administrativo o laboral/judicial)
 * @param warningDays Días de anticipación para advertencia (default: 3)
 * @returns Objeto con estado de vencimiento
 */
export function checkDeadlineStatus(
  deadline: Date, 
  type: BusinessDayType = BusinessDayType.ADMINISTRATIVE,
  warningDays: number = 3
) {
  const now = new Date();
  
  // Si la fecha ya pasó
  if (now > deadline) {
    return {
      status: 'expired',
      daysOverdue: getBusinessDaysCount(deadline, now, type),
      message: 'Plazo vencido'
    };
  }
  
  // Días hábiles restantes
  const daysRemaining = getBusinessDaysCount(now, deadline, type);
  
  // Si está próximo a vencer
  if (daysRemaining <= warningDays) {
    return {
      status: 'warning',
      daysRemaining,
      message: `${daysRemaining} día(s) hábil(es) restante(s)`
    };
  }
  
  // En plazo normal
  return {
    status: 'ok',
    daysRemaining,
    message: `${daysRemaining} día(s) hábil(es) restante(s)`
  };
}

/**
 * Formatea una fecha en formato español chileno (día/mes/año)
 * @param date Fecha a formatear (puede ser Timestamp, Date, string, etc.)
 * @param options Opciones de formato (por defecto incluye día, mes, año)
 * @param defaultValue Valor por defecto si la fecha es inválida
 * @returns String con la fecha formateada
 */
export function formatDate(
  date: any, 
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  },
  defaultValue: string = 'N/A'
): string {
  const dateObj = toDate(date);
  if (!dateObj) return defaultValue;
  
  try {
    return new Intl.DateTimeFormat('es-CL', options).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return defaultValue;
  }
}

/**
 * Formatea una fecha en formato completo (día/mes/año con hora y minutos)
 * @param date Fecha a formatear
 * @param defaultValue Valor por defecto si la fecha es inválida
 * @returns String con la fecha y hora formateada
 */
export function formatDateTime(date: any, defaultValue: string = 'N/A'): string {
  return formatDate(
    date, 
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    defaultValue
  );
}

/**
 * Formatea una fecha en formato corto (dd/mm/aaaa)
 * @param date Fecha a formatear
 * @param defaultValue Valor por defecto si la fecha es inválida
 * @returns String con la fecha en formato corto
 */
export function formatShortDate(date: any, defaultValue: string = 'N/A'): string {
  return formatDate(
    date, 
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },
    defaultValue
  );
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param date1 Primera fecha
 * @param date2 Segunda fecha (por defecto es la fecha actual)
 * @returns Número de días de diferencia (positivo si date1 > date2, negativo si date1 < date2)
 */
export function daysBetween(date1: any, date2: any = new Date()): number {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  
  if (!d1 || !d2) return 0;
  
  // Normalizar fechas a medianoche para una comparación justa
  const normalized1 = new Date(d1);
  normalized1.setHours(0, 0, 0, 0);
  
  const normalized2 = new Date(d2);
  normalized2.setHours(0, 0, 0, 0);
  
  // Calcular diferencia en días
  const diffTime = normalized1.getTime() - normalized2.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Verifica si una fecha está en el pasado
 * @param date Fecha a verificar
 * @returns true si la fecha está en el pasado
 */
export function isPast(date: any): boolean {
  const dateObj = toDate(date);
  if (!dateObj) return false;
  
  return dateObj < new Date();
}

/**
 * Verifica si una fecha está en el futuro
 * @param date Fecha a verificar
 * @returns true si la fecha está en el futuro
 */
export function isFuture(date: any): boolean {
  const dateObj = toDate(date);
  if (!dateObj) return false;
  
  return dateObj > new Date();
}

/**
 * Obtiene texto relativo para una fecha (ej: "hace 2 días", "en 3 días")
 * @param date Fecha a evaluar
 * @param referenceDate Fecha de referencia (por defecto es la fecha actual)
 * @returns Texto relativo
 */
export function getRelativeTimeText(date: any, referenceDate: any = new Date()): string {
  const dateObj = toDate(date);
  if (!dateObj) return 'Fecha inválida';
  
  const days = daysBetween(dateObj, referenceDate);
  
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  
  if (days > 0) {
    if (days < 30) return `En ${days} días`;
    if (days < 60) return `En 1 mes`;
    return `En ${Math.floor(days / 30)} meses`;
  } else {
    const absDays = Math.abs(days);
    if (absDays < 30) return `Hace ${absDays} días`;
    if (absDays < 60) return `Hace 1 mes`;
    return `Hace ${Math.floor(absDays / 30)} meses`;
  }
}