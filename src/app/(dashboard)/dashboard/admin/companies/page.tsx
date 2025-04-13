// src/app/(dashboard)/dashboard/admin/companies/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { setupNewCompany } from '@/lib/services/setupService';

interface Company {
  id: string;
  name: string;
  adminEmail: string;
  active: boolean;
  createdAt: any;
}

export default function CompaniesAdminPage() {
  const { isSuperAdmin } = useCurrentUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para el formulario de nueva empresa
  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    adminEmail: ''
  });
  const [creating, setCreating] = useState(false);

  // Cargar empresas al iniciar
  useEffect(() => {
    async function loadCompanies() {
      try {
        setLoading(true);
        
        const companiesRef = collection(db, 'companies');
        const q = query(companiesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const companiesList: Company[] = [];
        snapshot.forEach(doc => {
          companiesList.push({
            id: doc.id,
            ...doc.data()
          } as Company);
        });
        
        setCompanies(companiesList);
      } catch (error) {
        console.error('Error al cargar empresas:', error);
        setError('Error al cargar el listado de empresas');
      } finally {
        setLoading(false);
      }
    }
    
    loadCompanies();
  }, []);

  // Función para crear una nueva empresa
  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.adminEmail) {
      setError('Debe completar todos los campos');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      const result = await setupNewCompany(newCompany.name, newCompany.adminEmail);
      
      if (result.success) {
        setSuccess(`Empresa "${newCompany.name}" creada correctamente con ID: ${result.companyId}`);
        setNewCompany({ name: '', adminEmail: '' });
        setIsCreating(false);
        
        // Recargar la lista de empresas
        window.location.reload();
      } else {
        setError(result.error || 'Error al crear la empresa');
      }
    } catch (error) {
      console.error('Error al crear empresa:', error);
      setError('Ha ocurrido un error al crear la empresa');
    } finally {
      setCreating(false);
    }
  };

  // Verificar si el usuario es super admin
  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página. Esta sección está reservada para super administradores.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Pantalla de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Administración de Empresas</h1>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          Nueva Empresa
        </Button>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Formulario para crear nueva empresa */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Empresa</CardTitle>
            <CardDescription>
              Complete la información para crear una nueva empresa en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Nombre de la Empresa*</Label>
              <Input
                id="companyName"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="adminEmail">Correo del Administrador*</Label>
              <Input
                id="adminEmail"
                type="email"
                value={newCompany.adminEmail}
                onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este usuario será el administrador principal de la empresa
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateCompany}
                disabled={creating}
              >
                {creating ? 'Creando...' : 'Crear Empresa'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de empresas */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Empresas Registradas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Lista de todas las empresas configuradas en el sistema
          </p>
        </div>
        
        {companies.length === 0 ? (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            No hay empresas registradas en el sistema
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Administrador
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {company.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {company.adminEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        company.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {company.createdAt?.toDate().toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a 
                        href={`/dashboard?companyId=${company.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-dark"
                      >
                        Ver Dashboard
                      </a>
                      <span className="mx-2 text-gray-300">|</span>
                      <a 
                        href={`/admin/companies/edit/${company.id}`}
                        className="text-primary hover:text-primary-dark"
                      >
                        Editar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Instrucciones para implementación multi-tenant */}
      <Card>
        <CardHeader>
          <CardTitle>Implementación Multi-Tenant</CardTitle>
          <CardDescription>
            Instrucciones para configurar el acceso multi-empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Opciones de Implementación</h3>
            <div className="mt-2 space-y-2">
              <div>
                <h4 className="text-md font-medium">1. Implementación con Subdominios</h4>
                <p className="text-sm text-gray-600">
                  Configure cada empresa para acceder desde su propio subdominio:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-1">
                  <li>empresa1.canaletica.com</li>
                  <li>empresa2.canaletica.com</li>
                </ul>
                <p className="text-sm text-gray-600 mt-1">
                  Deberá configurar los DNS y el hosting para admitir subdominios comodín.
                </p>
              </div>
              
              <div className="mt-4">
                <h4 className="text-md font-medium">2. Implementación con Parámetros de URL</h4>
                <p className="text-sm text-gray-600">
                  Utilice un parámetro en la URL para identificar la empresa:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-1">
                  <li>canaletica.com/?company=empresa1</li>
                  <li>canaletica.com/?company=empresa2</li>
                </ul>
                <p className="text-sm text-gray-600 mt-1">
                  Esta opción es más simple de implementar pero menos elegante para el usuario.
                </p>
              </div>
              
              <div className="mt-4">
                <h4 className="text-md font-medium">3. Implementación con Rutas</h4>
                <p className="text-sm text-gray-600">
                  Utilice rutas específicas para cada empresa:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 ml-4 mt-1">
                  <li>canaletica.com/empresa1/dashboard</li>
                  <li>canaletica.com/empresa2/dashboard</li>
                </ul>
                <p className="text-sm text-gray-600 mt-1">
                  Equilibrio entre facilidad de implementación y experiencia de usuario.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium">Pasos para Activar Multi-Tenant</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 mt-2 space-y-2">
              <li>
                Modifique el archivo <code className="bg-gray-100 px-1">src/lib/contexts/CompanyContext.tsx</code> para extraer el ID de empresa según su método elegido.
              </li>
              <li>
                Actualice las reglas de seguridad de Firestore para garantizar el aislamiento de datos.
              </li>
              <li>
                Configure su servidor web o hosting para manejar la opción elegida (subdominios, parámetros, rutas).
              </li>
              <li>
                Pruebe exhaustivamente que los datos de cada empresa estén correctamente aislados.
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}