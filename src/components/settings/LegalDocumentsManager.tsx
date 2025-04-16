'use client';

import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useTermsDocument, usePrivacyDocument, useSaveTermsAndConditions, useSavePrivacyPolicy } from '@/lib/hooks/useDocuments';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants';
import { Spinner } from '@/components/ui/spinner';

interface LegalDocumentsManagerProps {
  companyId: string;
}

export function LegalDocumentsManager({ companyId = DEFAULT_COMPANY_ID }: LegalDocumentsManagerProps) {
  // Estados para términos y condiciones
  const [termsContent, setTermsContent] = useState('');
  const [termsHtml, setTermsHtml] = useState('');
  const [termsTitle, setTermsTitle] = useState('Términos y Condiciones del Canal de Denuncias');
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  
  // Estados para política de privacidad
  const [privacyContent, setPrivacyContent] = useState('');
  const [privacyHtml, setPrivacyHtml] = useState('');
  const [privacyTitle, setPrivacyTitle] = useState('Política de Privacidad y Tratamiento de Datos Personales');
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);
  
  // Estados para mostrar mensajes
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Función para procesar markdown a HTML
  const processMarkdown = async (markdown: string) => {
    try {
      if (!markdown) return '';
      
      return marked.parse(markdown, {
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert line breaks to <br>
        sanitize: true, // Sanitize HTML for security
        smartLists: true, // Use smarter list behavior
        smartypants: true // Use smart typography
      });
    } catch (error) {
      console.error("Error al procesar markdown:", error);
      return `<p class="text-red-500">Error al procesar el contenido. Por favor, revise el formato.</p>`;
    }
  };
  
  // Recuperar documentos existentes
  const { data: termsData, isLoading: isLoadingTerms } = useTermsDocument(companyId);
  const { data: privacyData, isLoading: isLoadingPrivacy } = usePrivacyDocument(companyId);
  
  // Mutaciones para guardar documentos
  const saveTermsMutation = useSaveTermsAndConditions();
  const savePrivacyMutation = useSavePrivacyPolicy();
  
  // Cargar contenido de los documentos existentes
  useEffect(() => {
    const loadDocumentContent = async () => {
      try {
        // Cargar términos y condiciones si existe
        try {
          if (termsData?.success && termsData.document && termsData.document.fileURL) {
            const response = await fetch(termsData.document.fileURL);
            if (!response.ok) throw new Error(`Error al cargar documento: ${response.status}`);
            
            const content = await response.text();
            setTermsContent(content);
            // Procesar markdown para la vista previa
            const htmlContent = await processMarkdown(content);
            setTermsHtml(htmlContent);
            if (termsData.document.title) {
              setTermsTitle(termsData.document.title);
            }
          } else {
            // Si no hay documento en Firebase, cargar desde el archivo estático
            const staticResponse = await fetch('/terminos-condiciones.md');
            if (!staticResponse.ok) throw new Error(`Error al cargar archivo estático: ${staticResponse.status}`);
            
            const staticContent = await staticResponse.text();
            setTermsContent(staticContent);
            // Procesar markdown para la vista previa
            const htmlContent = await processMarkdown(staticContent);
            setTermsHtml(htmlContent);
          }
        } catch (termsError) {
          console.error("Error al cargar términos y condiciones:", termsError);
          setTermsContent('# Error\n\nNo se pudo cargar el contenido de los términos y condiciones.');
          setTermsHtml('<h1>Error</h1><p>No se pudo cargar el contenido de los términos y condiciones.</p>');
          setErrorMessage("Error al cargar los términos y condiciones. Por favor, intente nuevamente.");
        }
        
        // Cargar política de privacidad si existe
        try {
          if (privacyData?.success && privacyData.document && privacyData.document.fileURL) {
            const response = await fetch(privacyData.document.fileURL);
            if (!response.ok) throw new Error(`Error al cargar documento: ${response.status}`);
            
            const content = await response.text();
            setPrivacyContent(content);
            // Procesar markdown para la vista previa
            const htmlContent = await processMarkdown(content);
            setPrivacyHtml(htmlContent);
            if (privacyData.document.title) {
              setPrivacyTitle(privacyData.document.title);
            }
          } else {
            // Si no hay documento en Firebase, cargar desde el archivo estático
            const staticResponse = await fetch('/politica-privacidad.md');
            if (!staticResponse.ok) throw new Error(`Error al cargar archivo estático: ${staticResponse.status}`);
            
            const staticContent = await staticResponse.text();
            setPrivacyContent(staticContent);
            // Procesar markdown para la vista previa
            const htmlContent = await processMarkdown(staticContent);
            setPrivacyHtml(htmlContent);
          }
        } catch (privacyError) {
          console.error("Error al cargar política de privacidad:", privacyError);
          setPrivacyContent('# Error\n\nNo se pudo cargar el contenido de la política de privacidad.');
          setPrivacyHtml('<h1>Error</h1><p>No se pudo cargar el contenido de la política de privacidad.</p>');
          setErrorMessage("Error al cargar la política de privacidad. Por favor, intente nuevamente.");
        }
      } catch (error) {
        console.error("Error general al cargar el contenido de los documentos:", error);
        setErrorMessage("Error al cargar los documentos. Por favor, intente nuevamente.");
      }
    };
    
    loadDocumentContent();
  }, [termsData, privacyData]);
  
  // Guardar términos y condiciones
  const handleSaveTerms = async () => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      
      const result = await saveTermsMutation.mutateAsync({
        companyId,
        termsContent,
        title: termsTitle
      });
      
      if (result) {
        setSuccessMessage("Términos y condiciones actualizados correctamente");
        setIsEditingTerms(false);
      } else {
        setErrorMessage("Error al guardar los términos y condiciones");
      }
    } catch (error) {
      console.error("Error al guardar términos:", error);
      setErrorMessage("Error al guardar los términos y condiciones: " + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  // Guardar política de privacidad
  const handleSavePrivacy = async () => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      
      const result = await savePrivacyMutation.mutateAsync({
        companyId,
        privacyContent,
        title: privacyTitle
      });
      
      if (result) {
        setSuccessMessage("Política de privacidad actualizada correctamente");
        setIsEditingPrivacy(false);
      } else {
        setErrorMessage("Error al guardar la política de privacidad");
      }
    } catch (error) {
      console.error("Error al guardar política de privacidad:", error);
      setErrorMessage("Error al guardar la política de privacidad: " + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  // Cancelar edición
  const handleCancelTerms = () => {
    if (termsData?.success && termsData.document && termsData.document.fileURL) {
      fetch(termsData.document.fileURL)
        .then(response => response.text())
        .then(async content => {
          setTermsContent(content);
          // Procesar markdown para la vista previa
          const htmlContent = await processMarkdown(content);
          setTermsHtml(htmlContent);
          if (termsData.document?.title) {
            setTermsTitle(termsData.document.title);
          }
        })
        .catch(err => console.error("Error al recargar términos:", err));
    }
    setIsEditingTerms(false);
  };
  
  const handleCancelPrivacy = () => {
    if (privacyData?.success && privacyData.document && privacyData.document.fileURL) {
      fetch(privacyData.document.fileURL)
        .then(response => response.text())
        .then(async content => {
          setPrivacyContent(content);
          // Procesar markdown para la vista previa
          const htmlContent = await processMarkdown(content);
          setPrivacyHtml(htmlContent);
          if (privacyData.document?.title) {
            setPrivacyTitle(privacyData.document.title);
          }
        })
        .catch(err => console.error("Error al recargar política:", err));
    }
    setIsEditingPrivacy(false);
  };
  
  // Manejar cambios en el contenido
  const handleTermsContentChange = async (e) => {
    const content = e.target.value;
    setTermsContent(content);
    // Actualizar vista previa en tiempo real (opcional)
    const htmlContent = await processMarkdown(content);
    setTermsHtml(htmlContent);
  };
  
  const handlePrivacyContentChange = async (e) => {
    const content = e.target.value;
    setPrivacyContent(content);
    // Actualizar vista previa en tiempo real (opcional)
    const htmlContent = await processMarkdown(content);
    setPrivacyHtml(htmlContent);
  };
  
  // Resetear a valores predeterminados
  const handleResetTerms = async () => {
    try {
      const staticResponse = await fetch('/terminos-condiciones.md');
      const staticContent = await staticResponse.text();
      setTermsContent(staticContent);
      // Procesar markdown para la vista previa
      const htmlContent = await processMarkdown(staticContent);
      setTermsHtml(htmlContent);
      setTermsTitle('Términos y Condiciones del Canal de Denuncias');
    } catch (err) {
      console.error("No se pudo cargar el archivo predeterminado de términos:", err);
      setErrorMessage("Error al cargar los términos predeterminados");
    }
  };
  
  const handleResetPrivacy = async () => {
    try {
      const staticResponse = await fetch('/politica-privacidad.md');
      const staticContent = await staticResponse.text();
      setPrivacyContent(staticContent);
      // Procesar markdown para la vista previa
      const htmlContent = await processMarkdown(staticContent);
      setPrivacyHtml(htmlContent);
      setPrivacyTitle('Política de Privacidad y Tratamiento de Datos Personales');
    } catch (err) {
      console.error("No se pudo cargar el archivo predeterminado de privacidad:", err);
      setErrorMessage("Error al cargar la política predeterminada");
    }
  };

  // Renderizado condicional para mostrar carga
  if (isLoadingTerms || isLoadingPrivacy) {
    return <Spinner text="Cargando documentos legales..." />;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Documentos Legales</h2>
      
      {/* Mensajes de error o éxito */}
      {errorMessage && (
        <Alert variant="error" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Términos y Condiciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Términos y Condiciones</CardTitle>
          <div className="flex space-x-2">
            {!isEditingTerms ? (
              <Button 
                onClick={() => setIsEditingTerms(true)}
                variant="outline"
                size="sm"
              >
                Editar
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleCancelTerms}
                  variant="outline"
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveTerms}
                  variant="primary"
                  size="sm"
                  disabled={saveTermsMutation.isPending}
                >
                  {saveTermsMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button 
                  onClick={handleResetTerms}
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  size="sm"
                >
                  Restaurar predeterminado
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingTerms ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="termsTitle">Título del documento</Label>
                <Input
                  id="termsTitle"
                  value={termsTitle}
                  onChange={(e) => setTermsTitle(e.target.value)}
                  className="mb-2"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="termsContent">Contenido (Markdown)</Label>
                  <Textarea
                    id="termsContent"
                    value={termsContent}
                    onChange={handleTermsContentChange}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Utilice Markdown para dar formato al texto. Este contenido se mostrará en el modal de términos y condiciones.
                  </p>
                </div>
                
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <p className="font-medium">Tips para formatear el texto:</p>
                  <ul className="pl-4 mt-1 list-disc space-y-1">
                    <li>Use <code className="bg-gray-100 px-1 rounded"># Título</code> para títulos principales</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">## Subtítulo</code> para subtítulos</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">**texto**</code> para texto en negrita</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">* Item</code> para listas con viñetas</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">1. Item</code> para listas numeradas</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">[texto](url)</code> para enlaces</li>
                  </ul>
                </div>
                
                <div>
                  <Label htmlFor="termsPreview">Vista previa</Label>
                  <div className="border rounded-md p-4 max-h-96 overflow-y-auto mt-2 bg-white">
                    <div dangerouslySetInnerHTML={{ __html: termsHtml }} className="markdown-content" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: termsHtml }} className="markdown-content" />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Política de Privacidad */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Política de Privacidad</CardTitle>
          <div className="flex space-x-2">
            {!isEditingPrivacy ? (
              <Button 
                onClick={() => setIsEditingPrivacy(true)}
                variant="outline"
                size="sm"
              >
                Editar
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleCancelPrivacy}
                  variant="outline"
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSavePrivacy}
                  variant="primary"
                  size="sm"
                  disabled={savePrivacyMutation.isPending}
                >
                  {savePrivacyMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button 
                  onClick={handleResetPrivacy}
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  size="sm"
                >
                  Restaurar predeterminado
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingPrivacy ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="privacyTitle">Título del documento</Label>
                <Input
                  id="privacyTitle"
                  value={privacyTitle}
                  onChange={(e) => setPrivacyTitle(e.target.value)}
                  className="mb-2"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="privacyContent">Contenido (Markdown)</Label>
                  <Textarea
                    id="privacyContent"
                    value={privacyContent}
                    onChange={handlePrivacyContentChange}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Utilice Markdown para dar formato al texto. Este contenido se mostrará en el modal de política de privacidad.
                  </p>
                </div>
                
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <p className="font-medium">Tips para formatear el texto:</p>
                  <ul className="pl-4 mt-1 list-disc space-y-1">
                    <li>Use <code className="bg-gray-100 px-1 rounded"># Título</code> para títulos principales</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">## Subtítulo</code> para subtítulos</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">**texto**</code> para texto en negrita</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">* Item</code> para listas con viñetas</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">1. Item</code> para listas numeradas</li>
                    <li>Use <code className="bg-gray-100 px-1 rounded">[texto](url)</code> para enlaces</li>
                  </ul>
                </div>
                
                <div>
                  <Label htmlFor="privacyPreview">Vista previa</Label>
                  <div className="border rounded-md p-4 max-h-96 overflow-y-auto mt-2 bg-white">
                    <div dangerouslySetInnerHTML={{ __html: privacyHtml }} className="markdown-content" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: privacyHtml }} className="markdown-content" />
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
        <h3 className="font-medium">Importante</h3>
        <p className="mt-1">
          Los documentos legales son críticos para cumplir con la normativa vigente. Asegúrese de que cualquier modificación
          cumple con los requisitos legales, especialmente las referencias a la Ley Karin y la norma ISO 37002:2021.
        </p>
        <p className="mt-2">
          Los cambios realizados aquí afectarán inmediatamente los documentos mostrados a los usuarios en la página principal.
        </p>
      </div>
    </div>
  );
}