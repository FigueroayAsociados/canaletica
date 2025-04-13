'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEFAULT_PRECAUTIONARY_MEASURES } from '@/types/report';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addKarinPrecautionaryMeasures } from '@/lib/services/reportService';

interface PrecautionaryMeasuresProps {
  reportId: string;
  companyId: string;
  existingMeasures?: string[];
  onClose?: () => void;
  onSuccess?: () => void;
}

/**
 * Componente para gestionar y aplicar medidas precautorias
 */
export function PrecautionaryMeasures({
  reportId,
  companyId,
  existingMeasures = [],
  onClose,
  onSuccess
}: PrecautionaryMeasuresProps) {
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(existingMeasures);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  // Usar React Query para la mutación
  const applyMeasuresMutation = useMutation({
    mutationFn: () => 
      addKarinPrecautionaryMeasures(companyId, reportId, selectedMeasures, justification),
    
    onSuccess: (result) => {
      if (result.success) {
        // Invalidar consultas para recargar datos
        queryClient.invalidateQueries({ queryKey: ['reports', companyId, reportId] });
        queryClient.invalidateQueries({ queryKey: ['karinReports', companyId] });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || 'Error al aplicar medidas precautorias');
      }
    },
    
    onError: (error: any) => {
      console.error('Error al aplicar medidas precautorias:', error);
      setError(error.message || 'Error al aplicar medidas precautorias');
    }
  });
  
  // Manejar aplicación de medidas
  const handleApplyMeasures = () => {
    if (selectedMeasures.length === 0) {
      setError("Debe seleccionar al menos una medida precautoria");
      return;
    }
    
    applyMeasuresMutation.mutate();
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Medidas Precautorias</h3>
      
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mb-4">
        <p>
          <strong>Nota:</strong> La Ley Karin exige que se implementen medidas precautorias
          en un plazo máximo de 3 días hábiles desde la recepción de la denuncia.
        </p>
      </div>
      
      <div className="space-y-3 max-h-60 overflow-y-auto p-2 border rounded-md">
        {DEFAULT_PRECAUTIONARY_MEASURES.map((measure) => (
          <div key={measure.id} className="flex items-start">
            <input 
              type="checkbox"
              id={`measure-${measure.id}`}
              className="mt-1 rounded border-gray-300 text-blue-600"
              checked={selectedMeasures.includes(measure.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMeasures([...selectedMeasures, measure.id]);
                } else {
                  setSelectedMeasures(selectedMeasures.filter(id => id !== measure.id));
                }
              }}
            />
            <div className="ml-2">
              <label htmlFor={`measure-${measure.id}`} className="text-sm font-medium">{measure.name}</label>
              <p className="text-xs text-gray-600">{measure.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Justificación de las medidas</label>
        <textarea 
          className="w-full p-2 border rounded-md"
          rows={3}
          placeholder="Explique por qué es necesario aplicar estas medidas precautorias..."
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        {onClose && (
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
        )}
        <Button 
          onClick={handleApplyMeasures}
          disabled={selectedMeasures.length === 0 || applyMeasuresMutation.isPending}
        >
          {applyMeasuresMutation.isPending ? "Aplicando..." : "Aplicar Medidas"}
        </Button>
      </div>
    </div>
  );
}