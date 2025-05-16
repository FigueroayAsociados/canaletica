'use client';

// src/app/(dashboard)/dashboard/follow-up/page.tsx

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { getReportsInFollowUp } from '@/lib/services/reportService';

export default function FollowUpPage() {
  const { isAdmin, isInvestigator, isSuperAdmin, uid, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const userCompanyId = profile?.company || contextCompanyId;
  
  // Estados para filtros
  const [filter, setFilter] = useState({
    status: '',
    searchTerm: '',
  });
  
  // Estados para datos
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar datos
  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);

        const result = await getReportsInFollowUp(userCompanyId);
        
        if (result.success) {
          setReports(result.reports);
          setFilteredReports(result.reports);
        } else {
          setError(result.error || 'Error al cargar las denuncias en seguimiento');
        }
      } catch (error) {
        console.error('Error al cargar denuncias en seguimiento:', error);
        setError('Ha ocurrido un error al cargar las denuncias');
      } finally {
        setLoading(false);
      }
    }
    
    fetchReports();
  }, [userCompanyId]);
  
  // Aplicar filtros
  useEffect(() => {
    if (!reports.length) return;
    
    let filteredData = [...reports];
    
    // Filtrar por estado
    if (filter.status) {
      filteredData = filteredData.filter(report => report.status === filter.status);
    }
    
    // Filtrar por término de búsqueda
    if (filter.searchTerm) {
      const searchTerm = filter.searchTerm.toLowerCase();
      filteredData = filteredData.filter(report => 
        report.code.toLowerCase().includes(searchTerm) ||
        report.category.toLowerCase().includes(searchTerm) ||
        report.subcategory.toLowerCase().includes(searchTerm) ||
        (report.reporter.contactInfo?.name && 
          report.reporter.contactInfo.name.toLowerCase().includes(searchTerm))
      );
    }
    
    setFilteredReports(filteredData);
  }, [reports, filter]);
  
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
  
  // Formatear fecha
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  };
  
  if (!isAdmin && !isInvestigator && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página. Esta sección está 
            reservada para investigadores y administradores.
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
          <p className="text-gray-600">Cargando denuncias en seguimiento...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Seguimiento</h1>
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
                <option value="Resuelta">Resuelta</option>
                <option value="En Seguimiento">En Seguimiento</option>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50">
          <CardContent className="p-6">
            <h3 className="font-medium text-blue-800">En Seguimiento</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {reports.filter(r => r.status === 'En Seguimiento').length}
            </p>
            <p className="text-sm text-blue-700 mt-1">Denuncias con recomendaciones pendientes</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-6">
            <h3 className="font-medium text-green-800">Resueltas</h3>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {reports.filter(r => r.status === 'Resuelta').length}
            </p>
            <p className="text-sm text-green-700 mt-1">Denuncias con recomendaciones completadas</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Lista de denuncias en seguimiento */}
      <Card>
        <CardHeader>
          <CardTitle>Denuncias en Seguimiento</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No hay denuncias en seguimiento</h3>
              <p className="mt-1 text-sm text-gray-500">
                {reports.length === 0
                  ? 'No hay denuncias que requieran seguimiento actualmente.'
                  : 'Ajuste los filtros para ver las denuncias en seguimiento.'}
              </p>
              {(filter.status || filter.searchTerm) && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpiar Filtros
                </Button>
              )}
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
                      Progreso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recomendaciones
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
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div
                              style={{ width: `${report.progress || 0}%` }}
                              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                report.progress === 100
                                  ? 'bg-green-500'
                                  : report.progress > 50
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                              }`}
                            ></div>
                          </div>
                          <div className="text-xs mt-1">{report.progress || 0}% completado</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.recommendations ? (
                            <>
                              <span className="font-medium">{report.recommendations.length}</span> recomendaciones
                              <div className="text-xs text-gray-500">
                                {report.recommendations.filter((r: any) => r.status === 'Completado').length} completadas
                              </div>
                            </>
                          ) : (
                            'Sin recomendaciones'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/dashboard/follow-up/${report.id}`}>
                          <Button size="sm" className="mr-2">
                            Gestionar
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
      
      {/* Guía */}
      <Card>
        <CardHeader>
          <CardTitle>Guía de Seguimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Proceso de Seguimiento</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li>Revisar periódicamente el estado de las recomendaciones</li>
                <li>Solicitar evidencias de implementación a los responsables</li>
                <li>Actualizar el estado de cada recomendación según su avance</li>
                <li>Documentar con detalle el cumplimiento o los obstáculos encontrados</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Estados de las Recomendaciones</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li><span className="text-yellow-600 font-medium">Pendiente:</span> Sin iniciar implementación</li>
                <li><span className="text-blue-600 font-medium">En Progreso:</span> Implementación en curso</li>
                <li><span className="text-green-600 font-medium">Completado:</span> Implementación verificada</li>
                <li><span className="text-red-600 font-medium">Cancelado:</span> No se implementará (requiere justificación)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}