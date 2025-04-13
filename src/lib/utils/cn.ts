// src/lib/utils/cn.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina múltiples nombres de clase en una sola cadena,
 * manejando conflictos de Tailwind CSS
 * 
 * Esta función utiliza:
 * - clsx: Para combinar condicionales y arrays de clases
 * - twMerge: Para resolver conflictos entre clases de Tailwind
 * 
 * @param inputs Array de clases, strings, objetos o arrays para combinar
 * @returns Una cadena optimizada con todas las clases combinadas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}