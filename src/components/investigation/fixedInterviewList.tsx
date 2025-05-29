// ARCHIVO DE REEMPLAZO PARA InterviewList.tsx
// Contiene mejoras para manejar entrevistas y testimonios correctamente

// Nota: Este archivo contiene únicamente los cambios clave para el manejo de testimonios
// Se debe integrar con el archivo InterviewList.tsx existente

'use client';

// Importación de módulos
import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { v4 as uuidv4 } from 'uuid';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { addInterview, convertInterviewToTestimony, signTestimony } from '@/lib/services/investigationService';

// Manejar el envío del formulario de firma
const handleSignTestimony = async (
  values: any,
  selectedInterview: any,
  companyId: string,
  reportId: string,
  uid: string,
  displayName: string,
  setIsSubmitting: Function,
  setError: Function,
  setSuccess: Function,
  setShowSignatureForm: Function,
  setSelectedInterview: Function,
  onInterviewAdded: Function
) => {
  if (!uid || !selectedInterview) return;
  
  setIsSubmitting(true);
  setError(null);
  
  try {
    const signatureData = {
      signatureMethod: values.signatureMethod,
      authorizedDisclosure: values.authorizedDisclosure,
      witnessName: values.witnessName,
      witnessPosition: values.witnessPosition,
      signatureObservations: values.signatureObservations,
      signedAt: new Date().toISOString(),
      signatureVerifiedBy: uid,
      signatureVerifiedByName: displayName || 'Usuario del sistema',
    };
    
    // Determinar el ID correcto a usar para la firma
    // 1. Preferir testimonyId si existe
    // 2. Usar ID de la entrevista solo como último recurso
    const idToUse = selectedInterview.testimonyId || selectedInterview.id;
    console.log('Firmando testimonio:', idToUse, 'para entrevista:', selectedInterview.id);
    
    const result = await signTestimony(
      companyId,
      reportId,
      idToUse,
      signatureData
    );
    
    if (result.success) {
      setSuccess('Testimonio firmado correctamente');
      setShowSignatureForm(false);
      setSelectedInterview(null);
      
      // Si la API devolvió un ID de testimonio, usarlo para actualizar la UI
      const effectiveTestimonyId = result.testimonyId || idToUse;
      
      // Actualizar la lista de testimonios
      const updatedInterview = {
        ...selectedInterview,
        status: 'signed',
        testimonyId: effectiveTestimonyId,
        signatureDetails: signatureData,
      };
      
      // Notificar al componente padre para que actualice los datos
      onInterviewAdded(updatedInterview);
      
      // Volver a cargar la página con foco en la pestaña correcta
      setTimeout(() => {
        window.location.href = `/dashboard/investigation/${reportId}?tab=interviews&refresh=${Date.now()}`;
      }, 1500);
    } else if (result.testimonyId) {
      // Si la API creó un nuevo testimonio, intentar firmar con el nuevo ID
      const retryValues = { ...values };
      const retryInterview = { 
        ...selectedInterview,
        testimonyId: result.testimonyId
      };
      
      setSuccess('Se ha creado un nuevo testimonio. Intentando firmar automáticamente...');
      
      // Esperar un momento y volver a intentar con el nuevo ID
      setTimeout(() => {
        handleSignTestimony(
          retryValues,
          retryInterview,
          companyId,
          reportId,
          uid,
          displayName,
          setIsSubmitting,
          setError,
          setSuccess,
          setShowSignatureForm,
          setSelectedInterview,
          onInterviewAdded
        );
      }, 1000);
    } else {
      setError(result.error || 'Error al firmar el testimonio');
      setIsSubmitting(false);
    }
  } catch (error) {
    console.error('Error al firmar el testimonio:', error);
    setError('Ha ocurrido un error al firmar el testimonio');
    setIsSubmitting(false);
  }
};

// Convertir entrevista a testimonio
const handleConvertToTestimony = async (
  interview: any,
  companyId: string,
  reportId: string,
  uid: string,
  setIsSubmitting: Function,
  setError: Function,
  setSuccess: Function,
  setPendingTestimonies: Function,
  onInterviewAdded: Function
) => {
  if (!uid) return;
  
  setIsSubmitting(true);
  setError(null);
  
  try {
    const result = await convertInterviewToTestimony(
      companyId,
      reportId,
      interview.id,
      uid
    );
    
    if (result.success) {
      setSuccess('Entrevista convertida a testimonio correctamente');
      
      // Actualizar la UI con el ID del testimonio recién creado
      const updatedInterview = {
        ...interview,
        isTestimony: true,
        status: 'pending_signature',
        testimonyId: result.testimonyId, // Guardar el ID del testimonio
      };
      
      // Añadir a pendientes
      setPendingTestimonies(prev => [...prev, updatedInterview]);
      
      // Notificar al componente padre
      onInterviewAdded(updatedInterview);
      
      // Opcional: recargar para asegurar datos frescos
      setTimeout(() => {
        window.location.href = `/dashboard/investigation/${reportId}?tab=interviews&refresh=${Date.now()}`;
      }, 1500);
    } else {
      setError(result.error || 'Error al convertir la entrevista a testimonio');
    }
  } catch (error) {
    console.error('Error al convertir a testimonio:', error);
    setError('Ha ocurrido un error al convertir la entrevista a testimonio');
  } finally {
    setIsSubmitting(false);
  }
};

// Función auxiliar para procesar entrevistas y separar en testimonios
export function processInterviews(interviews, setSignedTestimonies, setPendingTestimonies) {
  console.log('Procesando entrevistas para testimonios:', interviews);
  
  if (!interviews || !Array.isArray(interviews)) {
    console.log('No hay entrevistas para procesar o no es un array');
    setSignedTestimonies([]);
    setPendingTestimonies([]);
    return;
  }

  // Identificar entrevistas con testimonyId
  const interviewsWithTestimonyId = interviews.filter(
    interview => interview.isTestimony && interview.testimonyId
  );
  
  // Identificar testimonios pendientes vs firmados
  const signed = interviewsWithTestimonyId.filter(
    interview => interview.status === 'signed' || interview.status === 'verified'
  );
  
  const pending = interviewsWithTestimonyId.filter(
    interview => interview.status === 'pending_signature'
  );
  
  console.log('Testimonios firmados:', signed.length, 'Testimonios pendientes:', pending.length);
  
  setSignedTestimonies(signed);
  setPendingTestimonies(pending);
}

// Exportar funciones de utilidad para el manejo de testimonios
export {
  handleSignTestimony,
  handleConvertToTestimony
};