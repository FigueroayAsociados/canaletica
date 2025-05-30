// src/components/ui/file-upload.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';

// Props para el componente FileUpload
interface FileUploadProps {
  id: string;
  name: string;
  accept?: string;
  label?: string;
  description?: string;
  onChange: (file: File | undefined) => void;
  error?: string;
  value?: File;
  required?: boolean;
  maxSize?: number; // en bytes
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  id,
  name,
  accept = '*/*',
  label,
  description,
  onChange,
  error,
  value,
  required = false,
  maxSize,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Formatear tamaño de archivo para mostrar
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Manejar clic en el área de carga
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Validar tamaño si se especifica un máximo
      if (maxSize && file.size > maxSize) {
        onChange(undefined);
        // La función onChange debería manejar el error, pero aquí podríamos mostrar un mensaje también
        return;
      }
      
      onChange(file);
    } else {
      onChange(undefined);
    }
  };
  
  // Eventos para arrastrar y soltar
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Validar tamaño si se especifica un máximo
      if (maxSize && file.size > maxSize) {
        onChange(undefined);
        // La función onChange debería manejar el error
        return;
      }
      
      onChange(file);
    }
  };
  
  // Mostrar instrucciones de accesibilidad cuando el elemento recibe foco
  const handleFocus = () => {
    setShowInstructions(true);
  };
  
  const handleBlur = () => {
    setShowInstructions(false);
  };
  
  // Manejar eventos de teclado para accesibilidad
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };
  
  // Limpiar el archivo seleccionado
  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se propague al área de carga
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Obtener extensión de archivo
  const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  };
  
  // Obtener tipo de archivo para icono
  const getFileType = (file: File): 'image' | 'document' | 'video' | 'audio' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (
      file.type.includes('pdf') || 
      file.type.includes('document') || 
      file.type.includes('sheet') || 
      file.type.includes('text/')
    ) return 'document';
    return 'other';
  };
  
  // Renderizar el icono según el tipo de archivo
  const renderFileIcon = (file: File) => {
    const fileType = getFileType(file);
    
    switch (fileType) {
      case 'image':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'document':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'audio':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };
  
  return (
    <div className={`file-upload ${className}`}>
      {label && (
        <Label htmlFor={id} required={required} className="mb-1">
          {label}
        </Label>
      )}
      
      {/* Área de arrastrar y soltar */}
      <div
        className={`mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 ${
          isDragging
            ? 'border-primary bg-primary-50 border-dashed'
            : error
              ? 'border-red-300 bg-red-50 border-dashed'
              : 'border-gray-300 border-dashed bg-gray-50'
        } rounded-md transition-colors duration-200 cursor-pointer`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={0}
        role="button"
        aria-controls={id}
        aria-haspopup="dialog"
        aria-label={`${label || 'Subir archivo'}${required ? ' (requerido)' : ''}`}
      >
        {/* Mostrar archivo seleccionado o icono de carga */}
        {value ? (
          <div className="flex items-center space-x-3 p-3 bg-white rounded-md w-full">
            <div className="flex-shrink-0">
              {renderFileIcon(value)}
            </div>
            <div className="flex-1 truncate">
              <div className="text-sm font-medium text-gray-900 truncate">{value.name}</div>
              <div className="text-xs text-gray-500">
                {getFileExtension(value.name).toUpperCase()} · {formatFileSize(value.size)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearFile}
              className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-label="Eliminar archivo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <div className="relative font-medium text-primary hover:text-primary-dark">
                <span>Subir un archivo</span>
              </div>
              <p className="pl-1">o arrastrar y soltar</p>
            </div>
            <p className="text-xs text-gray-500">{accept.replace(/,/g, ', ')}</p>
            {maxSize && (
              <p className="text-xs text-gray-500">Tamaño máximo: {formatFileSize(maxSize)}</p>
            )}
          </div>
        )}
        
        {/* Instrucciones de accesibilidad */}
        {showInstructions && (
          <div className="sr-only">
            Presione Enter o la barra espaciadora para seleccionar un archivo. También puede arrastrar y soltar un archivo en esta área.
          </div>
        )}
      </div>
      
      {/* Campo de entrada de archivo oculto */}
      <input
        id={id}
        name={name}
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        required={required}
        aria-hidden="true"
      />
      
      {/* Mensaje de error */}
      {error && (
        <div className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}
      
      {/* Descripción */}
      {description && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
};

export default FileUpload;