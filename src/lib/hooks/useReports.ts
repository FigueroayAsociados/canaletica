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
import { KarinProcessStage } from '@/types/report';

/**
 * Hook para obtener un reporte por su ID
 */
export function useReport(
  companyId: string,
  reportId: string,
  userRole?: string | null,
  userId?: string | null
) {
  return useQuery({
    queryKey: ['reports', companyId, reportId, userRole],
    queryFn: async () => {
      const result = await getReportById(companyId, reportId, userRole, userId);
      if (result.success) {
        return result.report;
      } else {
        throw new Error(result.error || 'Error al obtener reporte');
      }
    },
    enabled: !!reportId && !!companyId && userId !== undefined && userRole !== null, // Esperar a que usuario y rol estén cargados
  });
}

/**
 * Hook para obtener todos los reportes
 */
export function useReports(
  companyId: string,
  filters = {},
  userRole?: string | null,
  userId?: string | null
) {
  return useQuery({
    queryKey: ['reports', companyId, filters, userRole],
    queryFn: async () => {
      const result = await getAllReports(companyId, userRole, userId);
      if (result.success) {
        return result.reports;
      } else {
        throw new Error(result.error || 'Error al obtener reportes');
      }
    },
    // Solo habilitamos la consulta cuando tenemos companyId Y el userRole está definido
    // Esto evita que se ejecute antes de que el perfil esté cargado
    enabled: !!companyId && userRole !== undefined && userRole !== null,
  });
}

/**
 * Hook para obtener reportes específicos de Ley Karin
 * Solo se ejecuta cuando companyId, userRole y userId están disponibles
 */
export function useKarinReports(
  companyId: string,
  userRole?: string | null,
  userId?: string | null
) {
  // Añadimos manejo especial para super admin
  const isSuperAdmin = userRole === 'super_admin';
  
  return useQuery({
    queryKey: ['karinReports', companyId, userRole, userId],
    queryFn: async () => {
      const result = await getKarinReports(companyId, userRole, userId);
      if (result.success) {
        return result.reports;
      } else {
        throw new Error(result.error || 'Error al obtener reportes Karin');
      }
    },
    // Solo habilitamos la consulta cuando tengamos todos los datos necesarios
    // Pero para super admin, permitimos consultar incluso sin userId explícito
    enabled: !!companyId && (
      (isSuperAdmin && !!userRole) || // Super admin solo necesita el rol
      (!!userRole && !!userId) // Otros roles necesitan userRole y userId
    ),
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
      newStage: KarinProcessStage | string; // Acepta tanto KarinProcessStage como string para mantener compatibilidad
      additionalData?: any;
    }) => {
      // Asegurarnos de que newStage sea tratado como KarinProcessStage
      return updateKarinProcessStage(companyId, reportId, newStage as KarinProcessStage, additionalData);
    },
    
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
export function useUsersByRole(
  companyId: string,
  role: string,
  userRole?: string | null,
  userId?: string | null
) {
  return useQuery({
    queryKey: ['users', companyId, role, userRole],
    queryFn: async () => {
      const result = await getUsersByRole(companyId, role, userRole, userId);
      if (result.success) {
        return result.users;
      } else {
        throw new Error(result.error || 'Error al obtener usuarios');
      }
    },
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