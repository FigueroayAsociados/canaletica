'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCompanyConfig, 
  saveCompanyConfig,
  getCategories,
  getSubcategories,
  getFormOptions,
  createFormOption,
  updateFormOption,
  deleteFormOption
} from '@/lib/services/configService';

/**
 * Hook para obtener la configuración de la empresa
 */
export function useCompanyConfig(companyId: string) {
  return useQuery({
    queryKey: ['config', companyId],
    queryFn: () => getCompanyConfig(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para guardar la configuración de la empresa
 */
export function useSaveCompanyConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      companyId, 
      userId, 
      config 
    }: {
      companyId: string;
      userId: string;
      config: any;
    }) => saveCompanyConfig(companyId, userId, config),
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['config', variables.companyId] });
    },
  });
}

/**
 * Hook para obtener categorías
 */
export function useCategories(companyId: string) {
  return useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => getCategories(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para obtener subcategorías
 */
export function useSubcategories(companyId: string, categoryId?: string) {
  return useQuery({
    queryKey: ['subcategories', companyId, categoryId],
    queryFn: () => getSubcategories(companyId, categoryId),
    enabled: !!companyId,
  });
}

/**
 * Hook para obtener opciones de formulario
 */
export function useFormOptions(companyId: string, optionType: string) {
  return useQuery({
    queryKey: ['formOptions', companyId, optionType],
    queryFn: () => getFormOptions(companyId, optionType),
    enabled: !!companyId && !!optionType,
  });
}

/**
 * Hook para gestionar opciones de formulario (crear, actualizar, eliminar)
 */
export function useFormOptionMutations(companyId: string, optionType: string) {
  const queryClient = useQueryClient();
  
  const createOption = useMutation({
    mutationFn: (optionData: any) => createFormOption(companyId, optionType, optionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formOptions', companyId, optionType] });
    },
  });
  
  const updateOption = useMutation({
    mutationFn: ({ optionId, updates }: { optionId: string; updates: any }) => 
      updateFormOption(companyId, optionType, optionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formOptions', companyId, optionType] });
    },
  });
  
  const deleteOption = useMutation({
    mutationFn: (optionId: string) => deleteFormOption(companyId, optionType, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formOptions', companyId, optionType] });
    },
  });
  
  return {
    createOption,
    updateOption,
    deleteOption
  };
}