'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GeneratedLegalDocument } from '@/lib/services/aiService';
import { AlertTriangle, Check, Copy, Download, Printer, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LegalDocumentViewerProps {
  document: GeneratedLegalDocument;
  onBack?: () => void;
  onSave?: (document: GeneratedLegalDocument) => void;
}

export default function LegalDocumentViewer({
  document,
  onBack,
  onSave
}: LegalDocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'full' | 'sections'>('full');
  const [isCopied, setIsCopied] = useState(false);
  
  // Manejar copia al portapapeles
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(document.content)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Error al copiar al portapapeles:', err);
      });
  };
  
  // Manejar descarga como txt
  const handleDownload = () => {
    const blob = new Blob([document.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Manejar impresión
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 2cm; }
              h1 { text-align: center; margin-bottom: 1cm; }
              h2 { margin-top: 0.8cm; border-bottom: 1px solid #ccc; padding-bottom: 0.2cm; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <h1>${document.title}</h1>
            <pre>${document.content}</pre>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} />
            <span>{document.title}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleCopyToClipboard}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              <span className="hidden md:inline">{isCopied ? 'Copiado' : 'Copiar'}</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleDownload}
            >
              <Download size={14} />
              <span className="hidden md:inline">Descargar</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handlePrint}
            >
              <Printer size={14} />
              <span className="hidden md:inline">Imprimir</span>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de vista (documento completo o por secciones) */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('full')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'full'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Documento Completo
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sections'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Por Secciones
            </button>
          </nav>
        </div>
        
        {/* Advertencias si existen */}
        {document.warnings && document.warnings.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            <AlertDescription>
              <ul className="list-disc pl-5 text-sm text-yellow-700">
                {document.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Contenido del documento */}
        {activeTab === 'full' ? (
          <div className="p-4 border rounded-md bg-gray-50 font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {document.content}
          </div>
        ) : (
          <div className="space-y-6">
            {document.sections.map((section, index) => (
              <div key={index} className="border rounded-md overflow-hidden">
                <div className="bg-gray-100 p-3 font-medium">
                  {section.title}
                </div>
                <div className="p-4 text-sm whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Recomendaciones si existen */}
        {document.recommendations && document.recommendations.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <h4 className="font-medium text-blue-700 mb-2">Recomendaciones</h4>
            <ul className="list-disc pl-5 text-sm text-blue-700">
              {document.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {onBack && (
          <Button 
            onClick={onBack} 
            variant="outline"
          >
            Volver
          </Button>
        )}
        
        {onSave && (
          <Button 
            onClick={() => onSave(document)}
          >
            Guardar Documento
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}