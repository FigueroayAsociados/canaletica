// src/components/settings/IntegrationsManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ExternalIntegration,
  getExternalIntegrations,
  createExternalIntegration,
  updateExternalIntegration,
  deleteExternalIntegration
} from '@/lib/services/configService';

// Tipos de integraciones disponibles
const integrationTypes = [
  { 
    value: 'email', 
    label: 'Servidor de Correo',
    description: 'Configuración del servidor SMTP para envío de correos electrónicos',
    fields: [
      { id: 'host', label: 'Servidor SMTP', type: 'text', required: true },
      { id: 'port', label: 'Puerto', type: 'number', required: true },
      { id: 'user', label: 'Usuario', type: 'text', required: true },
      { id: 'password', label: 'Contraseña', type: 'password', required: true },
      { id: 'secure', label: 'Conexión segura (SSL/TLS)', type: 'checkbox', required: false },
      { id: 'from', label: 'Dirección de envío', type: 'email', required: true },
      { id: 'fromName', label: 'Nombre de remitente', type: 'text', required: false }
    ]
  },
  { 
    value: 'slack', 
    label: 'Slack',
    description: 'Integración con Slack para recibir notificaciones',
    fields: [
      { id: 'webhookUrl', label: 'URL del Webhook', type: 'text', required: true },
      { id: 'channel', label: 'Canal', type: 'text', required: false },
      { id: 'username', label: 'Nombre de usuario', type: 'text', required: false },
      { id: 'icon', label: 'Ícono', type: 'text', required: false }
    ]
  },
  { 
    value: 'teams', 
    label: 'Microsoft Teams',
    description: 'Integración con Microsoft Teams para recibir notificaciones',
    fields: [
      { id: 'webhookUrl', label: 'URL del Webhook', type: 'text', required: true }
    ]
  },
  { 
    value: 'webhook', 
    label: 'Webhook Personalizado',
    description: 'Envía datos a un webhook personalizado cuando ocurren eventos',
    fields: [
      { id: 'url', label: 'URL del Webhook', type: 'text', required: true },
      { id: 'method', label: 'Método HTTP', type: 'select', required: true, options: ['POST', 'PUT'] },
      { id: 'headers', label: 'Cabeceras HTTP (JSON)', type: 'textarea', required: false },
      { id: 'events', label: 'Eventos a notificar', type: 'multiselect', required: true, options: [
        { value: 'report_created', label: 'Denuncia creada' },
        { value: 'report_assigned', label: 'Denuncia asignada' },
        { value: 'report_status_changed', label: 'Estado de denuncia cambiado' },
        { value: 'recommendation_created', label: 'Recomendación creada' },
        { value: 'recommendation_completed', label: 'Recomendación completada' }
      ]}
    ]
  }
];

interface IntegrationFormData {
  name: string;
  type: string;
  config: Record<string, any>;
  isActive: boolean;
}

export default function IntegrationsManager({ companyId = 'default' }: { companyId?: string }) {
  // Estados para las integraciones
  const [integrations, setIntegrations] = useState<ExternalIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edición
  const [isAddingIntegration, setIsAddingIntegration] = useState(false);
  const [isEditingIntegration, setIsEditingIntegration] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  // Formulario
  const [integrationForm, setIntegrationForm] = useState<IntegrationFormData>({
    name: '',
    type: 'email',
    config: {},
    isActive: true
  });

  // Efecto para inicializar el formulario cuando cambia el tipo de integración
  useEffect(() => {
    const selectedType = integrationTypes.find(type => type.value === integrationForm.type);
    if (selectedType) {
      const initialConfig: Record<string, any> = {};
      selectedType.fields.forEach(field => {
        if (field.type === 'checkbox') {
          initialConfig[field.id] = integrationForm.config[field.id] || false;
        } else if (field.type === 'multiselect') {
          initialConfig[field.id] = integrationForm.config[field.id] || [];
        } else {
          initialConfig[field.id] = integrationForm.config[field.id] || '';
        }
      });
      
      setIntegrationForm(prev => ({
        ...prev,
        config: initialConfig
      }));
    }
  }, [integrationForm.type]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadIntegrations();
  }, []);

  // Cargar integraciones
  const loadIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getExternalIntegrations(companyId);
      
      if (result.success && result.integrations) {
        setIntegrations(result.integrations);
      } else {
        setError(result.error || 'Error al cargar las integraciones externas');
      }
    } catch (err) {
      console.error('Error al cargar integraciones:', err);
      setError('Ha ocurrido un error al cargar las integraciones externas');
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

  // Funciones para manejo de integraciones
  const handleAddIntegration = async () => {
    try {
      setError(null);
      
      if (!validateIntegrationForm()) {
        return;
      }
      
      const result = await createExternalIntegration(companyId, {
        name: integrationForm.name,
        type: integrationForm.type,
        config: integrationForm.config,
        isActive: integrationForm.isActive
      });
      
      if (result.success) {
        showSuccessMessage('Integración creada correctamente');
        await loadIntegrations();
        setIsAddingIntegration(false);
        resetIntegrationForm();
      } else {
        setError(result.error || 'Error al crear la integración');
      }
    } catch (err) {
      console.error('Error al añadir integración:', err);
      setError('Ha ocurrido un error al crear la integración');
    }
  };

  const handleUpdateIntegration = async (integrationId: string) => {
    try {
      setError(null);
      
      if (!validateIntegrationForm()) {
        return;
      }
      
      const result = await updateExternalIntegration(companyId, integrationId, {
        name: integrationForm.name,
        type: integrationForm.type,
        config: integrationForm.config,
        isActive: integrationForm.isActive
      });
      
      if (result.success) {
        showSuccessMessage('Integración actualizada correctamente');
        await loadIntegrations();
        setIsEditingIntegration(null);
      } else {
        setError(result.error || 'Error al actualizar la integración');
      }
    } catch (err) {
      console.error('Error al actualizar integración:', err);
      setError('Ha ocurrido un error al actualizar la integración');
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta integración? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setError(null);
      
      const result = await deleteExternalIntegration(companyId, integrationId);
      
      if (result.success) {
        showSuccessMessage('Integración eliminada correctamente');
        await loadIntegrations();
      } else {
        setError(result.error || 'Error al eliminar la integración');
      }
    } catch (err) {
      console.error('Error al eliminar integración:', err);
      setError('Ha ocurrido un error al eliminar la integración');
    }
  };

  const handleEditIntegration = (integration: ExternalIntegration) => {
    setIntegrationForm({
      name: integration.name,
      type: integration.type,
      config: { ...integration.config },
      isActive: integration.isActive
    });
    
    setIsEditingIntegration(integration.id);
    setIsAddingIntegration(false);
  };

  const validateIntegrationForm = () => {
    if (!integrationForm.name.trim()) {
      setError('El nombre de la integración es obligatorio');
      return false;
    }
    
    const selectedType = integrationTypes.find(type => type.value === integrationForm.type);
    if (!selectedType) {
      setError('Tipo de integración no válido');
      return false;
    }
    
    // Validar campos requeridos según el tipo de integración
    for (const field of selectedType.fields) {
      if (field.required) {
        const value = integrationForm.config[field.id];
        if (field.type === 'multiselect') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            setError(`El campo "${field.label}" es obligatorio`);
            return false;
          }
        } else if (!value && value !== false) {
          setError(`El campo "${field.label}" es obligatorio`);
          return false;
        }
      }
    }
    
    return true;
  };

  const resetIntegrationForm = () => {
    setIntegrationForm({
      name: '',
      type: 'email',
      config: {},
      isActive: true
    });
  };

  const handleConfigChange = (fieldId: string, value: any) => {
    setIntegrationForm({
      ...integrationForm,
      config: {
        ...integrationForm.config,
        [fieldId]: value
      }
    });
  };

  const handleMultiselectToggle = (fieldId: string, optionValue: string) => {
    const currentValues = Array.isArray(integrationForm.config[fieldId]) 
      ? integrationForm.config[fieldId] 
      : [];
    
    let newValues;
    if (currentValues.includes(optionValue)) {
      newValues = currentValues.filter(v => v !== optionValue);
    } else {
      newValues = [...currentValues, optionValue];
    }
    
    handleConfigChange(fieldId, newValues);
  };

  // Obtener el nombre del tipo de integración para mostrar
  const getIntegrationTypeName = (type: string) => {
    const integrationType = integrationTypes.find(t => t.value === type);
    return integrationType ? integrationType.label : type;
  };

  // Filtrar las integraciones según el tipo seleccionado
  const filteredIntegrations = filterType 
    ? integrations.filter(integration => integration.type === filterType)
    : integrations;

  // Renderizar campos de configuración según el tipo de integración
  const renderConfigFields = () => {
    const selectedType = integrationTypes.find(type => type.value === integrationForm.type);
    if (!selectedType) return null;
    
    return (
      <div className="space-y-4 mt-4">
        {selectedType.fields.map(field => (
          <div key={field.id}>
            {field.type === 'checkbox' ? (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`field-${field.id}`}
                  checked={!!integrationForm.config[field.id]}
                  onChange={(e) => handleConfigChange(field.id, e.target.checked)}
                  className="h-4 w-4 text-primary border-gray-300 rounded"
                />
                <Label htmlFor={`field-${field.id}`} className="ml-2">
                  {field.label}
                </Label>
              </div>
            ) : field.type === 'textarea' ? (
              <div>
                <Label htmlFor={`field-${field.id}`}>
                  {field.label} {field.required && '*'}
                </Label>
                <Textarea
                  id={`field-${field.id}`}
                  value={integrationForm.config[field.id] || ''}
                  onChange={(e) => handleConfigChange(field.id, e.target.value)}
                  className="mt-1"
                />
              </div>
            ) : field.type === 'select' && field.options ? (
              <div>
                <Label htmlFor={`field-${field.id}`}>
                  {field.label} {field.required && '*'}
                </Label>
                <Select
                  id={`field-${field.id}`}
                  value={integrationForm.config[field.id] || ''}
                  onChange={(e) => handleConfigChange(field.id, e.target.value)}
                  className="mt-1"
                >
                  {field.options.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Select>
              </div>
            ) : field.type === 'multiselect' && field.options ? (
              <div>
                <Label>
                  {field.label} {field.required && '*'}
                </Label>
                <div className="mt-1 border rounded-md p-3 space-y-2">
                  {field.options.map((option: any) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`option-${field.id}-${option.value}`}
                        checked={
                          Array.isArray(integrationForm.config[field.id]) &&
                          integrationForm.config[field.id].includes(option.value)
                        }
                        onChange={() => handleMultiselectToggle(field.id, option.value)}
                        className="h-4 w-4 text-primary border-gray-300 rounded"
                      />
                      <label htmlFor={`option-${field.id}-${option.value}`} className="ml-2">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor={`field-${field.id}`}>
                  {field.label} {field.required && '*'}
                </Label>
                <Input
                  id={`field-${field.id}`}
                  type={field.type}
                  value={integrationForm.config[field.id] || ''}
                  onChange={(e) => handleConfigChange(field.id, e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
          <p className="text-gray-600">Cargando integraciones...</p>
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
      
      {/* Cabecera, filtro y botón de añadir */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Gestión de Integraciones Externas</h2>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="filterType" className="mr-2">Filtrar por tipo:</Label>
          <Select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-48"
          >
            <option value="">Todos los tipos</option>
            {integrationTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
          
          <Button 
            onClick={() => {
              resetIntegrationForm();
              setIsAddingIntegration(true);
              setIsEditingIntegration(null);
            }}
          >
            Añadir Integración
          </Button>
        </div>
      </div>
      
      {/* Formulario para añadir integración */}
      {isAddingIntegration && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Añadir Nueva Integración</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="integrationName">Nombre de la Integración*</Label>
              <Input
                id="integrationName"
                value={integrationForm.name}
                onChange={(e) => setIntegrationForm({ ...integrationForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="integrationType">Tipo de Integración*</Label>
              <Select
                id="integrationType"
                value={integrationForm.type}
                onChange={(e) => setIntegrationForm({ 
                  ...integrationForm, 
                  type: e.target.value,
                  config: {} // Resetear la configuración al cambiar de tipo
                })}
                className="mt-1"
              >
                {integrationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {integrationTypes.find(type => type.value === integrationForm.type)?.description}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Configuración</h4>
              {renderConfigFields()}
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="integrationActive"
                checked={integrationForm.isActive}
                onChange={(e) => setIntegrationForm({ ...integrationForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="integrationActive" className="ml-2">
                Integración Activa
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingIntegration(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddIntegration}>
                Guardar Integración
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulario para editar integración */}
      {isEditingIntegration && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Editar Integración</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editIntegrationName">Nombre de la Integración*</Label>
              <Input
                id="editIntegrationName"
                value={integrationForm.name}
                onChange={(e) => setIntegrationForm({ ...integrationForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="editIntegrationType">Tipo de Integración*</Label>
              <Select
                id="editIntegrationType"
                value={integrationForm.type}
                onChange={(e) => setIntegrationForm({ 
                  ...integrationForm, 
                  type: e.target.value,
                  config: {} // Resetear la configuración al cambiar de tipo
                })}
                className="mt-1"
              >
                {integrationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {integrationTypes.find(type => type.value === integrationForm.type)?.description}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Configuración</h4>
              {renderConfigFields()}
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editIntegrationActive"
                checked={integrationForm.isActive}
                onChange={(e) => setIntegrationForm({ ...integrationForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="editIntegrationActive" className="ml-2">
                Integración Activa
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingIntegration(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleUpdateIntegration(isEditingIntegration)}>
                Actualizar Integración
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de integraciones */}
      <div className="space-y-4">
        {filteredIntegrations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {filterType ? 'No hay integraciones para este tipo' : 'No hay integraciones configuradas'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIntegrations.map(integration => (
              <div key={integration.id} className="border rounded-md overflow-hidden">
                <div className="bg-gray-100 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{integration.name}</h3>
                      <p className="text-sm text-gray-500">
                        {getIntegrationTypeName(integration.type)}
                      </p>
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        integration.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {integration.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <h4 className="text-sm font-medium mb-2">Configuración</h4>
                  <div className="text-sm space-y-1">
                    {Object.entries(integration.config)
                      .filter(([key, value]) => {
                        // Filtrar contraseñas y valores sensibles
                        return !key.includes('password') && 
                              !key.includes('secret') && 
                              !key.includes('key');
                      })
                      .map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium min-w-[120px]">{key}:</span>
                          <span className="truncate">
                            {Array.isArray(value) 
                              ? value.join(', ') 
                              : typeof value === 'boolean'
                                ? value ? 'Sí' : 'No'
                                : String(value) || '-'
                            }
                          </span>
                        </div>
                      ))}
                    {Object.keys(integration.config)
                      .filter(key => 
                        key.includes('password') || 
                        key.includes('secret') || 
                        key.includes('key')
                      )
                      .map(key => (
                        <div key={key} className="flex">
                          <span className="font-medium min-w-[120px]">{key}:</span>
                          <span>************</span>
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditIntegration(integration)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteIntegration(integration.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}