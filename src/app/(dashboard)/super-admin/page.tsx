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
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { getAllCompanies, createCompany } from '@/lib/services/companyService';
import { EnvironmentType } from '@/lib/services/environmentService';
import useFeatureFlags from '@/lib/hooks/useFeatureFlags';

export default function SuperAdminPage() {
  const { currentUser, switchCompany, companyId } = useAuth();
  const { isSuperAdmin } = useCurrentUser(); // Usar el hook de usuario actual para la verificación
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
  useEffect(() => {
    if (!isSuperAdmin()) {
      router.push('/dashboard');
    }
  }, [isSuperAdmin, router]);
  
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
  
  // Si no es super admin, no mostrar nada (redirigirá)
  if (!isSuperAdmin()) {
    return null;
  }
  
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
                    onChange={(e) => setNewCompanyId(e.target.value)}
                    placeholder="ejemplo-sa"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Solo letras minúsculas, números y guiones
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => router.push('/dashboard')}>
              Ir al Dashboard
            </Button>
            
            <Button variant="outline" onClick={() => router.push('/super-admin/logs')}>
              Ver logs del sistema
            </Button>
            
            <Button variant="outline" onClick={() => router.push('/super-admin/setup-demo')}>
              Configurar empresa Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}