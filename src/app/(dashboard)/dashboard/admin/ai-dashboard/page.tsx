'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { Lightbulb, TrendingUp, AlertTriangle, Zap, Calendar } from 'lucide-react';
import InsightsDashboard from '@/components/ai/InsightsDashboard';
import Link from 'next/link';

export default function AIDashboardPage() {
  const { isAdmin, profile } = useCurrentUser();
  const isSuperAdmin = profile?.role === 'super_admin';
  const { companyId } = useCompany();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  
  // Solo permitir acceso a administradores
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Avanzado de IA</h1>
        
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
        </div>
      </div>
      
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
              3
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Tendencias identificadas en tus datos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-red-500">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Riesgos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              3
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Riesgos potenciales detectados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-amber-500">
              <Lightbulb className="mr-2 h-4 w-4" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              3
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Mejoras recomendadas por IA
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-green-500">
              <Zap className="mr-2 h-4 w-4" />
              Eficiencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              3
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Oportunidades de optimización
            </p>
          </CardContent>
        </Card>
      </div>
      
      <InsightsDashboard 
        timeRange={timeRange}
        className="h-full"
      />
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-3">
          Acerca del Dashboard Avanzado de IA
        </h2>
        <p className="text-gray-600 mb-4">
          Este dashboard utiliza inteligencia artificial para analizar todos los datos de denuncias e investigaciones, 
          identificando patrones, riesgos potenciales y oportunidades de mejora que podrían pasar desapercibidos. 
          Las recomendaciones se basan en análisis de datos históricos y mejores prácticas del sector.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Cómo utilizar este dashboard:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Revise regularmente las tendencias para anticipar cambios</li>
              <li>Priorice la atención a los riesgos de alta severidad</li>
              <li>Implemente las recomendaciones para mejorar procesos</li>
              <li>Utilice los insights de eficiencia para optimizar recursos</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Actualizaciones:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Los datos se analizan automáticamente cada 24 horas</li>
              <li>Puede actualizar manualmente los insights con el botón "Actualizar"</li>
              <li>Ajuste el período de tiempo para análisis específicos</li>
              <li>Los insights se clasifican por tipo y nivel de confianza</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}