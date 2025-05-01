'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LegalDocumentType, GeneratedLegalDocument } from '@/lib/services/aiService';
import { FilePlus, FileText, AlertTriangle, Check, Copy } from 'lucide-react';

interface LegalDocumentGeneratorProps {
  reportId?: string;
  reportData?: any;
  onDocumentGenerated?: (document: GeneratedLegalDocument) => void;
  generateDocument: (params: any) => Promise<GeneratedLegalDocument | null>;
  isLoading?: boolean;
  error?: string | null;
}

export default function LegalDocumentGenerator({
  reportId,
  reportData,
  onDocumentGenerated,
  generateDocument,
  isLoading = false,
  error = null
}: LegalDocumentGeneratorProps) {
  // Estados
  const [documentType, setDocumentType] = useState<LegalDocumentType>('informe_preliminar');
  const [additionalContext, setAdditionalContext] = useState('');
  const [tone, setTone] = useState<'formal' | 'neutral' | 'simple'>('formal');
  const [length, setLength] = useState<'concise' | 'standard' | 'detailed'>('standard');
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedLegalDocument | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // Diccionario de nombres para tipos de documentos
  const documentTypeNames: Record<LegalDocumentType, string> = {
    'informe_preliminar': 'Informe Preliminar',
    'informe_final': 'Informe Final',
    'notificacion_dt': 'Notificación Dirección del Trabajo',
    'plan_investigacion': 'Plan de Investigación',
    'carta_notificacion': 'Carta de Notificación',
    'acta_entrevista': 'Acta de Entrevista',
    'resolucion': 'Resolución'
  };
  
  // Opción seleccionada para el tipo de documento
  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDocumentType(e.target.value as LegalDocumentType);
  };
  
  // Manejar solicitud de generación
  const handleGenerateDocument = async () => {
    if (!reportData) return;
    
    const params = {
      documentType,
      caseData: {
        reportId,
        category: reportData.category,
        description: reportData.detailedDescription,
        involvedPersons: reportData.involvedPersons,
        date: reportData.createdAt,
        isKarinLaw: reportData.isKarinLaw,
        company: {
          name: reportData.companyName || 'La Empresa',
          rut: reportData.companyRut || '',
          address: reportData.companyAddress || ''
        }
      },
      authorData: {
        name: reportData.currentUserName || 'Investigador',
        position: reportData.currentUserPosition || 'Investigador Asignado'
      },
      additionalContext,
      tone,
      length
    };
    
    const result = await generateDocument(params);
    
    if (result) {
      setGeneratedDocument(result);
      if (onDocumentGenerated) {
        onDocumentGenerated(result);
      }
    }
  };
  
  // Manejar copia al portapapeles
  const handleCopyToClipboard = () => {
    if (generatedDocument) {
      navigator.clipboard.writeText(generatedDocument.content)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          console.error('Error al copiar al portapapeles:', err);
        });
    }
  };
  
  // Renderizar el documento generado
  const renderGeneratedDocument = () => {
    if (!generatedDocument) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{generatedDocument.title}</h3>
          <Button 
            size="sm" 
            onClick={handleCopyToClipboard} 
            variant="outline"
            className="flex items-center gap-1"
          >
            {isCopied ? (
              <>
                <Check size={14} />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar</span>
              </>
            )}
          </Button>
        </div>
        
        {/* Advertencias si existen */}
        {generatedDocument.warnings && generatedDocument.warnings.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            <AlertDescription>
              <ul className="list-disc pl-5 text-sm text-yellow-700">
                {generatedDocument.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Contenido formateado del documento */}
        <div className="p-4 border rounded-md bg-gray-50 font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
          {generatedDocument.content}
        </div>
        
        {/* Recomendaciones si existen */}
        {generatedDocument.recommendations && generatedDocument.recommendations.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <h4 className="font-medium text-blue-700 mb-2">Recomendaciones</h4>
            <ul className="list-disc pl-5 text-sm text-blue-700">
              {generatedDocument.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={18} />
          Asistente de Redacción Legal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {!generatedDocument ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentType">Tipo de documento</Label>
              <Select
                id="documentType"
                value={documentType}
                onChange={handleDocumentTypeChange}
                disabled={isLoading}
              >
                {Object.entries(documentTypeNames).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Seleccione el tipo de documento legal que desea generar
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tone">Tono</Label>
                <Select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="formal">Formal</option>
                  <option value="neutral">Neutral</option>
                  <option value="simple">Simple</option>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="length">Extensión</Label>
                <Select
                  id="length"
                  value={length}
                  onChange={(e) => setLength(e.target.value as any)}
                  disabled={isLoading}
                >
                  <option value="concise">Conciso</option>
                  <option value="standard">Estándar</option>
                  <option value="detailed">Detallado</option>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="context">Instrucciones adicionales (opcional)</Label>
              <Textarea
                id="context"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Incluya detalles específicos que desee que se incluyan en el documento..."
                disabled={isLoading}
                rows={3}
              />
            </div>
          </div>
        ) : (
          renderGeneratedDocument()
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {!generatedDocument ? (
          <Button 
            onClick={handleGenerateDocument} 
            disabled={isLoading || !reportData}
            className="flex items-center gap-1"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FilePlus size={16} />
                <span>Generar Documento</span>
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={() => setGeneratedDocument(null)} 
            variant="outline"
          >
            Crear Nuevo Documento
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}