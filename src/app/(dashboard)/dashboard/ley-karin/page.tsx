'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { getKarinReports } from '@/lib/services/reportService';
import { Spinner } from '@/components/ui/spinner';
import { formatChileanDate } from '@/lib/utils/dateUtils';

export default function LeyKarinPage() {
  const { uid, isAdmin, isInvestigator, isSuperAdmin, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();

  // Determinar el ID de la compañía correcta
  const userCompanyId = profile?.role === 'super_admin' ? contextCompanyId : (profile?.company || contextCompanyId);

  // Estados
  const [karinCases, setKarinCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('cases');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [stageFilter, setStageFilter] = useState('todas');

  // Cargar casos Ley Karin
  useEffect(() => {
    async function fetchKarinCases() {
      if (!uid || !userCompanyId || !profile?.role) return;

      try {
        setLoading(true);
        const result = await getKarinReports(userCompanyId, profile.role, uid);

        if (result.success) {
          setKarinCases(result.reports || []);
        } else {
          setError(result.error || 'Error al cargar casos Ley Karin');
        }
      } catch (error) {
        console.error('Error al cargar casos Ley Karin:', error);
        setError('Ha ocurrido un error al cargar los casos');
      } finally {
        setLoading(false);
      }
    }

    fetchKarinCases();
  }, [uid, userCompanyId, profile?.role]);

  // Filtrar casos
  const filteredCases = karinCases.filter(case_ => {
    const matchesSearch = case_.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.detailedDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || case_.status === statusFilter;
    
    const matchesStage = stageFilter === 'todas' || case_.karinProcess?.stage === stageFilter;

    return matchesSearch && matchesStatus && matchesStage;
  });

  // Calcular estadísticas
  const getStats = () => {
    const total = karinCases.length;
    const byStatus = karinCases.reduce((acc, case_) => {
      acc[case_.status] = (acc[case_.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byStage = karinCases.reduce((acc, case_) => {
      const stage = case_.karinProcess?.stage || 'complaint_filed';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const urgent = karinCases.filter(case_ => {
      // Casos urgentes: menos de 5 días para vencer plazo crítico
      const stage = case_.karinProcess?.stage;
      return ['reception', 'investigation', 'dt_submission'].includes(stage);
    }).length;

    return { total, byStatus, byStage, urgent };
  };

  const getStageName = (stage: string): string => {
    const stages: {[key: string]: string} = {
      'complaint_filed': 'Denuncia Interpuesta',
      'reception': 'Recepción',
      'subsanation': 'Subsanación',
      'precautionary_measures': 'Medidas Precautorias',
      'decision_to_investigate': 'Decisión de Investigar',
      'investigation': 'Investigación',
      'report_creation': 'Creación Informe',
      'report_approval': 'Revisión Interna',
      'dt_notification': 'Notificación DT',
      'suseso_notification': 'Notificación SUSESO',
      'investigation_complete': 'Investigación Completa',
      'final_report': 'Informe Final',
      'dt_submission': 'Envío a DT',
      'dt_resolution': 'Resolución DT',
      'measures_adoption': 'Adopción de Medidas',
      'closed': 'Cerrado'
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage: string): string => {
    const colors: {[key: string]: string} = {
      'complaint_filed': 'bg-blue-100 text-blue-800',
      'reception': 'bg-yellow-100 text-yellow-800',
      'subsanation': 'bg-orange-100 text-orange-800',
      'precautionary_measures': 'bg-red-100 text-red-800',
      'investigation': 'bg-purple-100 text-purple-800',
      'dt_submission': 'bg-indigo-100 text-indigo-800',
      'closed': 'bg-green-100 text-green-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner text="Cargando casos Ley Karin..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            🏛️ Gestión Ley Karin
            <Badge variant="destructive" className="ml-3">
              {stats.total} casos
            </Badge>
          </h1>
          <p className="text-gray-500 mt-1">
            Centro consolidado para la gestión de todos los casos bajo la Ley Karin
          </p>
        </div>
      </div>

      {/* Pestañas principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cases">📋 Casos Activos</TabsTrigger>
          <TabsTrigger value="stats">📊 Estadísticas y Métricas</TabsTrigger>
        </TabsList>

        {/* Pestaña de Casos */}
        <TabsContent value="cases" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Buscar</label>
                  <Input
                    placeholder="Código, descripción, categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <option value="todos">Todos los estados</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="En Investigación">En Investigación</option>
                    <option value="En Evaluación">En Evaluación</option>
                    <option value="Resuelta">Resuelta</option>
                    <option value="Cerrada">Cerrada</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Etapa Ley Karin</label>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <option value="todas">Todas las etapas</option>
                    <option value="complaint_filed">Denuncia Interpuesta</option>
                    <option value="reception">Recepción</option>
                    <option value="investigation">Investigación</option>
                    <option value="dt_submission">Envío a DT</option>
                    <option value="measures_adoption">Adopción de Medidas</option>
                    <option value="closed">Cerrado</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de casos */}
          <div className="space-y-4">
            {filteredCases.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No se encontraron casos que coincidan con los filtros.</p>
                </CardContent>
              </Card>
            ) : (
              filteredCases.map((case_) => (
                <Card key={case_.id} className="border-2 border-red-200 hover:border-red-300">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Denuncia #{case_.code}
                          </h3>
                          <ReportStatusBadge status={case_.status} />
                          <Badge className={getStageColor(case_.karinProcess?.stage || 'complaint_filed')}>
                            {getStageName(case_.karinProcess?.stage || 'complaint_filed')}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {case_.detailedDescription}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                          <div>
                            <span className="font-medium">Categoría:</span> {case_.category}
                          </div>
                          <div>
                            <span className="font-medium">Creado:</span> {formatChileanDate(case_.createdAt)}
                          </div>
                          <div>
                            <span className="font-medium">Investigador:</span> {case_.investigatorName || 'Sin asignar'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Link href={`/dashboard/investigation/${case_.id}/karin`}>
                          <Button className="bg-red-600 hover:bg-red-700 text-white">
                            🏛️ Gestión Unificada
                          </Button>
                        </Link>
                        <Link href={`/dashboard/investigation/${case_.id}`}>
                          <Button variant="outline">
                            Ver Investigación
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Pestaña de Estadísticas */}
        <TabsContent value="stats" className="space-y-6">
          {/* Resumen general */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{stats.total}</div>
                <div className="text-sm text-red-800">Total Casos Ley Karin</div>
              </CardContent>
            </Card>
            
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats.urgent}</div>
                <div className="text-sm text-yellow-800">Casos Urgentes</div>
              </CardContent>
            </Card>
            
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.byStatus['En Investigación'] || 0}
                </div>
                <div className="text-sm text-blue-800">En Investigación</div>
              </CardContent>
            </Card>
            
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {(stats.byStatus['Resuelta'] || 0) + (stats.byStatus['Cerrada'] || 0)}
                </div>
                <div className="text-sm text-green-800">Casos Cerrados</div>
              </CardContent>
            </Card>
          </div>

          {/* Distribución por etapas */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Etapas del Proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byStage).map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <Badge className={getStageColor(stage)}>
                        {getStageName(stage)}
                      </Badge>
                    </div>
                    <div className="text-lg font-semibold">{count} casos</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerta de cumplimiento */}
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="text-red-800">
              <strong>📋 Cumplimiento Ley Karin:</strong> Recuerde que todos los casos deben cumplir con los plazos legales establecidos. 
              Revise regularmente los casos urgentes y utilice la gestión unificada para un seguimiento eficiente.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}