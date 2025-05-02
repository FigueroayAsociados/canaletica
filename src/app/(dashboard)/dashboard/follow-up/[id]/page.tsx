// src/app/(dashboard)/dashboard/follow-up/[id]/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { getReportById } from '@/lib/services/reportService';
import RecommendationsList from '@/components/investigation/RecommendationsList';
import { Alert } from '@/components/ui/alert';
import { SafeRender } from '@/components/ui/safe-render';
import { getUsersByRole } from '@/lib/services/userService';

export default function FollowUpDetailPage() {
  // Usar useParams hook para acceder a los parámetros de manera segura
  const params = useParams();
  const reportId = params.id as string; // Esto es seguro en el lado del cliente
  
  const { companyId } = useCompany();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investigators, setInvestigators] = useState<any[]>([]);

  useEffect(() => {
    const fetchReportDetails = async () => {
      if (!reportId || !companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Obtener detalles de la denuncia
        const result = await getReportById(companyId, reportId);
        
        if (result.success) {
          setReport(result.report);
          setError(null);
          
          // Obtener la lista de investigadores para el selector
          const investigatorsResult = await getUsersByRole(companyId, 'investigator');
          if (investigatorsResult.success) {
            setInvestigators(investigatorsResult.users || []);
          }
        } else {
          setError('No se pudo cargar la información de la denuncia');
        }
      } catch (err) {
        console.error('Error al cargar la denuncia:', err);
        setError('Error al cargar la denuncia');
      } finally {
        setLoading(false);
      }
    };

    fetchReportDetails();
  }, [reportId, companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2">Cargando detalles de la denuncia...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <Alert variant="error">
        <p>{error || 'No se pudo cargar la información de la denuncia'}</p>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Seguimiento de Recomendaciones</h1>
        <p className="text-gray-600">
          Gestione el cumplimiento de las recomendaciones para la denuncia #{report.code}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Denuncia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Código</p>
                <p>{report.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Categoría</p>
                <p>{report.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estado</p>
                <p>{report.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha</p>
                <p>
                  {report.createdAt ? (
                    report.createdAt.seconds 
                      ? new Date(report.createdAt.seconds * 1000).toLocaleDateString()
                      : report.createdAt.toDate
                        ? new Date(report.createdAt.toDate()).toLocaleDateString()
                        : report.createdAt instanceof Date
                          ? report.createdAt.toLocaleDateString()
                          : 'Fecha no disponible'
                  ) : 'Fecha no disponible'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Componente de Recomendaciones */}
        <RecommendationsList 
          companyId={companyId} 
          reportId={reportId} 
          canAdd={report.status === 'Resuelta' || report.status === 'En Seguimiento'} 
          investigators={investigators}
        />
      </div>
    </div>
  );
}