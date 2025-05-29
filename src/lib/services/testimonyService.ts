// src/lib/services/testimonyService.ts

import { db, storage, auth } from '@/lib/firebase/config';
import { collection, doc, getDoc, updateDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Registra un nuevo testimonio formal para un caso Ley Karin
 * @param companyId ID de la compañía
 * @param reportId ID del reporte/caso
 * @param userId ID del usuario que registra el testimonio
 * @param testimonyData Datos del testimonio
 * @returns Resultado de la operación con ID del testimonio
 */
export async function addTestimony(
  companyId: string,
  reportId: string,
  userId: string,
  testimonyData: {
    personName: string;
    personType: 'complainant' | 'accused' | 'witness';
    date: string;
    location: string;
    interviewer: string;
    summary: string;
    interviewProtocol?: string;
    recordingConsent?: boolean;
    authorizedDisclosure?: boolean;
    isConfidential?: boolean;
    questions?: Array<{
      question: string;
      answer: string;
    }>;
    attachments?: Array<{
      id: string;
      fileId: string;
      fileName: string;
      fileType: string;
      uploadDate: string;
      description: string;
    }>;
  }
) {
  try {
    // Obtener referencia al documento del reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'El reporte no existe'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Crear un nuevo testimonio
    const testimonyId = uuidv4();
    const newTestimony = {
      id: testimonyId,
      ...testimonyData,
      interviewer: userId,
      interviewerName: auth.currentUser?.displayName || 'Usuario del sistema',
      date: Timestamp.fromDate(new Date(testimonyData.date)),
      hasSigned: false,
      physicalCopy: false,
      folioNumber: `T-${reportId.substring(0, 4)}-${testimonyId.substring(0, 4)}`,
      createdAt: new Date().toISOString(), // Usar toISOString para arrays
    };
    
    // Actualizar el array de testimonios en el reporte
    const testimonies = reportData.karinProcess?.testimonies || [];
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.testimonies': [...testimonies, newTestimony],
      'updatedAt': serverTimestamp()
    });
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: userId,
      actionType: 'testimony_added',
      description: `Testimonio registrado para ${testimonyData.personName}`,
      details: {
        testimonyId,
        personType: testimonyData.personType,
      },
      visibleToReporter: false,
    });
    
    return {
      success: true,
      testimonyId
    };
  } catch (error) {
    console.error('Error al registrar testimonio:', error);
    return {
      success: false,
      error: `Error al registrar testimonio: ${error.message}`
    };
  }
}

/**
 * Registra la firma de un testimonio
 * @param companyId ID de la compañía
 * @param reportId ID del reporte/caso
 * @param testimonyId ID del testimonio a firmar
 * @param signatureData Datos de la firma
 * @returns Resultado de la operación
 */
export async function signTestimony(
  companyId: string,
  reportId: string,
  testimonyId: string,
  signatureData: {
    signatureMethod: 'fisica' | 'electronica' | 'firma_simple';
    authorizedDisclosure?: boolean;
    witnessName?: string;
    witnessPosition?: string;
    signatureObservations?: string;
    signedAt: string;
    signatureVerifiedBy: string;
    signatureVerifiedByName?: string;
    signatureImageId?: string;
  }
) {
  try {
    console.log(`Intentando firmar testimonio ${testimonyId} para reporte ${reportId} de compañía ${companyId}`);
    
    // Obtener referencia al documento del reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      console.error(`Reporte ${reportId} no encontrado`);
      return {
        success: false,
        error: 'El reporte no existe'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Inicializar karinProcess si no existe
    if (!reportData.karinProcess) {
      console.log('Inicializando karinProcess en el reporte');
      await updateDoc(reportRef, {
        karinProcess: {
          testimonies: [],
          extendedInterviews: []
        }
      });
      return {
        success: false,
        error: 'Se ha inicializado el proceso Karin. Por favor, intente nuevamente.'
      };
    }
    
    // Obtener testimonios existentes
    const testimonies = reportData.karinProcess?.testimonies || [];
    console.log(`Encontrados ${testimonies.length} testimonios en el reporte`);
    
    // Buscar el testimonio a firmar
    const testimonyIndex = testimonies.findIndex((t: any) => t.id === testimonyId);
    if (testimonyIndex === -1) {
      console.error(`Testimonio ${testimonyId} no encontrado en el array de testimonios`);
      
      // Alternativa: Buscar en las entrevistas y crear el testimonio si es necesario
      const extendedInterviews = reportData.karinProcess?.extendedInterviews || [];
      const interview = extendedInterviews.find((i: any) => i.id === testimonyId);
      
      if (interview) {
        console.log('Se encontró la entrevista, creando testimonio automáticamente');
        // Crear un testimonio basado en la entrevista
        const newTestimony = {
          id: testimonyId,
          personName: interview.interviewee,
          personType: 'witness',
          date: interview.date,
          location: interview.location || 'No especificado',
          interviewer: interview.conductedBy,
          interviewerName: interview.conductedByName || 'Usuario del sistema',
          summary: interview.summary,
          hasSigned: false,
          folioNumber: `T-${reportId.substring(0, 4)}-${testimonyId.substring(0, 4)}`,
          createdAt: new Date().toISOString(), // Usar toISOString para compatibilidad con arrays
        };
        
        // Actualizar el documento con el nuevo testimonio
        await updateDoc(reportRef, {
          'karinProcess.testimonies': [...testimonies, newTestimony],
        });
        
        return {
          success: false,
          error: 'Se ha creado el testimonio. Por favor, intente firmar nuevamente.'
        };
      }
      
      return {
        success: false,
        error: 'El testimonio no fue encontrado'
      };
    }
    
    // Actualizar el testimonio con los datos de firma
    const updatedTestimonies = [...testimonies];
    updatedTestimonies[testimonyIndex] = {
      ...updatedTestimonies[testimonyIndex],
      hasSigned: true,
      signatureDetails: signatureData,
      signatureDate: signatureData.signedAt,
      updatedAt: new Date().toISOString(), // Usar toISOString en lugar de serverTimestamp en arrays
    };
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.testimonies': updatedTestimonies,
      'updatedAt': serverTimestamp()
    });
    
    // Actualizar también en las entrevistas extendidas si existe
    if (reportData.karinProcess?.extendedInterviews) {
      const extendedInterviews = reportData.karinProcess.extendedInterviews || [];
      const interviewIndex = extendedInterviews.findIndex((i: any) => i.testimonyId === testimonyId);
      
      if (interviewIndex !== -1) {
        const updatedInterviews = [...extendedInterviews];
        updatedInterviews[interviewIndex] = {
          ...updatedInterviews[interviewIndex],
          status: 'signed',
          signatureDate: signatureData.signedAt,
          physicalCopyGenerated: signatureData.signatureMethod === 'fisica',
          updatedAt: new Date().toISOString(),
        };
        
        // Actualizar entrevistas extendidas
        await updateDoc(reportRef, {
          'karinProcess.extendedInterviews': updatedInterviews,
        });
      }
    }
    
    // Registrar actividad
    const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
    await addDoc(activitiesRef, {
      timestamp: serverTimestamp(),
      actorId: signatureData.signatureVerifiedBy,
      actionType: 'testimony_signed',
      description: `Testimonio firmado con método: ${
        signatureData.signatureMethod === 'fisica' 
          ? 'firma física' 
          : signatureData.signatureMethod === 'electronica'
            ? 'firma electrónica avanzada'
            : 'firma simple'
      }`,
      details: {
        testimonyId,
        signatureMethod: signatureData.signatureMethod,
        witnessName: signatureData.witnessName
      },
      visibleToReporter: false,
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al firmar testimonio:', error);
    return {
      success: false,
      error: `Error al firmar testimonio: ${error.message}`
    };
  }
}

/**
 * Sube un documento asociado a un testimonio
 * @param companyId ID de la compañía
 * @param reportId ID del reporte/caso
 * @param testimonyId ID del testimonio
 * @param file Archivo a subir
 * @param description Descripción del archivo
 * @returns Resultado de la operación con detalles del archivo
 */
export async function uploadTestimonyAttachment(
  companyId: string,
  reportId: string,
  testimonyId: string,
  file: File,
  description: string
) {
  try {
    // Generar ID para el archivo
    const attachmentId = uuidv4();
    
    // Crear ruta de almacenamiento
    const filePath = `companies/${companyId}/reports/${reportId}/testimonies/${testimonyId}/${attachmentId}_${file.name}`;
    const storageRef = ref(storage, filePath);
    
    // Subir archivo
    await uploadBytes(storageRef, file);
    
    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(storageRef);
    
    // Obtener referencia al documento del reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'El reporte no existe'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Obtener testimonios existentes
    const testimonies = reportData.karinProcess?.testimonies || [];
    
    // Buscar el testimonio
    const testimonyIndex = testimonies.findIndex((t: any) => t.id === testimonyId);
    if (testimonyIndex === -1) {
      return {
        success: false,
        error: 'El testimonio no fue encontrado'
      };
    }
    
    // Crear información del archivo adjunto
    const attachment = {
      id: attachmentId,
      fileId: filePath,
      fileName: file.name,
      fileType: file.type,
      uploadDate: new Date().toISOString(),
      description,
      url: downloadURL
    };
    
    // Actualizar el testimonio con el nuevo adjunto
    const updatedTestimonies = [...testimonies];
    updatedTestimonies[testimonyIndex].attachments = [
      ...(updatedTestimonies[testimonyIndex].attachments || []),
      attachment
    ];
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.testimonies': updatedTestimonies,
      'updatedAt': serverTimestamp()
    });
    
    return {
      success: true,
      attachmentId,
      fileURL: downloadURL
    };
  } catch (error) {
    console.error('Error al subir adjunto de testimonio:', error);
    return {
      success: false,
      error: `Error al subir adjunto: ${error.message}`
    };
  }
}

/**
 * Convierte una entrevista existente en un testimonio formal
 * @param companyId ID de la compañía
 * @param reportId ID del reporte/caso
 * @param interviewId ID de la entrevista a convertir
 * @param userId ID del usuario que realiza la conversión
 * @returns Resultado de la operación
 */
export async function convertInterviewToTestimony(
  companyId: string,
  reportId: string,
  interviewId: string,
  userId: string
) {
  try {
    // Obtener referencia al documento del reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'El reporte no existe'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Buscar la entrevista en las actividades o en extendedInterviews
    let interview = null;
    
    // Verificar primero en extendedInterviews si existe
    if (reportData.karinProcess?.extendedInterviews) {
      const extendedInterviews = reportData.karinProcess.extendedInterviews;
      interview = extendedInterviews.find((i: any) => i.id === interviewId);
      
      if (interview) {
        // Actualizar la entrevista para marcarla como testimonio
        const updatedInterviews = extendedInterviews.map((i: any) => {
          if (i.id === interviewId) {
            return {
              ...i,
              isTestimony: true,
              status: 'pending_signature',
              updatedAt: new Date().toISOString()
            };
          }
          return i;
        });
        
        // Actualizar el documento con la entrevista modificada
        await updateDoc(reportRef, {
          'karinProcess.extendedInterviews': updatedInterviews,
          'updatedAt': serverTimestamp()
        });
        
        // Crear un testimonio basado en la entrevista
        const testimonyId = uuidv4();
        const newTestimony = {
          id: testimonyId,
          personName: interview.interviewee,
          personType: 'witness', // Valor por defecto, se puede cambiar después
          date: Timestamp.fromDate(new Date(interview.date)),
          location: interview.location || 'No especificado',
          interviewer: interview.conductedBy,
          interviewerName: interview.conductedByName || auth.currentUser?.displayName || 'Usuario del sistema',
          summary: interview.summary,
          interviewProtocol: interview.protocol || 'formal',
          recordingConsent: interview.recordingConsent || false,
          authorizedDisclosure: false,
          isConfidential: interview.isConfidential || false,
          questions: interview.questions || [],
          hasSigned: false,
          physicalCopy: false,
          folioNumber: `T-${reportId.substring(0, 4)}-${testimonyId.substring(0, 4)}`,
          createdAt: serverTimestamp(),
          testimonyFromInterviewId: interviewId,
        };
        
        // Actualizar el array de testimonios en el reporte
        const testimonies = reportData.karinProcess?.testimonies || [];
        
        // Actualizar el documento con el nuevo testimonio
        await updateDoc(reportRef, {
          'karinProcess.testimonies': [...testimonies, newTestimony],
        });
        
        // Vincular el testimonio con la entrevista
        const finalInterviews = updatedInterviews.map((i: any) => {
          if (i.id === interviewId) {
            return {
              ...i,
              testimonyId: testimonyId,
            };
          }
          return i;
        });
        
        await updateDoc(reportRef, {
          'karinProcess.extendedInterviews': finalInterviews,
        });
        
        // Registrar actividad
        const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
        await addDoc(activitiesRef, {
          timestamp: serverTimestamp(),
          actorId: userId,
          actionType: 'interview_converted_to_testimony',
          description: `Entrevista convertida a testimonio formal para ${interview.interviewee}`,
          details: {
            interviewId,
            testimonyId,
          },
          visibleToReporter: false,
        });
        
        return {
          success: true,
          testimonyId
        };
      }
    }
    
    // Si no se encontró la entrevista
    if (!interview) {
      return {
        success: false,
        error: 'La entrevista no fue encontrada'
      };
    }
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al convertir entrevista a testimonio:', error);
    return {
      success: false,
      error: `Error en la conversión: ${error.message}`
    };
  }
}

/**
 * Crea una versión física de un testimonio (genera un PDF)
 * @param companyId ID de la compañía
 * @param reportId ID del reporte/caso
 * @param testimonyId ID del testimonio
 * @returns URL del documento PDF generado
 */
export async function generatePhysicalTestimony(
  companyId: string,
  reportId: string,
  testimonyId: string
) {
  try {
    // Obtener referencia al documento del reporte
    const reportRef = doc(db, `companies/${companyId}/reports/${reportId}`);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return {
        success: false,
        error: 'El reporte no existe'
      };
    }
    
    const reportData = reportSnap.data();
    
    // Obtener testimonios existentes
    const testimonies = reportData.karinProcess?.testimonies || [];
    
    // Buscar el testimonio
    const testimonyIndex = testimonies.findIndex((t: any) => t.id === testimonyId);
    if (testimonyIndex === -1) {
      return {
        success: false,
        error: 'El testimonio no fue encontrado'
      };
    }
    
    // Aquí iría la lógica para generar el PDF con una librería como pdfmake o jspdf
    // Por simplicidad, simularemos que se ha generado y solo actualizaremos el estado
    
    // Actualizar el testimonio para marcar que tiene copia física
    const updatedTestimonies = [...testimonies];
    updatedTestimonies[testimonyIndex] = {
      ...updatedTestimonies[testimonyIndex],
      physicalCopy: true,
      physicalCopyGeneratedAt: new Date().toISOString(),
    };
    
    // Actualizar el documento
    await updateDoc(reportRef, {
      'karinProcess.testimonies': updatedTestimonies,
      'updatedAt': serverTimestamp()
    });
    
    // Actualizar también en las entrevistas extendidas si existe
    if (reportData.karinProcess?.extendedInterviews) {
      const extendedInterviews = reportData.karinProcess.extendedInterviews || [];
      const interviewIndex = extendedInterviews.findIndex((i: any) => i.testimonyId === testimonyId);
      
      if (interviewIndex !== -1) {
        const updatedInterviews = [...extendedInterviews];
        updatedInterviews[interviewIndex] = {
          ...updatedInterviews[interviewIndex],
          physicalCopyGenerated: true,
          updatedAt: new Date().toISOString(),
        };
        
        // Actualizar entrevistas extendidas
        await updateDoc(reportRef, {
          'karinProcess.extendedInterviews': updatedInterviews,
        });
      }
    }
    
    return {
      success: true,
      // pdfUrl: generatedPdfUrl, // Aquí iría la URL real del PDF generado
    };
  } catch (error) {
    console.error('Error al generar copia física del testimonio:', error);
    return {
      success: false,
      error: `Error al generar copia física: ${error.message}`
    };
  }
}