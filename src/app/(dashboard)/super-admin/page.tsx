'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getAllCompanies, createCompany } from '@/lib/services/companyService';
import { EnvironmentType } from '@/lib/services/environmentService';
import useFeatureFlags from '@/lib/hooks/useFeatureFlags';

export default function SuperAdminPage() {
  const { currentUser, switchCompany, companyId, isSuperAdmin } = useAuth();
  const router = useRouter();
  const { features, loading: featuresLoading, updateFlag } = useFeatureFlags();
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para crear nueva empresa
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyEnv, setNewCompanyEnv] = useState<EnvironmentType>('production');
  const [creatingCompany, setCreatingCompany] = useState(false);
  
  // Verificar si el usuario es super admin
  // Desactiva temporalmente esta verificación hasta que arreglemos los roles
  // (Consistente con el comportamiento en src/app/(dashboard)/layout.tsx)
  /*
  useEffect(() => {
    if (!isSuperAdmin()) {
      router.push('/dashboard');
    }
  }, [isSuperAdmin, router]);
  */
  
  // Cargar la lista de empresas
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getAllCompanies();
        
        if (result.success) {
          setCompanies(result.companies || []);
        } else {
          setError(result.error || 'Error al cargar empresas');
        }
      } catch (err) {
        console.error('Error al cargar empresas:', err);
        setError('Error al cargar la lista de empresas');
      } finally {
        setLoading(false);
      }
    };
    
    if (isSuperAdmin()) {
      loadCompanies();
    }
  }, [isSuperAdmin]);
  
  // Manejar el cambio de empresa
  const handleCompanyChange = async (targetCompanyId: string) => {
    setError(null);
    setSuccess(null);
    
    if (!targetCompanyId) return;
    
    const success = await switchCompany(targetCompanyId);
    
    if (success) {
      setSuccess(`Empresa cambiada a: ${targetCompanyId}`);
    } else {
      setError('Error al cambiar de empresa');
    }
  };
  
  // Crear nueva empresa
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCompanyId || !newCompanyName) {
      setError('ID y nombre de empresa son obligatorios');
      return;
    }
    
    // Validar formato del ID (solo letras minúsculas, números y guiones)
    const idFormat = /^[a-z0-9-]+$/;
    if (!idFormat.test(newCompanyId)) {
      setError('El ID de la empresa solo puede contener letras minúsculas, números y guiones');
      return;
    }
    
    try {
      setCreatingCompany(true);
      setError(null);
      setSuccess(null);
      
      const result = await createCompany(
        {
          id: newCompanyId,
          name: newCompanyName,
          environment: newCompanyEnv
        },
        currentUser?.uid || 'system'
      );
      
      if (result.success) {
        setSuccess(`Empresa "${newCompanyName}" creada correctamente`);
        setNewCompanyId('');
        setNewCompanyName('');
        
        // Recargar la lista de empresas
        const companiesResult = await getAllCompanies();
        if (companiesResult.success) {
          setCompanies(companiesResult.companies || []);
        }
      } else {
        setError(result.error || 'Error al crear la empresa');
      }
    } catch (err) {
      console.error('Error al crear empresa:', err);
      setError('Error al crear la empresa');
    } finally {
      setCreatingCompany(false);
    }
  };
  
  // Definir clase actual para la empresa seleccionada
  const getCompanyCardClass = (id: string) => {
    return id === companyId 
      ? 'border-primary border-2' 
      : '';
  };
  
  // Desactiva temporalmente esta verificación hasta que arreglemos los roles
  // (Consistente con el comportamiento en src/app/(dashboard)/layout.tsx)
  /*
  // Si no es super admin, no mostrar nada (redirigirá)
  if (!isSuperAdmin()) {
    return null;
  }
  */
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Panel de Super Administrador</h1>
      
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
      
      {/* Selector de empresa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Empresas disponibles</CardTitle>
            <CardDescription>Selecciona una empresa para administrar</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Cargando empresas...</p>
            ) : companies.length === 0 ? (
              <p>No hay empresas disponibles</p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="company-select">Seleccionar empresa</Label>
                <Select
                  id="company-select"
                  value={companyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="w-full"
                >
                  <option value="">Seleccionar empresa...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} {company.environment === 'demo' ? '(Demo)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Formulario para crear nueva empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Crear nueva empresa</CardTitle>
            <CardDescription>Añadir una nueva empresa al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company-id">ID de la empresa</Label>
                  <Input
                    id="company-id"
                    value={newCompanyId}
                    onChange={(e) => setNewCompanyId(e.target.value.toLowerCase())}
                    placeholder="ejemplo-sa"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Solo letras minúsculas, números y guiones. Este ID será único y no podrá cambiarse después.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Nota: Durante la fase de desarrollo, algunas operaciones se redireccionen a la empresa "default".
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="company-name">Nombre de la empresa</Label>
                  <Input
                    id="company-name"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Ejemplo S.A."
                    className="mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="company-env">Tipo de entorno</Label>
                  <Select
                    id="company-env"
                    value={newCompanyEnv}
                    onChange={(e) => setNewCompanyEnv(e.target.value as EnvironmentType)}
                    className="mt-1"
                  >
                    <option value="production">Producción</option>
                    <option value="demo">Demostración</option>
                    <option value="development">Desarrollo</option>
                  </Select>
                </div>
                
                <Button type="submit" disabled={creatingCompany}>
                  {creatingCompany ? 'Creando...' : 'Crear empresa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      {/* Gestión de funcionalidades para la empresa actual */}
      {companyId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gestión de funcionalidades</CardTitle>
            <CardDescription>
              Administrar funcionalidades para la empresa actual: {companies.find(c => c.id === companyId)?.name || companyId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {featuresLoading ? (
              <p>Cargando configuración...</p>
            ) : !features ? (
              <p>No se pudo cargar la configuración</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Funcionalidades Core */}
                  <div className="border p-4 rounded-md">
                    <h3 className="text-lg font-medium mb-3">Funcionalidades Core</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="modules-enabled">Sistema modular</Label>
                        <input
                          type="checkbox"
                          id="modules-enabled"
                          checked={features.modulesEnabled}
                          onChange={(e) => updateFlag('modulesEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ai-enabled">Inteligencia Artificial</Label>
                        <input
                          type="checkbox"
                          id="ai-enabled"
                          checked={features.aiEnabled}
                          onChange={(e) => updateFlag('aiEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="intelligent-risk-enabled" className="flex items-center gap-2">
                          🚀 Análisis Inteligente de Riesgo
                          <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full">
                            PREMIUM
                          </span>
                        </Label>
                        <input
                          type="checkbox"
                          id="intelligent-risk-enabled"
                          checked={features.intelligentRiskAnalysisEnabled}
                          onChange={(e) => updateFlag('intelligentRiskAnalysisEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Módulos */}
                  <div className="border p-4 rounded-md">
                    <h3 className="text-lg font-medium mb-3">Módulos</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="karin-module">Ley Karin</Label>
                        <input
                          type="checkbox"
                          id="karin-module"
                          checked={features.karinModuleEnabled}
                          onChange={(e) => updateFlag('karinModuleEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mpd-module">Modelo de Prevención</Label>
                        <input
                          type="checkbox"
                          id="mpd-module"
                          checked={features.mpdModuleEnabled}
                          onChange={(e) => updateFlag('mpdModuleEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cyber-module">Ciberseguridad</Label>
                        <input
                          type="checkbox"
                          id="cyber-module"
                          checked={features.cyberModuleEnabled}
                          onChange={(e) => updateFlag('cyberModuleEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="data-module">Protección de Datos</Label>
                        <input
                          type="checkbox"
                          id="data-module"
                          checked={features.dataModuleEnabled}
                          onChange={(e) => updateFlag('dataModuleEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="public-admin-module">Administración Pública</Label>
                        <input
                          type="checkbox"
                          id="public-admin-module"
                          checked={features.publicAdminModuleEnabled}
                          onChange={(e) => updateFlag('publicAdminModuleEnabled', e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-3">Interfaz y UX</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="new-ui">Nueva interfaz</Label>
                      <input
                        type="checkbox"
                        id="new-ui"
                        checked={features.newUiEnabled}
                        onChange={(e) => updateFlag('newUiEnabled', e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dashboard-v2">Dashboard V2</Label>
                      <input
                        type="checkbox"
                        id="dashboard-v2"
                        checked={features.dashboardV2Enabled}
                        onChange={(e) => updateFlag('dashboardV2Enabled', e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
          <CardDescription>Accede rápidamente a las principales funcionalidades de super administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => router.push('/dashboard')}>
              <CardContent className="p-4 text-center">
                <div className="mb-2 mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-7-7v14" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Dashboard</h3>
                <p className="text-sm text-gray-500 mt-1">Ir al panel principal</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => router.push('/super-admin/users')}>
              <CardContent className="p-4 text-center">
                <div className="mb-2 mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Usuarios</h3>
                <p className="text-sm text-gray-500 mt-1">Gestionar usuarios de empresas</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 hover:bg-amber-50 transition-colors cursor-pointer" onClick={() => router.push('/super-admin/companies')}>
              <CardContent className="p-4 text-center">
                <div className="mb-2 mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Empresas</h3>
                <p className="text-sm text-gray-500 mt-1">Gestionar empresas del sistema</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-50 hover:bg-green-50 transition-colors cursor-pointer" onClick={() => router.push('/super-admin/setup-demo')}>
              <CardContent className="p-4 text-center">
                <div className="mb-2 mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Demo</h3>
                <p className="text-sm text-gray-500 mt-1">Configurar entorno Demo</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}