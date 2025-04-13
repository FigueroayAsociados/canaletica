'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getReportById,
  getAllReports, 
  getKarinReports, 
  updateKarinProcessStage,
  updateReportStatus,
  assignReport,
  assignInvestigator,
  addCommunication
} from '@/lib/services/reportService';
import { getUsersByRole } from '@/lib/services/userService';

/**
 * Hook para obtener un reporte por su ID
 */
export function useReport(companyId: string, reportId: string) {
  return useQuery({
    queryKey: ['reports', companyId, reportId],
    queryFn: () => getReportById(companyId, reportId),
    enabled: !!reportId && !!companyId,
  });
}

/**
 * Hook para obtener todos los reportes
 */
export function useReports(companyId: string, filters = {}) {
  return useQuery({
    queryKey: ['reports', companyId, filters],
    queryFn: () => getAllReports(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para obtener reportes específicos de Ley Karin
 */
export function useKarinReports(companyId: string) {
  return useQuery({
    queryKey: ['karinReports', companyId],
    queryFn: () => getKarinReports(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para actualizar el estado de un reporte de Ley Karin
 */
export function useUpdateKarinStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      companyId, 
      reportId, 
      newStage, 
      additionalData = {} 
    }: {
      companyId: string;
      reportId: string;
      newStage: string;
      additionalData?: any;
    }) => updateKarinProcessStage(companyId, reportId, newStage, additionalData),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas relevantes para recargar los datos
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId, variables.reportId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['karinReports', variables.companyId] 
      });
    },
  });
}

/**
 * Hook para actualizar el estado general de un reporte
 */
export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      companyId, 
      reportId, 
      status, 
      additionalData = {} 
    }: {
      companyId: string;
      reportId: string;
      status: string;
      additionalData?: any;
    }) => updateReportStatus(companyId, reportId, status, additionalData),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas relevantes para recargar los datos
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId, variables.reportId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId] 
      });
    },
  });
}

/**
 * Hook para asignar un reporte a un investigador
 */
export function useAssignReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      companyId, 
      reportId, 
      investigatorId,
      investigatorName
    }: {
      companyId: string;
      reportId: string;
      investigatorId: string;
      investigatorName: string;
    }) => assignReport(companyId, reportId, investigatorId, investigatorName),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas relevantes para recargar los datos
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId, variables.reportId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId] 
      });
    },
  });
}

/**
 * Hook para obtener usuarios por rol (ej. investigadores)
 */
export function useUsersByRole(companyId: string, role: string) {
  return useQuery({
    queryKey: ['users', companyId, role],
    queryFn: () => getUsersByRole(companyId, role),
    enabled: !!companyId && !!role,
  });
}

/**
 * Hook para asignar un investigador a una denuncia
 */
export function useAssignInvestigator() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      companyId, 
      reportId, 
      investigatorId, 
      actorId,
      comment 
    }: {
      companyId: string;
      reportId: string;
      investigatorId: string;
      actorId: string;
      comment?: string;
    }) => assignInvestigator(companyId, reportId, investigatorId, actorId, comment),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas relevantes para recargar los datos
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId, variables.reportId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId] 
      });
    },
  });
}

/**
 * Hook para añadir una comunicación a la denuncia
 */
export function useAddCommunication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      companyId, 
      reportId, 
      senderId, 
      content,
      isFromReporter,
      isInternal
    }: {
      companyId: string;
      reportId: string;
      senderId: string;
      content: string;
      isFromReporter: boolean;
      isInternal: boolean;
    }) => addCommunication(companyId, reportId, senderId, content, isFromReporter, isInternal),
    
    onSuccess: (_, variables) => {
      // Invalidar consultas relevantes para recargar los datos
      queryClient.invalidateQueries({ 
        queryKey: ['reports', variables.companyId, variables.reportId] 
      });
    },
  });
}