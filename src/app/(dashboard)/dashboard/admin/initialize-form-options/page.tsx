'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeImpactTypes, initializeReportingChannels } from '@/lib/services/setupService';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';

export default function InitializeFormOptionsPage() {
  const { isSuperAdmin, isAdmin } = useCurrentUser();
  const { companyId } = useCompany();
  const [loadingImpacts, setLoadingImpacts] = useState<boolean>(false);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [impactsResult, setImpactsResult] = useState<{ success: boolean; message?: string; error?: string; count?: number } | null>(null);
  const [channelsResult, setChannelsResult] = useState<{ success: boolean; message?: string; error?: string; count?: number } | null>(null);

  const handleInitializeImpactTypes = async () => {
    setLoadingImpacts(true);
    setImpactsResult(null);

    try {
      const initResult = await initializeImpactTypes(companyId);
      setImpactsResult(initResult);
    } catch (error) {
      console.error('Error al inicializar tipos de impacto:', error);
      setImpactsResult({
        success: false,
        error: 'Error inesperado al inicializar tipos de impacto'
      });
    } finally {
      setLoadingImpacts(false);
    }
  };

  const handleInitializeReportingChannels = async () => {
    setLoadingChannels(true);
    setChannelsResult(null);

    try {
      const initResult = await initializeReportingChannels(companyId);
      setChannelsResult(initResult);
    } catch (error) {
      console.error('Error al inicializar canales de denuncia:', error);
      setChannelsResult({
        success: false,
        error: 'Error inesperado al inicializar canales de denuncia'
      });
    } finally {
      setLoadingChannels(false);
    }
  };

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inicializar Tipos de Impacto</CardTitle>
          <CardDescription>
            Esta herramienta inicializa la configuración de tipos de impacto para los formularios de denuncia.
            Sólo es necesario ejecutarla una vez cuando se configura el sistema por primera vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm">
            Los tipos de impacto predeterminados son:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Económico</p>
              <p className="text-sm text-gray-500">Impacto en finanzas o recursos económicos</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Laboral</p>
              <p className="text-sm text-gray-500">Afectación del ambiente o desempeño laboral</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Personal</p>
              <p className="text-sm text-gray-500">Impacto en la salud física o mental</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Reputacional</p>
              <p className="text-sm text-gray-500">Afectación a la imagen o reputación</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Operacional</p>
              <p className="text-sm text-gray-500">Impacto en las operaciones del negocio</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Legal</p>
              <p className="text-sm text-gray-500">Consecuencias legales para la organización</p>
            </div>
          </div>

          {impactsResult && (
            <Alert 
              variant={impactsResult.success ? "success" : "error"}
              className="mb-4"
            >
              <AlertDescription>
                {impactsResult.success ? impactsResult.message : impactsResult.error}
                {impactsResult.count && impactsResult.count > 0 && (
                  <span> ({impactsResult.count} elementos inicializados)</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleInitializeImpactTypes} 
            disabled={loadingImpacts}
          >
            {loadingImpacts ? "Inicializando..." : "Inicializar Tipos de Impacto"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inicializar Canales de Denuncia</CardTitle>
          <CardDescription>
            Esta herramienta inicializa la configuración de canales de denuncia para los formularios.
            Sólo es necesario ejecutarla una vez cuando se configura el sistema por primera vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm">
            Los canales de denuncia predeterminados son:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Verbal (presencial)</p>
              <p className="text-sm text-gray-500">Denuncia realizada presencialmente</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Escrita (documento)</p>
              <p className="text-sm text-gray-500">Denuncia presentada por documento escrito</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Correo electrónico</p>
              <p className="text-sm text-gray-500">Denuncia recibida por correo electrónico</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">A través de jefatura</p>
              <p className="text-sm text-gray-500">Denuncia presentada a través de un superior jerárquico</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Canal web</p>
              <p className="text-sm text-gray-500">Denuncia enviada a través del formulario web</p>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <p className="font-medium">Teléfono</p>
              <p className="text-sm text-gray-500">Denuncia recibida por vía telefónica</p>
            </div>
          </div>

          {channelsResult && (
            <Alert 
              variant={channelsResult.success ? "success" : "error"}
              className="mb-4"
            >
              <AlertDescription>
                {channelsResult.success ? channelsResult.message : channelsResult.error}
                {channelsResult.count && channelsResult.count > 0 && (
                  <span> ({channelsResult.count} elementos inicializados)</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleInitializeReportingChannels} 
            disabled={loadingChannels}
          >
            {loadingChannels ? "Inicializando..." : "Inicializar Canales de Denuncia"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}