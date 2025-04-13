'use client';

import React from 'react';
import { usePublicCompanyDocuments } from '@/lib/hooks/useDocuments';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CorporateDocumentsProps {
  companyId: string;
}

export function CorporateDocuments({ companyId }: CorporateDocumentsProps) {
  const { 
    data: documentsResult,
    isLoading,
    error
  } = usePublicCompanyDocuments(companyId);
  
  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
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
  
  if (isLoading) {
    return <Spinner text="Cargando documentos..." />;
  }
  
  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription>
          {error instanceof Error ? error.message : 'Error al cargar los documentos'}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Obtener documentos públicos
  const documents = documentsResult?.success ? documentsResult.documents : [];
  
  if (documents.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-gray-500">No hay documentos disponibles.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <h2 className="text-lg font-semibold border-b border-gray-200 px-6 py-4">
        Documentos Corporativos
      </h2>
      <ul className="divide-y divide-gray-200">
        {documents.map((document) => (
          <li key={document.id} className="p-4 hover:bg-gray-50">
            <a 
              href={document.fileURL} 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md p-2 -m-2"
            >
              <div className="flex-shrink-0">
                {getFileIcon(document.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {document.title}
                </p>
                {document.description && (
                  <p className="text-sm text-gray-500 truncate">
                    {document.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {document.fileName} ({formatFileSize(document.fileSize)})
                </p>
              </div>
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}