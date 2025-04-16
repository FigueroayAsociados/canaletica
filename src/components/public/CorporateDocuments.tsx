'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Para facilitar el debug, importamos estas interfaces
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { app } from '@/lib/firebase/config';

// Interfaz para documentos corporativos
interface DocumentItem {
  id: string;
  title: string;
  description: string;
  fileURL: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isPublic: boolean;
}

interface CorporateDocumentsProps {
  companyId: string;
}

export function CorporateDocuments({ companyId }: CorporateDocumentsProps) {
  // Estados para gestionar los documentos
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleDocuments, setVisibleDocuments] = useState(3); // Número inicial de documentos a mostrar

  // Cargar documentos al montar el componente
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Usamos las variables importadas directamente
        const db = getFirestore(app);
        
        // Intento directo y simple - debería funcionar con reglas permisivas
        let documentsQuery = query(
          collection(db, `companies/${companyId}/documents`)
        );
        
        let querySnapshot = await getDocs(documentsQuery);
        const allDocuments: DocumentItem[] = [];
        
        // Mostramos todos los documentos encontrados
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Solo incluimos documentos que tienen la marca isPublic
          if (data.isPublic === true) {
            allDocuments.push({
              id: doc.id,
              title: data.title || 'Sin título',
              description: data.description || '',
              fileURL: data.fileURL || '',
              fileName: data.fileName || 'archivo.pdf',
              fileType: data.fileType || 'application/pdf',
              fileSize: data.fileSize || 0,
              isPublic: true
            });
          }
        });
        
        console.log(`Documentos públicos encontrados: ${allDocuments.length}`);
        
        // Establecer los documentos encontrados
        setDocuments(allDocuments);
      } catch (err) {
        console.error("Error al cargar documentos:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Intentar un enfoque alternativo si falla el primer intento
        try {
          console.log("Intentando método alternativo...");
          const db = getFirestore(app);
          
          // Intentar con la colección publicDocuments directamente
          const publicDocsQuery = query(
            collection(db, `companies/${companyId}/publicDocuments`)
          );
          
          const publicSnapshot = await getDocs(publicDocsQuery);
          const altDocuments: DocumentItem[] = [];
          
          publicSnapshot.forEach((doc) => {
            const data = doc.data();
            altDocuments.push({
              id: doc.id,
              title: data.title || 'Sin título',
              description: data.description || '',
              fileURL: data.fileURL || '',
              fileName: data.fileName || 'archivo.pdf',
              fileType: data.fileType || 'application/pdf',
              fileSize: data.fileSize || 0,
              isPublic: true
            });
          });
          
          if (altDocuments.length > 0) {
            console.log(`Documentos alternativos encontrados: ${altDocuments.length}`);
            setDocuments(altDocuments);
            return;
          }
        } catch (altErr) {
          console.error("También falló el método alternativo:", altErr);
        }
        
        setError(`No se pudieron cargar los documentos: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Cargar documentos
    loadDocuments();
  }, [companyId]);
  
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
    console.log("DEBUG: Mostrando error:", error);
    return (
      <Alert variant="error">
        <AlertDescription>
          {error}
          <div className="mt-2">
            <button 
              onClick={() => window.location.reload()}
              className="text-red-700 hover:text-red-900 underline text-sm"
            >
              Intentar nuevamente
            </button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (documents.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-gray-500">No hay documentos disponibles.</p>
        <p className="text-xs text-gray-400 mt-2">ID de compañía: {companyId}</p>
        {!isLoading && (
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Recargar página
          </button>
        )}
      </div>
    );
  }
  
  // Determinar si hay documentos duplicados o repetidos para una mejor visualización
  const uniqueDocuments = documents.filter((doc, index, self) => 
    index === self.findIndex((d) => d.id === doc.id)
  );
  
  // Mostrar el número adecuado de documentos según el estado de expansión
  const documentsToShow = isExpanded ? uniqueDocuments : uniqueDocuments.slice(0, visibleDocuments);
  
  // Ocultar el botón "Ver todos" si hay menos documentos que el límite inicial
  const showExpandButton = uniqueDocuments.length > visibleDocuments;
  
  // Función para alternar entre vista expandida y compacta
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold">
          Documentos Corporativos
        </h2>
        <span className="text-xs text-gray-500">
          {uniqueDocuments.length} {uniqueDocuments.length === 1 ? 'documento' : 'documentos'}
        </span>
      </div>
      
      {/* Documentos en formato de tarjetas compacto */}
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {documentsToShow.map((document) => (
          <a 
            key={document.id}
            href={document.fileURL} 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center border border-gray-100 rounded-md p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 mr-3">
              {getFileIcon(document.fileType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {document.title}
              </p>
              {document.description && (
                <p className="text-xs text-gray-500 truncate">
                  {document.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 ml-2">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
          </a>
        ))}
      </div>
      
      {/* Botón para expandir/colapsar */}
      {showExpandButton && (
        <div className="flex justify-center p-3 border-t border-gray-100">
          <button 
            onClick={toggleExpand}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center focus:outline-none"
          >
            {isExpanded ? (
              <>
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Mostrar menos
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Ver todos los documentos ({uniqueDocuments.length})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}