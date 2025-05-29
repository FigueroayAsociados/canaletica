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
    
    // Obtener testimonios y entrevistas existentes
    const testimonies = reportData.karinProcess?.testimonies || [];
    const extendedInterviews = reportData.karinProcess?.extendedInterviews || [];
    
    console.log(`Encontrados ${testimonies.length} testimonios y ${extendedInterviews.length} entrevistas en el reporte`);
    
    // ESTRATEGIA DE BÚSQUEDA MEJORADA:
    
    // 1. Primero buscar el testimonio directamente por su ID
    let testimonyIndex = testimonies.findIndex((t: any) => t.id === testimonyId);
    
    // 2. Si no se encuentra, buscar entrevistas que tengan este testimonyId
    if (testimonyIndex === -1) {
      console.log(`Testimonio ${testimonyId} no encontrado directamente, buscando en entrevistas con testimonyId`);
      
      // Buscar entrevistas que referencien este testimonio
      const interviewWithTestimonyRef = extendedInterviews.find(
        (i: any) => i.testimonyId === testimonyId
      );
      
      if (interviewWithTestimonyRef) {
        console.log(`Encontrada entrevista que referencia al testimonio ${testimonyId}`);
        
        // Volver a buscar el testimonio con el ID correcto
        testimonyIndex = testimonies.findIndex((t: any) => t.id === interviewWithTestimonyRef.testimonyId);
        
        if (testimonyIndex !== -1) {
          console.log(`Testimonio encontrado a través de referencia en entrevista`);
        }
      }
    }
    
    // 3. Si aún no se encuentra, buscar la entrevista por ID y crear un testimonio
    if (testimonyIndex === -1) {
      console.log(`Testimonio no encontrado, buscando entrevista con ID ${testimonyId}`);
      
      // Buscar entrevista por ID
      const interview = extendedInterviews.find((i: any) => i.id === testimonyId);
      
      // IMPORTANTE: Verificar si esta entrevista ya está asociada a un testimonio existente
      if (interview && interview.testimonyId) {
        // Ya tiene un testimonyId asignado, intentar encontrar ese testimonio
        const existingTestimony = testimonies.find((t: any) => t.id === interview.testimonyId);
        if (existingTestimony) {
          // El testimonio existe, usar ese ID en lugar de crear uno nuevo
          return {
            success: false,
            error: `Esta entrevista ya tiene un testimonio asociado con ID ${interview.testimonyId}. Por favor, use ese ID para firmar.`,
            testimonyId: interview.testimonyId
          };
        }
      }
      
      if (interview) {
        console.log('Se encontró la entrevista, creando testimonio automáticamente');
        
        // Generar un nuevo ID único para el testimonio
        const newTestimonyId = uuidv4();
        
        // Crear un testimonio basado en la entrevista
        const newTestimony = {
          id: newTestimonyId, // Nuevo ID único
          personName: interview.interviewee,
          personType: 'witness',
          date: interview.date,
          location: interview.location || 'No especificado',
          interviewer: interview.conductedBy,
          interviewerName: interview.conductedByName || 'Usuario del sistema',
          summary: interview.summary,
          hasSigned: false,
          status: 'pending_signature',
          folioNumber: `T-${reportId.substring(0, 4)}-${newTestimonyId.substring(0, 4)}`,
          createdAt: new Date().toISOString(),
          fromInterviewId: interview.id // Mantener referencia a la entrevista original
        };
        
        // Actualizar la entrevista para incluir la referencia al testimonio
        const updatedInterviews = extendedInterviews.map((i: any) => {
          if (i.id === interview.id) {
            return {
              ...i,
              isTestimony: true,
              testimonyId: newTestimonyId,
              status: 'pending_signature'
            };
          }
          return i;
        });
        
        // Actualizar ambos en una operación atómica
        await updateDoc(reportRef, {
          'karinProcess.testimonies': [...testimonies, newTestimony],
          'karinProcess.extendedInterviews': updatedInterviews
        });
        
        // IMPORTANTE: No devolver success=false, sino un objeto que indique que se debe recargar
        return {
          success: false,
          needsReload: true,
          error: 'Se ha creado un nuevo testimonio. Por favor, recargue la página para firmar con el ID correcto.',
          testimonyId: newTestimonyId // Devolver el nuevo ID para que el cliente pueda usarlo
        };
      }
      
      return {
        success: false,
        error: 'No se encontró ningún testimonio ni entrevista con el ID proporcionado'
      };
    }
    
    // Si llegamos aquí, hemos encontrado el testimonio y podemos firmarlo
    console.log(`Firmando testimonio encontrado en índice ${testimonyIndex}`);
    
    // Actualizar el testimonio con los datos de firma
    const updatedTestimonies = [...testimonies];
    updatedTestimonies[testimonyIndex] = {
      ...updatedTestimonies[testimonyIndex],
      hasSigned: true,
      status: 'signed',
      signatureDetails: signatureData,
      signatureDate: signatureData.signedAt,
      updatedAt: new Date().toISOString(),
    };
    
    // Buscar y actualizar también la entrevista relacionada
    const updatedInterviews = extendedInterviews.map((interview: any) => {
      // Si esta entrevista está relacionada con el testimonio (ya sea por id o testimonyId)
      if (interview.id === testimonies[testimonyIndex].fromInterviewId || 
          interview.testimonyId === testimonies[testimonyIndex].id) {
        return {
          ...interview,
          status: 'signed', // Actualizar status también en la entrevista
          isTestimony: true,
          testimonyId: testimonies[testimonyIndex].id
        };
      }
      return interview;
    });
    
    // Actualizar todo en una operación atómica
    await updateDoc(reportRef, {
      'karinProcess.testimonies': updatedTestimonies,
      'karinProcess.extendedInterviews': updatedInterviews,
      'updatedAt': serverTimestamp() // Este está bien porque no está dentro de un array
    });
    
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
      success: true,
      testimonyId: testimonies[testimonyIndex].id
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
        // Verificar si esta entrevista ya tiene un testimonio asociado
        if (interview.isTestimony && interview.testimonyId) {
          console.log(`Esta entrevista ya está asociada al testimonio ${interview.testimonyId}`);
          
          // Verificar si el testimonio existe
          const testimonies = reportData.karinProcess?.testimonies || [];
          const existingTestimony = testimonies.find((t: any) => t.id === interview.testimonyId);
          
          if (existingTestimony) {
            return {
              success: true,
              testimonyId: existingTestimony.id,
              message: 'Esta entrevista ya está asociada a un testimonio existente'
            };
          }
        }
        
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
          status: 'pending_signature',
          physicalCopy: false,
          folioNumber: `T-${reportId.substring(0, 4)}-${testimonyId.substring(0, 4)}`,
          createdAt: new Date().toISOString(), // Usar toISOString para arrays
          fromInterviewId: interviewId,
        };
        
        // Actualizar el array de testimonios en el reporte
        const testimonies = reportData.karinProcess?.testimonies || [];
        
        // Actualizar la entrevista para marcarla como testimonio y vincularla
        const updatedInterviews = reportData.karinProcess.extendedInterviews.map((i: any) => {
          if (i.id === interviewId) {
            return {
              ...i,
              isTestimony: true,
              status: 'pending_signature',
              testimonyId: testimonyId,
              updatedAt: new Date().toISOString()
            };
          }
          return i;
        });
        
        // Actualizar el documento en una operación atómica
        await updateDoc(reportRef, {
          'karinProcess.testimonies': [...testimonies, newTestimony],
          'karinProcess.extendedInterviews': updatedInterviews,
          'updatedAt': serverTimestamp()
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