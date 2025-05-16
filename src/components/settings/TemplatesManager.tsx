// src/components/settings/TemplatesManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageTemplate, 
  getMessageTemplates, 
  createMessageTemplate, 
  updateMessageTemplate, 
  deleteMessageTemplate 
} from '@/lib/services/configService';

// Función para mostrar una plantilla de forma segura (sin evaluar variables)
const renderTemplate = (template: string, data: Record<string, string> = {}) => {
  try {
    // Reemplazar variables entre llaves si se proporcionaron datos
    let rendered = template;
    if (Object.keys(data).length > 0) {
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, value);
      });
    }
    
    // Escapar las variables que no fueron reemplazadas
    rendered = rendered.replace(/{{([^}]+)}}/g, (match) => {
      return `<span class="text-gray-500">${match}</span>`;
    });
    
    return rendered;
  } catch (error) {
    console.error('Error al renderizar plantilla:', error);
    return template;
  }
};

// Editor de texto simple
// Componente para mostrar una vista previa de la plantilla
const TemplatePreview = ({ content }: { content: string }) => {
  const exampleData = {
    codigo: 'ABC123',
    categoria: 'Seguridad',
    fecha: '01/01/2025',
    accion: 'Actualizar política de seguridad',
    dias: '15'
  };

  // Renderizar la plantilla con datos de ejemplo
  const previewHtml = renderTemplate(content, exampleData);

  return (
    <div className="mt-4 border rounded-md p-4 bg-white">
      <h4 className="text-sm font-medium mb-2 text-gray-500">Vista Previa:</h4>
      <div 
        className="text-sm" 
        dangerouslySetInnerHTML={{ __html: previewHtml }} 
      />
    </div>
  );
};

const SimpleTextEditor = ({ 
  value, 
  onChange,
  showPreview = true
}: { 
  value: string; 
  onChange: (value: string) => void;
  showPreview?: boolean;
}) => {
  // Función segura para insertar variables de plantilla
  const insertVariable = (variable: string) => {
    onChange(value + variable);
  };

  return (
    <div className="border rounded-md">
      <div className="bg-gray-100 p-2 border-b flex items-center space-x-2 flex-wrap">
        <button
          type="button"
          className="p-1 hover:bg-gray-200 rounded"
          onClick={() => onChange(value + '<b></b>')}
          title="Negrita"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          </svg>
        </button>
        <button
          type="button"
          className="p-1 hover:bg-gray-200 rounded"
          onClick={() => onChange(value + '<i></i>')}
          title="Cursiva"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
          </svg>
        </button>
        <button
          type="button"
          className="p-1 hover:bg-gray-200 rounded"
          onClick={() => onChange(value + '<a href=""></a>')}
          title="Enlace"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
        <button
          type="button"
          className="p-1 hover:bg-gray-200 rounded"
          onClick={() => onChange(value + '<ul>\n  <li></li>\n</ul>')}
          title="Lista"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <div className="flex flex-wrap mt-2 w-full">
          <button
            type="button"
            className="p-1 m-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
            onClick={() => insertVariable("{{codigo}}")}
            title="Insertar código de denuncia"
          >
            Código
          </button>
          <button
            type="button"
            className="p-1 m-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
            onClick={() => insertVariable("{{categoria}}")}
            title="Insertar categoría de denuncia"
          >
            Categoría
          </button>
          <button
            type="button"
            className="p-1 m-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
            onClick={() => insertVariable("{{fecha}}")}
            title="Insertar fecha"
          >
            Fecha
          </button>
          <button
            type="button"
            className="p-1 m-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
            onClick={() => insertVariable("{{accion}}")}
            title="Insertar acción de recomendación"
          >
            Acción
          </button>
          <button
            type="button"
            className="p-1 m-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
            onClick={() => insertVariable("{{dias}}")}
            title="Insertar días restantes"
          >
            Días
          </button>
        </div>
      </div>
      <Textarea 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="border-0 focus:ring-0 rounded-t-none" 
        rows={10}
      />
      <div className="bg-gray-50 p-2 border-t text-xs text-gray-500">
        Puedes usar estas variables que serán reemplazadas automáticamente:
        <div className="mt-1 grid grid-cols-2 gap-2">
          <div><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{"{{codigo}}"}</code> - Código de denuncia</div>
          <div><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{"{{categoria}}"}</code> - Categoría</div>
          <div><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{"{{fecha}}"}</code> - Fecha</div>
          <div><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{"{{accion}}"}</code> - Acción recomendada</div>
          <div><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{"{{dias}}"}</code> - Días restantes</div>
        </div>
      </div>

      {/* Mostrar vista previa si está habilitada */}
      {showPreview && value && (
        <TemplatePreview content={value} />
      )}
    </div>
  );
};

interface TemplateFormData {
  name: string;
  subject: string;
  content: string;
  type: string;
  isActive: boolean;
}

const templateTypes = [
  { value: 'report_created', label: 'Denuncia Creada' },
  { value: 'report_assigned', label: 'Denuncia Asignada' },
  { value: 'status_change', label: 'Cambio de Estado' },
  { value: 'recommendation_due', label: 'Recordatorio de Recomendación' },
  { value: 'report_closed', label: 'Denuncia Cerrada' },
  { value: 'new_message', label: 'Nuevo Mensaje' },
];

export default function TemplatesManager({ companyId }: { companyId: string }) {
  // Estados para las plantillas
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edición
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  // Formulario
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    name: '',
    subject: '',
    content: '',
    type: 'report_created',
    isActive: true
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadTemplates();
  }, []);

  // Cargar plantillas
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getMessageTemplates(companyId);
      
      if (result.success && result.templates) {
        setTemplates(result.templates);
      } else {
        setError(result.error || 'Error al cargar las plantillas de mensajes');
      }
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
      setError('Ha ocurrido un error al cargar las plantillas de mensajes');
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

  // Funciones para manejo de plantillas
  const handleAddTemplate = async () => {
    try {
      setError(null);
      
      if (!validateTemplateForm()) {
        return;
      }
      
      const result = await createMessageTemplate(companyId, {
        name: templateForm.name,
        subject: templateForm.subject,
        content: templateForm.content,
        type: templateForm.type,
        isActive: templateForm.isActive
      });
      
      if (result.success) {
        showSuccessMessage('Plantilla creada correctamente');
        await loadTemplates();
        setIsAddingTemplate(false);
        resetTemplateForm();
      } else {
        setError(result.error || 'Error al crear la plantilla');
      }
    } catch (err) {
      console.error('Error al añadir plantilla:', err);
      setError('Ha ocurrido un error al crear la plantilla');
    }
  };

  const handleUpdateTemplate = async (templateId: string) => {
    try {
      setError(null);
      
      if (!validateTemplateForm()) {
        return;
      }
      
      const result = await updateMessageTemplate(companyId, templateId, {
        name: templateForm.name,
        subject: templateForm.subject,
        content: templateForm.content,
        type: templateForm.type,
        isActive: templateForm.isActive
      });
      
      if (result.success) {
        showSuccessMessage('Plantilla actualizada correctamente');
        await loadTemplates();
        setIsEditingTemplate(null);
      } else {
        setError(result.error || 'Error al actualizar la plantilla');
      }
    } catch (err) {
      console.error('Error al actualizar plantilla:', err);
      setError('Ha ocurrido un error al actualizar la plantilla');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta plantilla? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setError(null);
      
      const result = await deleteMessageTemplate(companyId, templateId);
      
      if (result.success) {
        showSuccessMessage('Plantilla eliminada correctamente');
        await loadTemplates();
      } else {
        setError(result.error || 'Error al eliminar la plantilla');
      }
    } catch (err) {
      console.error('Error al eliminar plantilla:', err);
      setError('Ha ocurrido un error al eliminar la plantilla');
    }
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type,
      isActive: template.isActive
    });
    
    setIsEditingTemplate(template.id);
    setIsAddingTemplate(false);
  };

  const validateTemplateForm = () => {
    if (!templateForm.name.trim()) {
      setError('El nombre de la plantilla es obligatorio');
      return false;
    }
    
    if (!templateForm.subject.trim()) {
      setError('El asunto del mensaje es obligatorio');
      return false;
    }
    
    if (!templateForm.content.trim()) {
      setError('El contenido del mensaje es obligatorio');
      return false;
    }
    
    return true;
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      content: '',
      type: 'report_created',
      isActive: true
    });
  };

  // Obtener el nombre del tipo de plantilla para mostrar
  const getTemplateTypeName = (type: string) => {
    const templateType = templateTypes.find(t => t.value === type);
    return templateType ? templateType.label : type;
  };

  // Filtrar las plantillas según el tipo seleccionado
  const filteredTemplates = filterType 
    ? templates.filter(template => template.type === filterType)
    : templates;

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
          <p className="text-gray-600">Cargando plantillas...</p>
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
        <h2 className="text-xl font-semibold">Gestión de Plantillas de Mensajes</h2>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="filterType" className="mr-2">Filtrar por tipo:</Label>
          <Select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-48"
          >
            <option value="">Todos los tipos</option>
            {templateTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
          
          <Button 
            onClick={() => {
              resetTemplateForm();
              setIsAddingTemplate(true);
              setIsEditingTemplate(null);
            }}
          >
            Añadir Plantilla
          </Button>
        </div>
      </div>
      
      {/* Formulario para añadir plantilla */}
      {isAddingTemplate && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Añadir Nueva Plantilla</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Nombre de la Plantilla*</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="templateType">Tipo de Mensaje*</Label>
              <Select
                id="templateType"
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                className="mt-1"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label htmlFor="templateSubject">Asunto del Mensaje*</Label>
              <Input
                id="templateSubject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="templateContent">Contenido del Mensaje*</Label>
              <SimpleTextEditor
                value={templateForm.content}
                onChange={(content) => setTemplateForm({ ...templateForm, content })}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="templateActive"
                checked={templateForm.isActive}
                onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="templateActive" className="ml-2">
                Plantilla Activa
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingTemplate(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTemplate}>
                Guardar Plantilla
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulario para editar plantilla */}
      {isEditingTemplate && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Editar Plantilla</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTemplateName">Nombre de la Plantilla*</Label>
              <Input
                id="editTemplateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="editTemplateType">Tipo de Mensaje*</Label>
              <Select
                id="editTemplateType"
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                className="mt-1"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label htmlFor="editTemplateSubject">Asunto del Mensaje*</Label>
              <Input
                id="editTemplateSubject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="editTemplateContent">Contenido del Mensaje*</Label>
              <SimpleTextEditor
                value={templateForm.content}
                onChange={(content) => setTemplateForm({ ...templateForm, content })}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editTemplateActive"
                checked={templateForm.isActive}
                onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="editTemplateActive" className="ml-2">
                Plantilla Activa
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingTemplate(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleUpdateTemplate(isEditingTemplate)}>
                Actualizar Plantilla
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de plantillas */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {filterType ? 'No hay plantillas para este tipo de mensaje' : 'No hay plantillas configuradas'}
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
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asunto
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
                {filteredTemplates.map(template => (
                  <tr key={template.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{getTemplateTypeName(template.type)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-xs">{template.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        template.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => handleEditTemplate(template)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTemplate(template.id)}
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