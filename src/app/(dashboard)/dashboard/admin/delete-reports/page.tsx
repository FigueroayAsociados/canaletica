'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { getAllReports, deleteReport } from '@/lib/services/reportService';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useReports } from '@/lib/hooks/useReports';
import { useQueryClient } from '@tanstack/react-query';

export default function DeleteReportsPage() {
  const { companyId: contextCompanyId } = useCompany();
  const { isAdmin, isSuperAdmin } = useCurrentUser();
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  
  // Usar un companyId fijo como en reports/page.tsx para asegurar consistencia
  const companyId = 'default'; // En un sistema multi-tenant, esto vendría de un contexto o URL
  
  // Usar React Query para cargar los datos (igual que en reports/page.tsx)
  const { data, isLoading, isError, error } = useReports(companyId);
  
  // Estado para los reportes procesados
  const [reports, setReports] = useState<any[]>([]);
  
  // Actualizar los reportes cuando los datos cambien
  useEffect(() => {
    if (data?.success && data?.reports?.length) {
      console.log(`useReports cargó ${data.reports.length} denuncias`);
      setReports(data.reports);
    } else {
      console.log('useReports no encontró denuncias o falló:', data);
      setReports([]);
    }
  }, [data]);

  // Filtrar denuncias
  const filteredReports = reports.filter(report => {
    const searchTerm = filter.toLowerCase();
    return (
      report.code?.toLowerCase().includes(searchTerm) ||
      report.category?.toLowerCase().includes(searchTerm) ||
      report.status?.toLowerCase().includes(searchTerm)
    );
  });

  // Obtener el cliente de consulta para invalidar la caché después de eliminar
  const queryClient = useQueryClient();

  // Función para eliminar una denuncia
  const handleDeleteReport = async (reportId: string) => {
    if (confirmDelete !== reportId) {
      setConfirmDelete(reportId);
      return;
    }
    
    try {
      setDeleteInProgress(true);
      setSuccess(null);
      
      console.log(`Intentando eliminar denuncia ${reportId} de la compañía ${companyId}`);
      // Usar el ID de compañía fijo para eliminar la denuncia
      const result = await deleteReport(companyId, reportId);
      
      if (result.success) {
        setSuccess('Denuncia eliminada correctamente');
        
        // Actualizar la lista de denuncias
        setReports(reports.filter(report => report.id !== reportId));
        
        // Invalidar la caché para recargar los datos en otras páginas
        queryClient.invalidateQueries({ 
          queryKey: ['reports', companyId] 
        });
        
        // También invalidar cualquier consulta que use el ID de compañía del contexto
        if (contextCompanyId && contextCompanyId !== companyId) {
          queryClient.invalidateQueries({ 
            queryKey: ['reports', contextCompanyId] 
          });
        }
        
        console.log('Denuncia eliminada exitosamente');
      } else {
        console.error('Error al eliminar la denuncia:', result.error);
        // Mostrar alerta de error
        alert(`Error al eliminar la denuncia: ${result.error || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error al eliminar denuncia:', err);
      // Mostrar alerta de error
      alert('Error al eliminar la denuncia. Por favor, inténtalo de nuevo.');
    } finally {
      setDeleteInProgress(false);
      setConfirmDelete(null);
    }
  };

  // Cancelar confirmación de eliminación
  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  // Mostrar mensaje de éxito temporal
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (!isAdmin && !isSuperAdmin) {
    return (
      <Alert variant="error">
        <AlertDescription>
          No tienes permisos para acceder a esta página. Esta sección está reservada para administradores.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Eliminar Denuncias</h1>
        <p className="text-gray-600">Esta página permite eliminar denuncias del sistema. Utilícela para quitar denuncias de prueba o registros erróneos.</p>
      </div>
      
      {isError && (
        <Alert variant="error">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ha ocurrido un error al cargar las denuncias'}
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Eliminar Denuncias</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            ⚠️ Advertencia: Eliminar una denuncia no se puede deshacer. Todos los datos relacionados con la denuncia serán borrados permanentemente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="filter">Filtrar denuncias</Label>
            <Input
              id="filter"
              placeholder="Buscar por código, categoría o estado..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mt-1"
            />
          </div>
          
          {isLoading ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin text-primary mb-4">
                <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-gray-500">Cargando denuncias...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <p className="text-center py-6 text-gray-500">
              {filter ? 'No se encontraron denuncias que coincidan con tu búsqueda' : 'No hay denuncias disponibles'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-4 py-2 text-left">Código</th>
                    <th className="border px-4 py-2 text-left">Categoría</th>
                    <th className="border px-4 py-2 text-left">Estado</th>
                    <th className="border px-4 py-2 text-left">Fecha Creación</th>
                    <th className="border px-4 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-gray-50">
                      <td className="border px-4 py-2 font-medium">{report.code}</td>
                      <td className="border px-4 py-2">{report.category}</td>
                      <td className="border px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === 'Nuevo' ? 'bg-blue-100 text-blue-800' :
                          report.status === 'Asignada' ? 'bg-yellow-100 text-yellow-800' :
                          report.status === 'En Seguimiento' ? 'bg-purple-100 text-purple-800' :
                          report.status === 'Resuelta' ? 'bg-green-100 text-green-800' :
                          report.status === 'Cerrada' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="border px-4 py-2">
                        {report.createdAt?.toDate
                          ? report.createdAt.toDate().toLocaleDateString()
                          : 'Fecha desconocida'}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        {confirmDelete === report.id ? (
                          <div className="flex space-x-2 justify-center">
                            <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={deleteInProgress}
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              {deleteInProgress ? 'Eliminando...' : 'Confirmar'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleCancelDelete}
                              disabled={deleteInProgress}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}