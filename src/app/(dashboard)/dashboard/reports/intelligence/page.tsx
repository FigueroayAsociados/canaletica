'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { useAI } from '@/lib/hooks/useAI';
import { useReports } from '@/lib/hooks/useReports';
import { useReporting } from '@/lib/hooks/useReporting';
import { SafeRender } from '@/components/ui/safe-render';
import { Info, Lightbulb, AlertTriangle, TrendingUp, Zap, Calendar, RefreshCw } from 'lucide-react';
import SimpleInsightsDashboard from '@/components/ai/SimpleInsightsDashboard';
import Link from 'next/link';

export default function IntelligentReportsPage() {
  const { companyId } = useCompany();
  const { profile, loading: userLoading } = useCurrentUser();
  const { isEnabled } = useFeatureFlags();
  const { reports, loading: reportsLoading, getReports } = useReports();
  const { isAIEnabled } = useAI();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsData, setStatsData] = useState(null);
  const { loadSummary } = useReporting();

  // Determinar si el usuario es admin o superadmin
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  // Verificar si la característica está habilitada
  const isIntelligentReportsEnabled = isEnabled('advanced_reporting');

  // Cargar estadísticas básicas cuando cambia el rango de tiempo
  useEffect(() => {
    const loadStats = async () => {
      if (!companyId) return;
      
      setStatsLoading(true);
      try {
        const summary = await loadSummary({ 
          timeframe: timeRange,
          showAIInsights: true
        });
        
        setStatsData(summary);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    loadStats();
  }, [companyId, timeRange, loadSummary]);

  // Si está cargando información del usuario, mostrar un mensaje de carga
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Solo permitir acceso a administradores
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página. Esta sección está reservada para administradores.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Si la funcionalidad no está habilitada, mostrar mensaje informativo
  if (!isIntelligentReportsEnabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes Inteligentes</h1>
        
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <div className="text-center max-w-md">
              <Info className="h-10 w-10 text-primary/40 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Funcionalidad no disponible</h3>
              <p className="text-gray-500">
                Los reportes inteligentes no están habilitados para esta empresa. 
                {isSuperAdmin && " Como super administrador, puede habilitar esta característica en la sección de configuración."}
                {!isSuperAdmin && " Contacte con el administrador para activar esta característica."}
              </p>
              
              {isSuperAdmin && (
                <div className="mt-4">
                  <Link href="/dashboard/settings">
                    <Button>Ir a Configuración</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Reportes Inteligentes</h1>
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select 
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as any)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
              <SelectItem value="all">Todo el historial</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tarjetas de resumen con datos dinámicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-blue-500">
              <TrendingUp className="mr-2 h-4 w-4" />
              Tendencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <span className="text-gray-300">...</span>
              ) : (
                <SafeRender
                  condition={statsData && statsData.trendAnalysis && Array.isArray(statsData.trendAnalysis)}
                  fallback={<span>0</span>}
                >
                  {statsData?.trendAnalysis?.length || 0}
                </SafeRender>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Tendencias identificadas en las denuncias
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-red-500">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <span className="text-gray-300">...</span>
              ) : (
                <SafeRender
                  condition={statsData && typeof statsData.riskDistribution === 'object'}
                  fallback={<span>0</span>}
                >
                  {statsData?.riskDistribution?.high || 0}
                </SafeRender>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Casos de alto riesgo detectados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-amber-500">
              <Lightbulb className="mr-2 h-4 w-4" />
              Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <span className="text-gray-300">...</span>
              ) : (
                <SafeRender
                  condition={statsData && typeof statsData.complianceRate === 'number'}
                  fallback={<span>N/A</span>}
                >
                  {statsData?.complianceRate?.toFixed(1) || 0}%
                </SafeRender>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Tasa de cumplimiento normativo
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-green-500">
              <Zap className="mr-2 h-4 w-4" />
              Resolución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <span className="text-gray-300">...</span>
              ) : (
                <SafeRender
                  condition={statsData && typeof statsData.averageResolutionTime === 'number'}
                  fallback={<span>N/A</span>}
                >
                  {statsData?.averageResolutionTime?.toFixed(1) || 0}
                </SafeRender>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Días promedio de resolución
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="timeline">Cronología</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Denuncias</CardTitle>
                <CardDescription>Vista general por estado</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {statsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Spinner />
                  </div>
                ) : (
                  <SafeRender
                    condition={statsData && statsData.statusDistribution && Array.isArray(statsData.statusDistribution)}
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No hay datos disponibles</p>
                      </div>
                    }
                  >
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-lg font-medium mb-4">Distribución por Estado</p>
                        <div className="grid grid-cols-2 gap-3">
                          {statsData?.statusDistribution?.map((status, index) => (
                            <div key={index} className="border rounded-md p-3">
                              <p className="text-sm text-gray-500">{status.name}</p>
                              <p className="text-lg font-bold">{status.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SafeRender>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Clave</CardTitle>
                <CardDescription>Indicadores de rendimiento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-gray-500">Tiempo Promedio de Resolución</p>
                    <p className="text-2xl font-bold mt-2">
                      {statsLoading ? (
                        <span className="text-gray-300">...</span>
                      ) : (
                        <SafeRender
                          condition={statsData && typeof statsData.averageResolutionTime === 'number'}
                          fallback={<span>N/A</span>}
                        >
                          {statsData?.averageResolutionTime?.toFixed(1) || 0} días
                        </SafeRender>
                      )}
                    </p>
                  </div>
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-gray-500">Tasa de Cumplimiento</p>
                    <p className="text-2xl font-bold mt-2">
                      {statsLoading ? (
                        <span className="text-gray-300">...</span>
                      ) : (
                        <SafeRender
                          condition={statsData && typeof statsData.complianceRate === 'number'}
                          fallback={<span>N/A</span>}
                        >
                          {statsData?.complianceRate?.toFixed(1) || 0}%
                        </SafeRender>
                      )}
                    </p>
                  </div>
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-gray-500">Casos Críticos</p>
                    <p className="text-2xl font-bold mt-2">
                      {statsLoading ? (
                        <span className="text-gray-300">...</span>
                      ) : (
                        <SafeRender
                          condition={statsData && typeof statsData.riskDistribution === 'object'}
                          fallback={<span>0</span>}
                        >
                          {statsData?.riskDistribution?.high || 0}
                        </SafeRender>
                      )}
                    </p>
                  </div>
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-gray-500">Denuncias Totales</p>
                    <p className="text-2xl font-bold mt-2">
                      {statsLoading ? (
                        <span className="text-gray-300">...</span>
                      ) : (
                        <SafeRender
                          condition={statsData && typeof statsData.totalReports === 'number'}
                          fallback={<span>0</span>}
                        >
                          {statsData?.totalReports || 0}
                        </SafeRender>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="insights">
          <SafeRender
            condition={Boolean(companyId)}
            fallback={
              <Card>
                <CardContent className="py-10">
                  <div className="text-center max-w-md mx-auto">
                    <Info className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se puede cargar</h3>
                    <p className="text-gray-500">
                      No hay información de la empresa para cargar los insights.
                    </p>
                  </div>
                </CardContent>
              </Card>
            }
          >
            {timeRange && (
              <SimpleInsightsDashboard 
                timeRange={timeRange}
                className="h-full"
              />
            )}
          </SafeRender>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Categorías</CardTitle>
              <CardDescription>Distribución y tendencias por tipo de denuncia</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {statsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              ) : (
                <SafeRender
                  condition={statsData && statsData.categoryDistribution && Array.isArray(statsData.categoryDistribution)}
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No hay datos disponibles</p>
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 gap-6 h-full">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-lg font-medium mb-4">Distribución por Categoría</p>
                        <div className="grid grid-cols-2 gap-3">
                          {statsData?.categoryDistribution?.slice(0, 6).map((category, index) => (
                            <div key={index} className="border rounded-md p-3">
                              <p className="text-sm text-gray-500">{category.name}</p>
                              <p className="text-lg font-bold">{category.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-lg font-medium mb-4">Análisis de Categorías</p>
                        <div className="border rounded-md p-4 text-left">
                          <p className="text-sm text-gray-600">
                            {statsData?.categoryDistribution?.length > 0 ? (
                              <>
                                La categoría predominante es <strong>{statsData.categoryDistribution[0].name}</strong> con {statsData.categoryDistribution[0].value} denuncias, 
                                representando el {(statsData.categoryDistribution[0].value / statsData.totalReports * 100).toFixed(1)}% del total.
                                {statsData.categoryDistribution.length > 1 && (
                                  <> Seguida por <strong>{statsData.categoryDistribution[1].name}</strong> con {statsData.categoryDistribution[1].value} denuncias.</>
                                )}
                              </>
                            ) : (
                              "No hay suficientes datos para realizar un análisis de categorías."
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SafeRender>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Temporal</CardTitle>
              <CardDescription>Patrones y tendencias a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {statsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              ) : (
                <SafeRender
                  condition={statsData && statsData.reportsOverTime && statsData.reportsOverTime.series && Array.isArray(statsData.reportsOverTime.series)}
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No hay datos de tendencias temporales disponibles</p>
                    </div>
                  }
                >
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-lg font-medium mb-4">Distribución Temporal</p>
                      <div className="grid grid-cols-1 gap-4 border rounded-md p-6 max-w-2xl">
                        {statsData?.trendAnalysis && Array.isArray(statsData.trendAnalysis) && statsData.trendAnalysis.length > 0 ? (
                          <div className="text-left space-y-4">
                            {statsData.trendAnalysis.map((trend, index) => (
                              <div key={index} className={`border-l-4 pl-4 py-1 ${trend.isPositive ? 'border-green-500' : 'border-amber-500'}`}>
                                <h3 className="font-medium">{trend.title}</h3>
                                <p className="text-sm text-gray-600">{trend.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">
                            Se necesitan más datos históricos para generar análisis de tendencias significativos.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SafeRender>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-3">
          Acerca de los Reportes Inteligentes
        </h2>
        <p className="text-gray-600 mb-4">
          Esta sección proporciona análisis avanzados de sus denuncias, utilizando técnicas estadísticas y de inteligencia 
          artificial para identificar patrones, tendencias y relaciones que pueden no ser evidentes a simple vista. Los 
          reportes inteligentes le ayudan a tomar decisiones basadas en datos y a anticipar problemas potenciales.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Cómo utilizar los reportes:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Monitoree las tendencias para identificar patrones emergentes</li>
              <li>Revise los insights de IA para obtener recomendaciones basadas en datos</li>
              <li>Analice la distribución por categorías para identificar áreas problemáticas</li>
              <li>Examine la cronología para detectar patrones temporales</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Limitaciones actuales:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Los análisis son más precisos con mayor volumen de datos</li>
              <li>Algunos insights pueden requerir verificación manual</li>
              <li>Las predicciones y tendencias deben interpretarse en contexto</li>
              <li>Los análisis de relaciones complejas están en desarrollo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}