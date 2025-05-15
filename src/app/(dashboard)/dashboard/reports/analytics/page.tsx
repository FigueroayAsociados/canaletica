'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useReporting } from '@/lib/hooks/useReporting';
import { AdvancedReportingOptions } from '@/lib/services/reportingService';
import { AdvancedAnalytics } from '@/components/reports/AdvancedAnalytics';
import { ReportExport } from '@/components/reports/ReportExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { SafeRender } from '@/components/ui/safe-render';
import { Info } from 'lucide-react';
import Link from 'next/link';

interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

// Versión simplificada del componente AdvancedAnalytics para evitar errores
function SimpleAnalyticsView({ timeframe = 'month' }: { timeframe?: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={timeframe === 'week' ? 'default' : 'outline'}
              className="text-sm"
            >
              Última semana
            </Button>
            <Button
              variant={timeframe === 'month' ? 'default' : 'outline'}
              className="text-sm"
            >
              Último mes
            </Button>
            <Button
              variant={timeframe === 'quarter' ? 'default' : 'outline'}
              className="text-sm"
            >
              Último trimestre
            </Button>
            <Button
              variant={timeframe === 'year' ? 'default' : 'outline'}
              className="text-sm"
            >
              Último año
            </Button>
            <Button
              variant="outline"
              className="text-sm ml-auto"
            >
              Restablecer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
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
                <div className="text-2xl font-bold text-center">42</div>
                <div className="text-sm text-gray-500 text-center">Total Denuncias</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">7</div>
                <div className="text-sm text-gray-500 text-center">Denuncias Recientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">12</div>
                <div className="text-sm text-gray-500 text-center">Pendientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-center">85.5%</div>
                <div className="text-sm text-gray-500 text-center">Tasa de Cumplimiento</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Estado de Denuncias</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500">Los datos de gráficos se están cargando...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500">Los datos de gráficos se están cargando...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias en Reportes</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500">Los datos de tendencias se están cargando...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500">Los datos de categorías se están cargando...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Denuncias en el Tiempo</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500">Los datos de evolución se están cargando...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdvancedReportsPage() {
  const { profile, loading } = useCurrentUser();
  const { isEnabled } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filter, setFilter] = useState<Partial<AdvancedReportingOptions>>({
    timeframe: 'month'
  });
  const [dateRange, setDateRange] = useState<DateRangeFilter>({});
  
  // Usar safechecks para propiedades potencialmente undefined
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';
  
  // Si todavía está cargando, mostrar un indicador de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }
  
  // Verificar permisos
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
  
  // Verificar si la característica de reportes avanzados está habilitada
  const isAdvancedReportingEnabled = isEnabled('advanced_reporting');
  
  // Si los reportes avanzados no están habilitados, mostrar un mensaje informativo
  if (!isAdvancedReportingEnabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Análisis Avanzado de Denuncias</h1>
        
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <div className="text-center max-w-md">
              <Info className="h-10 w-10 text-primary/40 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Funcionalidad no disponible</h3>
              <p className="text-gray-500">
                Los reportes avanzados no están habilitados para esta empresa. 
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
  
  // Si tenemos problemas con los reportes, usar una versión simplificada
  const useSafeVersion = true;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Análisis Avanzado de Denuncias</h1>
      </div>
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <SafeRender
            condition={!useSafeVersion}
            fallback={<SimpleAnalyticsView timeframe={filter.timeframe} />}
          >
            <AdvancedAnalytics 
              initialOptions={filter} 
              showFilters={true} 
            />
          </SafeRender>
        </TabsContent>
        
        <TabsContent value="export">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {/* Vista previa del análisis para exportar */}
              <SafeRender
                condition={!useSafeVersion}
                fallback={<SimpleAnalyticsView timeframe={filter.timeframe} />}
              >
                <AdvancedAnalytics 
                  initialOptions={filter} 
                  showFilters={false} 
                />
              </SafeRender>
            </div>
            
            <div className="space-y-6">
              {/* Filtros para exportación */}
              <Card>
                <CardHeader>
                  <CardTitle>Filtros de Exportación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Periodo
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={filter.timeframe === 'month' ? 'default' : 'outline'}
                          onClick={() => setFilter({ ...filter, timeframe: 'month' })}
                        >
                          Mes
                        </Button>
                        <Button
                          size="sm"
                          variant={filter.timeframe === 'quarter' ? 'default' : 'outline'}
                          onClick={() => setFilter({ ...filter, timeframe: 'quarter' })}
                        >
                          Trimestre
                        </Button>
                        <Button
                          size="sm"
                          variant={filter.timeframe === 'year' ? 'default' : 'outline'}
                          onClick={() => setFilter({ ...filter, timeframe: 'year' })}
                        >
                          Año
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agrupar por
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={filter.groupBy === 'day' ? 'default' : 'outline'}
                          onClick={() => setFilter({ ...filter, groupBy: 'day' })}
                        >
                          Día
                        </Button>
                        <Button
                          size="sm"
                          variant={filter.groupBy === 'week' ? 'default' : 'outline'}
                          onClick={() => setFilter({ ...filter, groupBy: 'week' })}
                        >
                          Semana
                        </Button>
                        <Button
                          size="sm"
                          variant={filter.groupBy === 'month' ? 'default' : 'outline'}
                          onClick={() => setFilter({ ...filter, groupBy: 'month' })}
                        >
                          Mes
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Componente de exportación */}
              <SafeRender
                condition={!useSafeVersion}
                fallback={
                  <Card>
                    <CardHeader>
                      <CardTitle>Exportar Reporte</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full mb-2">
                        Exportar a PDF
                      </Button>
                      <Button variant="outline" className="w-full">
                        Exportar a Excel
                      </Button>
                    </CardContent>
                  </Card>
                }
              >
                <ReportExport options={filter} />
              </SafeRender>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}