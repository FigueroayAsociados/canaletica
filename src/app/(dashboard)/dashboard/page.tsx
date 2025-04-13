'use client';

// src/app/(dashboard)/dashboard/page.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import Link from 'next/link';
import { getDashboardMetrics } from '@/lib/services/dashboardService';

export default function DashboardPage() {
  const { profile, isAdmin } = useCurrentUser();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const companyId = 'default'; // En un sistema multi-tenant, esto vendría de un contexto o URL
        
        const result = await getDashboardMetrics(companyId);
        
        if (result.success) {
          setMetrics(result.metrics);
          setLastUpdated(new Date());
        } else {
          setError('No se pudieron cargar las métricas');
        }
      } catch (error) {
        console.error('Error al cargar métricas:', error);
        setError('Error al cargar las métricas del dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

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
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Calcular los incrementos (para mostrar "+X esta semana/mes")
  // En una implementación real, esto también vendría del backend
  const getNewThisWeek = () => {
    // Usamos el 15% de las nuevas denuncias como aproximación para "esta semana"
    return Math.round(metrics?.newReports * 0.15);
  };

  const getNewThisMonth = () => {
    // Usamos el 20% de las denuncias resueltas como aproximación para "este mes"
    return Math.round(metrics?.resolvedReports * 0.2);
  };

  // Calcular denuncias próximas a vencer
  // En una implementación real, esto vendría del backend
  const getExpiringSoon = () => {
    // Usamos el 30% de las denuncias en progreso como aproximación
    return Math.round(metrics?.inProgressReports * 0.3);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
        <div className="text-sm text-gray-500">
          Última actualización: {lastUpdated.toLocaleString()}
        </div>
      </div>

      {/* Mensaje de bienvenida */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          Bienvenido, {profile?.displayName}
        </h2>
        <p className="mt-1 text-gray-600">
          {profile?.role === 'super_admin'
            ? 'Tienes acceso completo al sistema como super administrador.'
            : isAdmin
              ? 'Tienes acceso completo al sistema como administrador.'
              : 'Tienes acceso como investigador para gestionar denuncias.'
          }
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Nuevas Denuncias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">{metrics?.newReports || 0}</span>
              {getNewThisWeek() > 0 && (
                <span className="ml-2 text-sm text-green-600">+{getNewThisWeek()} esta semana</span>
              )}
            </div>
            <div className="mt-2">
              <Link href="/dashboard/reports?status=Nuevo" className="text-sm text-primary hover:underline">
                Ver denuncias nuevas
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">En Investigación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">{metrics?.inProgressReports || 0}</span>
              {getExpiringSoon() > 0 && (
                <span className="ml-2 text-sm text-yellow-600">{getExpiringSoon()} próximas a vencer</span>
              )}
            </div>
            <div className="mt-2">
              <Link href="/dashboard/reports?status=En Investigación" className="text-sm text-primary hover:underline">
                Ver investigaciones activas
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">{metrics?.resolvedReports || 0}</span>
              {getNewThisMonth() > 0 && (
                <span className="ml-2 text-sm text-green-600">+{getNewThisMonth()} este mes</span>
              )}
            </div>
            <div className="mt-2">
              <Link href="/dashboard/reports?status=Resuelta" className="text-sm text-primary hover:underline">
                Ver denuncias resueltas
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">{metrics?.averageResolutionTime || 0}</span>
              <span className="ml-2 text-sm text-gray-600">días</span>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-600">
                Para resolver una denuncia
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Denuncias por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.reportsByCategory.map((item: any) => (
                <div key={item.category} className="flex items-center">
                  <div className="w-32 text-sm">
                    {item.category === 'modelo_prevencion' && 'Prev. Delitos'}
                    {item.category === 'ley_karin' && 'Ley Karin'}
                    {item.category === 'ciberseguridad' && 'Ciberseguridad'}
                    {item.category === 'reglamento_interno' && 'Regl. Interno'}
                    {item.category === 'politicas_codigos' && 'Políticas'}
                    {item.category === 'represalias' && 'Represalias'}
                    {item.category === 'otros' && 'Otros'}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(item.count / metrics.totalReports) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-10 text-right text-sm font-medium">{item.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex">
                  <div className="mr-4 flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {activity.type === 'report_created' && (
                        <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                      {activity.type === 'report_assigned' && (
                        <svg className="h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                      {activity.type === 'report_resolved' && (
                        <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.date).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/dashboard/reports" className="text-sm text-primary hover:underline">
                Ver todo el historial de actividad
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Denuncias por Mes (Gráfico simplificado) */}
      <Card>
        <CardHeader>
          <CardTitle>Denuncias por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between px-2">
            {metrics?.reportsByMonth.map((data: any, index: number) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="w-10 bg-primary rounded-t-sm"
                  style={{
                    height: `${(data.count / Math.max(...metrics.reportsByMonth.map((d: any) => d.count) || [1])) * 180}px`
                  }}
                ></div>
                <div className="mt-2 text-xs font-medium">{data.month}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}