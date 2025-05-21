// src/lib/services/securityService.ts

import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc,
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserRole } from '@/lib/utils/constants';
import { getAuth } from 'firebase/auth';

// Constantes de seguridad
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutos en milisegundos
const THREAT_THRESHOLD = 7; // Umbral para alertas de seguridad
const CRITICAL_THREAT_THRESHOLD = 12; // Umbral para acciones automáticas

/**
 * Servicio dedicado a la seguridad y privacidad multi-tenant
 * Implementa medidas de seguridad avanzadas siguiendo estándares ISO 37002:2021
 * y mejores prácticas de protección de datos para canales de denuncia
 */

/**
 * Verifica si un usuario tiene acceso a los datos de una compañía específica
 * @param userId ID del usuario que intenta acceder
 * @param targetCompanyId ID de la compañía a la que se intenta acceder
 * @param userRole Rol del usuario (opcional)
 * @returns Objeto con el resultado de la verificación
 */
export async function verifyCompanyAccessStrict(
  userId: string,
  targetCompanyId: string,
  userRole?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Los super_admin siempre tienen acceso a cualquier compañía
    if (userRole === 'super_admin') {
      return { success: true };
    }

    // Verificar si estamos en un subdominio para reforzar la seguridad
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const hostParts = hostname.split('.');
      const subdomain = hostParts[0]?.toLowerCase();
      
      // Si estamos en un subdominio específico (no www, etc.) y no coincide con targetCompanyId
      if (subdomain && 
          subdomain !== 'www' && 
          subdomain !== 'localhost' && 
          subdomain !== 'canaletic' && 
          subdomain !== 'canaletica' &&
          subdomain !== 'default' &&
          subdomain !== targetCompanyId) {
        
        const errorMsg = `⚠️ ALERTA DE SEGURIDAD: El subdominio (${subdomain}) no coincide con la compañía solicitada (${targetCompanyId})`;
        logger.error(errorMsg);
        
        return {
          success: false,
          error: 'No tiene permiso para acceder a los datos de esta compañía'
        };
      }
    }

    // Buscar el perfil de usuario en la colección global de usuarios
    const globalUserRef = doc(db, `users/${userId}`);
    const globalUserSnap = await getDoc(globalUserRef);

    if (globalUserSnap.exists()) {
      const userData = globalUserSnap.data();
      
      // Si el usuario tiene una compañía asignada y es diferente a la solicitada
      if (userData.companyId && userData.companyId !== targetCompanyId) {
        const errorMsg = `⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} con rol ${userRole} intentó acceder a compañía ${targetCompanyId} pero pertenece a ${userData.companyId}`;
        logger.error(errorMsg);
        
        return {
          success: false,
          error: 'No tiene permiso para acceder a los datos de esta compañía'
        };
      }
    }

    // Verificar si el usuario existe en la compañía específica
    const companyUserRef = doc(db, `companies/${targetCompanyId}/users/${userId}`);
    const companyUserSnap = await getDoc(companyUserRef);

    // Si el usuario no existe en la compañía solicitada
    if (!companyUserSnap.exists()) {
      const errorMsg = `⚠️ ALERTA DE SEGURIDAD: Usuario ${userId} intentó acceder a compañía ${targetCompanyId} pero no está registrado en ella`;
      logger.error(errorMsg);
      
      return {
        success: false,
        error: 'No tiene permiso para acceder a los datos de esta compañía'
      };
    }

    // El usuario existe en la compañía, tiene acceso
    return { success: true };
  } catch (error) {
    logger.error('Error al verificar acceso a compañía:', error);
    
    // Por seguridad, ante un error denegar el acceso por defecto
    return {
      success: false,
      error: 'Error al verificar su acceso a esta compañía'
    };
  }
}

/**
 * Registra una violación de seguridad
 * @param userId ID del usuario
 * @param action Acción que intentó realizar
 * @param resource Recurso al que intentó acceder
 * @param targetCompanyId ID de la compañía objetivo
 * @param userCompanyId ID de la compañía del usuario
 */
export function logSecurityViolation(
  userId: string,
  action: string,
  resource: string,
  targetCompanyId: string,
  userCompanyId: string
): void {
  const message = `VIOLACIÓN DE SEGURIDAD: Usuario ${userId} de compañía ${userCompanyId} intentó ${action} en ${resource} de compañía ${targetCompanyId}`;
  
  // Registrar en consola/logger
  logger.error(message);
  
  // Registrar en localStorage para propósitos de auditoría local
  try {
    if (typeof window !== 'undefined') {
      const violations = JSON.parse(localStorage.getItem('securityViolations') || '[]');
      violations.push({
        timestamp: new Date().toISOString(),
        userId,
        action,
        resource,
        targetCompanyId,
        userCompanyId,
        url: window.location.href
      });
      
      // Mantener solo las últimas 50 violaciones para no sobrecargar localStorage
      localStorage.setItem('securityViolations', JSON.stringify(violations.slice(-50)));
    }
  } catch (error) {
    // Ignorar errores de localStorage
  }
  
  // Registrar en Firestore para auditoría permanente
  try {
    const securityLogsRef = collection(db, 'securityLogs');
    addDoc(securityLogsRef, {
      timestamp: serverTimestamp(),
      userId,
      action,
      resource,
      targetCompanyId,
      userCompanyId,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      ipAddress: 'client-side', // Nota: en cliente solo podemos obtener IP a través de servicios externos
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });
  } catch (err) {
    logger.error('Error al registrar violación de seguridad en Firestore:', err);
  }
}

/**
 * Interfaz para eventos de seguridad
 */
export interface SecurityEvent {
  type: string;          // Tipo de evento (login_failure, access_denied, etc.)
  userId?: string;       // ID del usuario relacionado
  ipAddress?: string;    // Dirección IP
  userAgent?: string;    // User-Agent del navegador
  resource?: string;     // Recurso afectado
  companyId?: string;    // ID de la compañía relacionada
  details?: any;         // Detalles adicionales
  severity?: number;     // Nivel de severidad (1-10)
  frequency?: 'single' | 'repeated'; // Frecuencia del evento
  targetRole?: string;   // Rol del objetivo (admin, super_admin, etc.)
  fromUnknownIP?: boolean; // Si proviene de una IP desconocida
  fromBlockedCountry?: boolean; // Si proviene de un país bloqueado
}

/**
 * Interfaz para intentos de inicio de sesión
 */
interface LoginAttempt {
  failedAttempts: number;
  lastFailedAttempt: Timestamp | null;
  lockedUntil: Timestamp | null;
}

/**
 * Maneja un intento de inicio de sesión, implementando bloqueo de cuenta
 * tras múltiples intentos fallidos.
 * 
 * @param email Email del usuario
 * @param success Si el intento fue exitoso
 * @returns Información sobre el estado del bloqueo
 */
export async function handleLoginAttempt(email: string, success: boolean) {
  try {
    const userRef = doc(db, 'loginAttempts', email);
    const userSnap = await getDoc(userRef);

    if (success) {
      // Resetear contador en caso de éxito
      await setDoc(userRef, {
        failedAttempts: 0,
        lastFailedAttempt: null,
        lockedUntil: null
      });
      return { blocked: false };
    } else {
      // Incrementar contador de intentos fallidos
      const data = userSnap.exists() 
        ? userSnap.data() as LoginAttempt 
        : { failedAttempts: 0, lastFailedAttempt: null, lockedUntil: null };
      
      const now = Timestamp.now();

      // Verificar si la cuenta está bloqueada
      if (data.lockedUntil && data.lockedUntil.toDate() > now.toDate()) {
        const remainingMs = data.lockedUntil.toDate().getTime() - now.toDate().getTime();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        
        // Registrar intento durante bloqueo (posible ataque)
        await logSecurityEvent({
          type: 'blocked_account_attempt',
          userId: email,
          details: { remainingMinutes },
          severity: 7,
          resource: 'authentication'
        });
        
        return {
          blocked: true,
          remainingTime: remainingMinutes
        };
      }

      // Incrementar contador
      const newFailedAttempts = data.failedAttempts + 1;
      const updateData: LoginAttempt = {
        failedAttempts: newFailedAttempts,
        lastFailedAttempt: now,
        lockedUntil: null
      };

      // Bloquear cuenta si supera el límite
      if (newFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        const lockoutEnd = new Date(now.toDate().getTime() + LOCKOUT_TIME);
        updateData.lockedUntil = Timestamp.fromDate(lockoutEnd);
        
        // Registrar bloqueo de cuenta
        await logSecurityEvent({
          type: 'account_locked',
          userId: email,
          details: { 
            failedAttempts: newFailedAttempts,
            lockoutMinutes: LOCKOUT_TIME / 60000
          },
          severity: 6,
          resource: 'authentication'
        });
      }

      await setDoc(userRef, updateData);
      
      return {
        blocked: newFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS,
        remainingAttempts: MAX_FAILED_LOGIN_ATTEMPTS - newFailedAttempts
      };
    }
  } catch (error) {
    logger.error('Error al manejar intento de inicio de sesión:', error);
    // Por seguridad, permitir el inicio normal en caso de error
    return { blocked: false };
  }
}

/**
 * Registra un evento de seguridad y evalúa si representa una amenaza
 * 
 * @param event Evento de seguridad a registrar
 * @returns Resultado de la evaluación de amenaza
 */
export async function logSecurityEvent(event: SecurityEvent) {
  try {
    // Completar datos del evento
    const enhancedEvent = {
      ...event,
      timestamp: serverTimestamp(),
      userAgent: event.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'),
      ipAddress: event.ipAddress || 'client-side'
    };
    
    // Guardar evento en log centralizado
    const securityLogRef = collection(db, 'securityLogs');
    await addDoc(securityLogRef, enhancedEvent);

    // Evaluar si el evento representa una amenaza
    const threatLevel = evaluateThreatLevel(event);

    // Si supera umbral, enviar alerta
    if (threatLevel >= THREAT_THRESHOLD) {
      await sendSecurityAlert({
        level: threatLevel,
        event: event,
        actionRequired: determineRequiredAction(threatLevel, event)
      });

      // Para amenazas críticas, tomar acciones automáticas
      if (threatLevel >= CRITICAL_THREAT_THRESHOLD) {
        await autoBlockThreat(event);
      }
    }
    
    return {
      success: true,
      threatLevel,
      isSignificantThreat: threatLevel >= THREAT_THRESHOLD
    };
  } catch (error) {
    logger.error('Error al registrar evento de seguridad:', error);
    return { success: false, error: 'Error al registrar evento de seguridad' };
  }
}

/**
 * Evalúa el nivel de amenaza de un evento de seguridad
 * 
 * @param event Evento de seguridad a evaluar
 * @returns Puntuación de amenaza (0-20)
 */
function evaluateThreatLevel(event: SecurityEvent): number {
  let score = 0;

  // Analizar tipo de evento
  if (event.type === 'authentication_failure') score += 1;
  if (event.type === 'access_denied') score += 2;
  if (event.type === 'suspicious_activity') score += 3;
  if (event.type === 'blocked_account_attempt') score += 4;
  if (event.type === 'repeated_violation') score += 5;

  // Severidad explícita
  if (event.severity) {
    score += event.severity;
  }

  // Frecuencia
  if (event.frequency === 'repeated') score += 3;

  // Origen
  if (event.fromUnknownIP) score += 2;
  if (event.fromBlockedCountry) score += 5;

  // Target
  if (event.targetRole === 'admin') score += 3;
  if (event.targetRole === 'super_admin') score += 5;

  return score;
}

/**
 * Determina la acción requerida basada en el nivel de amenaza
 * 
 * @param threatLevel Nivel de amenaza (0-20)
 * @param event Evento de seguridad
 * @returns Acción recomendada
 */
function determineRequiredAction(threatLevel: number, event: SecurityEvent): string {
  if (threatLevel >= CRITICAL_THREAT_THRESHOLD) {
    return 'Bloqueo automático aplicado - Revisar urgentemente - Posible ataque en curso';
  }
  if (threatLevel >= THREAT_THRESHOLD) {
    return 'Investigar actividad sospechosa - Posible intento de intrusión';
  }
  return 'Monitorear - No se requiere acción inmediata';
}

/**
 * Envía una alerta de seguridad a los administradores
 * 
 * @param alertData Datos de la alerta
 */
async function sendSecurityAlert(alertData: { 
  level: number; 
  event: SecurityEvent; 
  actionRequired: string;
}) {
  try {
    // Registrar alerta en Firestore
    const alertsRef = collection(db, 'securityAlerts');
    await addDoc(alertsRef, {
      ...alertData,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
    
    // TODO: Implementar notificación por email a administradores de seguridad
    logger.warn('ALERTA DE SEGURIDAD:', alertData);
    
    return { success: true };
  } catch (error) {
    logger.error('Error al enviar alerta de seguridad:', error);
    return { success: false, error: 'Error al enviar alerta de seguridad' };
  }
}

/**
 * Aplica bloqueo automático ante amenazas críticas
 * 
 * @param event Evento de seguridad
 */
async function autoBlockThreat(event: SecurityEvent) {
  try {
    // Implementar acciones de mitigación según el tipo de amenaza
    if (event.userId) {
      // 1. Bloquear usuario temporalmente si es un ataque de autenticación
      if (event.type.includes('authentication') || event.type.includes('access')) {
        // Bloquear usuario por 24 horas
        const userRef = doc(db, 'users', event.userId);
        await updateDoc(userRef, {
          securityBlock: true,
          securityBlockReason: 'Actividad sospechosa detectada',
          securityBlockExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          securityBlockEvent: event
        });
        
        logger.warn(`Usuario ${event.userId} bloqueado automáticamente por 24 horas debido a actividad sospechosa`);
      }
    }
    
    // 2. Registrar IP en lista de vigilancia si es aplicable
    if (event.ipAddress && event.ipAddress !== 'client-side') {
      const watchlistRef = collection(db, 'ipWatchlist');
      await addDoc(watchlistRef, {
        ip: event.ipAddress,
        reason: `Auto-bloqueo: ${event.type}`,
        threatLevel: evaluateThreatLevel(event),
        addedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      });
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error al aplicar bloqueo automático:', error);
    return { success: false, error: 'Error al aplicar bloqueo automático' };
  }
}

/**
 * Verifica si un token de sesión es válido basado en parámetros contextuales
 * 
 * @param currentContext Contexto actual de la sesión
 * @param sessionContext Contexto almacenado con el token
 * @returns Si el contexto es válido
 */
export function validateSessionContext(currentContext: any, sessionContext: any): boolean {
  // Si no hay contexto almacenado, permitir por defecto
  if (!sessionContext) return true;
  
  // Verificar cambios en dispositivo/navegador
  if (currentContext.userAgent !== sessionContext.userAgent) {
    logSecurityEvent({
      type: 'session_context_mismatch',
      details: { 
        mismatch: 'userAgent',
        stored: sessionContext.userAgent,
        current: currentContext.userAgent
      },
      severity: 8,
      resource: 'session'
    });
    return false;
  }

  return true;
}

/**
 * Verifica la autenticidad de un archivo de evidencia
 * 
 * @param file Archivo a verificar
 * @returns Resultado de la verificación
 */
export async function verifyEvidenceAuthenticity(file: File) {
  try {
    // Para archivos multimedia, aplicar verificaciones adicionales
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      // TODO: Integrar con API de detección de deepfakes cuando esté disponible
      // Por ahora, solo verificamos tipos de archivo y metadatos básicos
      
      // Verificar extensión vs. tipo MIME
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions: Record<string, string[]> = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/gif': ['gif'],
        'video/mp4': ['mp4'],
        'video/quicktime': ['mov'],
        'video/x-msvideo': ['avi']
      };
      
      const isValidExtension = validExtensions[file.type]?.includes(fileExtension || '');
      if (!isValidExtension) {
        return {
          authentic: false,
          warning: 'La extensión del archivo no coincide con su tipo MIME',
          details: {
            fileType: file.type,
            fileExtension,
            expectedExtensions: validExtensions[file.type]
          }
        };
      }
    }
    
    // Generar hash para verificación
    const fileHash = await generateFileHash(file);
    
    return {
      authentic: true,
      fileHash,
      timestamp: new Date().toISOString(),
      verificationMethod: 'hash-verification'
    };
  } catch (error) {
    logger.error('Error al verificar autenticidad de evidencia:', error);
    return {
      authentic: false,
      warning: 'No se pudo verificar la autenticidad del archivo',
      error: String(error)
    };
  }
}

/**
 * Genera un hash SHA-256 de un archivo
 * 
 * @param file Archivo a hashear
 * @returns Hash SHA-256 en formato hexadecimal
 */
async function generateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            reject('Error al leer el archivo');
            return;
          }
          
          // Usar SubtleCrypto API para generar hash SHA-256
          const hashBuffer = await crypto.subtle.digest(
            'SHA-256', 
            e.target.result as ArrayBuffer
          );
          
          // Convertir ArrayBuffer a string hexadecimal
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Implementa un sistema seguro de subida de evidencias con verificación
 * y protección avanzada
 * 
 * @param file Archivo de evidencia
 * @param reportId ID del reporte
 * @param companyId ID de la compañía
 * @param userId ID del usuario que sube el archivo
 * @returns Resultado de la subida
 */
export async function uploadSecureEvidence(file: File, reportId: string, companyId: string, userId: string) {
  try {
    // Constantes de seguridad
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/quicktime', 'application/zip',
      'text/plain', 'application/rtf'
    ];
    
    // Verificar tamaño máximo
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Archivo demasiado grande' };
    }

    // Verificar tipo MIME permitido
    if (!allowedMimeTypes.includes(file.type)) {
      // Registrar intento de subida de tipo no permitido
      await logSecurityEvent({
        type: 'upload_forbidden_filetype',
        userId,
        resource: 'evidence',
        companyId,
        details: { fileType: file.type, fileName: file.name },
        severity: 5
      });
      
      return { success: false, error: 'Tipo de archivo no permitido' };
    }

    // Verificar autenticidad del archivo
    const authenticity = await verifyEvidenceAuthenticity(file);
    if (!authenticity.authentic) {
      await logSecurityEvent({
        type: 'upload_suspicious_file',
        userId,
        resource: 'evidence',
        companyId,
        details: { warning: authenticity.warning },
        severity: 7
      });
      
      return { 
        success: false, 
        error: 'El archivo no pasó la verificación de seguridad',
        details: authenticity
      };
    }

    // Generar nombre aleatorio para el archivo
    const fileId = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop();
    const secureFileName = `${fileId}.${fileExtension}`;

    // Configurar metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: encodeURIComponent(file.name),
        reportId: reportId,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        fileHash: authenticity.fileHash
      }
    };

    // Subir archivo
    const storage = getStorage();
    const fileRef = ref(storage, `companies/${companyId}/reports/${reportId}/evidence/${secureFileName}`);
    await uploadBytes(fileRef, file, metadata);
    const downloadURL = await getDownloadURL(fileRef);

    // Registrar en base de datos
    const evidenceRef = collection(db, `companies/${companyId}/reports/${reportId}/evidence`);
    await addDoc(evidenceRef, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storageFileName: secureFileName,
      storagePath: `companies/${companyId}/reports/${reportId}/evidence/${secureFileName}`,
      downloadURL,
      uploadedBy: userId,
      uploadedAt: serverTimestamp(),
      fileHash: authenticity.fileHash,
      verificationResult: authenticity
    });

    // Registrar en log de auditoría
    await logAuditEvent({
      action: 'upload_evidence',
      userId,
      resourceId: reportId,
      resourceType: 'report',
      details: `Subida de archivo: ${file.name} (${file.size} bytes)`,
      companyId
    });

    return { 
      success: true, 
      fileId: secureFileName,
      downloadURL,
      verificationData: authenticity
    };
  } catch (error) {
    logger.error('Error al subir evidencia segura:', error);
    return { success: false, error: 'Error al subir el archivo' };
  }
}

/**
 * Registra un evento de auditoría
 * 
 * @param event Datos del evento
 * @returns Resultado de la operación
 */
export async function logAuditEvent(event: {
  action: string;
  userId: string;
  resourceId: string;
  resourceType: string;
  details: string;
  companyId: string;
}) {
  try {
    const auditRef = collection(db, 'auditLogs');
    await addDoc(auditRef, {
      ...event,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      ipAddress: 'client-side' // En entorno cliente solo podemos obtener esto
    });
    return { success: true };
  } catch (error) {
    logger.error('Error al registrar evento de auditoría:', error);
    return { success: false, error: 'Error al registrar evento de auditoría' };
  }
}

/**
 * Genera un informe de cumplimiento ISO 37002:2021
 * 
 * @param companyId ID de la compañía
 * @returns Informe de cumplimiento
 */
export async function generateISOComplianceReport(companyId: string) {
  try {
    // TODO: Implementar obtención de datos para evaluar cumplimiento
    // Este es un esquema básico, en la implementación real se obtendrían
    // datos reales de la plataforma
    
    // Evaluación de secciones principales del estándar
    const sections = [
      {
        section: 'Confidencialidad',
        items: [
          {
            requirement: 'Opción de denuncia anónima',
            compliant: true,
            value: 20
          },
          {
            requirement: 'Encriptación de datos sensibles',
            compliant: true, 
            value: 25
          },
          {
            requirement: 'Gestión segura de evidencias',
            compliant: true,
            value: 25
          },
          {
            requirement: 'Acceso restringido a información',
            compliant: true,
            value: 20
          }
        ],
        score: 90,
        maxScore: 100
      },
      {
        section: 'Accesibilidad',
        items: [
          {
            requirement: 'Múltiples canales de denuncia',
            compliant: true,
            value: 30
          },
          {
            requirement: 'Disponibilidad 24/7',
            compliant: true,
            value: 30
          },
          {
            requirement: 'Información clara sobre el proceso',
            compliant: true,
            value: 20
          },
          {
            requirement: 'Soporte multilingüe',
            compliant: false,
            value: 0,
            maxValue: 20
          }
        ],
        score: 80,
        maxScore: 100
      },
      {
        section: 'Protección contra represalias',
        items: [
          {
            requirement: 'Políticas explícitas anti-represalias',
            compliant: true,
            value: 25
          },
          {
            requirement: 'Mecanismos de denuncia anónima',
            compliant: true,
            value: 25
          },
          {
            requirement: 'Seguimiento de posibles represalias',
            compliant: false,
            value: 0,
            maxValue: 25
          },
          {
            requirement: 'Medidas disciplinarias para infractores',
            compliant: true,
            value: 25
          }
        ],
        score: 75,
        maxScore: 100
      },
      {
        section: 'Seguridad informática',
        items: [
          {
            requirement: 'Autenticación de dos factores',
            compliant: false,
            value: 0,
            maxValue: 20
          },
          {
            requirement: 'Aislamiento multi-tenant',
            compliant: true,
            value: 20
          },
          {
            requirement: 'Encriptación de comunicaciones',
            compliant: true,
            value: 20
          },
          {
            requirement: 'Detección de intrusiones',
            compliant: false,
            value: 0,
            maxValue: 20
          },
          {
            requirement: 'Auditoría de actividades',
            compliant: true,
            value: 20
          }
        ],
        score: 60,
        maxScore: 100
      }
    ];

    // Calcular puntuación general
    const totalScore = sections.reduce((sum, section) => sum + section.score, 0);
    const maxPossibleScore = sections.reduce((sum, section) => sum + section.maxScore, 0);
    const overallScore = Math.round((totalScore / maxPossibleScore) * 100);

    // Generar recomendaciones
    const recommendations = [
      'Implementar autenticación de dos factores para administradores',
      'Desarrollar sistema de detección de intrusiones',
      'Implementar soporte multilingüe para mejorar accesibilidad',
      'Crear sistema de seguimiento para posibles represalias'
    ];

    // Registrar historial de informes de cumplimiento
    const complianceRef = collection(db, `companies/${companyId}/complianceReports`);
    await addDoc(complianceRef, {
      timestamp: serverTimestamp(),
      sections,
      overallScore,
      recommendations,
      standard: 'ISO 37002:2021'
    });

    return {
      success: true,
      overallScore,
      sections,
      recommendations,
      timestamp: new Date().toISOString(),
      standard: 'ISO 37002:2021'
    };
  } catch (error) {
    logger.error('Error al generar informe de cumplimiento:', error);
    return { 
      success: false, 
      error: 'Error al generar informe de cumplimiento' 
    };
  }
}