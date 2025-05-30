// src/components/forms/report/StepFive.tsx

import React, { useState, useRef } from 'react';
import { Field, FormikProps } from 'formik';
import { v4 as uuidv4 } from 'uuid';
import { ReportFormValues, EvidenceType } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUpload from '@/components/ui/file-upload';
import FormField from '@/components/ui/form-field';

interface StepFiveProps {
  formikProps: FormikProps<ReportFormValues>;
}

const StepFive: React.FC<StepFiveProps> = ({ formikProps }) => {
  const { values, errors, touched, setFieldValue } = formikProps;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para nueva evidencia con tipado correcto
  const [newEvidence, setNewEvidence] = useState<{
    file?: File;
    description: string;
    url: string;
  }>({
    file: undefined,
    description: '',
    url: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Límites actualizados por tipo de archivo
  const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024; // 15MB para documentos
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB para imágenes
  const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB para video/audio
  
  const ALLOWED_FILE_TYPES = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    // Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    // Video
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
  ];

  // Función para obtener el límite correcto según el tipo de archivo
  const getFileSizeLimit = (file: File): number => {
    // Documentos
    if (
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type.includes('openxmlformats-officedocument') ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'text/plain'
    ) {
      return MAX_DOCUMENT_SIZE;
    }
    
    // Imágenes
    if (file.type.startsWith('image/')) {
      return MAX_IMAGE_SIZE;
    }
    
    // Video y audio
    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      return MAX_MEDIA_SIZE;
    }
    
    // Por defecto
    return MAX_DOCUMENT_SIZE;
  };
  
  // Función para formatear tamaños en MB
  const formatFileSize = (bytes: number): string => {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Validar nuevo archivo con límites dinámicos
  const validateFile = (file?: File): string => {
    if (!file) return '';
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Tipo de archivo no permitido. Use documentos, imágenes, audio o video.`;
    }
    
    const sizeLimit = getFileSizeLimit(file);
    if (file.size > sizeLimit) {
      return `El archivo excede el tamaño máximo permitido (${formatFileSize(sizeLimit)})`;
    }
    
    return '';
  };

  // Validar nueva evidencia
  const validateEvidenceForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validar descripción
    if (!newEvidence.description) {
      errors.description = 'La descripción es obligatoria';
    }
    
    // Validación para asegurar que hay al menos un archivo o una URL
    if (!newEvidence.file && !newEvidence.url) {
      errors.file = 'Debe proporcionar un archivo o una URL';
    }
    
    // Validar archivo si existe
    if (newEvidence.file) {
      const fileError = validateFile(newEvidence.file);
      if (fileError) {
        errors.file = fileError;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manejar cambios en los campos de texto
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Extraer el nombre base del campo (sin el sufijo -evidence)
    const fieldName = name.replace('-evidence', '');
    
    setNewEvidence((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    
    // Limpiar error cuando el usuario comienza a escribir
    if (formErrors[fieldName]) {
      setFormErrors((prev) => ({
        ...prev,
        [fieldName]: '',
      }));
    }
  };

  // Agregar nueva evidencia con mejor manejo de errores y feedback de éxito
  const handleAddEvidence = () => {
    if (validateEvidenceForm()) {
      setUploading(true);
      
      try {
        // Crear objeto de evidencia
        const newEvidenceObj: EvidenceType = {
          id: uuidv4(),
          file: newEvidence.file,
          description: newEvidence.description,
          url: newEvidence.url
        };
        
        // Añadir a la lista
        setFieldValue('evidences', [...values.evidences, newEvidenceObj]);
        
        // Mostrar mensaje de éxito brevemente
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000); // Ocultar después de 3 segundos
        
        // Limpiar formulario
        setNewEvidence({
          file: undefined,
          description: '',
          url: ''
        });
        
        // Limpiar archivo seleccionado
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error al agregar evidencia:', error);
        setFormErrors({
          ...formErrors,
          general: 'Error al agregar la evidencia. Inténtelo de nuevo.'
        });
      } finally {
        setUploading(false);
      }
    }
  };

  // Eliminar evidencia
  const handleRemoveEvidence = (index: number) => {
    const newEvidences = [...values.evidences];
    newEvidences.splice(index, 1);
    setFieldValue('evidences', newEvidences);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Evidencias y Documentación
        </h3>
        <p className="text-gray-600">
          En esta sección puede aportar archivos, enlaces o cualquier evidencia que respalde su
          denuncia. No es obligatorio, pero ayudará en la investigación.
        </p>
      </div>

      {/* Alerta informativa con límites actualizados */}
      <Alert variant="info" className="mb-6">
        <AlertDescription>
          <p className="text-sm">
            <strong>Tipos de archivos permitidos:</strong> Documentos (PDF, Word, Excel, TXT),
            Imágenes (JPG, PNG, GIF), Audio (MP3, WAV), Video (MP4)
          </p>
          <p className="text-sm mt-1">
            <strong>Tamaños máximos:</strong>
          </p>
          <ul className="text-sm list-disc ml-5 mt-1">
            <li>Documentos: 15MB</li>
            <li>Imágenes: 50MB</li>
            <li>Audio/Video: 100MB</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Mensajes de error o éxito */}
      {formErrors.general && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>{formErrors.general}</AlertDescription>
        </Alert>
      )}
      
      {uploadSuccess && (
        <Alert variant="success" className="mb-6">
          <AlertDescription>Evidencia agregada exitosamente.</AlertDescription>
        </Alert>
      )}

      {/* Lista de evidencias */}
      {values.evidences && values.evidences.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Evidencias añadidas</h4>
          <div className="space-y-3">
            {values.evidences.map((evidence, index) => (
              <Card key={index} className="bg-gray-50">
                <CardContent className="py-4 px-5 flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h5 className="font-medium">
                        {evidence.file ? evidence.file.name : evidence.url ? 'URL Externa' : 'Evidencia'}
                      </h5>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{evidence.description}</p>
                    {evidence.url && (
                      <p className="text-sm text-blue-600 mt-1">
                        <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {evidence.url}
                        </a>
                      </p>
                    )}
                    {evidence.file && (
                      <p className="text-xs text-gray-500 mt-1">
                        Tamaño: {formatFileSize(evidence.file.size)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveEvidence(index)}
                  >
                    Eliminar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Formulario para agregar evidencia */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <h4 className="font-medium text-gray-900 mb-4">Agregar evidencia</h4>
        <div className="space-y-4">
          {/* Descripción de la evidencia */}
          <div>
            <FormField
              id="description-evidence"
              name="description-evidence"
              label="Descripción de la evidencia"
              type="textarea"
              required
              placeholder="Describa qué muestra esta evidencia y su relevancia para la denuncia"
              value={newEvidence.description}
              onChange={handleInputChange}
              description="Explique qué contiene esta evidencia y por qué es relevante para su denuncia"
            />
            {formErrors.description && (
              <div className="text-red-500 text-sm mt-1" role="alert">{formErrors.description}</div>
            )}
          </div>

          {/* Carga de archivo mejorada */}
          <div>
            <FileUpload 
              id="file"
              name="file"
              label="Archivo"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4,.wav,.avi,.xlsx,.xls,.txt,.gif,.webp"
              onChange={(file) => {
                if (file) {
                  // Validar el archivo
                  const errorMsg = validateFile(file);
                  if (errorMsg) {
                    setFormErrors(prev => ({
                      ...prev,
                      file: errorMsg
                    }));
                    return;
                  }
                  
                  // Si pasa la validación, actualizar el estado
                  setNewEvidence(prev => ({
                    ...prev,
                    file
                  }));
                  
                  // Limpiar error si existía
                  if (formErrors.file) {
                    setFormErrors(prev => ({
                      ...prev,
                      file: ''
                    }));
                  }
                } else {
                  // Si se elimina el archivo
                  setNewEvidence(prev => ({
                    ...prev,
                    file: undefined
                  }));
                }
              }}
              value={newEvidence.file}
              error={formErrors.file}
              description="Formatos admitidos: PDF, Word, Excel, imágenes, audio y video. Si no puede subir el archivo, puede proporcionar un enlace a continuación."
              maxSize={MAX_MEDIA_SIZE} // Tamaño máximo permitido
            />
          </div>

          {/* URL alternativa con FormField */}
          <div>
            <FormField
              id="url"
              name="url-evidence"
              label="URL (alternativa al archivo)"
              placeholder="https://ejemplo.com/mi-evidencia"
              description="Si la evidencia está disponible en línea, proporcione la URL completa"
              value={newEvidence.url}
              onChange={handleInputChange}
            />
            {formErrors.url && (
              <div className="text-red-500 text-sm mt-1">{formErrors.url}</div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewEvidence({
                  file: undefined,
                  description: '',
                  url: ''
                });
                setFormErrors({});
              }}
              className="mr-2"
              disabled={uploading}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              onClick={handleAddEvidence}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="mr-2">Agregando...</span>
                  <span className="inline-block animate-spin">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                </>
              ) : "Agregar Evidencia"}
            </Button>
          </div>
        </div>
      </div>

      {/* Descripción de evidencias adicionales */}
      <div className="mb-6">
        <Label htmlFor="additionalEvidenceDescription">
          ¿Hay evidencias adicionales que no puede proporcionar ahora? (opcional)
        </Label>
        <Field
          as={Textarea}
          id="additionalEvidenceDescription"
          name="additionalEvidenceDescription"
          rows={3}
          placeholder="Describa cualquier evidencia adicional que podría ser relevante pero que no puede aportar en este momento."
        />
        <p className="text-sm text-gray-500 mt-1">
          Por ejemplo, documentos físicos, grabaciones a las que no tiene acceso actualmente, etc.
        </p>
      </div>
    </div>
  );
};

export default StepFive;