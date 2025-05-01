'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskAnalysisResult } from '@/lib/services/aiService';
import { AlertTriangle, Clock, FileText, TrendingUp } from 'lucide-react';

interface RiskAnalysisCardProps {
  analysis: RiskAnalysisResult;
  isLoading?: boolean;
}

export default function RiskAnalysisCard({
  analysis,
  isLoading = false
}: RiskAnalysisCardProps) {
  // Obtener color basado en nivel de riesgo
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'crítico':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'alto':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medio':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'bajo':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Renderizar indicador circular con porcentaje
  const CircularIndicator = ({ 
    value, 
    label, 
    color 
  }: { 
    value: number; 
    label: string; 
    color: string;
  }) => (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16" viewBox="0 0 36 36">
          <path
            className="text-gray-200"
            stroke-width="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            strokeDasharray="100, 100"
          />
          <path
            className={color}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            strokeDasharray={`${value}, 100`}
          />
        </svg>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <span className="text-sm font-bold">{value}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );

  // Si está cargando, mostrar esqueleto
  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full border ${getRiskColor(analysis.riskLevel)}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={18} />
          Análisis de Riesgo (IA)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          {/* Nivel de riesgo principal */}
          <div className="text-center p-3 rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Nivel de riesgo</h3>
            <div className="flex items-center justify-center">
              <div
                className={`text-2xl font-bold capitalize px-3 py-1 rounded-full ${
                  analysis.riskLevel === 'crítico'
                    ? 'bg-red-100 text-red-700'
                    : analysis.riskLevel === 'alto'
                    ? 'bg-orange-100 text-orange-700'
                    : analysis.riskLevel === 'medio'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {analysis.riskLevel}
              </div>
              <span className="text-sm text-gray-500 ml-2">({analysis.riskScore}/100)</span>
            </div>
          </div>
          
          {/* Factores de riesgo */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Factores de riesgo identificados:</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {analysis.riskFactors.map((factor, index) => (
                <li key={index} className="text-gray-700">{factor}</li>
              ))}
            </ul>
          </div>
          
          {/* Acciones recomendadas */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Acciones recomendadas:</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {analysis.recommendedActions.map((action, index) => (
                <li key={index} className="text-gray-700">{action}</li>
              ))}
            </ul>
          </div>
          
          {/* Indicadores adicionales */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <CircularIndicator 
              value={analysis.timelinessScore} 
              label="Urgencia" 
              color="stroke-blue-500" 
            />
            <CircularIndicator 
              value={analysis.legalImplicationScore} 
              label="Imp. Legal" 
              color="stroke-purple-500" 
            />
            <CircularIndicator 
              value={analysis.organizationalImpactScore} 
              label="Imp. Org." 
              color="stroke-amber-500" 
            />
            <CircularIndicator 
              value={analysis.reputationalRiskScore} 
              label="Riesgo Rep." 
              color="stroke-red-500" 
            />
          </div>
          
          <div className="text-xs text-gray-500 mt-4 text-center italic">
            Este análisis es generado automáticamente y debe ser validado por un investigador
          </div>
        </div>
      </CardContent>
    </Card>
  );
}