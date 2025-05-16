'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCompany } from '@/lib/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AIDashboardPage() {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Inteligencia Artificial</h1>
        <Button variant="outline">
          Actualizar Análisis
        </Button>
      </div>

      <Alert variant="info" className="my-4">
        <AlertDescription>
          Esta funcionalidad se encuentra en desarrollo y estará disponible próximamente. 
          El dashboard de IA proporcionará análisis predictivo, detección de patrones y recomendaciones 
          automatizadas basadas en los datos de denuncias.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">Panorama General</TabsTrigger>
          <TabsTrigger value="trends">Análisis de Tendencias</TabsTrigger>
          <TabsTrigger value="predictions">Predicciones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Implementación</CardTitle>
                <CardDescription>Progreso del desarrollo de funcionalidades de IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Análisis de Riesgo Predictivo</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">En Desarrollo</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Detección de Patrones</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Completado</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Categorización Automática</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Planificado</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Beneficios Esperados</CardTitle>
                <CardDescription>Valor añadido por la implementación de IA</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Reducción de 30% en tiempos de investigación</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Mejora del 40% en precisión de categorización</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Detección temprana de casos de alto riesgo</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Generación automatizada de informes y documentos</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Tendencias</CardTitle>
              <CardDescription>Esta función estará disponible próximamente</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center p-6 max-w-md">
                  <div className="text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Análisis de Tendencias en Desarrollo</h3>
                  <p className="text-gray-600 mb-4">
                    Estamos trabajando en algoritmos avanzados que identificarán patrones y tendencias en los datos
                    de denuncias para ayudar a prevenir incidentes futuros.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle>Predicciones y Recomendaciones</CardTitle>
              <CardDescription>Esta función estará disponible próximamente</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center p-6 max-w-md">
                  <div className="text-primary mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Sistema Predictivo en Construcción</h3>
                  <p className="text-gray-600 mb-4">
                    Nuestro sistema de IA pronto podrá predecir resultados probables y recomendar
                    acciones específicas basadas en el análisis de casos similares.
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