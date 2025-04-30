'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { setupDemoCompany } from '@/lib/services/companyService';

export default function SetupDemoPage() {
  const { currentUser, switchCompany } = useAuth();
  const { isSuperAdmin } = useCurrentUser(); // Usar el hook de usuario actual para la verificación
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Verificar si el usuario es super admin
  if (!isSuperAdmin()) {
    router.push('/dashboard');
    return null;
  }
  
  // Configurar empresa de demostración
  const handleSetupDemo = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await setupDemoCompany('demo', currentUser.uid);
      
      if (result.success) {
        setSuccess('Empresa de demostración configurada correctamente');
        
        // Cambiar a la empresa demo
        await switchCompany('demo');
      } else {
        setError(result.error || 'Error al configurar la empresa de demostración');
      }
    } catch (err) {
      console.error('Error al configurar demo:', err);
      setError('Error al configurar la empresa de demostración');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Configurar Empresa de Demostración</h1>
      
      {/* Mensajes de estado */}
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuración de Demo</CardTitle>
          <CardDescription>
            Esta acción creará o actualizará una empresa de demostración con datos de ejemplo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              Al configurar la empresa de demostración:
            </p>
            
            <ul className="list-disc pl-5 space-y-1">
              <li>Se creará una empresa con ID "demo" si no existe</li>
              <li>Se habilitarán todos los módulos disponibles</li>
              <li>Se cargarán datos de ejemplo para demostración</li>
              <li>Se configurará automáticamente el entorno como "demo"</li>
            </ul>
            
            <div className="pt-4">
              <Button 
                onClick={handleSetupDemo} 
                disabled={loading}
              >
                {loading ? 'Configurando...' : 'Configurar Empresa Demo'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/super-admin')}
                className="ml-2"
              >
                Volver
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {success && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración exitosa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              La empresa de demostración ha sido configurada correctamente y ahora estás viendo el entorno demo.
            </p>
            
            <div className="flex space-x-2">
              <Button onClick={() => router.push('/dashboard')}>
                Ir al Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/super-admin')}
              >
                Volver al Panel de Super Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}