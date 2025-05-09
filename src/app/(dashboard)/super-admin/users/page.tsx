'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getAllCompanies } from '@/lib/services/companyService';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '@/lib/utils/constants';
import GlobalCompanyUsersManager from '@/components/settings/GlobalCompanyUsersManager';

export default function SuperAdminUsersPage() {
  const { currentUser, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  // Estados para crear nuevo usuario
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string>(UserRole.ADMIN);
  
  // Estados UI
  const [loading, setLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
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
  
  // Crear nuevo administrador de empresa
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany || !email || !displayName) {
      setError('Todos los campos son obligatorios');
      return;
    }
    
    try {
      setCreatingUser(true);
      setError(null);
      setSuccess(null);
      
      // Usar el API para crear usuario desde el servidor
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          displayName,
          companyId: selectedCompany,
          role,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Usuario "${displayName}" (${email}) creado correctamente como ${role === 'admin' ? 'Administrador' : 'Usuario'} en la empresa ${companies.find(c => c.id === selectedCompany)?.name}`);
        
        // Limpiar formulario
        setEmail('');
        setDisplayName('');
        setRole(UserRole.ADMIN);
      } else {
        setError(result.error || 'Error al crear usuario');
      }
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      setError(err.message || 'Error al crear usuario');
    } finally {
      setCreatingUser(false);
    }
  };
  
  // Si no es super admin, no mostrar nada (redirigirá)
  if (!isSuperAdmin()) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Administración Global de Usuarios</h1>
      
      <Tabs defaultValue="manager" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="manager">Gestionar Usuarios</TabsTrigger>
          <TabsTrigger value="create">Crear Nuevo Usuario</TabsTrigger>
        </TabsList>
        
        {/* Tab: Gestor de usuarios */}
        <TabsContent value="manager">
          <GlobalCompanyUsersManager />
        </TabsContent>
        
        {/* Tab: Crear nuevo usuario */}
        <TabsContent value="create">
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
          
          <Card>
            <CardHeader>
              <CardTitle>Crear nuevo usuario</CardTitle>
              <CardDescription>Agregar un nuevo usuario a una empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company">Empresa</Label>
                      <Select
                        id="company"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="mt-1"
                        required
                      >
                        <option value="">Seleccionar empresa...</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name} {company.environment === 'demo' ? '(Demo)' : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@ejemplo.com"
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="displayName">Nombre completo</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="mt-1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="role">Rol</Label>
                      <Select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1"
                        required
                      >
                        <option value={UserRole.ADMIN}>Administrador</option>
                        <option value={UserRole.INVESTIGATOR}>Investigador</option>
                        <option value={UserRole.USER}>Usuario</option>
                      </Select>
                    </div>
                    
                    <Button type="submit" disabled={creatingUser} className="w-full md:w-auto">
                      {creatingUser ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Información importante</h3>
                    <div className="text-sm text-gray-600 space-y-3">
                      <p>
                        <strong>Contraseñas:</strong> Al crear un nuevo usuario, se generará una contraseña aleatoria.
                        El usuario deberá usar la opción "Olvidé mi contraseña" para establecer su propia contraseña.
                      </p>
                      <p>
                        <strong>Roles de usuario:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Administrador:</strong> Acceso completo a la plataforma</li>
                        <li><strong>Investigador:</strong> Puede gestionar investigaciones y casos</li>
                        <li><strong>Usuario:</strong> Permisos básicos para ver reportes y datos</li>
                      </ul>
                      <p>
                        <strong>Notificaciones:</strong> Considere notificar manualmente al usuario cuando cree su cuenta.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Botón volver */}
      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push('/super-admin')}>
          Volver al Panel de Super Administrador
        </Button>
      </div>
    </div>
  );
}