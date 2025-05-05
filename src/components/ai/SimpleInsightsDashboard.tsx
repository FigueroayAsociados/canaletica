'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Lightbulb, TrendingUp, AlertTriangle, Zap, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Definir tipos simplificados
interface SimpleInsight {
  id: string;
  title: string;
  description: string;
  category: 'trend' | 'risk' | 'recommendation' | 'efficiency';
}

interface SimpleInsightsDashboardProps {
  className?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year' | 'all';
}

// Ejemplos de insights estáticos para mostrar
const mockInsights: SimpleInsight[] = [
  {
    id: '1',
    title: 'Aumento en denuncias de acoso',
    description: 'Se ha detectado un incremento del 15% en las denuncias relacionadas con acoso laboral durante el último trimestre.',
    category: 'trend'
  },
  {
    id: '2',
    title: 'Casos críticos no atendidos',
    description: 'Hay 3 casos marcados como alta prioridad que llevan más de 7 días sin actualización.',
    category: 'risk'
  },
  {
    id: '3',
    title: 'Mejorar documentación inicial',
    description: 'Los casos con documentación completa desde el inicio se resuelven un 40% más rápido.',
    category: 'recommendation'
  },
  {
    id: '4',
    title: 'Optimizar proceso de entrevistas',
    description: 'Programar entrevistas en bloque puede reducir el tiempo de investigación en un 25%.',
    category: 'efficiency'
  }
];

export default function SimpleInsightsDashboard({ className = '', timeRange = 'month' }: SimpleInsightsDashboardProps) {
  // Estado simplificado
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('trends');
  const [insights, setInsights] = useState<SimpleInsight[]>([]);
  
  // Efecto para cargar datos de ejemplo
  useEffect(() => {
    setLoading(true);
    
    // Simular carga de datos
    const timer = setTimeout(() => {
      setInsights(mockInsights);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeRange]);
  
  // Filtrar insights por categoría
  const trendInsights = insights.filter(insight => insight.category === 'trend');
  const riskInsights = insights.filter(insight => insight.category === 'risk');
  const recommendationInsights = insights.filter(insight => insight.category === 'recommendation');
  const efficiencyInsights = insights.filter(insight => insight.category === 'efficiency');
  
  // Si está cargando, mostrar spinner
  if (loading) {
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
            <p className="text-gray-500">Analizando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Renderizar dashboard simplificado
  return (
    <Card className={className}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Lightbulb className="mr-2 h-5 w-5 text-amber-500" />
          Insights y Recomendaciones IA
        </CardTitle>
        
        <Button onClick={() => setLoading(true)} variant="ghost" size="sm" disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="trends" className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              Tendencias
            </TabsTrigger>
            
            <TabsTrigger value="risks" className="flex-1">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Riesgos
            </TabsTrigger>
            
            <TabsTrigger value="recommendations" className="flex-1">
              <Lightbulb className="h-4 w-4 mr-2" />
              Recomendaciones
            </TabsTrigger>
            
            <TabsTrigger value="efficiency" className="flex-1">
              <Zap className="h-4 w-4 mr-2" />
              Eficiencia
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trends" className="mt-0">
            <SimpleInsightList insights={trendInsights} emptyMessage="No hay tendencias identificadas en este período" />
          </TabsContent>
          
          <TabsContent value="risks" className="mt-0">
            <SimpleInsightList insights={riskInsights} emptyMessage="No hay riesgos identificados en este período" />
          </TabsContent>
          
          <TabsContent value="recommendations" className="mt-0">
            <SimpleInsightList insights={recommendationInsights} emptyMessage="No hay recomendaciones en este período" />
          </TabsContent>
          
          <TabsContent value="efficiency" className="mt-0">
            <SimpleInsightList insights={efficiencyInsights} emptyMessage="No hay sugerencias de eficiencia en este período" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Componente simple para mostrar una lista de insights
function SimpleInsightList({ insights, emptyMessage }: { insights: SimpleInsight[], emptyMessage: string }) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {insights.map(insight => (
        <div 
          key={insight.id} 
          className="p-4 rounded-lg border border-gray-100 bg-gray-50"
        >
          <h3 className="font-medium mb-1">{insight.title}</h3>
          <p className="text-sm text-gray-600">{insight.description}</p>
        </div>
      ))}
    </div>
  );
}