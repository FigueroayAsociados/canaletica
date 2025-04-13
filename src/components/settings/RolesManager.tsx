// src/components/settings/RolesManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  CustomRole,
  getCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole
} from '@/lib/services/configService';

// Lista de permisos disponibles en el sistema
const availablePermissions = [
  { id: 'reports.view', label: 'Ver denuncias', description: 'Permite ver el listado de denuncias y sus detalles' },
  { id: 'reports.create', label: 'Crear denuncias', description: 'Permite crear nuevas denuncias desde el panel administrativo' },
  { id: 'reports.edit', label: 'Editar denuncias', description: 'Permite modificar la información de las denuncias' },
  { id: 'reports.assign', label: 'Asignar denuncias', description: 'Permite asignar denuncias a investigadores' },
  { id: 'reports.change_status', label: 'Cambiar estado', description: 'Permite cambiar el estado de las denuncias' },
  { id: 'investigations.view', label: 'Ver investigaciones', description: 'Permite acceder al panel de investigación' },
  { id: 'investigations.manage', label: 'Gestionar investigaciones', description: 'Permite gestionar el proceso de investigación completo' },
  { id: 'communications.view', label: 'Ver comunicaciones', description: 'Permite ver los mensajes entre el denunciante y los investigadores' },
  { id: 'communications.reply', label: 'Responder comunicaciones', description: 'Permite responder a los mensajes de los denunciantes' },
  { id: 'recommendations.view', label: 'Ver recomendaciones', description: 'Permite ver las recomendaciones de las denuncias' },
  { id: 'recommendations.manage', label: 'Gestionar recomendaciones', description: 'Permite crear y modificar recomendaciones' },
  { id: 'follow_up.view', label: 'Ver seguimiento', description: 'Permite ver el panel de seguimiento' },
  { id: 'follow_up.update', label: 'Actualizar seguimiento', description: 'Permite actualizar el estado de las recomendaciones' },
  { id: 'users.view', label: 'Ver usuarios', description: 'Permite ver el listado de usuarios del sistema' },
  { id: 'users.manage', label: 'Gestionar usuarios', description: 'Permite crear, editar y desactivar usuarios' },
  { id: 'settings.view', label: 'Ver configuración', description: 'Permite ver la sección de configuración' },
  { id: 'settings.manage', label: 'Gestionar configuración', description: 'Permite modificar la configuración del sistema' },
  { id: 'statistics.view', label: 'Ver estadísticas', description: 'Permite ver las estadísticas del sistema' },
  { id: 'exports.generate', label: 'Generar reportes', description: 'Permite exportar información a diferentes formatos' },
];

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

export default function RolesManager({ companyId = 'default' }: { companyId?: string }) {
  // Estados para los roles
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edición
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Formulario
  const [roleForm, setRoleForm] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: []
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadRoles();
  }, []);

  // Cargar roles
  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getCustomRoles(companyId);
      
      if (result.success && result.roles) {
        setRoles(result.roles);
      } else {
        setError(result.error || 'Error al cargar los roles');
      }
    } catch (err) {
      console.error('Error al cargar roles:', err);
      setError('Ha ocurrido un error al cargar los roles');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar mensaje de éxito temporal
  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  // Funciones para manejo de roles
  const handleAddRole = async () => {
    try {
      setError(null);
      
      if (!validateRoleForm()) {
        return;
      }
      
      const result = await createCustomRole(companyId, {
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions,
        isSystemRole: false
      });
      
      if (result.success) {
        showSuccessMessage('Rol creado correctamente');
        await loadRoles();
        setIsAddingRole(false);
        resetRoleForm();
      } else {
        setError(result.error || 'Error al crear el rol');
      }
    } catch (err) {
      console.error('Error al añadir rol:', err);
      setError('Ha ocurrido un error al crear el rol');
    }
  };

  const handleUpdateRole = async (roleId: string) => {
    try {
      setError(null);
      
      if (!validateRoleForm()) {
        return;
      }
      
      const result = await updateCustomRole(companyId, roleId, {
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions
      });
      
      if (result.success) {
        showSuccessMessage('Rol actualizado correctamente');
        await loadRoles();
        setIsEditingRole(null);
      } else {
        setError(result.error || 'Error al actualizar el rol');
      }
    } catch (err) {
      console.error('Error al actualizar rol:', err);
      setError('Ha ocurrido un error al actualizar el rol');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar este rol? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setError(null);
      
      const result = await deleteCustomRole(companyId, roleId);
      
      if (result.success) {
        showSuccessMessage('Rol eliminado correctamente');
        await loadRoles();
      } else {
        setError(result.error || 'Error al eliminar el rol');
      }
    } catch (err) {
      console.error('Error al eliminar rol:', err);
      setError('Ha ocurrido un error al eliminar el rol');
    }
  };

  const handleEditRole = (role: CustomRole) => {
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
    
    setIsEditingRole(role.id);
    setIsAddingRole(false);
  };

  const toggleRoleExpansion = (roleId: string) => {
    setExpandedRole(expandedRole === roleId ? null : roleId);
  };

  const validateRoleForm = () => {
    if (!roleForm.name.trim()) {
      setError('El nombre del rol es obligatorio');
      return false;
    }
    
    if (!roleForm.description.trim()) {
      setError('La descripción del rol es obligatoria');
      return false;
    }
    
    if (roleForm.permissions.length === 0) {
      setError('Debe seleccionar al menos un permiso');
      return false;
    }
    
    return true;
  };

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      description: '',
      permissions: []
    });
  };

  const handlePermissionToggle = (permissionId: string) => {
    setRoleForm(prev => {
      if (prev.permissions.includes(permissionId)) {
        return {
          ...prev,
          permissions: prev.permissions.filter(id => id !== permissionId)
        };
      } else {
        return {
          ...prev,
          permissions: [...prev.permissions, permissionId]
        };
      }
    });
  };

  // Agrupar permisos por categoría para mostrarlos organizados
  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    const category = permission.id.split('.')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, typeof availablePermissions>);

  // Obtener categorías de permisos
  const permissionCategories = Object.keys(groupedPermissions).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      
      {/* Cabecera y botón de añadir */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestión de Roles Personalizados</h2>
        <Button 
          onClick={() => {
            resetRoleForm();
            setIsAddingRole(true);
            setIsEditingRole(null);
          }}
        >
          Añadir Rol
        </Button>
      </div>
      
      {/* Formulario para añadir rol */}
      {isAddingRole && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Añadir Nuevo Rol</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Nombre del Rol*</Label>
              <Input
                id="roleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="roleDescription">Descripción*</Label>
              <Textarea
                id="roleDescription"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Permisos*</Label>
              <div className="mt-2 border rounded-md">
                {permissionCategories.map(category => (
                  <div key={category} className="border-b last:border-b-0">
                    <div className="p-3 bg-gray-50">
                      <h4 className="font-medium capitalize">{category}</h4>
                    </div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {groupedPermissions[category].map(permission => (
                        <div key={permission.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`permission-${permission.id}`}
                            checked={roleForm.permissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                            className="h-4 w-4 text-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`permission-${permission.id}`} className="ml-2 flex flex-col">
                            <span className="text-sm font-medium">{permission.label}</span>
                            <span className="text-xs text-gray-500">{permission.description}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingRole(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddRole}>
                Guardar Rol
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulario para editar rol */}
      {isEditingRole && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Editar Rol</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRoleName">Nombre del Rol*</Label>
              <Input
                id="editRoleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="editRoleDescription">Descripción*</Label>
              <Textarea
                id="editRoleDescription"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Permisos*</Label>
              <div className="mt-2 border rounded-md">
                {permissionCategories.map(category => (
                  <div key={category} className="border-b last:border-b-0">
                    <div className="p-3 bg-gray-50">
                      <h4 className="font-medium capitalize">{category}</h4>
                    </div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {groupedPermissions[category].map(permission => (
                        <div key={permission.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`edit-permission-${permission.id}`}
                            checked={roleForm.permissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                            className="h-4 w-4 text-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`edit-permission-${permission.id}`} className="ml-2 flex flex-col">
                            <span className="text-sm font-medium">{permission.label}</span>
                            <span className="text-xs text-gray-500">{permission.description}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingRole(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleUpdateRole(isEditingRole)}>
                Actualizar Rol
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de roles */}
      <div className="space-y-4">
        {roles.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay roles personalizados configurados</p>
        ) : (
          roles.map(role => (
            <div key={role.id} className="border rounded-md overflow-hidden">
              <div className="bg-gray-100 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleRoleExpansion(role.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className={`h-5 w-5 transition-transform ${expandedRole === role.id ? 'transform rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div>
                    <div className="font-medium flex items-center">
                      {role.name}
                      {role.isSystemRole && (
                        <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">Sistema</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </div>
                </div>
                <div className="space-x-2">
                  {!role.isSystemRole && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Permisos del rol */}
              {expandedRole === role.id && (
                <div className="p-4 bg-white">
                  <h4 className="font-medium mb-2">Permisos asignados</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {role.permissions.sort().map(permissionId => {
                      const permission = availablePermissions.find(p => p.id === permissionId);
                      return permission ? (
                        <div key={permissionId} className="flex items-center p-2 bg-gray-50 rounded-md">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium">{permission.label}</div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}