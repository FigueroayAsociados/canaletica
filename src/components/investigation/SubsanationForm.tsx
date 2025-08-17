'use client';

// src/components/investigation/SubsanationForm.tsx
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addBusinessDays, getBusinessDaysCount } from '@/lib/utils/dateUtils';
import { registerSubsanationRequest, uploadSubsanationDocument, markSubsanationItem } from '@/lib/services/reportService';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

interface SubsanationFormProps {
  report: any;
  companyId: string;
  onUpdate: () => void;
  readOnly?: boolean;
}

export const SubsanationForm: React.FC<SubsanationFormProps> = ({
  report,
  companyId,
  onUpdate,
  readOnly = false,
}) => {
  const { uid } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  
  // Estados para el formulario
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemDocType, setNewItemDocType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [documentDescription, setDocumentDescription] = useState('');
  
  // Estados para subsanaciones
  const subsanationData = report?.karinProcess || {};
  const [items, setItems] = useState<any[]>(subsanationData.subsanationItems || []);
  const [documents, setDocuments] = useState<any[]>(subsanationData.subsanationDocuments || []);
  const [comments, setComments] = useState(subsanationData.subsanationComments || '');
  
  // Calcular días restantes para subsanar
  useEffect(() => {
    if (subsanationData.subsanationRequested && subsanationData.subsanationDeadline) {
      const now = new Date();
      const deadline = new Date(subsanationData.subsanationDeadline);
      
      // Calcular días hábiles restantes
      const remaining = getBusinessDaysCount(now, deadline);
      setDaysRemaining(remaining);
    } else if (subsanationData.subsanationRequested) {
      // Si no hay deadline calculado, calcularlo (5 días hábiles desde solicitud)
      const requestDate = new Date(subsanationData.subsanationRequested);
      const deadline = addBusinessDays(requestDate, 5);
      
      const now = new Date();
      const remaining = getBusinessDaysCount(now, deadline);
      setDaysRemaining(remaining);
    }
  }, [subsanationData]);
  
  // Añadir un nuevo ítem a subsanar
  const handleAddItem = async () => {
    if (!newItemDescription) {
      setError('Debe ingresar una descripción del ítem a subsanar');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Crear nuevo ítem
      const newItem = {
        id: uuidv4(),
        description: newItemDescription,
        status: 'pending',
        requiredDocumentType: newItemDocType || undefined,
      };
      
      // Actualizar estado local
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      
      // Calcular deadline (5 días hábiles desde ahora)
      const deadline = addBusinessDays(new Date(), 5);
      
      // Guardar en Firestore
      await registerSubsanationRequest(
        companyId,
        report.id,
        updatedItems,
        deadline,
        comments
      );
      
      // Limpiar formulario
      setNewItemDescription('');
      setNewItemDocType('');
      setSuccess('Ítem añadido correctamente');
      
      // Notificar al componente padre
      onUpdate();
    } catch (error) {
      console.error('Error al añadir ítem:', error);
      setError('Error al añadir el ítem a subsanar');
    } finally {
      setLoading(false);
    }
  };
  
  // Subir un documento para subsanación
  const handleUploadDocument = async () => {
    if (!selectedFile) {
      setError('Debe seleccionar un archivo');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Subir documento a Storage
      const result = await uploadSubsanationDocument(
        companyId,
        report.id,
        selectedFile,
        selectedItemId || undefined,
        documentDescription
      );
      
      if (result.success) {
        // Actualizar estado local
        const newDocument = {
          id: result.documentId,
          fileId: result.fileId,
          fileName: selectedFile.name,
          uploadDate: new Date().toISOString(),
          itemId: selectedItemId || undefined,
          description: documentDescription,
        };
        
        const updatedDocuments = [...documents, newDocument];
        setDocuments(updatedDocuments);
        
        // Limpiar formulario
        setSelectedFile(null);
        setSelectedItemId(null);
        setDocumentDescription('');
        setSuccess('Documento subido correctamente');
        
        // Notificar al componente padre
        onUpdate();
      } else {
        setError(result.error || 'Error al subir el documento');
      }
    } catch (error) {
      console.error('Error al subir documento:', error);
      setError('Error al subir el documento de subsanación');
    } finally {
      setLoading(false);
    }
  };
  
  // Marcar un ítem como completado
  const handleMarkItemCompleted = async (itemId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Actualizar estado local
      const updatedItems = items.map(item => 
        item.id === itemId ? { ...item, status: 'completed' } : item
      );
      setItems(updatedItems);
      
      // Actualizar en Firestore
      await markSubsanationItem(
        companyId,
        report.id,
        itemId,
        'completed'
      );
      
      setSuccess('Ítem marcado como completado');
      
      // Notificar al componente padre
      onUpdate();
    } catch (error) {
      console.error('Error al marcar ítem:', error);
      setError('Error al actualizar el estado del ítem');
    } finally {
      setLoading(false);
    }
  };
  
  // Guardar los comentarios
  const handleSaveComments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calcular deadline (5 días hábiles desde ahora)
      const deadline = addBusinessDays(new Date(), 5);
      
      // Guardar en Firestore
      await registerSubsanationRequest(
        companyId,
        report.id,
        items,
        deadline,
        comments
      );
      
      setSuccess('Comentarios guardados correctamente');
      
      // Notificar al componente padre
      onUpdate();
    } catch (error) {
      console.error('Error al guardar comentarios:', error);
      setError('Error al guardar los comentarios');
    } finally {
      setLoading(false);
    }
  };
  
  // Indicadores de estado del proceso
  const allItemsCompleted = items.length > 0 && items.every(item => item.status === 'completed');
  const isSubsanationLate = daysRemaining !== null && daysRemaining <= 0;
  const pendingItems = items.filter(item => item.status === 'pending');
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Subsanación de Denuncia</span>
          {daysRemaining !== null && (
            <span 
              className={`text-sm px-2 py-1 rounded-full ${
                daysRemaining <= 1 
                  ? 'bg-red-100 text-red-800' 
                  : daysRemaining <= 3 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {isSubsanationLate 
                ? 'Plazo vencido' 
                : `${daysRemaining} día(s) restante(s)`}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isSubsanationLate && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              El plazo para subsanar la denuncia ha vencido. La subsanación de información debe realizarse dentro de 5 días hábiles desde la solicitud.
            </AlertDescription>
          </Alert>
        )}
        
        {subsanationData.subsanationReceived ? (
          <Alert variant="success" className="mb-4">
            <AlertDescription>
              La subsanación ha sido recibida correctamente el {new Date(subsanationData.subsanationReceived).toLocaleDateString()}.
            </AlertDescription>
          </Alert>
        ) : allItemsCompleted ? (
          <Alert variant="info" className="mb-4">
            <AlertDescription>
              Todos los ítems han sido completados. Marque la subsanación como recibida en el panel de etapas.
            </AlertDescription>
          </Alert>
        ) : null}
        
        {/* Lista de ítems a subsanar */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Elementos que requieren subsanación</h3>
          
          {items.length === 0 ? (
            <div className="text-sm text-gray-500 mb-4">
              No hay elementos registrados que requieran subsanación.
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className={`p-3 rounded-md border ${
                    item.status === 'completed' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.description}</p>
                      {item.requiredDocumentType && (
                        <p className="text-xs text-gray-600">
                          Documento requerido: {item.requiredDocumentType}
                        </p>
                      )}
                    </div>
                    
                    {!readOnly && item.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkItemCompleted(item.id)}
                        disabled={loading}
                      >
                        Marcar completado
                      </Button>
                    )}
                    
                    {item.status === 'completed' && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Completado
                      </span>
                    )}
                  </div>
                  
                  {/* Documentos relacionados con este ítem */}
                  {documents.filter(doc => doc.itemId === item.id).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Documentos adjuntos:</p>
                      <ul className="mt-1 space-y-1">
                        {documents
                          .filter(doc => doc.itemId === item.id)
                          .map(doc => (
                            <li key={doc.id} className="text-xs flex items-center">
                              <span className="mr-1">📎</span>
                              <span>{doc.fileName}</span>
                              {doc.description && (
                                <span className="ml-1 text-gray-600">- {doc.description}</span>
                              )}
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Formulario para añadir nuevo ítem (solo si no es readOnly) */}
          {!readOnly && !subsanationData.subsanationReceived && (
            <div className="border p-3 rounded-md mt-4">
              <h4 className="text-sm font-medium mb-2">Añadir nuevo elemento a subsanar</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="itemDescription" className="block text-xs font-medium text-gray-700">
                    Descripción
                  </label>
                  <input
                    type="text"
                    id="itemDescription"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Describa la información que debe ser subsanada"
                  />
                </div>
                
                <div>
                  <label htmlFor="documentType" className="block text-xs font-medium text-gray-700">
                    Tipo de documento requerido (opcional)
                  </label>
                  <input
                    type="text"
                    id="documentType"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                    value={newItemDocType}
                    onChange={(e) => setNewItemDocType(e.target.value)}
                    placeholder="Ej: Contrato de trabajo, certificado, carta, etc."
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={loading || !newItemDescription}
                  >
                    Añadir Ítem
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Documentos de subsanación */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Documentos de subsanación recibidos</h3>
          
          {documents.length === 0 ? (
            <div className="text-sm text-gray-500 mb-4">
              No hay documentos de subsanación registrados.
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Documento</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Descripción</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Relacionado con</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-3 py-2">{doc.fileName}</td>
                      <td className="px-3 py-2">{doc.description || '-'}</td>
                      <td className="px-3 py-2">
                        {doc.itemId 
                          ? items.find(item => item.id === doc.itemId)?.description || 'Ítem no encontrado'
                          : 'General'
                        }
                      </td>
                      <td className="px-3 py-2">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Formulario para añadir nuevo documento (solo si no es readOnly) */}
          {!readOnly && !subsanationData.subsanationReceived && (
            <div className="border p-3 rounded-md mt-4">
              <h4 className="text-sm font-medium mb-2">Subir documento de subsanación</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="file" className="block text-xs font-medium text-gray-700">
                    Archivo
                  </label>
                  <input
                    type="file"
                    id="file"
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  />
                </div>
                
                <div>
                  <label htmlFor="docDescription" className="block text-xs font-medium text-gray-700">
                    Descripción del documento
                  </label>
                  <input
                    type="text"
                    id="docDescription"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                    value={documentDescription}
                    onChange={(e) => setDocumentDescription(e.target.value)}
                    placeholder="Describa el contenido del documento"
                  />
                </div>
                
                <div>
                  <label htmlFor="relatedItem" className="block text-xs font-medium text-gray-700">
                    Relacionado con ítem (opcional)
                  </label>
                  <select
                    id="relatedItem"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                    value={selectedItemId || ''}
                    onChange={(e) => setSelectedItemId(e.target.value || null)}
                  >
                    <option value="">Documento general</option>
                    {pendingItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUploadDocument}
                    disabled={loading || !selectedFile}
                  >
                    Subir Documento
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Comentarios */}
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Comentarios</h3>
          
          {readOnly ? (
            <div className="p-3 bg-gray-50 rounded-md border text-sm">
              {comments || 'No hay comentarios registrados.'}
            </div>
          ) : (
            <>
              <textarea
                className="w-full p-2 border rounded-md text-sm"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Añada comentarios sobre la subsanación..."
                disabled={subsanationData.subsanationReceived}
              ></textarea>
              
              {!subsanationData.subsanationReceived && (
                <div className="flex justify-end mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveComments}
                    disabled={loading}
                  >
                    Guardar Comentarios
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Mensajes de estado */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" className="mt-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SubsanationForm;