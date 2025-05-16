'use client';

// src/app/(dashboard)/dashboard/investigation/page.tsx

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks/useCompany';
import { getAssignedReports } from '@/lib/services/investigationService';

export default function InvestigationPage() {
  const { uid, isAdmin, isInvestigator, isSuperAdmin, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();

  // Estados para filtros
  const [filter, setFilter] = useState({
    status: '',
    searchTerm: '',
  });

  // Estados para datos
  const [assignedReports, setAssignedReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determinar el ID de la compañía correcta
  const userCompanyId = profile?.company || contextCompanyId;

  // Cargar las denuncias asignadas
  useEffect(() => {
    async function fetchAssignedReports() {
      if (!uid) return;

      try {
        setLoading(true);
        const result = await getAssignedReports(userCompanyId, uid);

        if (result.success) {
          console.log('Denuncias asignadas:', result.reports); // Para depuración
          setAssignedReports(result.reports);
          setFilteredReports(result.reports);
        } else {
          setError(result.error || 'Error al cargar las denuncias asignadas');
        }
      } catch (error) {
        console.error('Error al cargar denuncias asignadas:', error);
        setError('Ha ocurrido un error al cargar sus casos asignados');
      } finally {
        setLoading(false);
      }
    }

    fetchAssignedReports();
  }, [uid]);

  // Aplicar filtros
  useEffect(() => {
    if (!assignedReports.length) return;

    let filteredData = [...assignedReports];

    // Filtrar por estado
    if (filter.status) {
      filteredData = filteredData.filter(report => report.status === filter.status);
    }

    // Filtrar por término de búsqueda
    if (filter.searchTerm) {
      const searchTerm = filter.searchTerm.toLowerCase();
      filteredData = filteredData.filter(report =>
        (report.code && report.code.toLowerCase().includes(searchTerm)) ||
        (report.category && report.category.toLowerCase().includes(searchTerm)) ||
        (report.subcategory && report.subcategory.toLowerCase().includes(searchTerm)) ||
        (report.reporter && report.reporter.contactInfo?.name &&
          report.reporter.contactInfo.name.toLowerCase().includes(searchTerm))
      );
    }

    setFilteredReports(filteredData);
  }, [assignedReports, filter]);

  // Manejar cambios en los filtros
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilter({
      status: '',
      searchTerm: '',
    });
  };

  // Formatear fechas
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  };

  // Calcular días transcurridos
  const getDaysSince = (date: any) => {
    if (!date) return 0;
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - dateObj.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Renderizar un indicador de progreso
  const renderProgressBar = (report: any) => {
    const progress = report.investigation?.progress || 0;
    
    return (
      <div className="relative pt-1">
        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: `${progress}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
              progress === 100
                ? 'bg-green-500'
                : progress > 50
                ? 'bg-blue-500'
                : 'bg-yellow-500'
            }`}
          ></div>
        </div>
        <div className="text-xs mt-1">{progress}% completado</div>
      </div>
    );
  };

  if (!isInvestigator && !isAdmin && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página. Esta sección está reservada para investigadores y administradores.
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
          <p className="text-gray-600">Cargando sus casos asignados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Investigación</h1>
        <Link href="/dashboard/investigation/all">
          {(isAdmin || isSuperAdmin) && (
            <Button variant="outline">Ver Todas las Investigaciones</Button>
          )}
        </Link>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <Select
                id="status"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="w-full"
              >
                <option value="">Todos los estados</option>
                <option value="Asignada">Asignada</option>
                <option value="En Investigación">En Investigación</option>
                <option value="Pendiente Información">Pendiente Información</option>
                <option value="En Evaluación">En Evaluación</option>
                <option value="Resuelta">Resuelta</option>
                <option value="En Seguimiento">En Seguimiento</option>
                <option value="Cerrada">Cerrada</option>
              </Select>
            </div>
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <Input
                id="searchTerm"
                name="searchTerm"
                value={filter.searchTerm}
                onChange={handleFilterChange}
                placeholder="Código, categoría, denunciante..."
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full md:w-auto"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-yellow-50">
          <CardContent className="p-6">
            <h3 className="font-medium text-yellow-800">Por Iniciar</h3>
            <p className="text-3xl font-bold text-yellow-900 mt-2">
              {assignedReports.filter(r => r.status === 'Asignada').length}
            </p>
            <p className="text-sm text-yellow-700 mt-1">Casos asignados pendientes de iniciar</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-6">
            <h3 className="font-medium text-blue-800">En Proceso</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {assignedReports.filter(r =>
                ['En Investigación', 'Pendiente Información', 'En Evaluación'].includes(r.status)
              ).length}
            </p>
            <p className="text-sm text-blue-700 mt-1">Investigaciones activas en proceso</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-6">
            <h3 className="font-medium text-green-800">Completadas</h3>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {assignedReports.filter(r =>
                ['Resuelta', 'En Seguimiento', 'Cerrada'].includes(r.status)
              ).length}
            </p>
            <p className="text-sm text-green-700 mt-1">Investigaciones resueltas o cerradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de casos asignados */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Casos Asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No hay casos que coincidan con los filtros</h3>
              <p className="mt-1 text-sm text-gray-500">
                {assignedReports.length === 0
                  ? 'Aún no tiene casos asignados para investigar.'
                  : 'Ajuste los filtros para ver sus casos asignados.'}
              </p>
              {filter.status || filter.searchTerm ? (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpiar Filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código / Fecha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Denunciante
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progreso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Días Activo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className={`hover:bg-gray-50 ${report.isKarinLaw ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{report.code}</div>
                        <div className="text-xs text-gray-500">{formatDate(report.createdAt)}</div>
                        {report.isKarinLaw && (
                          <span className="mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Ley Karin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.category === 'modelo_prevencion' && 'Prev. de Delitos'}
                          {report.category === 'ley_karin' && 'Ley Karin'}
                          {report.category === 'ciberseguridad' && 'Ciberseguridad'}
                          {report.category === 'reglamento_interno' && 'Regl. Interno'}
                          {report.category === 'politicas_codigos' && 'Políticas'}
                          {report.category === 'represalias' && 'Represalias'}
                          {report.category === 'otros' && 'Otros'}
                        </div>
                        <div className="text-xs text-gray-500">{report.subcategory}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ReportStatusBadge status={report.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.isAnonymous ? (
                          <span className="text-sm text-gray-500">Anónimo</span>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {report.reporter?.contactInfo?.name || 'N/A'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderProgressBar(report)}
                        <div className="text-xs text-gray-500 mt-1">
                          {report.investigation?.hasPlan && (
                            <span className="inline-block mr-2 px-1 bg-green-100 text-green-800 rounded">Plan ✓</span>
                          )}
                          {report.investigation?.interviewCount > 0 && (
                            <span className="inline-block mr-2 px-1 bg-blue-100 text-blue-800 rounded">
                              {report.investigation.interviewCount} entrevistas
                            </span>
                          )}
                          {report.investigation?.findingCount > 0 && (
                            <span className="inline-block mr-2 px-1 bg-yellow-100 text-yellow-800 rounded">
                              {report.investigation.findingCount} hallazgos
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          getDaysSince(report.createdAt) > 30
                            ? 'text-red-600'
                            : getDaysSince(report.createdAt) > 15
                            ? 'text-yellow-600'
                            : 'text-gray-900'
                        }`}>
                          {getDaysSince(report.createdAt)} días
                        </div>
                        {report.isKarinLaw && (
                          <div className="text-xs text-red-600">
                            Plazo estricto
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/investigation/${report.id}`}>
                          <Button size="sm" className="mr-2">
                            Investigar
                          </Button>
                        </Link>
                        <Link href={`/dashboard/reports/${report.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recordatorios / Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips para Investigadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Plazos de Investigación</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li>Casos regulares: <span className="font-medium">30 días hábiles</span> para completar la investigación (prorrogable hasta 60 días en casos especiales)</li>
                <li className="text-red-600 font-medium">Casos Ley Karin: <span className="underline">30 días hábiles máximo</span> (plazo improrrogable)</li>
                <li>Informe preliminar Ley Karin: Dentro de los <span className="font-medium">3 días hábiles</span> administrativos</li>
                <li>Implementación de medidas precautorias Ley Karin: <span className="font-medium">3 días hábiles</span> desde recepción</li>
                <li>Notificación a Dirección del Trabajo: <span className="font-medium">3 días hábiles</span> desde recepción</li>
                <li>Notificación a SUSESO (mutualidad): <span className="font-medium">5 días hábiles</span> desde conocimiento</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Mejores Prácticas</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li>Documentar todas las entrevistas y hallazgos con evidencia</li>
                <li>Mantener absoluta confidencialidad durante todo el proceso</li>
                <li>Implementar medidas de separación física/funcional entre partes</li>
                <li>Calcular plazos considerando solo días hábiles administrativos</li>
                <li>Para casos Ley Karin, registrar todas las notificaciones obligatorias</li>
                <li>Utilizar enfoque de triangulación para mayor credibilidad</li>
                <li>Hacer preguntas enfocadas en conductas concretas, no interpretaciones</li>
                <li>Mantener informada a la persona denunciante sobre avances</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}