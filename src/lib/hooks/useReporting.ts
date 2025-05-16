import { useState, useCallback, useEffect, useContext } from 'react';
import { CompanyContext } from '@/lib/contexts/CompanyContext';
import { 
  getReportingSummary, 
  getReportTrends,
  getReportsByPeriod,
  exportReportingData,
  AdvancedReportingOptions,
  ReportingSummary,
  TrendAnalysis,
  ReportingChartData,
  getDefaultReportingOptions
} from '@/lib/services/reportingService';

export function useReporting() {
  const companyContext = useContext(CompanyContext);
  const { companyId } = companyContext;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportingSummary, setReportingSummary] = useState<ReportingSummary | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<ReportingChartData | null>(null);
  const [options, setOptions] = useState<AdvancedReportingOptions>(getDefaultReportingOptions());

  const loadSummary = useCallback(async (customOptions?: Partial<AdvancedReportingOptions>) => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const mergedOptions = { ...options, ...customOptions };
      const summary = await getReportingSummary(companyId, mergedOptions);
      setReportingSummary(summary);
      
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar resumen de reportes';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, options]);

  const loadTrends = useCallback(async (customOptions?: Partial<AdvancedReportingOptions>) => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const mergedOptions = { ...options, ...customOptions };
      const trends = await getReportTrends(companyId, mergedOptions);
      setTrendAnalysis(trends);
      
      return trends;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar tendencias';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId, options]);

  const loadTimeSeriesData = useCallback(async (customOptions?: Partial<AdvancedReportingOptions>) => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const mergedOptions = { ...options, ...customOptions };
      const data = await getReportsByPeriod(companyId, mergedOptions);
      setTimeSeriesData(data);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos de series temporales';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, options]);

  const exportData = useCallback(async (
    format: 'csv' | 'excel' | 'pdf', 
    customOptions?: Partial<AdvancedReportingOptions>
  ) => {
    if (!companyId) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const mergedOptions = { ...options, ...customOptions };
      const exportUrl = await exportReportingData(companyId, format, mergedOptions);
      
      return exportUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al exportar datos';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, options]);

  const updateOptions = useCallback((newOptions: Partial<AdvancedReportingOptions>) => {
    setOptions(prevOptions => ({
      ...prevOptions,
      ...newOptions
    }));
  }, []);

  const resetOptions = useCallback(() => {
    setOptions(getDefaultReportingOptions());
  }, []);

  // Cargar datos iniciales cuando cambia companyId
  useEffect(() => {
    if (companyId) {
      loadSummary();
    }
  }, [companyId, loadSummary]);

  return {
    isLoading,
    error,
    reportingSummary,
    trendAnalysis,
    timeSeriesData,
    options,
    loadSummary,
    loadTrends,
    loadTimeSeriesData,
    exportData,
    updateOptions,
    resetOptions
  };
}