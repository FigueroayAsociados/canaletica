// src/components/settings/ConflictsOfInterestManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ConflictOfInterest, 
  getConflictsOfInterest, 
  createConflictOfInterest, 
  updateConflictOfInterest, 
  deleteConflictOfInterest 
} from '@/lib/services/conflictService';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

interface ConflictsOfInterestManagerProps {
  companyId: string;
}

export default function ConflictsOfInterestManager({ companyId }: ConflictsOfInterestManagerProps) {
  const { uid, displayName } = useCurrentUser();
  
  // Estados para los conflictos
  const [conflicts, setConflicts] = useState<ConflictOfInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edición
  const [isAddingConflict, setIsAddingConflict] = useState(false);
  const [isEditingConflict, setIsEditingConflict] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'active', 'resolved'

  // Estado para filtros
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');

  // Formulario
  const [conflictForm, setConflictForm] = useState<Omit<ConflictOfInterest, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    affectedArea: '',
    severity: 'medium',
    isActive: true,
    mitigationSteps: '',
    reportDate: new Date(),
    resolvedDate: null,
    status: 'pending',
    reportedBy: displayName || 'Usuario no identificado',
    assignedTo: ''
  });

  // Cargar datos al montar el componente o cambiar filtros
  useEffect(() => {
    loadConflictsOfInterest();
  }, [companyId, filterStatus, filterSeverity]);

  // Cargar conflictos de interés
  const loadConflictsOfInterest = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: { status?: string, severity?: string } = {};
      if (filterStatus) filters.status = filterStatus;
      if (filterSeverity) filters.severity = filterSeverity;

      const result = await getConflictsOfInterest(companyId, filters);
      
      if (result.success && result.conflicts) {
        // Filtrar los conflictos según el modo de visualización
        let filteredConflicts = result.conflicts;
        
        if (viewMode === 'active') {
          filteredConflicts = result.conflicts.filter(c => c.isActive);
        } else if (viewMode === 'resolved') {
          filteredConflicts = result.conflicts.filter(c => c.status === 'resolved');
        }
        
        setConflicts(filteredConflicts);
      } else {
        setError(result.error || 'Error al cargar los conflictos de interés');
      }
    } catch (err) {
      console.error('Error al cargar conflictos de interés:', err);
      setError('Ha ocurrido un error al cargar los conflictos de interés');
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

  // Funciones para manejo de conflictos
  const handleAddConflict = async () => {
    try {
      setError(null);
      
      if (!validateConflictForm()) {
        return;
      }
      
      const result = await createConflictOfInterest(companyId, {
        ...conflictForm,
        reportedBy: displayName || 'Usuario no identificado',
      });
      
      if (result.success) {
        showSuccessMessage('Conflicto de interés creado correctamente');
        await loadConflictsOfInterest();
        setIsAddingConflict(false);
        resetConflictForm();
      } else {
        setError(result.error || 'Error al crear el conflicto de interés');
      }
    } catch (err) {
      console.error('Error al añadir conflicto de interés:', err);
      setError('Ha ocurrido un error al crear el conflicto de interés');
    }
  };

  const handleUpdateConflict = async (conflictId: string) => {
    try {
      setError(null);
      
      if (!validateConflictForm()) {
        return;
      }
      
      const result = await updateConflictOfInterest(companyId, conflictId, conflictForm);
      
      if (result.success) {
        showSuccessMessage('Conflicto de interés actualizado correctamente');
        await loadConflictsOfInterest();
        setIsEditingConflict(null);
      } else {
        setError(result.error || 'Error al actualizar el conflicto de interés');
      }
    } catch (err) {
      console.error('Error al actualizar conflicto de interés:', err);
      setError('Ha ocurrido un error al actualizar el conflicto de interés');
    }
  };

  const handleDeleteConflict = async (conflictId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar este conflicto de interés? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setError(null);
      
      const result = await deleteConflictOfInterest(companyId, conflictId);
      
      if (result.success) {
        showSuccessMessage('Conflicto de interés eliminado correctamente');
        await loadConflictsOfInterest();
      } else {
        setError(result.error || 'Error al eliminar el conflicto de interés');
      }
    } catch (err) {
      console.error('Error al eliminar conflicto de interés:', err);
      setError('Ha ocurrido un error al eliminar el conflicto de interés');
    }
  };

  const handleEditConflict = (conflict: ConflictOfInterest) => {
    setConflictForm({
      name: conflict.name,
      description: conflict.description,
      affectedArea: conflict.affectedArea,
      severity: conflict.severity,
      isActive: conflict.isActive,
      mitigationSteps: conflict.mitigationSteps,
      reportDate: conflict.reportDate,
      resolvedDate: conflict.resolvedDate,
      status: conflict.status,
      reportedBy: conflict.reportedBy,
      assignedTo: conflict.assignedTo
    });
    
    setIsEditingConflict(conflict.id);
    setIsAddingConflict(false);
  };

  const validateConflictForm = () => {
    if (!conflictForm.name.trim()) {
      setError('El nombre del conflicto de interés es obligatorio');
      return false;
    }
    
    if (!conflictForm.description.trim()) {
      setError('La descripción del conflicto de interés es obligatoria');
      return false;
    }
    
    if (!conflictForm.affectedArea.trim()) {
      setError('El área afectada es obligatoria');
      return false;
    }
    
    return true;
  };

  const resetConflictForm = () => {
    setConflictForm({
      name: '',
      description: '',
      affectedArea: '',
      severity: 'medium',
      isActive: true,
      mitigationSteps: '',
      reportDate: new Date(),
      resolvedDate: null,
      status: 'pending',
      reportedBy: displayName || 'Usuario no identificado',
      assignedTo: ''
    });
  };

  // Formatear fecha para mostrar en la interfaz
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtener el color de fondo según la severidad
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener el color de fondo según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'in_review':
        return 'bg-purple-100 text-purple-800';
      case 'mitigated':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Traducir severidad a español
  const translateSeverity = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return severity;
    }
  };

  // Traducir estado a español
  const translateStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_review':
        return 'En revisión';
      case 'mitigated':
        return 'Mitigado';
      case 'resolved':
        return 'Resuelto';
      default:
        return status;
    }
  };

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
          <p className="text-gray-600">Cargando conflictos de interés...</p>
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Gestión de Conflictos de Interés</h2>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => {
              resetConflictForm();
              setIsAddingConflict(true);
              setIsEditingConflict(null);
            }}
          >
            Añadir Conflicto de Interés
          </Button>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-md">
        <div className="flex items-center space-x-2">
          <Label htmlFor="filterStatus">Estado:</Label>
          <Select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-40"
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_review">En revisión</option>
            <option value="mitigated">Mitigado</option>
            <option value="resolved">Resuelto</option>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="filterSeverity">Severidad:</Label>
          <Select
            id="filterSeverity"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-40"
          >
            <option value="">Todas</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="viewMode">Ver:</Label>
          <Select
            id="viewMode"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="w-40"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="resolved">Resueltos</option>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          onClick={loadConflictsOfInterest}
        >
          Actualizar
        </Button>
      </div>
      
      {/* Formulario para añadir conflicto */}
      {isAddingConflict && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Añadir Nuevo Conflicto de Interés</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="conflictName">Nombre del Conflicto*</Label>
                <Input
                  id="conflictName"
                  value={conflictForm.name}
                  onChange={(e) => setConflictForm({ ...conflictForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="affectedArea">Área Afectada*</Label>
                <Input
                  id="affectedArea"
                  value={conflictForm.affectedArea}
                  onChange={(e) => setConflictForm({ ...conflictForm, affectedArea: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Descripción*</Label>
              <Textarea
                id="description"
                value={conflictForm.description}
                onChange={(e) => setConflictForm({ ...conflictForm, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="severity">Severidad</Label>
                <Select
                  id="severity"
                  value={conflictForm.severity}
                  onChange={(e) => setConflictForm({ ...conflictForm, severity: e.target.value as 'low' | 'medium' | 'high' })}
                  className="mt-1 w-full"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  id="status"
                  value={conflictForm.status}
                  onChange={(e) => setConflictForm({ ...conflictForm, status: e.target.value as 'pending' | 'in_review' | 'mitigated' | 'resolved' })}
                  className="mt-1 w-full"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_review">En revisión</option>
                  <option value="mitigated">Mitigado</option>
                  <option value="resolved">Resuelto</option>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="mitigationSteps">Medidas de Mitigación</Label>
              <Textarea
                id="mitigationSteps"
                value={conflictForm.mitigationSteps}
                onChange={(e) => setConflictForm({ ...conflictForm, mitigationSteps: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedTo">Asignado a</Label>
                <Input
                  id="assignedTo"
                  value={conflictForm.assignedTo}
                  onChange={(e) => setConflictForm({ ...conflictForm, assignedTo: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="reportDate">Fecha de Reporte</Label>
                <Input
                  id="reportDate"
                  type="date"
                  value={conflictForm.reportDate ? new Date(conflictForm.reportDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) => setConflictForm({ 
                    ...conflictForm, 
                    reportDate: e.target.value ? new Date(e.target.value) : null 
                  })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={conflictForm.isActive}
                onChange={(e) => setConflictForm({ ...conflictForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="isActive" className="ml-2">
                Conflicto Activo
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingConflict(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddConflict}>
                Guardar Conflicto
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulario para editar conflicto */}
      {isEditingConflict && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Editar Conflicto de Interés</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editConflictName">Nombre del Conflicto*</Label>
                <Input
                  id="editConflictName"
                  value={conflictForm.name}
                  onChange={(e) => setConflictForm({ ...conflictForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="editAffectedArea">Área Afectada*</Label>
                <Input
                  id="editAffectedArea"
                  value={conflictForm.affectedArea}
                  onChange={(e) => setConflictForm({ ...conflictForm, affectedArea: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="editDescription">Descripción*</Label>
              <Textarea
                id="editDescription"
                value={conflictForm.description}
                onChange={(e) => setConflictForm({ ...conflictForm, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editSeverity">Severidad</Label>
                <Select
                  id="editSeverity"
                  value={conflictForm.severity}
                  onChange={(e) => setConflictForm({ ...conflictForm, severity: e.target.value as 'low' | 'medium' | 'high' })}
                  className="mt-1 w-full"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editStatus">Estado</Label>
                <Select
                  id="editStatus"
                  value={conflictForm.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'pending' | 'in_review' | 'mitigated' | 'resolved';
                    let resolvedDate = conflictForm.resolvedDate;
                    
                    // Si se cambia a resuelto, establecer la fecha de resolución
                    if (newStatus === 'resolved' && !resolvedDate) {
                      resolvedDate = new Date();
                    } else if (newStatus !== 'resolved') {
                      // Si se cambia de resuelto a otro estado, eliminar la fecha de resolución
                      resolvedDate = null;
                    }
                    
                    setConflictForm({ 
                      ...conflictForm, 
                      status: newStatus,
                      resolvedDate
                    });
                  }}
                  className="mt-1 w-full"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_review">En revisión</option>
                  <option value="mitigated">Mitigado</option>
                  <option value="resolved">Resuelto</option>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="editMitigationSteps">Medidas de Mitigación</Label>
              <Textarea
                id="editMitigationSteps"
                value={conflictForm.mitigationSteps}
                onChange={(e) => setConflictForm({ ...conflictForm, mitigationSteps: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editAssignedTo">Asignado a</Label>
                <Input
                  id="editAssignedTo"
                  value={conflictForm.assignedTo}
                  onChange={(e) => setConflictForm({ ...conflictForm, assignedTo: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="editReportDate">Fecha de Reporte</Label>
                <Input
                  id="editReportDate"
                  type="date"
                  value={conflictForm.reportDate ? new Date(conflictForm.reportDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) => setConflictForm({ 
                    ...conflictForm, 
                    reportDate: e.target.value ? new Date(e.target.value) : null 
                  })}
                  className="mt-1"
                />
              </div>
            </div>
            
            {conflictForm.status === 'resolved' && (
              <div>
                <Label htmlFor="editResolvedDate">Fecha de Resolución</Label>
                <Input
                  id="editResolvedDate"
                  type="date"
                  value={conflictForm.resolvedDate ? new Date(conflictForm.resolvedDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) => setConflictForm({ 
                    ...conflictForm, 
                    resolvedDate: e.target.value ? new Date(e.target.value) : null 
                  })}
                  className="mt-1"
                />
              </div>
            )}
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editIsActive"
                checked={conflictForm.isActive}
                onChange={(e) => setConflictForm({ ...conflictForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="editIsActive" className="ml-2">
                Conflicto Activo
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingConflict(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleUpdateConflict(isEditingConflict)}>
                Actualizar Conflicto
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de conflictos */}
      <div className="space-y-4">
        {conflicts.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-md">
            No hay conflictos de interés registrados
          </p>
        ) : (
          <div className="overflow-hidden border rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área Afectada
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severidad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Reporte
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conflicts.map(conflict => (
                  <tr key={conflict.id} className={!conflict.isActive ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{conflict.name}</div>
                      {!conflict.isActive && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{conflict.affectedArea}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(conflict.severity)}`}>
                        {translateSeverity(conflict.severity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(conflict.status)}`}>
                        {translateStatus(conflict.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(conflict.reportDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => handleEditConflict(conflict)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteConflict(conflict.id)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}