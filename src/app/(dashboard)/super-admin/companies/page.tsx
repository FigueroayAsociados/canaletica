'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/contexts/AuthContext';
import CompaniesManager from '@/components/settings/CompaniesManager';

export default function SuperAdminCompaniesPage() {
  const { currentUser, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  // Estados
  const [error, setError] = useState<string | null>(null);
  
  // Verificación de permisos temporalmente comentada
  // Consistente con el resto de páginas de super admin
  /*
  // Verificar si el usuario es super admin
  useEffect(() => {
    if (!isSuperAdmin()) {
      router.push('/dashboard');
    }
  }, [isSuperAdmin, router]);
  
  // Si no es super admin, no mostrar nada
  if (!isSuperAdmin()) {
    return null;
  }
  */
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Gestión de Empresas</h1>
      
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Administración de Empresas</CardTitle>
          <CardDescription>
            Gestiona todas las empresas del sistema, crea nuevas o modifica las existentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompaniesManager />
        </CardContent>
      </Card>
      
      {/* Botón volver */}
      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push('/super-admin')}>
          Volver al Panel de Super Administrador
        </Button>
      </div>
    </div>
  );
}