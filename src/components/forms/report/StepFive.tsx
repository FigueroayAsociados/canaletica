// src/components/forms/report/StepFive.tsx

import React, { useState, useRef } from 'react';
import { Field, ErrorMessage, FormikProps } from 'formik';
import { v4 as uuidv4 } from 'uuid';
import { ReportFormValues } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StepFiveProps {
  formikProps: FormikProps<ReportFormValues>;
}

const StepFive: React.FC<StepFiveProps> = ({ formikProps }) => {
  const { values, errors, touched, setFieldValue } = formikProps;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newEvidence, setNewEvidence] = useState({
    file: undefined as File | undefined,
    description: '',
    url: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  
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

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      console.log('Archivo seleccionado:', file.name, file.type, file.size);
      
      // Validación del tipo de archivo
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFormErrors((prev) => ({
          ...prev,
          file: `Tipo de archivo no permitido: ${file.type}. Use documentos, imágenes, audio o video.`,
        }));
        return;
      }
      
      // Validación del tamaño
      const sizeLimit = getFileSizeLimit(file);
      if (file.size > sizeLimit) {
        const sizeMB = Math.round(sizeLimit / (1024 * 1024));
        setFormErrors((prev) => ({
          ...prev,
          file: `El archivo excede el tamaño máximo permitido (${sizeMB}MB)`,
        }));
        return;
      }
      
      // Si pasó todas las validaciones, guardar el archivo
      setNewEvidence((prev) => ({
        ...prev,
        file,
      }));
      
      // Limpiar error cuando el usuario selecciona un archivo válido
      if (formErrors.file) {
        setFormErrors((prev) => ({
          ...prev,
          file: '',
        }));
      }
    }
  };

  // Manejar cambios en el formulario de nueva evidencia
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    setNewEvidence((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpiar error cuando el usuario comienza a escribir
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Agregar nueva evidencia con mejor manejo de errores
  const handleAddEvidence = () => {
    if (validateEvidenceForm()) {
      setUploading(true);
      
      try {
        // Crear objeto de evidencia
        const newEvidenceObj = {
          id: uuidv4(),
          file: newEvidence.file,
          description: newEvidence.description,
          url: newEvidence.url
        };
        
        // Añadir a la lista
        setFieldValue('evidences', [...values.evidences, newEvidenceObj]);
        
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

      {/* Mensaje de error general */}
      {formErrors.general && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>{formErrors.general}</AlertDescription>
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
                        {evidence.file ? evidence.file.name : 'URL Externa'}
                      </h5>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{evidence.description}</p>
                    {evidence.url && (
                      <p className="text-sm text-blue-600 mt-1">
                        {evidence.url}
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
            <Label htmlFor="description" required>
              Descripción de la evidencia
            </Label>
            <Textarea
              id="description"
              name="description"
              value={newEvidence.description}
              onChange={handleInputChange}
              className={formErrors.description ? "border-red-500" : ""}
              placeholder="Describa qué muestra esta evidencia y su relevancia para la denuncia"
            />
            {formErrors.description && (
              <div className="text-red-500 text-sm mt-1">{formErrors.description}</div>
            )}
          </div>

          {/* Carga de archivo */}
          <div>
            <Label htmlFor="file">
              Archivo
            </Label>
            <Input
              id="file"
              name="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className={formErrors.file ? "border-red-500" : ""}
            />
            {formErrors.file && (
              <div className="text-red-500 text-sm mt-1">{formErrors.file}</div>
            )}
            {newEvidence.file && (
              <p className="text-sm text-green-600 mt-1">
                Archivo seleccionado: {newEvidence.file.name} ({formatFileSize(newEvidence.file.size)})
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Si no puede subir el archivo, puede proporcionar un enlace a continuación.
            </p>
          </div>

          {/* URL alternativa */}
          <div>
            <Label htmlFor="url">
              URL (alternativa al archivo)
            </Label>
            <Input
              id="url"
              name="url"
              value={newEvidence.url}
              onChange={handleInputChange}
              className={formErrors.url ? "border-red-500" : ""}
              placeholder="https://ejemplo.com/mi-evidencia"
            />
            {formErrors.url && (
              <div className="text-red-500 text-sm mt-1">{formErrors.url}</div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleAddEvidence}
            className="mt-3"
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