'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { initializeImpactTypes } from '@/lib/services/setupService';
import { useCompany } from '@/lib/hooks';

export default function InitializeImpactTypesPage() {
  const { isSuperAdmin, isAdmin } = useCurrentUser();
  const { companyId } = useCompany();
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; count?: number } | null>(null);

  // Verificar si el usuario tiene permisos adecuados
  if (!isAdmin && !isSuperAdmin) {
    return (
      <Alert variant="error">
        <AlertDescription>
          No tiene permisos para acceder a esta sección. Esta página está reservada para administradores.
        </AlertDescription>
      </Alert>
    );
  }

  const handleInitializeImpactTypes = async () => {
    setLoading(true);
    setResult(null);

    try {
      const initResult = await initializeImpactTypes(companyId);
      setResult(initResult);
    } catch (error) {
      console.error('Error al inicializar tipos de impacto:', error);
      setResult({
        success: false,
        error: 'Error inesperado al inicializar tipos de impacto'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inicializar Tipos de Impacto</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Tipos de Impacto</CardTitle>
          <CardDescription>
            Esta herramienta le permite crear o actualizar los tipos de impacto disponibles para los formularios de denuncia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Información importante:</strong> Los tipos de impacto se utilizan en los formularios de denuncia 
              para clasificar el impacto que ha tenido la situación reportada. Esta acción agregará los tipos de impacto
              predeterminados si no existen todavía.
            </p>
          </div>
          
          {result && (
            <Alert variant={result.success ? "success" : "error"} className="mb-4">
              <AlertDescription>
                {result.success ? (
                  <span>
                    {result.message}
                    {result.count !== undefined && ` (${result.count} tipos de impacto definidos).`}
                  </span>
                ) : (
                  result.error || "Ha ocurrido un error desconocido."
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-center mt-4">
            <Button 
              onClick={handleInitializeImpactTypes}
              disabled={loading}
              size="lg"
            >
              {loading ? 'Inicializando...' : 'Inicializar Tipos de Impacto'}
            </Button>
          </div>
          
          <div className="mt-6 border-t pt-4">
            <h3 className="font-medium mb-2">Tipos de impacto predeterminados:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Económico:</strong> Impacto en finanzas o recursos económicos</li>
              <li><strong>Laboral:</strong> Afectación del ambiente o desempeño laboral</li>
              <li><strong>Personal:</strong> Impacto en la salud física o mental</li>
              <li><strong>Reputacional:</strong> Afectación a la imagen o reputación</li>
              <li><strong>Operacional:</strong> Impacto en las operaciones del negocio</li>
              <li><strong>Legal:</strong> Consecuencias legales para la organización</li>
              <li><strong>Otro:</strong> Otro tipo de impacto no especificado</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-500 mt-4">
            <p>
              Después de inicializar los tipos de impacto, puede personalizar los valores desde la sección 
              <strong> Configuración del Sistema &gt; Gestión de opciones de formulario</strong>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}