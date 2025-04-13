'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Spinner } from '@/components/ui/spinner';
import { CompanyDocumentsManager } from '@/components/settings/CompanyDocumentsManager';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function CompanySettingsPage() {
  const params = useParams();
  const companyId = params.id as string;
  const { isSuperAdmin, isAdmin } = useCurrentUser();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  
  useEffect(() => {
    async function loadCompanyData() {
      try {
        setLoading(true);
        
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);
        
        if (companySnap.exists()) {
          setCompanyName(companySnap.data().name || 'Empresa');
        } else {
          setError('Empresa no encontrada');
        }
      } catch (error) {
        console.error('Error al cargar datos de la empresa:', error);
        setError('Error al cargar información de la empresa');
      } finally {
        setLoading(false);
      }
    }
    
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);
  
  // Verificar permisos
  if (!isSuperAdmin && !isAdmin) {
    return (
      <Alert variant="error">
        <AlertDescription>
          No tiene permisos para acceder a esta página.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (loading) {
    return <Spinner text="Cargando configuración..." />;
  }
  
  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de {companyName}</h1>
        <Button variant="outline" onClick={() => window.history.back()}>
          Volver
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Sección de documentos corporativos */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos Corporativos</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyDocumentsManager companyId={companyId} />
          </CardContent>
        </Card>
        
        {/* Otras secciones de configuración pueden agregarse aquí */}
      </div>
    </div>
  );
}