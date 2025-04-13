'use client';

// src/app/(dashboard)/dashboard/reports/page.tsx
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReportStatusBadge } from '@/components/reports/ReportStatusBadge';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { getAllReports } from '@/lib/services/reportService';

// Tipos para los filtros y denuncias
interface ReportFilters {
  status: string;
  category: string;
  dateRange: string;
  searchTerm: string;
}

interface Report {
  id: string;
  code: string;
  status: string;
  category: string;
  subcategory: string;
  createdAt: any;
  updatedAt: any;
  priority: string;
  isAnonymous: boolean;
  isKarinLaw: boolean;
  assignedTo?: string;
  assignedToName?: string;
  reporter: {
    relationship: string;
    isAnonymous: boolean;
    contactInfo?: {
      name?: string;
      email?: string;
    };
  };
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const { isAdmin } = useCurrentUser();
  
  // Estado para los filtros
  const [filters, setFilters] = useState<ReportFilters>({
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    dateRange: searchParams.get('dateRange') || '',
    searchTerm: searchParams.get('search') || '',
  });
  
  // Estado para los datos
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  
  // Cargar las denuncias
  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const companyId = 'default'; // En un sistema multi-tenant, esto vendría de un contexto o URL
        const result = await getAllReports(companyId);
        
        if (result.success) {
          setReports(result.reports);
        } else {
          setError(result.error || 'Error al cargar las denuncias');
        }
      } catch (error) {
        console.error('Error al cargar denuncias:', error);
        setError('Ha ocurrido un error al cargar las denuncias');
      } finally {
        setLoading(false);
      }
    }
    
    fetchReports();
  }, []);
  
  // Aplicar filtros cuando cambien
  useEffect(() => {
    if (!reports.length) return;
    
    let result = [...reports];
    
    // Filtrar por estado
    if (filters.status) {
      result = result.filter(report => report.status === filters.status);
    }
    
    // Filtrar por categoría
    if (filters.category) {
      result = result.filter(report => report.category === filters.category);
    }
    
    // Filtrar por rango de fecha
    if (filters.dateRange) {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      
      result = result.filter(report => {
        const reportDate = report.createdAt.toDate ? 
          report.createdAt.toDate() : new Date(report.createdAt);
        return reportDate >= startDate;
      });
    }
    
    // Filtrar por término de búsqueda
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(report => 
        report.code.toLowerCase().includes(searchLower) ||
        (report.reporter.contactInfo?.name && 
          report.reporter.contactInfo.name.toLowerCase().includes(searchLower)) ||
        report.category.toLowerCase().includes(searchLower) ||
        report.subcategory.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredReports(result);
  }, [reports, filters]);
  
  // Manejar cambios en los filtros
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Limpiar todos los filtros
  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      dateRange: '',
      searchTerm: '',
    });
  };
  
  // Seleccionar/deseleccionar una denuncia
  const toggleSelectReport = (id: string) => {
    setSelectedReports(prev => 
      prev.includes(id) 
        ? prev.filter(reportId => reportId !== id)
        : [...prev, id]
    );
  };
  
  // Seleccionar/deseleccionar todas las denuncias
  const toggleSelectAll = () => {
    if (selectedReports.length === filteredReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(filteredReports.map(report => report.id));
    }
  };
  
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
          <p className="text-gray-600">Cargando denuncias...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Repositorio de Denuncias</h1>
        {isAdmin && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              disabled={selectedReports.length === 0}
            >
              Exportar Seleccionadas
            </Button>
            <Link href="/dashboard/reports/stats">
              <Button variant="outline">Estadísticas</Button>
            </Link>
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <Select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full"
              >
                <option value="">Todos los estados</option>
                <option value="Nuevo">Nuevo</option>
                <option value="Admitida">Admitida</option>
                <option value="Asignada">Asignada</option>
                <option value="En Investigación">En Investigación</option>
                <option value="Pendiente Información">Pendiente Información</option>
                <option value="En Evaluación">En Evaluación</option>
                <option value="Resuelta">Resuelta</option>
                <option value="En Seguimiento">En Seguimiento</option>
                <option value="Cerrada">Cerrada</option>
                <option value="Rechazada">Rechazada</option>
              </Select>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <Select
                id="category"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full"
              >
                <option value="">Todas las categorías</option>
                <option value="modelo_prevencion">Prevención de Delitos</option>
                <option value="ley_karin">Ley Karin</option>
                <option value="ciberseguridad">Ciberseguridad</option>
                <option value="reglamento_interno">Reglamento Interno</option>
                <option value="politicas_codigos">Políticas y Códigos</option>
                <option value="represalias">Represalias</option>
                <option value="otros">Otros</option>
              </Select>
            </div>
            
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Creación
              </label>
              <Select
                id="dateRange"
                name="dateRange"
                value={filters.dateRange}
                onChange={handleFilterChange}
                className="w-full"
              >
                <option value="">Cualquier fecha</option>
                <option value="today">Hoy</option>
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
                <option value="year">Último año</option>
              </Select>
            </div>
            
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <Input
                id="searchTerm"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder="Código, nombre, categoría..."
                className="w-full"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="ml-2"
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabla de denuncias */}
      {filteredReports.length === 0 ? (
        <div className="bg-white p-6 text-center border rounded-lg shadow-sm">
          <p className="text-gray-500">No se encontraron denuncias que coincidan con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary border-gray-300 rounded"
                        checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Denunciante
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignado a
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
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary border-gray-300 rounded"
                        checked={selectedReports.includes(report.id)}
                        onChange={() => toggleSelectReport(report.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.code}
                      </div>
                      {report.isKarinLaw && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Ley Karin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.createdAt.toDate
                          ? new Date(report.createdAt.toDate()).toLocaleDateString()
                          : new Date(report.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.createdAt.toDate
                          ? new Date(report.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
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
                      <div className="text-xs text-gray-500">
                        {report.subcategory}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        report.priority === 'Alta' 
                          ? 'bg-red-100 text-red-800' 
                          : report.priority === 'Media'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {report.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.isAnonymous ? (
                        <span className="text-sm text-gray-500">Anónimo</span>
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.reporter.contactInfo?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {report.reporter.relationship}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.assignedToName || 'No asignado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/dashboard/reports/${report.id}`}
                        className="text-primary hover:text-primary-dark mr-3"
                      >
                        Ver
                      </Link>
                      {isAdmin && (
                        <Link 
                          href={`/dashboard/reports/${report.id}/edit`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Editar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación (básica) */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button variant="outline" disabled>
                Anterior
              </Button>
              <Button variant="outline" disabled>
                Siguiente
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">1</span> a <span className="font-medium">{filteredReports.length}</span> de <span className="font-medium">{filteredReports.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <Button
                    variant="outline"
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    disabled
                  >
                    <span className="sr-only">Anterior</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                    disabled
                  >
                    1
                  </Button>
                  <Button
                    variant="outline"
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    disabled
                  >
                    <span className="sr-only">Siguiente</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}