//src/app/(dashboard)/dashboard/users/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useCompany } from '@/lib/hooks';
import { 
  getAllActiveUsers, 
  deactivateUser, 
  updateUserProfile 
} from '@/lib/services/userService';

export default function UsersPage() {
  const { isAdmin, profile } = useCurrentUser();
  const { companyId: contextCompanyId } = useCompany();

  // Estados para los datos
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  // Usar la compañía del usuario para garantizar el aislamiento de datos
  const userCompanyId = profile?.company || contextCompanyId;

  // Cargar los usuarios
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);

        const result = await getAllActiveUsers(userCompanyId);
        
        if (result.success) {
          setUsers(result.users);
          setFilteredUsers(result.users);
        } else {
          setError(result.error || 'Error al cargar los usuarios');
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
        setError('Ha ocurrido un error al cargar los usuarios');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);
  
  // Aplicar filtros cuando cambien
  useEffect(() => {
    if (!users.length) return;
    
    let result = [...users];
    
    // Filtrar por rol
    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.displayName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, roleFilter]);
  
  // Manejar cambio de rol de usuario
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isAdmin) return;

    try {
      setIsSubmitting(true);

      const result = await updateUserProfile(userCompanyId, userId, {
        role: newRole,
      });
      
      if (result.success) {
        // Actualizar la lista de usuarios
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { ...user, role: newRole } 
              : user
          )
        );
      } else {
        setError(result.error || 'Error al actualizar el rol del usuario');
      }
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      setError('Ha ocurrido un error al actualizar el rol');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Desactivar usuario
  const handleDeactivateUser = async (userId: string) => {
    if (!isAdmin) return;

    if (!confirm('¿Está seguro de que desea desactivar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await deactivateUser(userCompanyId, userId);
      
      if (result.success) {
        // Eliminar el usuario de la lista
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      } else {
        setError(result.error || 'Error al desactivar el usuario');
      }
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      setError('Ha ocurrido un error al desactivar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página. Esta sección está reservada para administradores.
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
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <div>
          <Link href="/register">
            <Button>Crear Nuevo Usuario</Button>
          </Link>
        </div>
      </div>
      
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <Input
                id="searchTerm"
                placeholder="Nombre o email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <Select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Todos los roles</option>
                <option value="admin">Administrador</option>
                <option value="investigator">Investigador</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                }}
                className="w-full md:w-auto"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de usuarios */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white p-6 text-center border rounded-lg shadow-sm">
          <p className="text-gray-500">No se encontraron usuarios que coincidan con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
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
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="admin">Administrador</option>
                        <option value="investigator">Investigador</option>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {user.lastLogin 
                          ? new Date(user.lastLogin.toDate()).toLocaleString()
                          : 'Nunca'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeactivateUser(user.id)}
                        disabled={isSubmitting}
                      >
                        Desactivar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}