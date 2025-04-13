'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { initializeDefaultOptions } from '@/lib/services/initializeDefaultOptions';

export default function InitializePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    if (!confirm('¿Está seguro de inicializar las opciones por defecto? Esta acción solo debe realizarse una vez.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      await initializeDefaultOptions();
      
      setResult('Las opciones se han inicializado correctamente.');
    } catch (err) {
      console.error('Error al inicializar opciones:', err);
      setError('Ha ocurrido un error al inicializar las opciones. Consulte la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Inicialización del Sistema</h1>
      
      <div className="bg-white shadow-sm rounded-lg p-6 border">
        <h2 className="text-xl font-semibold mb-4">Opciones de Formularios</h2>
        <p className="text-gray-600 mb-6">
          Esta herramienta inicializa las opciones predeterminadas para los formularios de denuncia.
          Solo debe ejecutarse una vez, cuando se configura el sistema por primera vez.
        </p>
        
        {error && (
          <Alert variant="error" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {result && (
          <Alert variant="success" className="mb-4">
            <AlertDescription>{result}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleInitialize}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Inicializando...' : 'Inicializar Opciones Predeterminadas'}
        </Button>
      </div>
    </div>
  );
}