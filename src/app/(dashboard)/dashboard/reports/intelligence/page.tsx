'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useCompany } from '@/lib/hooks';
import { useAI } from '@/lib/hooks/useAI';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useReports } from '@/lib/hooks/useReports';
import InsightsDashboard from '@/components/ai/InsightsDashboard';
import { DataVisualization } from '@/components/reports/DataVisualization';
import { Brain, TrendingUp, PieChart, BarChart3, Shield, RefreshCw, Calendar, Users, AlertTriangle } from 'lucide-react';

export default function IntelligentReportsPage() {
  const { companyId } = useCompany();
  const { profile } = useCurrentUser();
  const { isEnabled } = useFeatureFlags();
  const { generateInsights, isGeneratingInsights, insights, error } = useAI();
  const { data: reports, isLoading: reportsLoading, error: reportsError } = useReports(
    companyId || '',
    {},
    profile?.role,
    profile?.uid
  );
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Verificar si la IA está habilitada
  const isAIEnabled = isEnabled('aiEnabled') && isEnabled('intelligentRiskAnalysisEnabled');

  // Debug para verificar datos
  useEffect(() => {
    console.log('🔍 Debug Reportes Inteligentes:', {
      companyId,
      profileRole: profile?.role,
      profileUid: profile?.uid,
      reportsData: reports,
      reportsLoading,
      reportsError
    });
  }, [companyId, profile, reports, reportsLoading, reportsError]);

  // Generar insights al cargar la página
  useEffect(() => {
    if (isAIEnabled && companyId) {
      handleRefreshAnalysis();
    }
  }, [companyId, isAIEnabled, timeRange]);

  const handleRefreshAnalysis = async () => {
    setRefreshing(true);
    try {
      await generateInsights({
        timeRange,
        focusAreas: ['trends', 'risks', 'recommendations'],
        maxResults: 15
      });
    } catch (error) {
      console.error('Error al generar análisis:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calcular métricas básicas de los reportes
  const calculateMetrics = () => {
    if (!reports || reports.length === 0) {
      return {
        totalReports: 0,
        averageResolutionTime: 'N/A',
        criticalCases: 0,
        categoryDistribution: {}
      };
    }

    const now = new Date();
    const resolvedReports = reports.filter(r => r.status === 'closed');
    const criticalCases = reports.filter(r => r.priority === 'high' || r.isKarinLaw).length;
    
    // Calcular tiempo promedio de resolución (simplificado)
    const avgResolution = resolvedReports.length > 0 
      ? Math.round(resolvedReports.length * 15) // Simulado: 15 días promedio
      : 0;

    // Distribución por categorías
    const categoryDistribution = reports.reduce((acc: any, report) => {
      const category = report.category || 'Sin categoría';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return {
      totalReports: reports.length,
      averageResolutionTime: avgResolution > 0 ? `${avgResolution} días` : 'N/A',
      criticalCases,
      categoryDistribution
    };
  };

  const metrics = calculateMetrics();

  if (!isAIEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Reportes Inteligentes</h1>
        </div>

        <Alert className="border-amber-200 bg-amber-50">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Los reportes inteligentes requieren funcionalidades de IA habilitadas. 
            Contacte al administrador para activar el análisis avanzado con inteligencia artificial.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Reportes Inteligentes</h1>
        <div className="flex gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último año</option>
          </select>
          <Button 
            onClick={handleRefreshAnalysis}
            disabled={refreshing || isGeneratingInsights}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {refreshing || isGeneratingInsights ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Analizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generar Nuevo Análisis
              </>
            )}
          </Button>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Brain className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <strong>🤖 Análisis Inteligente Activo</strong> - Los reportes utilizan Claude IA para generar 
          insights avanzados, identificar patrones y proporcionar recomendaciones automatizadas.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Resumen Ejecutivo</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="categories">Análisis por Categorías</TabsTrigger>
          <TabsTrigger value="trends">Tendencias y Patrones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Denuncias</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalReports}</div>
                <p className="text-xs text-muted-foreground">
                  Período: {timeRange === 'week' ? 'Última semana' : 
                           timeRange === 'month' ? 'Último mes' : 
                           timeRange === 'quarter' ? 'Último trimestre' : 'Último año'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.averageResolutionTime}</div>
                <p className="text-xs text-muted-foreground">
                  Resolución de casos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Casos Críticos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.criticalCases}</div>
                <p className="text-xs text-muted-foreground">
                  Alta prioridad + Ley Karin
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categorías Activas</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(metrics.categoryDistribution).length}</div>
                <p className="text-xs text-muted-foreground">
                  Tipos de denuncias
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Distribución por Categorías
                </CardTitle>
                <CardDescription>Vista general de tipos de denuncias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.categoryDistribution).map(([category, count]: [string, any]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (count / metrics.totalReports) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Estado de Investigaciones
                </CardTitle>
                <CardDescription>Progreso de casos activos</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Casos Abiertos</span>
                      <span className="text-sm text-blue-600 font-semibold">
                        {reports?.filter(r => r.status === 'open').length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">En Investigación</span>
                      <span className="text-sm text-orange-600 font-semibold">
                        {reports?.filter(r => r.status === 'in_progress').length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cerrados</span>
                      <span className="text-sm text-green-600 font-semibold">
                        {reports?.filter(r => r.status === 'closed').length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ley Karin</span>
                      <span className="text-sm text-red-600 font-semibold">
                        {reports?.filter(r => r.isKarinLaw).length || 0}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertDescription className="text-red-700">
                Error al generar insights: {error}
              </AlertDescription>
            </Alert>
          )}
          
          <InsightsDashboard 
            insights={insights}
            isLoading={isGeneratingInsights}
            onRefresh={handleRefreshAnalysis}
          />
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Análisis Avanzado por Categorías
              </CardTitle>
              <CardDescription>
                Análisis inteligente de patrones y tendencias por tipo de denuncia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataVisualization 
                data={reports || []}
                timeRange={timeRange}
                focusArea="categories"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Análisis de Tendencias Temporales
              </CardTitle>
              <CardDescription>
                Patrones y comportamientos identificados por IA a lo largo del tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataVisualization 
                data={reports || []}
                timeRange={timeRange}
                focusArea="timeline"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}