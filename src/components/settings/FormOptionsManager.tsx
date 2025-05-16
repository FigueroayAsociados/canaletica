// src/components/settings/FormOptionsManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { FormOptionValue, getFormOptions, createFormOption, updateFormOption, deleteFormOption } from '@/lib/services/configService';

interface FormOptionFormData {
  name: string;
  value: string;
  description: string;
  isActive: boolean;
}

const optionTypes = [
  { value: 'relationships', label: 'Relaciones con la Empresa' },
  { value: 'frequencies', label: 'Frecuencias de Conducta' },
  { value: 'impacts', label: 'Tipos de Impacto' },
  { value: 'channels', label: 'Canales de Denuncia' },
];

export default function FormOptionsManager({ companyId }: { companyId: string }) {
  // Estados para las opciones
  const [formOptions, setFormOptions] = useState<FormOptionValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edición
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isEditingOption, setIsEditingOption] = useState<string | null>(null);
  const [currentOptionType, setCurrentOptionType] = useState('relationships');

  // Formulario
  const [optionForm, setOptionForm] = useState<FormOptionFormData>({
    name: '',
    value: '',
    description: '',
    isActive: true
  });

  // Cargar datos al montar el componente o cambiar el tipo de opción
  useEffect(() => {
    loadFormOptions(currentOptionType);
  }, [currentOptionType, companyId]);

  // Cargar opciones de formulario
  const loadFormOptions = async (optionType: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getFormOptions(companyId, optionType);
      
      if (result.success && result.options) {
        setFormOptions(result.options);
      } else {
        setError(result.error || `Error al cargar las opciones de ${optionType}`);
      }
    } catch (err) {
      console.error(`Error al cargar opciones de ${optionType}:`, err);
      setError(`Ha ocurrido un error al cargar las opciones de ${optionType}`);
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

  // Funciones para manejo de opciones
  const handleAddOption = async () => {
    try {
      setError(null);
      
      if (!validateOptionForm()) {
        return;
      }
      
      // Calcular el siguiente orden
      const nextOrder = formOptions.length > 0 
        ? Math.max(...formOptions.map(o => o.order)) + 1 
        : 0;
      
      const result = await createFormOption(companyId, currentOptionType, {
        name: optionForm.name,
        value: optionForm.value || optionForm.name.toLowerCase().replace(/\s+/g, '_'),
        description: optionForm.description,
        isActive: optionForm.isActive,
        order: nextOrder
      });
      
      if (result.success) {
        showSuccessMessage('Opción creada correctamente');
        await loadFormOptions(currentOptionType);
        setIsAddingOption(false);
        resetOptionForm();
      } else {
        setError(result.error || 'Error al crear la opción');
      }
    } catch (err) {
      console.error('Error al añadir opción:', err);
      setError('Ha ocurrido un error al crear la opción');
    }
  };

  const handleUpdateOption = async (optionId: string) => {
    try {
      setError(null);
      
      if (!validateOptionForm()) {
        return;
      }
      
      const result = await updateFormOption(companyId, currentOptionType, optionId, {
        name: optionForm.name,
        value: optionForm.value || optionForm.name.toLowerCase().replace(/\s+/g, '_'),
        description: optionForm.description,
        isActive: optionForm.isActive
      });
      
      if (result.success) {
        showSuccessMessage('Opción actualizada correctamente');
        await loadFormOptions(currentOptionType);
        setIsEditingOption(null);
      } else {
        setError(result.error || 'Error al actualizar la opción');
      }
    } catch (err) {
      console.error('Error al actualizar opción:', err);
      setError('Ha ocurrido un error al actualizar la opción');
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta opción? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setError(null);
      
      const result = await deleteFormOption(companyId, currentOptionType, optionId);
      
      if (result.success) {
        showSuccessMessage('Opción eliminada correctamente');
        await loadFormOptions(currentOptionType);
      } else {
        setError(result.error || 'Error al eliminar la opción');
      }
    } catch (err) {
      console.error('Error al eliminar opción:', err);
      setError('Ha ocurrido un error al eliminar la opción');
    }
  };

  const handleEditOption = (option: FormOptionValue) => {
    setOptionForm({
      name: option.name,
      value: option.value,
      description: option.description || '',
      isActive: option.isActive
    });
    
    setIsEditingOption(option.id);
    setIsAddingOption(false);
  };

  const validateOptionForm = () => {
    if (!optionForm.name.trim()) {
      setError('El nombre de la opción es obligatorio');
      return false;
    }
    
    return true;
  };

  const resetOptionForm = () => {
    setOptionForm({
      name: '',
      value: '',
      description: '',
      isActive: true
    });
  };

  // Obtener el nombre del tipo de opción actual para mostrar
  const getCurrentOptionTypeName = () => {
    const optionType = optionTypes.find(t => t.value === currentOptionType);
    return optionType ? optionType.label : currentOptionType;
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
          <p className="text-gray-600">Cargando opciones de formulario...</p>
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
      
      {/* Cabecera, selector de tipo y botón de añadir */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Gestión de Opciones de Formularios</h2>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="optionType" className="mr-2">Tipo de opciones:</Label>
          <Select
            id="optionType"
            value={currentOptionType}
            onChange={(e) => setCurrentOptionType(e.target.value)}
            className="w-64"
          >
            {optionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
          
          <Button 
            onClick={() => {
              resetOptionForm();
              setIsAddingOption(true);
              setIsEditingOption(null);
            }}
          >
            Añadir Opción
          </Button>
        </div>
      </div>
      
      {/* Formulario para añadir opción */}
      {isAddingOption && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Añadir Nueva Opción para {getCurrentOptionTypeName()}</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="optionName">Nombre de la Opción*</Label>
              <Input
                id="optionName"
                value={optionForm.name}
                onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="optionValue">Valor (opcional)</Label>
              <Input
                id="optionValue"
                value={optionForm.value}
                onChange={(e) => setOptionForm({ ...optionForm, value: e.target.value })}
                className="mt-1"
                placeholder="Se generará automáticamente si lo deja vacío"
              />
              <p className="text-xs text-gray-500 mt-1">
                Identificador técnico. Se generará automáticamente a partir del nombre si lo deja vacío.
              </p>
            </div>
            
            <div>
              <Label htmlFor="optionDescription">Descripción (opcional)</Label>
              <Input
                id="optionDescription"
                value={optionForm.description}
                onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="optionActive"
                checked={optionForm.isActive}
                onChange={(e) => setOptionForm({ ...optionForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="optionActive" className="ml-2">
                Opción Activa
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingOption(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddOption}>
                Guardar Opción
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulario para editar opción */}
      {isEditingOption && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Editar Opción para {getCurrentOptionTypeName()}</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editOptionName">Nombre de la Opción*</Label>
              <Input
                id="editOptionName"
                value={optionForm.name}
                onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="editOptionValue">Valor</Label>
              <Input
                id="editOptionValue"
                value={optionForm.value}
                onChange={(e) => setOptionForm({ ...optionForm, value: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recomendamos no cambiar este valor si ya existen denuncias que lo utilizan.
              </p>
            </div>
            
            <div>
              <Label htmlFor="editOptionDescription">Descripción (opcional)</Label>
              <Input
                id="editOptionDescription"
                value={optionForm.description}
                onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editOptionActive"
                checked={optionForm.isActive}
                onChange={(e) => setOptionForm({ ...optionForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="editOptionActive" className="ml-2">
                Opción Activa
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingOption(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleUpdateOption(isEditingOption)}>
                Actualizar Opción
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de opciones */}
      <div className="space-y-4">
        {formOptions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No hay opciones configuradas para {getCurrentOptionTypeName()}
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
                    Valor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formOptions.map(option => (
                  <tr key={option.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{option.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{option.value}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-xs">{option.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        option.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {option.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => handleEditOption(option)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteOption(option.id)}
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