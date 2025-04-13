// src/components/reports/ExportReportPDF.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Importamos dinámicamente para evitar problemas de SSR
import dynamic from 'next/dynamic';
// El servicio se importará en el método cuando sea necesario

interface ExportReportPDFProps {
  report: any;
  includeEvidence?: boolean;
  includeCommunications?: boolean;
  includeActivities?: boolean;
}

const ExportReportPDF: React.FC<ExportReportPDFProps> = ({
  report,
  includeEvidence: defaultIncludeEvidence = true,
  includeCommunications: defaultIncludeCommunications = true,
  includeActivities: defaultIncludeActivities = true,
}) => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  
  // Estados para todas las opciones de exportación
  const [includeEvidence, setIncludeEvidence] = useState(defaultIncludeEvidence);
  const [includeCommunications, setIncludeCommunications] = useState(defaultIncludeCommunications);
  const [includeActivities, setIncludeActivities] = useState(defaultIncludeActivities);
  const [includeKarinDocuments, setIncludeKarinDocuments] = useState(true);
  const [addWatermark, setAddWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [generateIndex, setGenerateIndex] = useState(true);

  // Función para formatear fechas
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    const dateObj = date.toDate ? new Date(date.toDate()) : new Date(date);
    
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  // Función para generar el PDF
  const generatePDF = async () => {
    setExporting(true);
    setError(null);

    try {
      // Obtener companyId de donde proceda en una implementación real
      // (probablemente del contexto o de report.companyId)
      const companyId = report.companyId || 'default-company-id';
      const reportId = report.id;

      // Configuración para la generación del PDF
      const exportOptions = {
        format: 'pdf' as const,
        includeInternalCommunications: includeCommunications,
        includeTimeline: includeActivities,
        includeSummary: true,
        includeAttachments: includeEvidence,
        generateTableOfContents: generateIndex,
        watermark: addWatermark ? watermarkText : (report.isDeleted ? 'ANULADO' : undefined),
        includeKarinDocuments: report.isKarinLaw ? includeKarinDocuments : false,
        includeHeaders: true,
        includeFooters: true,
        password: undefined, // Opcional: añadir contraseña si se requiere mayor seguridad
      };

      try {
        // Importar dinámicamente el servicio de reportes para evitar problemas de SSR
        const reportService = await import('@/lib/services/reportService');
        
        // Llamar a la función real que genera el PDF
        const result = await reportService.generateDigitalFilePDF(companyId, reportId, exportOptions);

        if (result.success) {
          // Abrir el PDF en una nueva ventana o descargarlo
          window.open(result.downloadUrl, '_blank');
        } else {
          setError(result.error || 'No se pudo generar el PDF');
        }
      } catch (importError) {
        console.error('Error al importar el servicio de reportes:', importError);
        setError('Error al cargar el generador de PDF. Por favor, inténtelo de nuevo más tarde.');
      }
    } catch (err) {
      console.error('Error al generar PDF:', err);
      setError('Error al generar el PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <div className="relative">
      <Button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center"
        variant="outline"
      >
        <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Generar Expediente
      </Button>

      {showOptions && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Opciones de expediente</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="include-evidence"
                checked={includeEvidence}
                onChange={(e) => setIncludeEvidence(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <label htmlFor="include-evidence" className="ml-2 block text-sm text-gray-700">
                Incluir evidencias
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="include-communications"
                checked={includeCommunications}
                onChange={(e) => setIncludeCommunications(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <label htmlFor="include-communications" className="ml-2 block text-sm text-gray-700">
                Incluir comunicaciones
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="include-activities"
                checked={includeActivities}
                onChange={(e) => setIncludeActivities(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <label htmlFor="include-activities" className="ml-2 block text-sm text-gray-700">
                Incluir actividades
              </label>
            </div>
            
            {report.isKarinLaw && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="include-karin-docs"
                  checked={includeKarinDocuments}
                  onChange={(e) => setIncludeKarinDocuments(e.target.checked)}
                  className="h-4 w-4 text-primary border-gray-300 rounded"
                />
                <label htmlFor="include-karin-docs" className="ml-2 block text-sm text-gray-700">
                  Incluir documentos Ley Karin
                </label>
              </div>
            )}
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="add-watermark"
                checked={addWatermark}
                onChange={(e) => setAddWatermark(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <label htmlFor="add-watermark" className="ml-2 block text-sm text-gray-700">
                Agregar marca de agua
              </label>
            </div>
            
            {addWatermark && (
              <div className="ml-6">
                <input
                  type="text"
                  placeholder="Texto de marca de agua"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
            )}
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="generate-index"
                checked={generateIndex}
                onChange={(e) => setGenerateIndex(e.target.checked)}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <label htmlFor="generate-index" className="ml-2 block text-sm text-gray-700">
                Generar índice
              </label>
            </div>
            
            <div className="pt-3 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptions(false)}
              >
                Cancelar
              </Button>
              
              <Button
                onClick={generatePDF}
                disabled={exporting}
                size="sm"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando...
                  </>
                ) : (
                  'Generar PDF'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ExportReportPDF;