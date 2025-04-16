'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useCompanyDocuments, useUploadDocument, useUpdateDocument, useDeleteDocument } from '@/lib/hooks/useDocuments';
import { CompanyDocument } from '@/lib/services/documentService';

interface CompanyDocumentsManagerProps {
  companyId: string;
}

export function CompanyDocumentsManager({ companyId }: CompanyDocumentsManagerProps) {
  // Estado para el formulario
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentData, setDocumentData] = useState({
    title: '',
    description: '',
    isPublic: companyId === 'default', // Por defecto, documentos públicos solo en empresa principal
    documentType: 'standard' as 'standard' | 'legal' | 'terms' | 'privacy'
  });
  const [editingDocument, setEditingDocument] = useState<CompanyDocument | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Consultas y mutaciones de React Query
  const { 
    data: documentsResult,
    isLoading: isLoadingDocuments,
    error: documentsError,
    refetch: refetchDocuments // Añadimos la función para forzar la recarga
  } = useCompanyDocuments(companyId);
  
  // Efecto para recargar documentos cuando el componente se monta
  React.useEffect(() => {
    // Recargar documentos al montar el componente
    refetchDocuments();
    
    // También configuramos un intervalo para recargar cada 5 segundos
    // Esto ayudará a detectar documentos creados desde otras fuentes
    const interval = setInterval(() => {
      refetchDocuments();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [companyId, refetchDocuments]);
  
  const uploadMutation = useUploadDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();
  
  // Manejar cambio en el campo de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  
  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDocumentData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Manejar cambio en isPublic
  const handleIsPublicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentData(prev => ({
      ...prev,
      isPublic: e.target.checked
    }));
  };
  
  // Función para subir archivos directamente a Firebase (alternativa)
  const uploadFileDirectly = async (file: File, docData: any) => {
    try {
      setSuccessMessage("Iniciando carga alternativa del documento...");
      
      // Importar Firebase directamente
      const {
        getStorage, ref, uploadBytes, getDownloadURL
      } = await import('firebase/storage');
      const {
        getFirestore, collection, addDoc, serverTimestamp
      } = await import('firebase/firestore');
      
      // Inicializar Firebase
      const { app } = await import('@/lib/firebase/config');
      const storage = getStorage(app);
      const db = getFirestore(app);
      
      // Generar ruta única
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `companies/${companyId}/public_documents/${fileName}`;
      
      console.log("Subiendo archivo a:", filePath);
      
      // Crear referencia y subir
      const storageRef = ref(storage, filePath);
      const result = await uploadBytes(storageRef, file);
      console.log("Archivo subido:", result);
      
      // Obtener URL
      const downloadURL = await getDownloadURL(result.ref);
      console.log("URL de descarga:", downloadURL);
      
      // Guardar metadatos en Firestore
      const docRef = await addDoc(
        collection(db, `companies/${companyId}/documents`),
        {
          title: docData.title,
          description: docData.description,
          fileURL: downloadURL,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          isPublic: docData.isPublic,
          path: filePath,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );
      
      console.log("Documento guardado con ID:", docRef.id);
      setSuccessMessage("¡Documento cargado correctamente!");
      resetForm();
      
      // Recargar la lista de documentos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      return true;
    } catch (error) {
      console.error("Error en carga alternativa:", error);
      alert(`Error en carga alternativa: ${error.message}`);
      return false;
    }
  };

  // Manejar envío del formulario de creación
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDocument) {
      // Actualizar documento existente
      updateMutation.mutate({
        companyId,
        documentId: editingDocument.id!,
        documentData,
        previousIsPublic: editingDocument.isPublic
      }, {
        onSuccess: () => {
          resetForm();
        }
      });
    } else {
      // Crear nuevo documento
      if (!selectedFile) {
        alert('Por favor seleccione un archivo');
        return;
      }
      
      // Intentar método alternativo primero
      try {
        setSuccessMessage("Intentando carga alternativa...");
        const result = await uploadFileDirectly(selectedFile, documentData);
        
        if (result) {
          console.log("Carga alternativa exitosa");
          return; // Salir si el método alternativo tuvo éxito
        } else {
          console.log("Carga alternativa falló, probando método normal");
        }
      } catch (e) {
        console.error("Error en método alternativo:", e);
      }
      
      // Si el método alternativo falla, usar el método normal
      uploadMutation.mutate({
        companyId,
        file: selectedFile,
        documentData
      }, {
        onSuccess: () => {
          resetForm();
        }
      });
    }
  };
  
  // Manejar edición de un documento
  const handleEdit = (document: CompanyDocument) => {
    setEditingDocument(document);
    setDocumentData({
      title: document.title,
      description: document.description,
      isPublic: document.isPublic,
      documentType: document.documentType || 'standard'
    });
    setShowForm(true);
  };
  
  // Manejar eliminación de un documento
  const handleDelete = (document: CompanyDocument) => {
    if (window.confirm(`¿Está seguro de eliminar el documento "${document.title}"?`)) {
      deleteMutation.mutate({
        companyId,
        documentId: document.id!,
        isPublic: document.isPublic
      });
    }
  };
  
  // Resetear formulario
  const resetForm = () => {
    setSelectedFile(null);
    setDocumentData({
      title: '',
      description: '',
      isPublic: companyId === 'default', // Por defecto, documentos públicos solo en empresa principal
      documentType: 'standard'
    });
    setEditingDocument(null);
    setShowForm(false);
  };
  
  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Formatear fecha
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Fecha desconocida';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Obtener ícono según tipo de archivo
  const getFileIcon = (fileType: string): JSX.Element => {
    if (fileType.includes('pdf')) {
      return (
        <svg className="h-8 w-8 text-red-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 62.9-21.9-12.7-9.6-24.9-23.4-34.5-40.8zM86.1 428.1c0 .8 13.2-5.4 34.9-40.2-6.7 6.3-29.1 24.5-34.9 40.2zM248 160h136v328c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V24C0 10.7 10.7 0 24 0h200v136c0 13.2 10.8 24 24 24zm-8 171.8c-20-12.2-33.3-29-42.7-53.8 4.5-18.5 11.6-46.6 6.2-64.2-4.7-29.4-42.4-26.5-47.8-6.8-5 18.3-.4 44.1 8.1 77-11.6 27.6-28.7 64.6-40.8 85.8-.1 0-.1.1-.2.1-27.1 13.9-73.6 44.5-54.5 68 5.6 6.9 16 10 21.5 10 17.9 0 35.7-18 61.1-61.8 25.8-8.5 54.1-19.1 79-23.2 21.7 11.8 47.1 19.5 64 19.5 29.2 0 31.2-32 19.7-43.4-13.9-13.6-54.3-9.7-73.6-7.2zM377 105L279 7c-4.5-4.5-10.6-7-17-7h-6v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zm-74.1 255.3c4.1-2.7-2.5-11.9-42.8-9 37.1 15.8 42.8 9 42.8 9z"/>
        </svg>
      );
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return (
        <svg className="h-8 w-8 text-blue-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm57.1 120H305c7.7 0 13.4 7.1 11.7 14.7l-38 168c-1.2 5.5-6.1 9.3-11.7 9.3h-38c-5.5 0-10.3-3.8-11.6-9.1-25.8-103.5-20.8-81.2-25.6-110.5h-.5c-1.1 14.3-2.4 17.4-25.6 110.5-1.3 5.3-6.1 9.1-11.6 9.1H117c-5.6 0-10.5-3.9-11.7-9.4l-37.8-168c-1.7-7.5 4-14.6 11.7-14.6h24.5c5.7 0 10.7 4 11.8 9.7 15.6 78 20.1 109.5 21 122.2 1.6-10.2 7.3-32.7 29.4-122.7 1.3-5.4 6.1-9.1 11.7-9.1h29.1c5.6 0 10.4 3.8 11.7 9.2 24 100.4 28.8 124 29.6 129.4-.2-11.2-2.6-17.8 21.6-129.2 1-5.6 5.9-9.5 11.5-9.5zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
        </svg>
      );
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return (
        <svg className="h-8 w-8 text-green-600" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm60.1 106.5L224 336l60.1 93.5c5.1 8-.6 18.5-10.1 18.5h-34.9c-4.4 0-8.5-2.4-10.6-6.3C208.9 405.5 192 373 192 373c-6.4 14.8-10 20-36.6 68.8-2.1 3.9-6.1 6.3-10.5 6.3H110c-9.5 0-15.2-10.5-10.1-18.5l60.3-93.5-60.3-93.5c-5.2-8 .6-18.5 10.1-18.5h34.8c4.4 0 8.5 2.4 10.6 6.3 26.1 48.8 20 33.6 36.6 68.5 0 0 6.1-11.7 36.6-68.5 2.1-3.9 6.2-6.3 10.6-6.3H274c9.5-.1 15.2 10.4 10.1 18.4zM384 121.9v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
        </svg>
      );
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return (
        <svg className="h-8 w-8 text-orange-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path d="M193.6 336v-32c47.6 0 87.7-34.6 95.8-80H288V96h-64V64h128v192h-32c-8.1 45.4-48.2 80-95.8 80v32c17.7 0 32 14.3 32 32v128c0 17.7-14.3 32-32 32H128c-17.7 0-32-14.3-32-32V368c0-17.7 14.3-32 32-32zm0-112c-29.5 0-53.3-23.9-53.3-53.3 0-29.5 23.9-53.3 53.3-53.3 29.5 0 53.3 23.9 53.3 53.3 0 29.5-23.8 53.3-53.3 53.3z"/>
        </svg>
      );
    } else if (fileType.includes('image')) {
      return (
        <svg className="h-8 w-8 text-purple-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path d="M320 464c8.8 0 16-7.2 16-16V160H256c-17.7 0-32-14.3-32-32V48H64c-8.8 0-16 7.2-16 16v384c0 8.8 7.2 16 16 16h256zM0 64C0 28.7 28.7 0 64 0h165.5c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm88 240c0-8.8 7.2-16 16-16h176c8.8 0 16 7.2 16 16s-7.2 16-16 16H104c-8.8 0-16-7.2-16-16z"/>
        </svg>
      );
    } else {
      return (
        <svg className="h-8 w-8 text-gray-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
          <path d="M0 64C0 28.7 28.7 0 64 0h160v128c0 17.7 14.3 32 32 32h128v288c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0l128 128z"/>
        </svg>
      );
    }
  };
  
  // Verificar si hay errores
  const hasError = documentsError || uploadMutation.isError || updateMutation.isError || deleteMutation.isError;
  const errorMessage = documentsError instanceof Error
    ? documentsError.message
    : uploadMutation.error instanceof Error
      ? uploadMutation.error.message
      : updateMutation.error instanceof Error
        ? updateMutation.error.message
        : deleteMutation.error instanceof Error
          ? deleteMutation.error.message
          : 'Error al procesar la operación';
          
  // Mostrar error detallado en consola para depuración  
  React.useEffect(() => {
    if (hasError) {
      console.error('Error en gestión de documentos:', {
        documentsError,
        uploadError: uploadMutation.error,
        updateError: updateMutation.error,
        deleteError: deleteMutation.error
      });
    }
  }, [hasError, documentsError, uploadMutation.error, updateMutation.error, deleteMutation.error]);
  
  // Lógica para mostrar mensajes de éxito
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  React.useEffect(() => {
    if (uploadMutation.isSuccess) {
      setSuccessMessage('Documento subido correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else if (updateMutation.isSuccess) {
      setSuccessMessage('Documento actualizado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else if (deleteMutation.isSuccess) {
      setSuccessMessage('Documento eliminado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }, [uploadMutation.isSuccess, updateMutation.isSuccess, deleteMutation.isSuccess]);
  
  // Mostrar cargando
  if (isLoadingDocuments) {
    return <Spinner text="Cargando documentos..." />;
  }
  
  // Obtener la lista de documentos
  const documents = documentsResult?.success ? documentsResult.documents : [];
  
  // Función para crear un documento de demostración
  const createDemoDocument = async () => {
    try {
      setSuccessMessage("Creando documento de demostración...");
      
      // Importar función directamente
      const { createDirectPublicDocument, uploadDemoPublicDocument } = await import('@/lib/services/documentService');
      
      // Intentar primero con uploadDemoPublicDocument
      try {
        const demoDoc = await uploadDemoPublicDocument(companyId);
        if (demoDoc) {
          setSuccessMessage(`¡Documento de demostración creado con ID: ${demoDoc.id}!`);
          // Recargar documentos
          refetchDocuments();
          return;
        }
      } catch (uploadError) {
        console.error("Error al crear documento con método principal:", uploadError);
      }
      
      // Si falla, intentar con método alternativo
      const docId = await createDirectPublicDocument(companyId);
      
      if (docId) {
        setSuccessMessage(`¡Documento de demostración creado con ID: ${docId}!`);
        // Recargar documentos
        refetchDocuments();
      } else {
        setSuccessMessage("Error al crear el documento de demostración");
      }
    } catch (error) {
      console.error("Error al crear documento de demostración:", error);
      setSuccessMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Documentos Corporativos</h2>
        <div className="flex gap-2">
          {companyId === 'default' && (
            <Button
              onClick={createDemoDocument}
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              Crear Documento de Prueba
            </Button>
          )}
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "default"}
          >
            {showForm ? "Cancelar" : "Agregar Documento"}
          </Button>
        </div>
      </div>

      {/* Errores */}
      {hasError && (
        <Alert variant="error">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Mensaje de éxito */}
      {successMessage && (
        <Alert variant="success">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Formulario de creación/edición */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingDocument ? "Editar Documento" : "Nuevo Documento Corporativo"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título del Documento*</Label>
                <Input
                  id="title"
                  name="title"
                  value={documentData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Manual de Prevención"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={documentData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Descripción breve del documento..."
                />
              </div>
              
              {!editingDocument && (
                <div>
                  <Label htmlFor="file">Archivo*</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos recomendados: PDF, Word, Excel, PowerPoint, imágenes
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={documentData.isPublic}
                    onChange={handleIsPublicChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="isPublic" className="text-sm font-normal flex items-center">
                    <span className="mr-1">Documento público</span>
                    {companyId === 'default' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Se mostrará en página de inicio
                      </span>
                    )}
                  </Label>
                </div>
                
                <div>
                  <Label htmlFor="documentType">Tipo de Documento</Label>
                  <select
                    id="documentType"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    value={documentData.documentType}
                    onChange={(e) => setDocumentData({
                      ...documentData,
                      documentType: e.target.value as 'standard' | 'legal' | 'terms' | 'privacy'
                    })}
                  >
                    <option value="standard">Documento Estándar</option>
                    <option value="legal">Documento Legal</option>
                    <option value="terms">Términos y Condiciones</option>
                    <option value="privacy">Política de Privacidad</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Los documentos de tipo "Términos y Condiciones" o "Política de Privacidad" se utilizarán automáticamente en las secciones correspondientes.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={uploadMutation.isPending || updateMutation.isPending}
                >
                  {uploadMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : editingDocument ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {/* Lista de documentos */}
      {documents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay documentos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Agregue documentos corporativos para que estén disponibles en el canal de denuncias.
          </p>
          {/* Información adicional si este es la empresa principal */}
          {companyId === 'default' && (
            <p className="mt-2 text-sm text-blue-600">
              <strong>Nota:</strong> Esta es la empresa principal y sus documentos públicos
              se mostrarán en la página principal del sitio.
            </p>
          )}
          <div className="mt-6 flex gap-2 justify-center">
            <Button onClick={() => {
              // Forzar una recarga de documentos
              refetchDocuments();
              // Mensaje para feedback
              setSuccessMessage("Recargando lista de documentos...");
            }} variant="outline">
              Actualizar Lista
            </Button>
            <Button onClick={() => setShowForm(true)}>
              Agregar Documento
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Listado de Documentos
              {companyId === 'default' && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Página Principal
                </span>
              )}
            </h3>
            <Button variant="outline" size="sm" onClick={() => refetchDocuments()}>
              Actualizar Lista
            </Button>
          </div>
          <ul className="divide-y divide-gray-200">
            {documents.map((document) => (
              <li key={document.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getFileIcon(document.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {document.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex gap-1">
                        {document.isPublic ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Público
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Privado
                          </span>
                        )}
                        
                        {document.documentType && document.documentType !== 'standard' && (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            document.documentType === 'legal' 
                              ? 'bg-blue-100 text-blue-800' 
                              : document.documentType === 'terms'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {document.documentType === 'legal' 
                              ? 'Legal' 
                              : document.documentType === 'terms'
                                ? 'Términos'
                                : 'Privacidad'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-500 truncate">{document.description}</p>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <p>{document.fileName} ({formatFileSize(document.fileSize)})</p>
                      <span className="mx-1">•</span>
                      <p>Subido el {formatDate(document.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center space-x-2">
                    <a
                      href={document.fileURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Ver
                    </a>
                    <button
                      onClick={() => handleEdit(document)}
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(document)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                      disabled={deleteMutation.isPending}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}