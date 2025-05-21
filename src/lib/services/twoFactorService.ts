// src/lib/services/twoFactorService.ts

import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { UserRole } from '@/lib/utils/constants';
import { logSecurityEvent } from './securityService';

// Duración de validez del código OTP (5 minutos)
const OTP_VALIDITY_DURATION = 5 * 60 * 1000;

// Longitud del código OTP
const OTP_LENGTH = 6;

/**
 * Interfaz para información de 2FA de usuario
 */
interface TwoFactorInfo {
  enabled: boolean;            // Si 2FA está habilitado
  enrollmentDate?: Timestamp;  // Fecha de activación de 2FA
  method: '2fa_app' | 'email'; // Método de 2FA
  secret?: string;             // Secreto para app de autenticación (si aplica)
  verified: boolean;           // Si el 2FA ha sido verificado
  backupCodes?: string[];      // Códigos de respaldo (hash)
  phone?: string;              // Teléfono opcional para SMS (futuro)
  requiredForRoles: string[];  // Roles que requieren 2FA (vacío = todos)
}

/**
 * Interfaz para código OTP temporal
 */
interface OTPCode {
  code: string;
  expiresAt: Timestamp;
  attempts: number;
  maxAttempts: number;
}

/**
 * Verifica si un usuario tiene habilitado 2FA
 * 
 * @param userId ID del usuario
 * @returns Estado de 2FA
 */
export async function getUserTwoFactorStatus(userId: string) {
  try {
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    if (docSnap.exists()) {
      return {
        success: true,
        enabled: docSnap.data().enabled,
        method: docSnap.data().method,
        verified: docSnap.data().verified
      };
    }
    
    return {
      success: true,
      enabled: false,
      method: null,
      verified: false
    };
  } catch (error) {
    logger.error('Error al verificar estado 2FA:', error);
    return {
      success: false,
      error: 'Error al verificar estado de autenticación de dos factores'
    };
  }
}

/**
 * Inicia la configuración de 2FA para un usuario
 * 
 * @param userId ID del usuario
 * @param method Método de 2FA ('2fa_app' o 'email')
 * @param email Email del usuario para método email
 * @returns Información para completar configuración
 */
export async function initializeTwoFactor(userId: string, method: '2fa_app' | 'email', email?: string) {
  try {
    // Verificar si ya existe configuración 2FA
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    if (docSnap.exists() && docSnap.data().enabled && docSnap.data().verified) {
      return {
        success: false,
        error: 'La autenticación de dos factores ya está habilitada para este usuario'
      };
    }
    
    // Según el método elegido, generar datos necesarios
    if (method === '2fa_app') {
      // Generar secreto para app de autenticación (TOTP)
      const secret = generateTOTPSecret();
      
      // Crear URL para código QR
      const otpAuthUrl = generateOTPAuthURL(userId, secret, email || 'usuario@canaletica.cl');
      
      // Guardar en BD para validación posterior
      await setDoc(userTwoFactorRef, {
        enabled: false,
        method: '2fa_app',
        secret,
        verified: false,
        enrollmentDate: null,
        requiredForRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
      });
      
      return {
        success: true,
        method: '2fa_app',
        secret,
        otpAuthUrl,
        qrCode: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`
      };
      
    } else if (method === 'email') {
      // Verificar que el email está disponible
      if (!email) {
        return {
          success: false,
          error: 'Se requiere dirección de email para 2FA por correo'
        };
      }
      
      // Generar y enviar código OTP por email
      const otpCode = generateOTPCode();
      
      // Guardar código OTP temporal
      await setDoc(doc(db, 'tempOTPCodes', userId), {
        code: otpCode,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + OTP_VALIDITY_DURATION)),
        attempts: 0,
        maxAttempts: 3
      });
      
      // Guardar en BD configuración inicial
      await setDoc(userTwoFactorRef, {
        enabled: false,
        method: 'email',
        email,
        verified: false,
        enrollmentDate: null,
        requiredForRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
      });
      
      // TODO: Enviar email con código OTP
      logger.info(`[DEV] Código OTP para 2FA: ${otpCode}`);
      
      return {
        success: true,
        method: 'email',
        message: 'Se ha enviado un código de verificación al email'
      };
    }
    
    return {
      success: false,
      error: 'Método de autenticación de dos factores no soportado'
    };
  } catch (error) {
    logger.error('Error al inicializar 2FA:', error);
    return {
      success: false,
      error: 'Error al inicializar autenticación de dos factores'
    };
  }
}

/**
 * Verifica un código OTP para completar la configuración de 2FA
 * 
 * @param userId ID del usuario
 * @param code Código OTP ingresado
 * @returns Resultado de la verificación
 */
export async function verifyAndEnableTwoFactor(userId: string, code: string) {
  try {
    // Obtener configuración de 2FA
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    if (!docSnap.exists()) {
      return {
        success: false,
        error: 'No se encontró configuración de autenticación de dos factores'
      };
    }
    
    const twoFactorData = docSnap.data() as TwoFactorInfo;
    
    // Verificar según el método
    if (twoFactorData.method === '2fa_app') {
      // Verificar código TOTP
      const isValid = verifyTOTPCode(code, twoFactorData.secret || '');
      
      if (!isValid) {
        // Registrar intento fallido
        await logSecurityEvent({
          type: 'failed_2fa_verification',
          userId,
          details: { method: '2fa_app' },
          severity: 4,
          resource: 'authentication'
        });
        
        return {
          success: false,
          error: 'Código de verificación incorrecto'
        };
      }
      
      // Código válido, activar 2FA
      const backupCodes = generateBackupCodes();
      
      await updateDoc(userTwoFactorRef, {
        enabled: true,
        verified: true,
        enrollmentDate: serverTimestamp(),
        backupCodes: backupCodes.map(c => hashBackupCode(c)),
      });
      
      // Registrar activación exitosa
      await logSecurityEvent({
        type: 'enabled_2fa',
        userId,
        details: { method: '2fa_app' },
        severity: 2,
        resource: 'authentication'
      });
      
      return {
        success: true,
        enabled: true,
        backupCodes // Devolver códigos sin hash para mostrar al usuario
      };
      
    } else if (twoFactorData.method === 'email') {
      // Verificar código OTP
      const otpRef = doc(db, 'tempOTPCodes', userId);
      const otpSnap = await getDoc(otpRef);
      
      if (!otpSnap.exists()) {
        return {
          success: false,
          error: 'No se encontró código de verificación'
        };
      }
      
      const otpData = otpSnap.data() as OTPCode;
      
      // Verificar si ha expirado
      if (otpData.expiresAt.toDate() < new Date()) {
        await deleteDoc(otpRef);
        return {
          success: false,
          error: 'El código de verificación ha expirado'
        };
      }
      
      // Verificar número de intentos
      if (otpData.attempts >= otpData.maxAttempts) {
        await deleteDoc(otpRef);
        return {
          success: false,
          error: 'Demasiados intentos fallidos. Inicie el proceso nuevamente'
        };
      }
      
      // Verificar código
      if (otpData.code !== code) {
        // Incrementar contador de intentos
        await updateDoc(otpRef, {
          attempts: otpData.attempts + 1
        });
        
        // Registrar intento fallido
        await logSecurityEvent({
          type: 'failed_2fa_verification',
          userId,
          details: { method: 'email', attempts: otpData.attempts + 1 },
          severity: 4,
          resource: 'authentication'
        });
        
        return {
          success: false,
          error: 'Código de verificación incorrecto',
          remainingAttempts: otpData.maxAttempts - (otpData.attempts + 1)
        };
      }
      
      // Código válido, activar 2FA
      const backupCodes = generateBackupCodes();
      
      await updateDoc(userTwoFactorRef, {
        enabled: true,
        verified: true,
        enrollmentDate: serverTimestamp(),
        backupCodes: backupCodes.map(c => hashBackupCode(c)),
      });
      
      // Eliminar código temporal
      await deleteDoc(otpRef);
      
      // Registrar activación exitosa
      await logSecurityEvent({
        type: 'enabled_2fa',
        userId,
        details: { method: 'email' },
        severity: 2,
        resource: 'authentication'
      });
      
      return {
        success: true,
        enabled: true,
        backupCodes // Devolver códigos sin hash para mostrar al usuario
      };
    }
    
    return {
      success: false,
      error: 'Método de autenticación de dos factores no válido'
    };
  } catch (error) {
    logger.error('Error al verificar código 2FA:', error);
    return {
      success: false,
      error: 'Error al verificar código de autenticación de dos factores'
    };
  }
}

/**
 * Genera un código OTP para login con 2FA
 * 
 * @param userId ID del usuario
 * @param email Email del usuario (para método email)
 * @returns Resultado de la operación
 */
export async function generateLoginOTP(userId: string, email?: string) {
  try {
    // Verificar si el usuario tiene 2FA habilitado
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    if (!docSnap.exists() || !docSnap.data().enabled) {
      return {
        success: false,
        error: 'El usuario no tiene autenticación de dos factores habilitada'
      };
    }
    
    const twoFactorData = docSnap.data() as TwoFactorInfo;
    
    if (twoFactorData.method === 'email') {
      // Generar código OTP y enviar por email
      const otpCode = generateOTPCode();
      
      // Guardar código OTP temporal
      await setDoc(doc(db, 'loginOTPCodes', userId), {
        code: otpCode,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + OTP_VALIDITY_DURATION)),
        attempts: 0,
        maxAttempts: 3
      });
      
      // TODO: Enviar email con código OTP
      logger.info(`[DEV] Código OTP para login 2FA: ${otpCode}`);
      
      return {
        success: true,
        method: 'email',
        message: 'Se ha enviado un código de verificación al email'
      };
    } else if (twoFactorData.method === '2fa_app') {
      // Para app de autenticación, no se genera código
      return {
        success: true,
        method: '2fa_app',
        message: 'Ingrese el código de su aplicación de autenticación'
      };
    }
    
    return {
      success: false,
      error: 'Método de autenticación de dos factores no soportado'
    };
  } catch (error) {
    logger.error('Error al generar OTP para login:', error);
    return {
      success: false,
      error: 'Error al generar código de verificación'
    };
  }
}

/**
 * Verifica el código 2FA durante el proceso de login
 * 
 * @param userId ID del usuario
 * @param code Código ingresado
 * @param isBackupCode Si el código es un código de respaldo
 * @returns Resultado de la verificación
 */
export async function verifyLoginTwoFactor(userId: string, code: string, isBackupCode: boolean = false) {
  try {
    // Verificar si el usuario tiene 2FA habilitado
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    if (!docSnap.exists() || !docSnap.data().enabled) {
      return {
        success: false,
        error: 'El usuario no tiene autenticación de dos factores habilitada'
      };
    }
    
    const twoFactorData = docSnap.data() as TwoFactorInfo;
    
    // Si es código de respaldo
    if (isBackupCode) {
      // Verificar si el código de respaldo es válido
      const hashedCode = hashBackupCode(code);
      const backupCodes = twoFactorData.backupCodes || [];
      const codeIndex = backupCodes.indexOf(hashedCode);
      
      if (codeIndex === -1) {
        // Registrar intento fallido
        await logSecurityEvent({
          type: 'failed_2fa_login',
          userId,
          details: { method: 'backup_code' },
          severity: 5,
          resource: 'authentication'
        });
        
        return {
          success: false,
          error: 'Código de respaldo inválido'
        };
      }
      
      // Eliminar el código de respaldo usado
      backupCodes.splice(codeIndex, 1);
      await updateDoc(userTwoFactorRef, { backupCodes });
      
      // Registrar uso de código de respaldo
      await logSecurityEvent({
        type: 'backup_code_used',
        userId,
        details: { remainingCodes: backupCodes.length },
        severity: 3,
        resource: 'authentication'
      });
      
      return {
        success: true,
        message: 'Autenticación completada con código de respaldo'
      };
    }
    
    // Verificar según el método
    if (twoFactorData.method === '2fa_app') {
      // Verificar código TOTP
      const isValid = verifyTOTPCode(code, twoFactorData.secret || '');
      
      if (!isValid) {
        // Registrar intento fallido
        await logSecurityEvent({
          type: 'failed_2fa_login',
          userId,
          details: { method: '2fa_app' },
          severity: 5,
          resource: 'authentication'
        });
        
        return {
          success: false,
          error: 'Código de verificación incorrecto'
        };
      }
      
      // Registrar login exitoso con 2FA
      await logSecurityEvent({
        type: 'successful_2fa_login',
        userId,
        details: { method: '2fa_app' },
        severity: 1,
        resource: 'authentication'
      });
      
      return {
        success: true,
        message: 'Autenticación de dos factores completada'
      };
      
    } else if (twoFactorData.method === 'email') {
      // Verificar código OTP
      const otpRef = doc(db, 'loginOTPCodes', userId);
      const otpSnap = await getDoc(otpRef);
      
      if (!otpSnap.exists()) {
        return {
          success: false,
          error: 'No se encontró código de verificación'
        };
      }
      
      const otpData = otpSnap.data() as OTPCode;
      
      // Verificar si ha expirado
      if (otpData.expiresAt.toDate() < new Date()) {
        await deleteDoc(otpRef);
        return {
          success: false,
          error: 'El código de verificación ha expirado'
        };
      }
      
      // Verificar número de intentos
      if (otpData.attempts >= otpData.maxAttempts) {
        await deleteDoc(otpRef);
        
        // Registrar demasiados intentos fallidos
        await logSecurityEvent({
          type: 'too_many_failed_2fa_attempts',
          userId,
          details: { method: 'email' },
          severity: 7,
          resource: 'authentication'
        });
        
        return {
          success: false,
          error: 'Demasiados intentos fallidos. Inicie el proceso nuevamente'
        };
      }
      
      // Verificar código
      if (otpData.code !== code) {
        // Incrementar contador de intentos
        await updateDoc(otpRef, {
          attempts: otpData.attempts + 1
        });
        
        // Registrar intento fallido
        await logSecurityEvent({
          type: 'failed_2fa_login',
          userId,
          details: { method: 'email', attempts: otpData.attempts + 1 },
          severity: 5,
          resource: 'authentication'
        });
        
        return {
          success: false,
          error: 'Código de verificación incorrecto',
          remainingAttempts: otpData.maxAttempts - (otpData.attempts + 1)
        };
      }
      
      // Eliminar código temporal
      await deleteDoc(otpRef);
      
      // Registrar login exitoso con 2FA
      await logSecurityEvent({
        type: 'successful_2fa_login',
        userId,
        details: { method: 'email' },
        severity: 1,
        resource: 'authentication'
      });
      
      return {
        success: true,
        message: 'Autenticación de dos factores completada'
      };
    }
    
    return {
      success: false,
      error: 'Método de autenticación de dos factores no válido'
    };
  } catch (error) {
    logger.error('Error al verificar 2FA para login:', error);
    return {
      success: false,
      error: 'Error al verificar autenticación de dos factores'
    };
  }
}

/**
 * Desactiva la autenticación de dos factores para un usuario
 * 
 * @param userId ID del usuario
 * @param administrativeAction Si es una acción administrativa (para super_admin)
 * @returns Resultado de la operación
 */
export async function disableTwoFactor(userId: string, administrativeAction: boolean = false) {
  try {
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    if (!docSnap.exists() || !docSnap.data().enabled) {
      return {
        success: false,
        error: 'El usuario no tiene autenticación de dos factores habilitada'
      };
    }
    
    // Registrar desactivación
    await logSecurityEvent({
      type: 'disabled_2fa',
      userId,
      details: { 
        method: docSnap.data().method,
        administrativeAction
      },
      severity: administrativeAction ? 4 : 2,
      resource: 'authentication'
    });
    
    // Opción 1: Eliminar completamente
    // await deleteDoc(userTwoFactorRef);
    
    // Opción 2: Desactivar pero mantener registro
    await updateDoc(userTwoFactorRef, {
      enabled: false,
      disabledAt: serverTimestamp(),
      disabledBy: administrativeAction ? 'admin' : 'user'
    });
    
    return {
      success: true,
      message: 'Autenticación de dos factores desactivada correctamente'
    };
  } catch (error) {
    logger.error('Error al desactivar 2FA:', error);
    return {
      success: false,
      error: 'Error al desactivar autenticación de dos factores'
    };
  }
}

/**
 * Genera nuevos códigos de respaldo para un usuario
 * 
 * @param userId ID del usuario
 * @returns Nuevos códigos de respaldo
 */
export async function generateNewBackupCodes(userId: string) {
  try {
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    if (!docSnap.exists() || !docSnap.data().enabled) {
      return {
        success: false,
        error: 'El usuario no tiene autenticación de dos factores habilitada'
      };
    }
    
    // Generar nuevos códigos de respaldo
    const backupCodes = generateBackupCodes();
    
    // Actualizar en la base de datos
    await updateDoc(userTwoFactorRef, {
      backupCodes: backupCodes.map(c => hashBackupCode(c)),
      backupCodesGeneratedAt: serverTimestamp()
    });
    
    // Registrar generación de nuevos códigos
    await logSecurityEvent({
      type: 'generated_new_backup_codes',
      userId,
      severity: 2,
      resource: 'authentication'
    });
    
    return {
      success: true,
      backupCodes
    };
  } catch (error) {
    logger.error('Error al generar nuevos códigos de respaldo:', error);
    return {
      success: false,
      error: 'Error al generar nuevos códigos de respaldo'
    };
  }
}

/**
 * Verifica si un usuario debe usar 2FA según su rol
 * 
 * @param userId ID del usuario
 * @param userRole Rol del usuario
 * @returns Si el usuario debe usar 2FA
 */
export async function shouldRequireTwoFactor(userId: string, userRole: string) {
  try {
    // Si no es admin ni super_admin, no requerir 2FA
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      return {
        success: true,
        required: false
      };
    }
    
    // Verificar si el usuario ya tiene 2FA habilitado
    const userTwoFactorRef = doc(db, 'usersTwoFactor', userId);
    const docSnap = await getDoc(userTwoFactorRef);
    
    // Si ya tiene 2FA habilitado, no necesita configurarlo
    if (docSnap.exists() && docSnap.data().enabled) {
      return {
        success: true,
        required: false,
        enabled: true
      };
    }
    
    // Obtener configuración global de 2FA
    const configRef = doc(db, 'config', 'twoFactor');
    const configSnap = await getDoc(configRef);
    
    let requiredRoles: string[] = [UserRole.SUPER_ADMIN];
    
    if (configSnap.exists()) {
      requiredRoles = configSnap.data().requiredRoles || requiredRoles;
    }
    
    // Verificar si el rol del usuario está en la lista de roles requeridos
    const required = requiredRoles.includes(userRole);
    
    return {
      success: true,
      required,
      requiredRoles
    };
  } catch (error) {
    logger.error('Error al verificar requerimiento de 2FA:', error);
    return {
      success: false,
      error: 'Error al verificar requerimientos de autenticación de dos factores',
      required: false // Por defecto, no requerir en caso de error
    };
  }
}

// Funciones de utilidad para 2FA

/**
 * Genera un secreto para TOTP (Time-based One-Time Password)
 */
function generateTOTPSecret(): string {
  // En una implementación real, usar una biblioteca específica
  // como 'otplib' para generar un secreto seguro
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return secret;
}

/**
 * Genera una URL para autenticación TOTP (para código QR)
 */
function generateOTPAuthURL(name: string, secret: string, issuer: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(name)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Verifica un código TOTP
 * 
 * NOTA: En producción, usar una biblioteca como 'otplib'
 * Esta es una implementación simplificada para fines de demostración
 */
function verifyTOTPCode(code: string, secret: string): boolean {
  // Implementación simplificada - en producción usar biblioteca TOTP
  if (process.env.NODE_ENV !== 'production') {
    // En desarrollo, aceptar "123456" como código válido para pruebas
    return code === '123456';
  }
  
  // En producción, usar biblioteca TOTP adecuada
  return false;
}

/**
 * Genera un código OTP numérico aleatorio
 */
function generateOTPCode(): string {
  // Generar código numérico de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Genera códigos de respaldo para 2FA
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Generar 8 códigos de respaldo
  for (let i = 0; i < 8; i++) {
    let code = '';
    
    // Formato: XXXX-XXXX-XXXX
    for (let j = 0; j < 12; j++) {
      if (j === 4 || j === 8) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    codes.push(code);
  }
  
  return codes;
}

/**
 * Aplica hash a un código de respaldo para almacenamiento seguro
 * 
 * NOTA: En producción, usar una función criptográfica adecuada
 */
function hashBackupCode(code: string): string {
  // Implementación simplificada - en producción usar función criptográfica adecuada
  return code; // No aplicar hash en esta versión de demostración
}