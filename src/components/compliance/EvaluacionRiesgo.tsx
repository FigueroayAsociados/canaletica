// src/components/compliance/EvaluacionRiesgo.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EvaluacionRiesgo as IEvaluacionRiesgo } from '@/types/compliance';

interface Props {
  reportId: string;
  companyId: string;
  className?: string;
}

export default function EvaluacionRiesgo({ reportId, companyId, className }: Props) {
  const [evaluacion, setEvaluacion] = useState<IEvaluacionRiesgo | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarEvaluacion();
  }, [reportId, companyId]);

  const cargarEvaluacion = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/compliance/report/${reportId}?companyId=${companyId}`);
      const data = await response.json();
      
      if (data.success) {
        setEvaluacion(data.evaluacion);
      } else if (response.status === 404) {
        // No hay evaluación aún, no es error
        setEvaluacion(null);
      } else {
        setError(data.error || 'Error cargando evaluación');
      }
    } catch (err) {
      console.error('Error cargando evaluación:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const evaluarRiesgo = async () => {
    try {
      setEvaluando(true);
      setError(null);
      
      const response = await fetch('/api/compliance/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, companyId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEvaluacion(data.evaluacion);
      } else {
        setError(data.error || 'Error en evaluación');
      }
    } catch (err) {
      console.error('Error evaluando riesgo:', err);
      setError('Error de conexión');
    } finally {
      setEvaluando(false);
    }
  };

  const getRiskColor = (nivel: string) => {
    switch (nivel) {
      case 'Aceptable': return 'bg-green-500';
      case 'Tolerable': return 'bg-yellow-500';
      case 'Importante': return 'bg-orange-500';
      case 'Intolerable': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyColor = (urgencia: string) => {
    switch (urgencia) {
      case 'Baja': return 'bg-green-100 text-green-800';
      case 'Media': return 'bg-yellow-100 text-yellow-800';
      case 'Alta': return 'bg-orange-100 text-orange-800';
      case 'Crítica': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Cargando evaluación de riesgo...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Evaluación de Riesgo de Compliance</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={evaluarRiesgo}
            disabled={evaluando}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${evaluando ? 'animate-spin' : ''}`} />
            <span>{evaluacion ? 'Re-evaluar' : 'Evaluar'}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!evaluacion && !error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta denuncia no ha sido evaluada aún. Haga clic en "Evaluar" para realizar el análisis de riesgo automático.
            </AlertDescription>
          </Alert>
        )}

        {evaluacion && (
          <>
            {/* Badge de Riesgo Principal */}
            <div className="flex items-center space-x-4">
              <Badge
                variant="secondary"
                className={`${getRiskColor(evaluacion.nivel_riesgo)} text-white px-4 py-2 text-sm font-medium`}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Riesgo {evaluacion.nivel_riesgo}
              </Badge>
              
              <Badge
                variant="outline"
                className={getUrgencyColor(evaluacion.urgencia)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Urgencia {evaluacion.urgencia}
              </Badge>
            </div>

            {/* Matriz de Valores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{evaluacion.probabilidad}</div>
                <div className="text-sm text-blue-800">Probabilidad</div>
                <div className="text-xs text-gray-600">Escala 1-5</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{evaluacion.impacto}</div>
                <div className="text-sm text-orange-800">Impacto</div>
                <div className="text-xs text-gray-600">Escala 1-5</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{evaluacion.valor_riesgo}</div>
                <div className="text-sm text-purple-800">Valor Total</div>
                <div className="text-xs text-gray-600">P × I = {evaluacion.valor_riesgo}</div>
              </div>
            </div>

            {/* Delitos Identificados */}
            {evaluacion.delitos_identificados.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                  Delitos Potenciales Identificados ({evaluacion.delitos_identificados.length})
                </h4>
                <div className="space-y-2">
                  {evaluacion.delitos_identificados.slice(0, 3).map((delito, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{delito.categoria}</div>
                        <div className="text-sm text-gray-600">{delito.ley} - {delito.articulo}</div>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        {Math.round(delito.relevancia * 100)}% relevancia
                      </Badge>
                    </div>
                  ))}
                  {evaluacion.delitos_identificados.length > 3 && (
                    <div className="text-sm text-gray-500 text-center">
                      Y {evaluacion.delitos_identificados.length - 3} delito(s) más...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Controles Sugeridos */}
            {evaluacion.controles_sugeridos.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-blue-500" />
                  Controles Sugeridos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {evaluacion.controles_sugeridos.slice(0, 6).map((control, index) => (
                    <div key={index} className="flex items-center p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <Shield className="h-3 w-3 mr-2 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-blue-800">{control}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones Recomendadas */}
            {evaluacion.acciones_recomendadas.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-green-500" />
                  Acciones Recomendadas
                </h4>
                <div className="space-y-2">
                  {evaluacion.acciones_recomendadas.slice(0, 4).map((accion, index) => (
                    <div key={index} className="flex items-start p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-sm text-green-800">{accion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-gray-500 border-t pt-3">
              Evaluación realizada: {new Date(evaluacion.created_at).toLocaleString('es-CL')}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}