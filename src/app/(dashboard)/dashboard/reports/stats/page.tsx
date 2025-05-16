'use client';

// src/app/(dashboard)/dashboard/reports/stats/page.tsx
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getReportStatistics } from '@/lib/services/reportService';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks/useCompany';

export default function ReportsStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, uid, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const userCompanyId = profile?.company || contextCompanyId;
  
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        const result = await getReportStatistics(userCompanyId);
        
        if (result.success) {
          setStats(result.stats);
        } else {
          setError(result.error || 'Error al cargar las estadísticas');
        }
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        setError('Ha ocurrido un error al cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [userCompanyId]);
  
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
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard/reports">
            <Button>Volver al Listado de Denuncias</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Procesar los datos para su visualización
  const totalReports = stats?.totalReports || 0;
  
  // Obtener datos por estado (ordenados según el flujo ideal)
  const stateOrder = [
    'Nuevo', 'Admitida', 'Asignada', 'En Investigación', 
    'Pendiente Información', 'En Evaluación', 'Resuelta', 
    'En Seguimiento', 'Cerrada', 'Rechazada'
  ];
  
  const statusStats = stateOrder.map(status => {
    const count = stats?.byStatus?.[status] || 0;
    return {
      status,
      count,
      percentage: totalReports > 0 ? Math.round((count / totalReports) * 100) : 0
    };
  });
  
  // Obtener datos por categoría
  const categoryLabels: Record<string, string> = {
    'modelo_prevencion': 'Prevención de Delitos',
    'ley_karin': 'Ley Karin',
    'ciberseguridad': 'Ciberseguridad',
    'reglamento_interno': 'Reglamento Interno',
    'politicas_codigos': 'Políticas y Códigos',
    'represalias': 'Represalias',
    'otros': 'Otros'
  };
  
  const categoryStats = Object.entries(stats?.byCategory || {}).map(([key, value]) => {
    return {
      category: categoryLabels[key] || key,
      count: value as number,
      percentage: totalReports > 0 ? Math.round(((value as number) / totalReports) * 100) : 0
    };
  }).sort((a, b) => b.count - a.count);
  
  // Fecha de actualización
  const updatedDate = stats?.updated?.toDate 
    ? new Date(stats.updated.toDate()) 
    : stats?.updated 
      ? new Date(stats.updated)
      : new Date();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas de Denuncias</h1>
        <div className="text-sm text-gray-500">
          Última actualización: {updatedDate.toLocaleString()}
        </div>
      </div>
      
      {/* Resumen general */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-5xl font-bold text-primary">{totalReports}</div>
            <div className="mt-2 text-gray-500">Total de denuncias recibidas</div>
          </div>
          
          {/* Acciones adicionales */}
          <div className="mt-6 flex justify-center">
            <Link href="/dashboard/reports">
              <Button>Ver todas las denuncias</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* Distribución por estado */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusStats.map(item => (
              <div key={item.status} className="flex items-center">
                <div className="w-32 text-sm font-medium">
                  {item.status}
                </div>
                <div className="flex-1 mr-4">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-20 flex justify-between text-sm">
                  <span>{item.count}</span>
                  <span className="text-gray-500">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Distribución por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.map(item => (
              <div key={item.category} className="flex items-center">
                <div className="w-40 text-sm font-medium">
                  {item.category}
                </div>
                <div className="flex-1 mr-4">
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-20 flex justify-between text-sm">
                  <span>{item.count}</span>
                  <span className="text-gray-500">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Acciones */}
      <div className="flex justify-end">
        <Link href="/dashboard/reports">
          <Button variant="outline">Volver al Listado</Button>
        </Link>
      </div>
    </div>
  );
}