// src/lib/hooks/useCompliance.ts
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EvaluacionRiesgo, ComplianceConfig } from '@/types/compliance';

/**
 * Hook para verificar si el módulo de compliance está habilitado
 */
export function useComplianceEnabled(companyId: string) {
  return useQuery({
    queryKey: ['compliance', 'enabled', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/compliance/config?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error('Error verificando configuración de compliance');
      }
      const data = await response.json();
      return data.enabled || false;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook para obtener la evaluación de riesgo de una denuncia
 */
export function useEvaluacionRiesgo(companyId: string, reportId: string) {
  return useQuery({
    queryKey: ['compliance', 'evaluacion', companyId, reportId],
    queryFn: async () => {
      const response = await fetch(`/api/compliance/report/${reportId}?companyId=${companyId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No hay evaluación aún
        }
        throw new Error('Error obteniendo evaluación de riesgo');
      }
      const data = await response.json();
      return data.evaluacion as EvaluacionRiesgo;
    },
    enabled: !!companyId && !!reportId,
  });
}

/**
 * Hook para evaluar el riesgo de una denuncia
 */
export function useEvaluarRiesgo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, companyId }: { reportId: string; companyId: string }) => {
      const response = await fetch('/api/compliance/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, companyId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error evaluando riesgo');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidar consultas relacionadas para refrescar los datos
      queryClient.invalidateQueries({ 
        queryKey: ['compliance', 'evaluacion', variables.companyId, variables.reportId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['compliance', 'stats', variables.companyId] 
      });
    },
  });
}

/**
 * Hook para obtener estadísticas de compliance
 */
export function useEstadisticasCompliance(companyId: string) {
  return useQuery({
    queryKey: ['compliance', 'stats', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/compliance/stats?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error('Error obteniendo estadísticas de compliance');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook para configurar el módulo de compliance
 */
export function useConfigurarCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      config 
    }: { 
      companyId: string; 
      config: ComplianceConfig 
    }) => {
      const response = await fetch(`/api/compliance/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, config })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error configurando compliance');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidar consulta de configuración
      queryClient.invalidateQueries({ 
        queryKey: ['compliance', 'enabled', variables.companyId] 
      });
    },
  });
}