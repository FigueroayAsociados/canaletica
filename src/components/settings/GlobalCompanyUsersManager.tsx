// src/components/settings/GlobalCompanyUsersManager.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deleteDoc, doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { UserRole } from '@/lib/utils/constants';
import { getAllCompanies } from '@/lib/services/companyService';
import { deactivateUser, updateUserProfile } from '@/lib/services/userService';

interface Company {
  id: string;
  name: string;
  environment?: string;
  isActive?: boolean;
}

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: any;
  lastLogin?: any;
}

export default function GlobalCompanyUsersManager() {
  // Estados
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  
  // Estados de filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Cargar empresas
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoading(true);
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
    
    loadCompanies();
  }, []);
  
  // Cargar usuarios de una empresa
  const loadCompanyUsers = async (companyId: string) => {
    if (!companyId) return;
    
    try {
      setUsersLoading(true);
      setError(null);
      
      const usersRef = collection(db, `companies/${companyId}/users`);
      const usersSnapshot = await getDocs(usersRef);
      
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      setCompanyUsers(users);
      
    } catch (err) {
      console.error(`Error al cargar usuarios de la empresa ${companyId}:`, err);
      setError('Error al cargar usuarios de la empresa');
    } finally {
      setUsersLoading(false);
    }
  };
  
  // Manejar cambio de empresa seleccionada
  const handleCompanyChange = async (companyId: string) => {
    setSelectedCompany(companyId);
    setSuccess(null);
    setError(null);
    
    if (companyId) {
      await loadCompanyUsers(companyId);
    } else {
      setCompanyUsers([]);
    }
  };
  
  // Cambiar rol de usuario
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!selectedCompany || !userId) return;
    
    try {
      setActiveAction(userId);
      setError(null);
      
      const result = await updateUserProfile(selectedCompany, userId, {
        role: newRole as UserRole,
      });
      
      if (result.success) {
        setCompanyUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { ...user, role: newRole } 
              : user
          )
        );
        setSuccess(`Rol actualizado correctamente`);
      } else {
        setError(result.error || 'Error al actualizar el rol del usuario');
      }
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      setError('Ha ocurrido un error al actualizar el rol');
    } finally {
      setActiveAction(null);
    }
  };
  
  // Desactivar usuario
  const handleDeactivateUser = async (userId: string) => {
    if (!selectedCompany || !userId) return;
    
    if (!confirm('¿Está seguro de que desea desactivar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setActiveAction(userId);
      setError(null);
      
      const result = await deactivateUser(selectedCompany, userId);
      
      if (result.success) {
        setCompanyUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { ...user, isActive: false } 
              : user
          )
        );
        setSuccess(`Usuario desactivado correctamente`);
      } else {
        setError(result.error || 'Error al desactivar el usuario');
      }
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      setError('Ha ocurrido un error al desactivar el usuario');
    } finally {
      setActiveAction(null);
    }
  };
  
  // Filtrar usuarios
  const filteredUsers = companyUsers.filter(user => {
    // Filtro por búsqueda
    const matchesSearch = searchTerm
      ? user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    // Filtro por rol
    const matchesRole = roleFilter
      ? user.role === roleFilter
      : true;
    
    return matchesSearch && matchesRole;
  });
  
  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
  };
  
  return (
    <div className="space-y-6">
      {/* Mensajes */}
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
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Empresa</CardTitle>
          <CardDescription>
            Elija una empresa para administrar sus usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando empresas...</p>
          ) : (
            <Select 
              value={selectedCompany}
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
          )}
        </CardContent>
      </Card>
      
      {/* Gestión de usuarios */}
      {selectedCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Usuarios de la empresa</CardTitle>
            <CardDescription>
              {companies.find(c => c.id === selectedCompany)?.name || selectedCompany}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="searchTerm">Buscar</Label>
                <Input
                  id="searchTerm"
                  placeholder="Nombre o email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="roleFilter">Filtrar por rol</Label>
                <Select
                  id="roleFilter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="mt-1"
                >
                  <option value="">Todos los roles</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                  <option value={UserRole.INVESTIGATOR}>Investigador</option>
                  <option value={UserRole.USER}>Usuario</option>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full md:w-auto"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
            
            {/* Lista de usuarios */}
            {usersLoading ? (
              <div className="flex justify-center py-6">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No se encontraron usuarios que coincidan con los filtros.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Acceso
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className={!user.isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName}
                            {!user.isActive && <span className="ml-2 text-xs text-red-500">(Inactivo)</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isActive ? (
                            <Select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={!!activeAction}
                              className="text-sm"
                            >
                              <option value={UserRole.ADMIN}>Administrador</option>
                              <option value={UserRole.INVESTIGATOR}>Investigador</option>
                              <option value={UserRole.USER}>Usuario</option>
                            </Select>
                          ) : (
                            <div className="text-sm text-gray-500">
                              {user.role === UserRole.ADMIN ? 'Administrador' : 
                               user.role === UserRole.INVESTIGATOR ? 'Investigador' : 
                               user.role === UserRole.USER ? 'Usuario' : user.role}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.lastLogin 
                              ? new Date(user.lastLogin.toDate()).toLocaleString()
                              : 'Nunca'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user.isActive && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeactivateUser(user.id)}
                              disabled={!!activeAction}
                            >
                              Desactivar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}