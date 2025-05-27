'use client';

// src/app/(dashboard)/dashboard/page.tsx

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import Link from 'next/link';
import { getDashboardMetrics } from '@/lib/services/dashboardService';
// Removida importación de iconos no utilizados
import { ArrowUp, ArrowDown, RefreshCcw } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Componentes de dashboard
import SummaryStatCard from '@/components/dashboard/SummaryStatCard';
import CategoryDistributionCard from '@/components/dashboard/CategoryDistributionCard';
import RecentActivityCard from '@/components/dashboard/RecentActivityCard';
import MonthlyTrendCard from '@/components/dashboard/MonthlyTrendCard';
import AssistantCard from '@/components/dashboard/AssistantCard';
import SmartAlertSystem from '@/components/alerts/SmartAlertSystem';

export default function DashboardPage() {
  const { profile, isAdmin } = useCurrentUser();
  const { companyId } = useCompany();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Asegurar que solo se puedan ver métricas de la compañía del usuario
  // Los super admin pueden ver cualquier compañía (la que esté en el contexto)
  // Los admin regulares sólo pueden ver la compañía de su perfil
  let userCompanyId = profile?.role === 'super_admin' ? companyId : (profile?.company || companyId);
  
  // Para despliegues de Vercel, asegurar que userCompanyId sea 'default' si contiene patrones de Vercel
  if (userCompanyId && (
      userCompanyId.includes('-vercel') || 
      userCompanyId.startsWith('canaletica-') ||
      userCompanyId.includes('-ricardo-figueroas-projects-')
    )) {
    console.log(`[DashboardPage] Corrigiendo companyId de Vercel "${userCompanyId}" a "default"`);
    userCompanyId = 'default';
  }

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      const result = await getDashboardMetrics(userCompanyId);

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
  };

  // Cargar métricas iniciales
  useEffect(() => {
    fetchMetrics();
  }, []);
  
  // Configurar un listener para actualizaciones en tiempo real de la colección de denuncias
  useEffect(() => {
    // Usar la compañía del usuario para escuchar cambios

    // Crear referencia a la colección de denuncias
    const reportsRef = collection(db, `companies/${userCompanyId}/reports`);

    // Establecer el listener
    const unsubscribe = onSnapshot(reportsRef, (snapshot) => {
      // Cuando hay cambios en la colección de denuncias, actualizar las métricas
      console.log("Detectado cambio en las denuncias. Actualizando dashboard...");
      fetchMetrics();
    }, (error) => {
      console.error("Error en el listener de denuncias:", error);
    });
    
    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe();
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

  // Formatear actividades recientes para el nuevo componente
  const formatActivities = () => {
    if (!metrics?.recentActivity) return [];
    
    return metrics.recentActivity.map((activity: any) => {
      let activityType: 'report' | 'investigation' | 'followup' | 'user' = 'report';
      let status = '';
      let url = '';
      
      if (activity.type === 'report_created') {
        activityType = 'report';
        status = 'Nuevo';
        url = `/dashboard/reports/${activity.reportId}`;
      } else if (activity.type === 'report_assigned') {
        activityType = 'investigation';
        status = 'Asignado';
        url = `/dashboard/investigation/${activity.reportId}`;
      } else if (activity.type === 'report_resolved') {
        activityType = 'followup';
        status = 'Resuelto';
        url = `/dashboard/follow-up/${activity.reportId}`;
      }
      
      return {
        id: activity.id,
        type: activityType,
        title: `Denuncia #${activity.reportId.slice(0, 6)}`,
        description: activity.description,
        date: new Date(activity.date),
        status,
        url
      };
    });
  };

  // Formatear datos mensuales para el componente de tendencias
  const formatMonthlyData = () => {
    if (!metrics?.reportsByMonth) return [];
    
    return metrics.reportsByMonth.map((item: any) => ({
      month: item.month,
      value: item.count
    }));
  };

  // Calcular totales para componente de tendencias
  const calculateTrendTotals = () => {
    if (!metrics?.reportsByMonth || metrics.reportsByMonth.length < 2) {
      return { current: 0, previous: 0 };
    }
    
    const monthsData = metrics.reportsByMonth;
    const currentPeriodTotal = monthsData[monthsData.length - 1].count;
    const previousPeriodTotal = monthsData[monthsData.length - 2].count;
    
    return { current: currentPeriodTotal, previous: previousPeriodTotal };
  };

  const { current: currentMonthTotal, previous: previousMonthTotal } = calculateTrendTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchMetrics()} 
            className="text-primary hover:text-primary-dark focus:outline-none flex items-center"
            disabled={loading}
            title="Actualizar métricas del dashboard"
          >
            <RefreshCcw className={`h-5 w-5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Actualizar</span>
          </button>
          <div className="text-sm text-gray-500">
            Última actualización: {lastUpdated.toLocaleString()}
          </div>
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
        <SummaryStatCard
          title="Nuevas Denuncias"
          value={metrics?.newReports || 0}
          change={getNewThisWeek() > 0 ? {
            value: getNewThisWeek(),
            type: 'increase',
            period: 'week'
          } : undefined}
          linkUrl="/dashboard/reports?status=Nuevo"
          linkText="Ver denuncias nuevas"
          colorScheme="primary"
        />

        <SummaryStatCard
          title="En Investigación"
          value={metrics?.inProgressReports || 0}
          urgent={getExpiringSoon() > 0 ? {
            count: getExpiringSoon(),
            type: 'expiring'
          } : undefined}
          linkUrl="/dashboard/reports?status=todas_en_investigacion" // Filtro especial que muestra exactamente las 7 denuncias
          linkText="Ver investigaciones activas"
          colorScheme="warning"
        />

        <SummaryStatCard
          title="Resueltas"
          value={metrics?.resolvedReports || 0}
          change={getNewThisMonth() > 0 ? {
            value: getNewThisMonth(),
            type: 'increase',
            period: 'month'
          } : undefined}
          linkUrl="/dashboard/reports?status=Resuelta"
          linkText="Ver denuncias resueltas"
          colorScheme="success"
        />

        <SummaryStatCard
          title="Tiempo Promedio"
          value={metrics?.averageResolutionTime || 0}
          subtitle="días"
          colorScheme="info"
        />
      </div>

      {/* Gráficos y datos detallados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryDistributionCard
              title="Denuncias por Categoría"
              categories={metrics?.reportsByCategory.map((item: any) => ({
                category: item.category,
                count: item.count
              })) || []}
              totalCount={metrics?.totalReports}
            />
            
            <RecentActivityCard
              title="Actividad Reciente"
              activities={formatActivities()}
              viewAllUrl="/dashboard/reports"
            />
          </div>
          
          {/* Alertas Inteligentes */}
          <div className="mt-2">
            <SmartAlertSystem sidebarMode />
          </div>
        </div>
        
        {/* Asistente Virtual */}
        <div className="h-[500px]">
          <AssistantCard />
        </div>
      </div>

      {/* Gráfico de tendencias */}
      <div className="grid grid-cols-1 gap-6">
        <MonthlyTrendCard
          title="Tendencia de Denuncias"
          data={formatMonthlyData()}
          currentPeriodTotal={currentMonthTotal}
          previousPeriodTotal={previousMonthTotal}
          valueLabel="Denuncias"
          colorScheme="blue"
        />
      </div>
    </div>
  );
}