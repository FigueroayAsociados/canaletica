'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { Lightbulb, TrendingUp, AlertTriangle, Zap, Calendar, Info } from 'lucide-react';
import SimpleInsightsDashboard from '@/components/ai/SimpleInsightsDashboard';
import Link from 'next/link';
import { SafeRender } from '@/components/ui/safe-render';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

export default function AIDashboardPage() {
  const { profile, loading } = useCurrentUser();
  const { companyId } = useCompany();
  const { isEnabled } = useFeatureFlags();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  
  // Usar SafeRender para evitar problemas con acceso a propiedades undefined
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
  
  // Mostrar un mensaje de funcionalidad próximamente
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Avanzado de IA</h1>
      
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center max-w-md">
            <Info className="h-10 w-10 text-primary/40 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Próximamente</h3>
            <p className="text-gray-500">
              Estamos trabajando en mejorar esta funcionalidad. Estará disponible en una próxima actualización.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
}