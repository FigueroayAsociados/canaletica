'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useCompany } from '@/lib/hooks';

export default function IntelligentReportsPage() {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Reportes Inteligentes</h1>
        <Button variant="outline">
          Generar Nuevo Análisis
        </Button>
      </div>

      <Alert variant="info" className="my-4">
        <AlertDescription>
          Esta funcionalidad se encuentra en desarrollo y estará disponible próximamente.
          Los reportes inteligentes proporcionarán análisis avanzados y visualizaciones 
          de datos para ayudar a identificar patrones y tendencias en las denuncias.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="categories">Análisis por Categorías</TabsTrigger>
          <TabsTrigger value="timeline">Análisis Temporal</TabsTrigger>
          <TabsTrigger value="relationships">Relaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Denuncias</CardTitle>
                <CardDescription>Vista general de todas las denuncias</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center" style={{ height: '300px' }}>
                <div className="text-center">
                  <Spinner />
                  <p className="mt-4 text-gray-500">Cargando datos...</p>
                </div>
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
                    <p className="text-2xl font-bold mt-2">N/A</p>
                  </div>
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-gray-500">Tasa de Recurrencia</p>
                    <p className="text-2xl font-bold mt-2">N/A</p>
                  </div>
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-gray-500">% Casos Críticos</p>
                    <p className="text-2xl font-bold mt-2">N/A</p>
                  </div>
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-gray-500">Efectividad de Soluciones</p>
                    <p className="text-2xl font-bold mt-2">N/A</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Categorías</CardTitle>
              <CardDescription>Distribución y tendencias por tipo de denuncia</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center p-6 max-w-md">
                  <div className="text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Análisis en Desarrollo</h3>
                  <p className="text-gray-600 mb-4">
                    Estamos trabajando en algoritmos avanzados que analizarán la distribución y 
                    comportamiento de denuncias por categorías, permitiendo identificar áreas 
                    que requieren atención prioritaria.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Temporal</CardTitle>
              <CardDescription>Patrones y tendencias a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center p-6 max-w-md">
                  <div className="text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Análisis Temporal en Construcción</h3>
                  <p className="text-gray-600 mb-4">
                    Próximamente podrá visualizar tendencias y patrones temporales de
                    denuncias, incluyendo análisis de estacionalidad y factores cíclicos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Relaciones</CardTitle>
              <CardDescription>Conexiones entre denuncias, personas y eventos</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center p-6 max-w-md">
                  <div className="text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Análisis de Relaciones en Desarrollo</h3>
                  <p className="text-gray-600 mb-4">
                    Esta herramienta permitirá visualizar conexiones complejas entre denuncias,
                    personas y eventos, ayudando a identificar patrones y relaciones que
                    podrían pasar desapercibidas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}