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
import Link from 'next/link';

interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export default function AdvancedReportsPage() {
  const { isAdmin, profile } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filter, setFilter] = useState<Partial<AdvancedReportingOptions>>({
    timeframe: 'month'
  });
  const [dateRange, setDateRange] = useState<DateRangeFilter>({});
  
  // Para evitar problemas de rendering
  const isSuperAdmin = profile?.role === 'super_admin';
  
  // Verificar permisos
  if (!isAdmin && !isSuperAdmin) {
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
          <AdvancedAnalytics 
            initialOptions={filter} 
            showFilters={true} 
          />
        </TabsContent>
        
        <TabsContent value="export">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {/* Vista previa del análisis para exportar */}
              <AdvancedAnalytics 
                initialOptions={filter} 
                showFilters={false} 
              />
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
              <ReportExport options={filter} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}