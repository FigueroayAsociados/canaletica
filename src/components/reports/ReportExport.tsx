import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useReporting } from '@/lib/hooks/useReporting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdvancedReportingOptions } from '@/lib/services/reportingService';

interface ReportExportProps {
  options?: Partial<AdvancedReportingOptions>;
  onExportComplete?: (url: string) => void;
}

export function ReportExport({ 
  options, 
  onExportComplete 
}: ReportExportProps) {
  const { exportData, isLoading } = useReporting();
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('pdf');

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExportFormat(format);
    try {
      const url = await exportData(format, options);
      if (url) {
        setExportUrl(url);
        if (onExportComplete) {
          onExportComplete(url);
        }
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar Reporte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Seleccione el formato para exportar el reporte con los filtros actuales:
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={isLoading}
            >
              <span className="mr-2">📊</span> CSV
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              disabled={isLoading}
            >
              <span className="mr-2">📑</span> Excel
            </Button>
            
            <Button
              variant="default"
              onClick={() => handleExport('pdf')}
              disabled={isLoading}
            >
              <span className="mr-2">📄</span> PDF
            </Button>
          </div>
          
          {isLoading && (
            <div className="text-center mt-4">
              <div className="inline-block animate-spin text-primary mb-2">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-sm text-gray-500">Generando {exportFormat.toUpperCase()}...</p>
            </div>
          )}
          
          {exportUrl && !isLoading && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">¡Reporte generado correctamente!</p>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{exportUrl.split('/').pop()}</p>
                <a 
                  href={exportUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  <Button size="sm" variant="outline">
                    Descargar
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}