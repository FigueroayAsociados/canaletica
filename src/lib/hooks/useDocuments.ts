// src/lib/hooks/useDocuments.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanyDocuments, uploadCompanyDocument, updateCompanyDocument, deleteCompanyDocument, getTermsDocument, getPrivacyDocument, saveTermsAndConditions, savePrivacyPolicy } from '@/lib/services/documentService';
import type { CompanyDocument } from '@/lib/services/documentService';

// Key para cachear los documentos por compañía
const companyDocumentsKey = (companyId: string) => ['company-documents', companyId];

// Key para cachear documentos legales específicos
const legalDocumentKey = (companyId: string, type: 'terms' | 'privacy') => 
  ['legal-document', companyId, type];

// Hook para obtener los documentos de una empresa
export function useCompanyDocuments(companyId: string) {
  return useQuery({
    queryKey: companyDocumentsKey(companyId),
    queryFn: async () => {
      try {
        const documents = await getCompanyDocuments(companyId);
        return { success: true, documents };
      } catch (error) {
        console.error('Error en useCompanyDocuments:', error);
        return {
          success: false, 
          error: error instanceof Error ? error.message : 'Error desconocido',
          documents: []
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Hook para obtener el documento de términos y condiciones
export function useTermsDocument(companyId: string) {
  return useQuery({
    queryKey: legalDocumentKey(companyId, 'terms'),
    queryFn: async () => {
      try {
        const document = await getTermsDocument(companyId);
        return { success: true, document };
      } catch (error) {
        console.error('Error en useTermsDocument:', error);
        return {
          success: false, 
          error: error instanceof Error ? error.message : 'Error desconocido',
          document: null
        };
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// Hook para obtener el documento de política de privacidad
export function usePrivacyDocument(companyId: string) {
  return useQuery({
    queryKey: legalDocumentKey(companyId, 'privacy'),
    queryFn: async () => {
      try {
        const document = await getPrivacyDocument(companyId);
        return { success: true, document };
      } catch (error) {
        console.error('Error en usePrivacyDocument:', error);
        return {
          success: false, 
          error: error instanceof Error ? error.message : 'Error desconocido',
          document: null
        };
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// Hook para subir un documento
export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      companyId, 
      file, 
      documentData 
    }: { 
      companyId: string; 
      file: File; 
      documentData: { 
        title: string; 
        description?: string; 
        isPublic?: boolean;
        documentType?: 'standard' | 'legal' | 'terms' | 'privacy';
      }; 
    }) => {
      const result = await uploadCompanyDocument(companyId, file, documentData);
      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidar la cache para forzar una recarga
      queryClient.invalidateQueries({
        queryKey: companyDocumentsKey(variables.companyId)
      });
      
      // Si es un documento legal, invalidar también esa caché
      if (variables.documentData.documentType === 'terms' || variables.documentData.documentType === 'privacy') {
        queryClient.invalidateQueries({
          queryKey: legalDocumentKey(variables.companyId, variables.documentData.documentType)
        });
      }
    }
  });
}

// Hook para guardar términos y condiciones como documento
export function useSaveTermsAndConditions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      companyId, 
      termsContent,
      title
    }: { 
      companyId: string; 
      termsContent: string;
      title?: string;
    }) => {
      return saveTermsAndConditions(companyId, termsContent, title);
    },
    onSuccess: (_, variables) => {
      // Invalidar la caché de documentos
      queryClient.invalidateQueries({
        queryKey: companyDocumentsKey(variables.companyId)
      });
      
      // Invalidar la caché del documento de términos
      queryClient.invalidateQueries({
        queryKey: legalDocumentKey(variables.companyId, 'terms')
      });
    }
  });
}

// Hook para guardar política de privacidad como documento
export function useSavePrivacyPolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      companyId, 
      privacyContent,
      title
    }: { 
      companyId: string; 
      privacyContent: string;
      title?: string;
    }) => {
      return savePrivacyPolicy(companyId, privacyContent, title);
    },
    onSuccess: (_, variables) => {
      // Invalidar la caché de documentos
      queryClient.invalidateQueries({
        queryKey: companyDocumentsKey(variables.companyId)
      });
      
      // Invalidar la caché del documento de privacidad
      queryClient.invalidateQueries({
        queryKey: legalDocumentKey(variables.companyId, 'privacy')
      });
    }
  });
}

// Hook para actualizar un documento
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      companyId, 
      documentId, 
      documentData,
      previousIsPublic // Para saber si cambió el status público/privado
    }: { 
      companyId: string; 
      documentId: string; 
      documentData: { 
        title: string; 
        description?: string; 
        isPublic?: boolean;
        documentType?: 'standard' | 'legal' | 'terms' | 'privacy';
      }; 
      previousIsPublic: boolean;
    }) => {
      await updateCompanyDocument(companyId, documentId, documentData);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      // Invalidar la cache para forzar una recarga
      queryClient.invalidateQueries({
        queryKey: companyDocumentsKey(variables.companyId)
      });
      
      // Si es un documento legal, invalidar también esa caché
      if (variables.documentData.documentType === 'terms' || variables.documentData.documentType === 'privacy') {
        queryClient.invalidateQueries({
          queryKey: legalDocumentKey(variables.companyId, variables.documentData.documentType)
        });
      }
    }
  });
}

// Hook para eliminar un documento
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      companyId, 
      documentId, 
      isPublic 
    }: { 
      companyId: string; 
      documentId: string; 
      isPublic: boolean;
    }) => {
      // Necesitamos obtener el nombre del archivo primero
      const documents = await getCompanyDocuments(companyId);
      const document = documents.find(doc => doc.id === documentId);
      
      if (!document) {
        throw new Error('Documento no encontrado');
      }
      
      await deleteCompanyDocument(companyId, documentId, document.fileName);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      // Invalidar la cache para forzar una recarga
      queryClient.invalidateQueries({
        queryKey: companyDocumentsKey(variables.companyId)
      });
      
      // Invalidar todas las cachés legales, por si acaso
      queryClient.invalidateQueries({
        queryKey: ['legal-document', variables.companyId]
      });
    }
  });
}