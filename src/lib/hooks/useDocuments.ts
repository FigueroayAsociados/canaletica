'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadCompanyDocument,
  getCompanyDocuments,
  getPublicCompanyDocuments,
  updateCompanyDocument,
  deleteCompanyDocument,
  CompanyDocument
} from '@/lib/services/documentService';

/**
 * Hook para obtener documentos de una empresa
 */
export function useCompanyDocuments(companyId: string) {
  return useQuery({
    queryKey: ['documents', companyId],
    queryFn: () => getCompanyDocuments(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para obtener documentos públicos de una empresa
 */
export function usePublicCompanyDocuments(companyId: string) {
  return useQuery({
    queryKey: ['publicDocuments', companyId],
    queryFn: () => getPublicCompanyDocuments(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para subir un documento
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      companyId,
      file,
      documentData,
    }: {
      companyId: string;
      file: File;
      documentData: {
        title: string;
        description: string;
        isPublic: boolean;
      };
    }) => uploadCompanyDocument(companyId, file, documentData),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas de documentos para recargar datos
      queryClient.invalidateQueries({ 
        queryKey: ['documents', variables.companyId]
      });
      
      // Si es público, invalidar también la lista de documentos públicos
      if (variables.documentData.isPublic) {
        queryClient.invalidateQueries({ 
          queryKey: ['publicDocuments', variables.companyId]
        });
      }
    },
  });
}

/**
 * Hook para actualizar documento
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      companyId,
      documentId,
      documentData,
      previousIsPublic
    }: {
      companyId: string;
      documentId: string;
      documentData: {
        title: string;
        description: string;
        isPublic: boolean;
      };
      previousIsPublic: boolean;
    }) => updateCompanyDocument(companyId, documentId, documentData),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas de documentos para recargar datos
      queryClient.invalidateQueries({ 
        queryKey: ['documents', variables.companyId]
      });
      
      // Si cambia la visibilidad o si es público, invalidar también los documentos públicos
      if (variables.documentData.isPublic !== variables.previousIsPublic || variables.documentData.isPublic) {
        queryClient.invalidateQueries({ 
          queryKey: ['publicDocuments', variables.companyId]
        });
      }
    },
  });
}

/**
 * Hook para eliminar documento
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      companyId,
      documentId,
      isPublic
    }: {
      companyId: string;
      documentId: string;
      isPublic: boolean;
    }) => deleteCompanyDocument(companyId, documentId),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas de documentos para recargar datos
      queryClient.invalidateQueries({ 
        queryKey: ['documents', variables.companyId]
      });
      
      // Si es público, invalidar también la lista de documentos públicos
      if (variables.isPublic) {
        queryClient.invalidateQueries({ 
          queryKey: ['publicDocuments', variables.companyId]
        });
      }
    },
  });
}