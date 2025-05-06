// src/lib/utils/dateUtils.ts

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
 * Verifica si una fecha es un feriado en Chile
 * @param date Fecha a verificar
 * @returns true si es feriado, false en caso contrario
 */
export function isChileanHoliday(date: Date): boolean {
  const dateString = date.toISOString().split('T')[0]; // Formato AAAA-MM-DD
  return CHILEAN_HOLIDAYS.includes(dateString);
}

/**
 * Calcula si una fecha es un día hábil (no es fin de semana ni feriado)
 * @param date Fecha a verificar
 * @returns true si es día hábil, false en caso contrario
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // No es fin de semana (0=domingo, 6=sábado) ni feriado
  return dayOfWeek !== 0 && dayOfWeek !== 6 && !isChileanHoliday(date);
}

/**
 * Añade un número específico de días hábiles a una fecha
 * @param date Fecha inicial
 * @param days Número de días hábiles a añadir
 * @returns Nueva fecha con los días hábiles añadidos
 */
export function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let count = 0;
  
  while (count < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      count++;
    }
  }
  
  return result;
}

/**
 * Calcula el número de días hábiles entre dos fechas
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @returns Número de días hábiles entre las dos fechas
 */
export function getBusinessDaysCount(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  
  while (curDate <= endDate) {
    if (isBusinessDay(curDate)) {
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
 * @returns Fecha límite
 */
export function calculateDeadline(startDate: Date, businessDays: number): Date {
  return addBusinessDays(startDate, businessDays);
}

/**
 * Verifica si una fecha límite está próxima a vencer o ya venció
 * @param deadline Fecha límite
 * @param warningDays Días de anticipación para advertencia (default: 3)
 * @returns Objeto con estado de vencimiento
 */
export function checkDeadlineStatus(deadline: Date, warningDays: number = 3) {
  const now = new Date();
  
  // Si la fecha ya pasó
  if (now > deadline) {
    return {
      status: 'expired',
      daysOverdue: getBusinessDaysCount(deadline, now),
      message: 'Plazo vencido'
    };
  }
  
  // Días hábiles restantes
  const daysRemaining = getBusinessDaysCount(now, deadline);
  
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