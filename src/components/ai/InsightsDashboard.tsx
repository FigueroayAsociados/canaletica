'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAI } from '@/lib/hooks/useAI';
import { AIInsight } from '@/lib/services/aiService';
import { Lightbulb, TrendingUp, AlertTriangle, Clock, Zap, RefreshCw, ChevronRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface InsightsDashboardProps {
  className?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'all';
}

export default function InsightsDashboard({ className, timeRange = 'month' }: InsightsDashboardProps) {
  const { 
    generateInsights, 
    insights: cachedInsights,
    isGeneratingInsights, 
    error: aiError,
    isAIEnabled
  } = useAI();
  
  const [insights, setInsights] = useState<{
    trends: AIInsight[],
    risks: AIInsight[],
    recommendations: AIInsight[],
    efficiency: AIInsight[]
  }>({
    trends: [],
    risks: [],
    recommendations: [],
    efficiency: []
  });
  
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadInsights() {
      try {
        setError(null);
        
        // Validar que tenemos acceso a la función isAIEnabled
        if (typeof isAIEnabled !== 'function') {
          console.error('isAIEnabled no es una función válida');
          setError('Error de configuración: No se pueden validar permisos');
          return;
        }
        
        // Validar que tenemos acceso a la función generateInsights
        if (typeof generateInsights !== 'function') {
          console.error('generateInsights no es una función válida');
          setError('Error de configuración: No se pueden generar insights');
          return;
        }
        
        // Si ya tenemos insights en caché y no estamos generando nuevos, usarlos
        if (cachedInsights && Array.isArray(cachedInsights) && cachedInsights.length > 0 && !isGeneratingInsights) {
          organizeInsights(cachedInsights);
          return;
        }
        
        const result = await generateInsights({ timeRange });
        
        // Verificar explícitamente todas las propiedades esperadas
        if (result && typeof result === 'object' && result.success === true && 
            Array.isArray(result.insights) && result.insights.length > 0) {
          organizeInsights(result.insights);
        } else {
          // Proporcionar mensajes de error más específicos
          if (!result || typeof result !== 'object') {
            setError('Error al generar insights: Respuesta inválida');
          } else if (!result.success) {
            setError(result.error || 'No se pudieron generar insights');
          } else if (!Array.isArray(result.insights)) {
            setError('Los insights generados no tienen el formato esperado');
          } else if (result.insights.length === 0) {
            // No es realmente un error, solo no hay datos
            organizeInsights([]);
          }
        }
      } catch (err) {
        console.error('Error al cargar insights:', err);
        setError('Ha ocurrido un error al cargar los insights');
      }
    }
    
    // Organizar insights por categoría con validación adicional
    function organizeInsights(allInsights: AIInsight[]) {
      // Asegurarse de que allInsights es un array
      if (!Array.isArray(allInsights)) {
        console.error('organizeInsights recibió datos no válidos:', allInsights);
        setInsights({
          trends: [],
          risks: [],
          recommendations: [],
          efficiency: []
        });
        return;
      }
      
      // Filtrar insights válidos
      const validInsights = allInsights.filter(insight => 
        insight && typeof insight === 'object' && typeof insight.category === 'string'
      );
      
      const organized = {
        trends: validInsights.filter(i => i.category === 'trend'),
        risks: validInsights.filter(i => i.category === 'risk'),
        recommendations: validInsights.filter(i => i.category === 'recommendation'),
        efficiency: validInsights.filter(i => i.category === 'efficiency')
      };
      
      setInsights(organized);
    }
    
    // Validar que la función isAIEnabled existe y es una función
    if (typeof isAIEnabled === 'function' && isAIEnabled()) {
      loadInsights();
    }
  }, [generateInsights, cachedInsights, isGeneratingInsights, timeRange, isAIEnabled]);
  
  const handleRefresh = async () => {
    try {
      setError(null);
      
      // Validar que tenemos acceso a la función generateInsights
      if (typeof generateInsights !== 'function') {
        console.error('generateInsights no es una función válida');
        setError('Error de configuración: No se pueden generar insights');
        return;
      }
      
      const result = await generateInsights({ timeRange, maxResults: 30 });
      
      // Usar la misma lógica de validación que en useEffect
      if (result && typeof result === 'object' && result.success === true && 
          Array.isArray(result.insights)) {
        
        // Filtrar insights válidos
        const validInsights = result.insights.filter(insight => 
          insight && typeof insight === 'object' && typeof insight.category === 'string'
        );
        
        const organized = {
          trends: validInsights.filter(i => i.category === 'trend'),
          risks: validInsights.filter(i => i.category === 'risk'),
          recommendations: validInsights.filter(i => i.category === 'recommendation'),
          efficiency: validInsights.filter(i => i.category === 'efficiency')
        };
        
        setInsights(organized);
      } else {
        // Proporcionar mensajes de error más específicos
        if (!result || typeof result !== 'object') {
          setError('Error al generar insights: Respuesta inválida');
        } else if (!result.success) {
          setError(result.error || 'No se pudieron generar insights');
        } else if (!Array.isArray(result.insights)) {
          setError('Los insights generados no tienen el formato esperado');
        } else if (result.insights.length === 0) {
          setError('No se encontraron insights para mostrar');
        }
      }
    } catch (err) {
      console.error('Error al refrescar insights:', err);
      setError('Ha ocurrido un error al refrescar los insights');
    }
  };
  
  // Si la IA no está habilitada, mostrar mensaje
  // Validar explícitamente que isAIEnabled es una función
  if (typeof isAIEnabled !== 'function' || !isAIEnabled()) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-amber-500" />
            Insights y Recomendaciones IA
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center max-w-md">
            <Info className="h-10 w-10 text-primary/40 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Funcionalidad no disponible</h3>
            <p className="text-gray-500">
              {typeof isAIEnabled !== 'function' 
                ? 'Error de configuración: No se pueden validar permisos.'
                : 'Las funcionalidades de IA no están habilitadas para esta empresa. Contacta con el administrador para activar esta característica.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Mostrar spinner mientras se cargan los insights
  if (isGeneratingInsights && (!insights.trends.length && !insights.risks.length && 
      !insights.recommendations.length && !insights.efficiency.length)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-amber-500" />
            Insights y Recomendaciones IA
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-500">Generando insights con IA...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Mostrar error si ocurre alguno
  if (error || aiError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-amber-500" />
            Insights y Recomendaciones IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="error">
            <AlertDescription>
              {error || aiError}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Renderizar el panel de insights
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-amber-500" />
            Insights y Recomendaciones IA
          </CardTitle>
          
          <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={isGeneratingInsights}>
            {isGeneratingInsights ? <Spinner size="sm" className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="trends">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="trends" className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              Tendencias
              {insights.trends.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {insights.trends.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="risks" className="flex-1">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Riesgos
              {insights.risks.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {insights.risks.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="recommendations" className="flex-1">
              <Lightbulb className="h-4 w-4 mr-2" />
              Recomendaciones
              {insights.recommendations.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {insights.recommendations.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="efficiency" className="flex-1">
              <Zap className="h-4 w-4 mr-2" />
              Eficiencia
              {insights.efficiency.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {insights.efficiency.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trends" className="mt-0">
            <div className="space-y-3">
              {insights.trends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay tendencias identificadas en este período</p>
                </div>
              ) : (
                insights.trends.map(trend => (
                  <InsightCard 
                    key={trend.id}
                    insight={trend}
                    icon={<TrendingUp />}
                    colorClass="text-blue-500 bg-blue-50 border-blue-200"
                  />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="risks" className="mt-0">
            <div className="space-y-3">
              {insights.risks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay riesgos identificados en este período</p>
                </div>
              ) : (
                insights.risks.map(risk => (
                  <InsightCard 
                    key={risk.id}
                    insight={risk}
                    icon={<AlertTriangle />}
                    colorClass="text-red-500 bg-red-50 border-red-200"
                  />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations" className="mt-0">
            <div className="space-y-3">
              {insights.recommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay recomendaciones en este período</p>
                </div>
              ) : (
                insights.recommendations.map(recommendation => (
                  <InsightCard 
                    key={recommendation.id}
                    insight={recommendation}
                    icon={<Lightbulb />}
                    colorClass="text-amber-500 bg-amber-50 border-amber-200"
                  />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="efficiency" className="mt-0">
            <div className="space-y-3">
              {insights.efficiency.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay sugerencias de eficiencia en este período</p>
                </div>
              ) : (
                insights.efficiency.map(efficiency => (
                  <InsightCard 
                    key={efficiency.id}
                    insight={efficiency}
                    icon={<Zap />}
                    colorClass="text-green-500 bg-green-50 border-green-200"
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="text-xs text-gray-500">
        Generado por IA basado en datos del {timeRange === 'week' ? 'última semana' : 
        timeRange === 'month' ? 'último mes' : 
        timeRange === 'quarter' ? 'último trimestre' : 
        timeRange === 'year' ? 'último año' : 'período completo'}
      </CardFooter>
    </Card>
  );
}

// Componente para mostrar un insight
function InsightCard({ 
  insight, 
  icon, 
  colorClass = 'text-primary bg-primary/10 border-primary/20'
}: { 
  insight: AIInsight; 
  icon: React.ReactNode; 
  colorClass?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Verificar que insight sea un objeto válido
  if (!insight || typeof insight !== 'object') {
    return (
      <div className={`p-4 rounded-lg border border-red-200 bg-red-50 text-red-600 overflow-hidden`}>
        <p className="text-sm">Error: Formato de insight inválido</p>
      </div>
    );
  }
  
  // Verificar propiedades requeridas
  const hasRequiredProps = insight.title && insight.description && 
                           typeof insight.confidence === 'number';
                           
  if (!hasRequiredProps) {
    return (
      <div className={`p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 overflow-hidden`}>
        <p className="text-sm">Error: Datos de insight incompletos</p>
      </div>
    );
  }
  
  // Formatear confianza con validación
  const confidence = typeof insight.confidence === 'number' ? insight.confidence : 0;
  const confidencePercentage = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
  
  return (
    <div className={`p-4 rounded-lg border ${colorClass} overflow-hidden`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 ${colorClass}`}>
          {icon}
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="font-medium">
              {insight.title}
            </h3>
            <Badge variant="outline" className="ml-2 whitespace-nowrap text-xs">
              {confidencePercentage}% confianza
            </Badge>
          </div>
          
          <p className={`mt-1 text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>
            {insight.description}
          </p>
          
          {/* Validar la existencia y tipo de relatedReports */}
          {insight.relatedReports && Array.isArray(insight.relatedReports) && insight.relatedReports.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {expanded && insight.relatedReports.map((reportId, index) => (
                <Badge key={`${reportId || 'unknown'}-${index}`} variant="secondary" className="text-xs">
                  {reportId || 'ID Desconocido'}
                </Badge>
              ))}
              {!expanded && (
                <Badge variant="secondary" className="text-xs">
                  {insight.relatedReports.length} casos relacionados
                </Badge>
              )}
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-6 px-0 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Ver menos' : 'Ver más'}
            <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}