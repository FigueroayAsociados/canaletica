// src/components/forms/report/SuccessStep.tsx

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SuccessStepProps {
  result: {
    success: boolean;
    reportCode?: string;
    accessCode?: string;
    error?: string;
  } | null;
}

const SuccessStep: React.FC<SuccessStepProps> = ({ result }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAccessCode, setCopiedAccessCode] = useState(false);
  
  // Restablecer los estados de copiado después de 2 segundos
  useEffect(() => {
    if (copiedCode) {
      const timer = setTimeout(() => setCopiedCode(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedCode]);
  
  useEffect(() => {
    if (copiedAccessCode) {
      const timer = setTimeout(() => setCopiedAccessCode(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedAccessCode]);
  
  const handleCopyCode = () => {
    if (result?.reportCode) {
      navigator.clipboard.writeText(result.reportCode);
      setCopiedCode(true);
    }
  };
  
  const handleCopyAccessCode = () => {
    if (result?.accessCode) {
      navigator.clipboard.writeText(result.accessCode);
      setCopiedAccessCode(true);
    }
  };
  
  // En caso de error completo en la denuncia
  if (!result) {
    return (
      <div className="py-8">
        <Alert variant="error" className="mb-6">
          <AlertDescription>
            Ocurrió un error al procesar su denuncia. Por favor, inténtelo de nuevo.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-8">
          <Link href="/">
            <Button variant="outline">Volver al Inicio</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Si hay un error pero no hay código, es un error completo
  if (!result.success || (!result.reportCode && !result.accessCode)) {
    return (
      <div className="py-8">
        <Alert variant="error" className="mb-6">
          <AlertDescription>
            {result.error || 'Ocurrió un error al procesar su denuncia. Por favor, inténtelo de nuevo.'}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-8">
          <Link href="/">
            <Button variant="outline">Volver al Inicio</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-8 max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">¡Denuncia Registrada!</h2>
        <p className="mt-2 text-gray-600">
          Su denuncia ha sido recibida correctamente y será procesada a la brevedad.
        </p>
      </div>
      
      {/* Mostrar warning si hay error parcial (archivos no subidos) */}
      {result.error && (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>
            {result.error}
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Código de Denuncia</h3>
            <div className="flex items-center mt-2">
              <div className="bg-gray-100 px-4 py-2 rounded-md text-lg font-mono flex-grow text-center">
                {result.reportCode}
              </div>
              <Button 
                variant="outline" 
                className="ml-2" 
                onClick={handleCopyCode}
              >
                {copiedCode ? '¡Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Guarde este código para hacer seguimiento a su denuncia.
            </p>
          </div>
          
          {/* Mostrar código de acceso solo para denuncias anónimas */}
          {result.accessCode && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900">Código de Acceso</h3>
              <div className="flex items-center mt-2">
                <div className="bg-gray-100 px-4 py-2 rounded-md text-lg font-mono flex-grow text-center">
                  {result.accessCode}
                </div>
                <Button 
                  variant="outline" 
                  className="ml-2" 
                  onClick={handleCopyAccessCode}
                >
                  {copiedAccessCode ? '¡Copiado!' : 'Copiar'}
                </Button>
              </div>
              <p className="text-sm text-red-600 mt-2 font-medium">
                IMPORTANTE: Este código es su única forma de acceder a su denuncia anónima. 
                Guárdelo en un lugar seguro.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Instrucciones de seguimiento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seguimiento de su Denuncia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Para realizar seguimiento a su denuncia, visite la sección de "Seguimiento de Denuncias" 
            e ingrese el código proporcionado.
          </p>
          <div className="mt-4">
            <Link href="/track">
              <Button variant="outline" className="w-full">
                Ir a Seguimiento
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-center mt-8">
        <Link href="/">
          <Button variant="default">Volver al Inicio</Button>
        </Link>
      </div>
    </div>
  );
};

export default SuccessStep;