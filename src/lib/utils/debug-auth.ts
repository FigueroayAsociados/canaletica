// src/lib/utils/debug-auth.ts
//
// Este archivo contiene utilidades para ayudar a diagnosticar y solucionar 
// problemas de autenticación, especialmente relacionados con multi-tenancy

import { logger } from './logger';
import { DEFAULT_COMPANY_ID } from './constants/index';
import { normalizeCompanyId } from './helpers';

/**
 * Función para diagnosticar problemas con la detección y normalización de companyId
 * Esta función se puede llamar desde cualquier parte del código donde se sospeche
 * que hay problemas con el ID de compañía
 */
export function debugCompanyId(
  context: string,
  detectedId: string,
  normalizedId?: string,
  options?: { 
    email?: string;
    uid?: string;
    action?: string;
  }
) {
  // Si no se proporciona un ID normalizado, normalizarlo aquí
  const actualNormalizedId = normalizedId || normalizeCompanyId(detectedId);
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    context,
    detectedId,
    normalizedId: actualNormalizedId,
    isDefault: actualNormalizedId === DEFAULT_COMPANY_ID,
    wasNormalized: detectedId !== actualNormalizedId,
    subdomain: typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : 'unknown',
    localStorage: typeof window !== 'undefined' ? localStorage.getItem('selectedCompanyId') : null,
    ...options
  };
  
  // Guardar en localStorage para debugging
  if (typeof window !== 'undefined') {
    const debugHistory = JSON.parse(localStorage.getItem('debugCompanyId') || '[]');
    debugHistory.push(debugInfo);
    localStorage.setItem('debugCompanyId', JSON.stringify(debugHistory.slice(-10))); // Mantener solo los últimos 10
  }
  
  // Mostrar en consola de forma destacada
  console.log('%c🔍 DEBUG COMPANY ID', 'background: #ff9800; color: white; padding: 2px 5px; border-radius: 2px;', debugInfo);
  
  // Registrar en el sistema de logs
  logger.info(`DEBUG COMPANY ID: ${JSON.stringify(debugInfo)}`, null, {
    prefix: 'debugCompanyId'
  });
  
  return debugInfo;
}

/**
 * Comprueba si estamos en la URL de una compañía específica
 */
export function isCompanySubdomain(companyId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const hostParts = hostname.split('.');
  const subdomain = hostParts[0];
  
  return subdomain.toLowerCase() === companyId.toLowerCase();
}

/**
 * Comprueba si el email es del usuario mvc específico
 */
export function isMvcUser(email: string): boolean {
  return email.toLowerCase() === 'mvc@canaletica.cl';
}

/**
 * Convierte cualquier error a un mensaje legible
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'Error desconocido';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  
  if (error.code) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'Usuario no encontrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/invalid-credential':
        return 'Credenciales inválidas';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Intente más tarde';
      default:
        return `Error de autenticación: ${error.code}`;
    }
  }
  
  return JSON.stringify(error);
}

/**
 * Función especial para solucionar el problema de mvc específicamente
 */
export function forceMvcCompanyId(email: string, currentCompanyId: string): string {
  if (email.toLowerCase() === 'mvc@canaletica.cl' && currentCompanyId !== 'mvc') {
    console.log(`🔧 HOTFIX: El email es mvc@canaletica.cl, forzando companyId=mvc (era ${currentCompanyId})`);
    return 'mvc';
  }
  return currentCompanyId;
}