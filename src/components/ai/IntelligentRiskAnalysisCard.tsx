// src/components/ai/IntelligentRiskAnalysisCard.tsx
// Componente para mostrar análisis inteligente híbrido (IA + Compliance)

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnalisisInteligente } from '@/lib/services/intelligentRiskService';

interface IntelligentRiskAnalysisCardProps {
  analysis: AnalisisInteligente;
}

export default function IntelligentRiskAnalysisCard({ analysis }: IntelligentRiskAnalysisCardProps) {
  const [activeTab, setActiveTab] = useState('unified');

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Crítico':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Alto':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medio':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Bajo':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Muy Bajo':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Crítica':
        return 'bg-red-500 text-white';
      case 'Alta':
        return 'bg-orange-500 text-white';
      case 'Media':
        return 'bg-yellow-500 text-white';
      case 'Baja':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'negative':
        return '😟';
      case 'positive':
        return '😊';
      default:
        return '😐';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen Unificado */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🚀 Análisis Unificado de Riesgo
              <Badge variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                PREMIUM
              </Badge>
            </span>
            <div className="text-sm text-gray-600">
              Confianza: {analysis.unified_risk.confidence}%
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Score Unificado */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {analysis.unified_risk.score}/100
              </div>
              <div className="text-sm text-gray-600">Puntuación Híbrida</div>
              <div className="text-xs text-gray-500 mt-1">
                60% Compliance + 40% IA
              </div>
            </div>

            {/* Nivel de Riesgo */}
            <div className="text-center">
              <Badge 
                className={`text-lg px-4 py-2 ${getRiskLevelColor(analysis.unified_risk.level)}`}
              >
                {analysis.unified_risk.level}
              </Badge>
              <div className="text-sm text-gray-600 mt-2">Nivel de Riesgo</div>
            </div>

            {/* Urgencia */}
            <div className="text-center">
              <Badge 
                className={`text-lg px-4 py-2 ${getUrgencyColor(analysis.unified_risk.urgency)}`}
              >
                {analysis.unified_risk.urgency}
              </Badge>
              <div className="text-sm text-gray-600 mt-2">Urgencia</div>
            </div>
          </div>

          {/* Alertas Críticas */}
          {(analysis.unified_risk.level === 'Crítico' || analysis.unified_risk.urgency === 'Crítica') && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                ⚠️ <strong>Atención Inmediata Requerida:</strong> Este caso requiere intervención urgente según el análisis híbrido.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Pestañas de Análisis Detallado */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unified">Resumen</TabsTrigger>
          <TabsTrigger value="ai">Análisis IA</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
        </TabsList>

        {/* Pestaña de Resumen Unificado */}
        <TabsContent value="unified" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Componentes del Análisis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🤖 Componente IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Severidad:</span>
                    <span className="font-semibold">{analysis.ai_analysis.severity_score}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sentimiento:</span>
                    <span className="flex items-center gap-1">
                      {getSentimentIcon(analysis.ai_analysis.sentiment)}
                      {analysis.ai_analysis.sentiment}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Indicadores de Riesgo:</span>
                    <span className="font-semibold">{analysis.ai_analysis.risk_indicators.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confianza IA:</span>
                    <span className="font-semibold">{analysis.ai_analysis.confidence}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">⚖️ Componente Legal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Valor de Riesgo:</span>
                    <span className="font-semibold">{analysis.compliance_analysis.valor_riesgo}/25</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delitos Identificados:</span>
                    <span className="font-semibold">{analysis.compliance_analysis.delitos_identificados.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Controles Sugeridos:</span>
                    <span className="font-semibold">{analysis.compliance_analysis.controles_sugeridos.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Urgencia Legal:</span>
                    <Badge className={getUrgencyColor(analysis.compliance_analysis.urgencia)}>
                      {analysis.compliance_analysis.urgencia}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tiempo de Procesamiento */}
          <div className="text-center text-sm text-gray-500">
            Análisis completado en {analysis.processing_time_ms}ms
          </div>
        </TabsContent>

        {/* Pestaña de Análisis IA */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🤖 Análisis de Inteligencia Artificial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Palabras Clave */}
              <div>
                <h4 className="font-medium mb-2">Palabras Clave Detectadas:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.ai_analysis.key_phrases.map((phrase, index) => (
                    <Badge key={index} variant="outline" className="bg-blue-50">
                      {phrase}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Indicadores de Riesgo */}
              <div>
                <h4 className="font-medium mb-2">Indicadores de Riesgo:</h4>
                <div className="space-y-2">
                  {analysis.ai_analysis.risk_indicators.map((indicator, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                      <span className="text-orange-600">⚠️</span>
                      <span className="text-sm">{indicator}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Casos Similares */}
              <div>
                <h4 className="font-medium mb-2">Casos Similares Encontrados:</h4>
                <p className="text-sm text-gray-600">
                  Se encontraron {analysis.ai_analysis.similar_cases_count} casos similares en la base de datos.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>⚖️ Análisis Legal de Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delitos Identificados */}
              <div>
                <h4 className="font-medium mb-2">Delitos Identificados:</h4>
                <div className="space-y-3">
                  {analysis.compliance_analysis.delitos_identificados.map((delito, index) => (
                    <Card key={index} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium">{delito.nombre}</h5>
                          <Badge className={getRiskLevelColor(delito.nivel_riesgo)}>
                            {delito.nivel_riesgo}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{delito.descripcion}</p>
                        <div className="text-xs text-gray-500">
                          <strong>Ley:</strong> {delito.ley} | 
                          <strong> Probabilidad:</strong> {delito.probabilidad} | 
                          <strong> Impacto:</strong> {delito.impacto}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Controles Sugeridos */}
              <div>
                <h4 className="font-medium mb-2">Controles Sugeridos:</h4>
                <div className="space-y-2">
                  {analysis.compliance_analysis.controles_sugeridos.map((control, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm">{control}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Recomendaciones */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Acciones Inmediatas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-700">🚨 Acciones Inmediatas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.intelligent_recommendations.immediate_actions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span className="text-sm">{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Estrategia de Investigación */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-blue-700">🔍 Estrategia de Investigación</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.intelligent_recommendations.investigation_strategy.map((strategy, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm">{strategy}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Mitigación de Riesgos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-green-700">🛡️ Mitigación de Riesgos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.intelligent_recommendations.risk_mitigation.map((mitigation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span className="text-sm">{mitigation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Consideraciones Legales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-purple-700">⚖️ Consideraciones Legales</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.intelligent_recommendations.legal_considerations.map((consideration, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-500 mt-1">•</span>
                      <span className="text-sm">{consideration}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}