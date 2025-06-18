'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import { UnifiedKarinController } from '@/components/investigation/UnifiedKarinController';
import { KarinAIAssistant } from '@/components/investigation/KarinAIAssistant';
import { getInvestigationDetails } from '@/lib/services/investigationService';
import { Spinner } from '@/components/ui/spinner';

export default function UnifiedKarinPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const { uid, isAdmin, isInvestigator, isSuperAdmin, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();
  const { isEnabled } = useFeatureFlags();

  // Determinar el ID de la compañía correcta
  const userCompanyId = profile?.role === 'super_admin' ? contextCompanyId : (profile?.company || contextCompanyId);

  // Estados
  const [investigation, setInvestigation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar permisos
  const isAssignedInvestigator = investigation?.assignedTo === uid;
  const canEdit = isAssignedInvestigator || isAdmin || isSuperAdmin;

  // Verificar si IA está habilitada
  const isAIEnabled = isEnabled('aiEnabled');

  // Cargar datos de la investigación
  useEffect(() => {
    async function fetchInvestigationDetails() {
      if (!reportId || !uid) return;

      try {
        setLoading(true);
        const result = await getInvestigationDetails(userCompanyId, reportId);
        
        if (result.success) {
          // Verificar que sea un caso de Ley Karin
          if (!result.investigation.isKarinLaw) {
            router.push(`/dashboard/investigation/${reportId}`);
            return;
          }
          setInvestigation(result.investigation);
        } else {
          setError(result.error || 'Error al cargar los detalles de la investigación');
        }
      } catch (error) {
        console.error('Error al cargar detalles de investigación:', error);
        setError('Ha ocurrido un error al cargar los detalles de la investigación');
      } finally {
        setLoading(false);
      }
    }

    fetchInvestigationDetails();
  }, [reportId, uid, userCompanyId, router]);

  // Función para recargar datos después de actualizaciones
  const handleDataUpdate = async () => {
    try {
      const result = await getInvestigationDetails(userCompanyId, reportId);
      if (result.success) {
        setInvestigation(result.investigation);
      }
    } catch (error) {
      console.error('Error al recargar datos:', error);
    }
  };

  // Estados de carga y error
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner text="Cargando gestión Ley Karin..." />
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
          <Link href="/dashboard/investigation">
            <Button>Volver al Listado</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>No se encontró la investigación solicitada.</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard/investigation">
            <Button>Volver al Listado</Button>
          </Link>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            Gestión Ley Karin - Denuncia #{investigation.code}
            <Badge variant="destructive" className="ml-3">
              Ley Karin
            </Badge>
          </h1>
          <p className="text-gray-500 mt-1">
            Gestión unificada del proceso legal - Creada el {formatDate(investigation.createdAt)}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Link href={`/dashboard/investigation/${reportId}`}>
            <Button variant="outline">Vista Investigación</Button>
          </Link>
          <Link href={`/dashboard/reports/${reportId}`}>
            <Button variant="outline">Ver Denuncia</Button>
          </Link>
        </div>
      </div>

      {/* Alerta informativa */}
      <Alert className="bg-red-50 border-red-200">
        <AlertDescription className="text-red-800">
          <strong>Proceso Ley Karin:</strong> Este es el centro de control unificado para gestionar todos los aspectos 
          del proceso legal. Aquí encontrarás todas las herramientas necesarias sin necesidad de navegar entre múltiples páginas.
        </AlertDescription>
      </Alert>

      {/* Layout principal con IA */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controlador principal (3/4 del ancho) */}
        <div className="lg:col-span-3">
          <UnifiedKarinController
            investigation={investigation}
            canEdit={canEdit}
            onDataUpdate={handleDataUpdate}
            userCompanyId={userCompanyId}
          />
        </div>

        {/* Asistente IA (1/4 del ancho) */}
        {isAIEnabled && (
          <div className="lg:col-span-1">
            <KarinAIAssistant
              investigation={investigation}
              onSuggestionApplied={handleDataUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}