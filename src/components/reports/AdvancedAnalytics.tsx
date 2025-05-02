import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChartComponent, 
  BarChartComponent, 
  PieChartComponent, 
  AreaChartComponent 
} from './DataVisualization';
import { useReporting } from '@/lib/hooks/useReporting';
import { AdvancedReportingOptions } from '@/lib/services/reportingService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface AdvancedAnalyticsProps {
  initialOptions?: Partial<AdvancedReportingOptions>;
  showFilters?: boolean;
}

export function AdvancedAnalytics({ 
  initialOptions, 
  showFilters = true 
}: AdvancedAnalyticsProps) {
  const {
    isLoading,
    error,
    reportingSummary,
    trendAnalysis,
    timeSeriesData,
    options,
    loadSummary,
    loadTrends,
    loadTimeSeriesData,
    updateOptions,
    resetOptions
  } = useReporting();

  const [activeTab, setActiveTab] = useState('overview');

  // Cargar datos iniciales
  useEffect(() => {
    if (initialOptions) {
      updateOptions(initialOptions);
    }
    
    // Usar un timeout para evitar bloqueos en la UI
    const timer = setTimeout(() => {
      loadSummary();
      loadTrends();
      loadTimeSeriesData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [initialOptions, loadSummary, loadTimeSeriesData, loadTrends, updateOptions]);

  // Manejar cambio de filtros
  const handleTimeframeChange = (timeframe: AdvancedReportingOptions['timeframe']) => {
    updateOptions({ timeframe });
    
    // Usar un timeout para evitar bloqueos en la UI
    setTimeout(() => {
      loadSummary({ timeframe });
      setTimeout(() => {
        loadTimeSeriesData({ timeframe });
      }, 50);
    }, 50);
  };

  if (isLoading && !reportingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando análisis avanzado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={options.timeframe === 'week' ? 'default' : 'outline'}
                onClick={() => handleTimeframeChange('week')}
                className="text-sm"
              >
                Última semana
              </Button>
              <Button
                variant={options.timeframe === 'month' ? 'default' : 'outline'}
                onClick={() => handleTimeframeChange('month')}
                className="text-sm"
              >
                Último mes
              </Button>
              <Button
                variant={options.timeframe === 'quarter' ? 'default' : 'outline'}
                onClick={() => handleTimeframeChange('quarter')}
                className="text-sm"
              >
                Último trimestre
              </Button>
              <Button
                variant={options.timeframe === 'year' ? 'default' : 'outline'}
                onClick={() => handleTimeframeChange('year')}
                className="text-sm"
              >
                Último año
              </Button>
              <Button
                variant="outline"
                onClick={resetOptions}
                className="text-sm ml-auto"
              >
                Restablecer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-6">
          <TabsTrigger value="overview" className="flex-1">Resumen</TabsTrigger>
          <TabsTrigger value="trends" className="flex-1">Tendencias</TabsTrigger>
          <TabsTrigger value="categories" className="flex-1">Categorías</TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1">Cronológico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">{reportingSummary?.totalReports || 0}</div>
                <div className="text-sm text-gray-500 text-center">Total Denuncias</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">{reportingSummary?.recentReports || 0}</div>
                <div className="text-sm text-gray-500 text-center">Denuncias Recientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">{reportingSummary?.pendingReports || 0}</div>
                <div className="text-sm text-gray-500 text-center">Pendientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">{reportingSummary?.complianceRate?.toFixed(1) || 0}%</div>
                <div className="text-sm text-gray-500 text-center">Tasa de Cumplimiento</div>
              </CardContent>
            </Card>
          </div>

          {/* Estado de Denuncias */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de Denuncias</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent 
                data={reportingSummary?.statusDistribution || []} 
                height={300}
              />
            </CardContent>
          </Card>

          {/* Distribución por Categoría */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartComponent 
                data={reportingSummary?.categoryDistribution || []} 
                height={300}
                layout="horizontal"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Tendencias */}
          <div className="space-y-6">
            {trendAnalysis.map(trend => (
              <Card key={trend.id}>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center">
                      {trend.title}
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend.isPositive ? '+' : '-'}{trend.changePercentage}%
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">{trend.description}</p>
                  {trend.data && (
                    <LineChartComponent 
                      data={{ series: trend.data }} 
                      height={250}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {/* Distribución por Categoría */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent 
                data={reportingSummary?.categoryDistribution || []} 
                height={350}
              />
            </CardContent>
          </Card>

          {/* Categorías por tipo de riesgo */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              {reportingSummary?.riskDistribution && (
                <BarChartComponent 
                  data={Object.entries(reportingSummary.riskDistribution).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value
                  }))} 
                  height={250}
                  color="#0891b2"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {/* Evolución temporal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Denuncias en el Tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              {timeSeriesData && (
                <AreaChartComponent 
                  data={timeSeriesData} 
                  height={350}
                  stacked={false}
                />
              )}
            </CardContent>
          </Card>

          {/* Evolución por Categoría */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {reportingSummary?.reportsOverTime && (
                <LineChartComponent 
                  data={reportingSummary.reportsOverTime} 
                  height={300}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}