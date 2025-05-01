import { db } from '../firebase/admin';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, DocumentData } from 'firebase/firestore';
import { format, subMonths, subDays } from 'date-fns';

export interface ReportingDataPoint {
  date: string;
  value: number;
  category?: string;
}

export interface ReportingDataSeries {
  id: string;
  name: string;
  data: ReportingDataPoint[];
}

export interface ReportingChartData {
  series: ReportingDataSeries[];
  categories?: string[];
}

export interface ReportingSummary {
  totalReports: number;
  recentReports: number;
  pendingReports: number;
  resolvedReports: number;
  averageResolutionTime: number;
  complianceRate: number;
  riskDistribution: Record<string, number>;
  reportsOverTime: ReportingChartData;
  categoryDistribution: {
    name: string;
    value: number;
  }[];
  statusDistribution: {
    name: string;
    value: number;
  }[];
}

export interface TrendAnalysis {
  id: string;
  title: string;
  description: string;
  changePercentage: number;
  isPositive: boolean;
  data?: ReportingDataSeries[];
}

export interface AdvancedReportingOptions {
  timeframe?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  statuses?: string[];
  groupBy?: 'day' | 'week' | 'month';
  includeAIInsights?: boolean;
}

const DEFAULT_OPTIONS: AdvancedReportingOptions = {
  timeframe: 'month',
  groupBy: 'day',
  includeAIInsights: false
};

export const getDefaultReportingOptions = (): AdvancedReportingOptions => ({
  ...DEFAULT_OPTIONS
});

export async function getReportingSummary(
  companyId: string, 
  options: AdvancedReportingOptions = DEFAULT_OPTIONS
): Promise<ReportingSummary> {
  try {
    // Determinar fechas basadas en timeframe
    const endDate = options.endDate || new Date();
    let startDate: Date;
    
    if (options.startDate) {
      startDate = options.startDate;
    } else {
      switch (options.timeframe) {
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'quarter':
          startDate = subMonths(endDate, 3);
          break;
        case 'year':
          startDate = subMonths(endDate, 12);
          break;
        case 'month':
        default:
          startDate = subMonths(endDate, 1);
      }
    }

    // Simulación de datos para el prototipo
    // En producción, aquí iría la lógica real de consulta a Firestore
    return {
      totalReports: 156,
      recentReports: 32,
      pendingReports: 28,
      resolvedReports: 98,
      averageResolutionTime: 8.2, // días
      complianceRate: 94.5, // porcentaje
      riskDistribution: {
        high: 18,
        medium: 43,
        low: 95
      },
      reportsOverTime: generateTimeSeriesData(startDate, endDate, options.groupBy || 'day'),
      categoryDistribution: [
        { name: 'Ley Karin', value: 52 },
        { name: 'Prevención de Delitos', value: 38 },
        { name: 'Reglamento Interno', value: 26 },
        { name: 'Políticas y Códigos', value: 19 },
        { name: 'Ciberseguridad', value: 12 },
        { name: 'Represalias', value: 6 },
        { name: 'Otros', value: 3 }
      ],
      statusDistribution: [
        { name: 'Resuelta', value: 98 },
        { name: 'En Investigación', value: 24 },
        { name: 'Nueva', value: 16 },
        { name: 'Pendiente Información', value: 10 },
        { name: 'Cerrada', value: 4 },
        { name: 'Rechazada', value: 4 }
      ]
    };
    
  } catch (error) {
    console.error('Error getting reporting summary:', error);
    throw new Error('Failed to get reporting summary');
  }
}

export async function getReportTrends(
  companyId: string,
  options: AdvancedReportingOptions = DEFAULT_OPTIONS
): Promise<TrendAnalysis[]> {
  try {
    // Simulación de datos para el prototipo
    return [
      {
        id: 'trend-1',
        title: 'Aumento en Denuncias Ley Karin',
        description: 'Se ha detectado un incremento del 34% en denuncias relacionadas con Ley Karin en el último mes',
        changePercentage: 34,
        isPositive: false,
        data: [{
          id: 'ley-karin',
          name: 'Ley Karin',
          data: [
            { date: '2023-01', value: 4 },
            { date: '2023-02', value: 5 },
            { date: '2023-03', value: 6 },
            { date: '2023-04', value: 12 },
            { date: '2023-05', value: 16 }
          ]
        }]
      },
      {
        id: 'trend-2',
        title: 'Mejora en Tiempos de Resolución',
        description: 'El tiempo medio de resolución ha disminuido un 28%, pasando de 11.4 a 8.2 días',
        changePercentage: 28,
        isPositive: true,
        data: [{
          id: 'tiempo-resolucion',
          name: 'Tiempo de Resolución (días)',
          data: [
            { date: '2023-01', value: 12.3 },
            { date: '2023-02', value: 11.8 },
            { date: '2023-03', value: 11.4 },
            { date: '2023-04', value: 9.6 },
            { date: '2023-05', value: 8.2 }
          ]
        }]
      },
      {
        id: 'trend-3',
        title: 'Cambio en Distribución de Categorías',
        description: 'La proporción de denuncias de Ciberseguridad ha aumentado un 15% respecto al trimestre anterior',
        changePercentage: 15,
        isPositive: false
      }
    ];
  } catch (error) {
    console.error('Error getting report trends:', error);
    throw new Error('Failed to get report trends');
  }
}

export async function getReportsByPeriod(
  companyId: string,
  options: AdvancedReportingOptions = DEFAULT_OPTIONS
): Promise<ReportingChartData> {
  try {
    const endDate = options.endDate || new Date();
    let startDate: Date;
    
    if (options.startDate) {
      startDate = options.startDate;
    } else {
      startDate = subMonths(endDate, options.timeframe === 'year' ? 12 : 3);
    }
    
    return generateTimeSeriesData(startDate, endDate, options.groupBy || 'day');
  } catch (error) {
    console.error('Error getting reports by period:', error);
    throw new Error('Failed to get reports by period');
  }
}

export async function exportReportingData(
  companyId: string,
  format: 'csv' | 'excel' | 'pdf',
  options: AdvancedReportingOptions = DEFAULT_OPTIONS
): Promise<string> {
  try {
    // Simulación de exportación
    // En producción, aquí generaríamos el archivo real y devolveríamos la URL
    
    const exportId = Math.random().toString(36).substring(2, 15);
    
    return {
      csv: `https://storage.googleapis.com/exports/canaletica/${companyId}/report_export_${exportId}.csv`,
      excel: `https://storage.googleapis.com/exports/canaletica/${companyId}/report_export_${exportId}.xlsx`,
      pdf: `https://storage.googleapis.com/exports/canaletica/${companyId}/report_export_${exportId}.pdf`
    }[format] || '';
    
  } catch (error) {
    console.error('Error exporting reporting data:', error);
    throw new Error('Failed to export reporting data');
  }
}

// Función auxiliar para generar datos de series temporales simulados
function generateTimeSeriesData(
  startDate: Date, 
  endDate: Date, 
  groupBy: 'day' | 'week' | 'month' = 'day'
): ReportingChartData {
  const formatMapping = {
    day: 'yyyy-MM-dd',
    week: 'yyyy-[W]ww',
    month: 'yyyy-MM'
  };
  
  const formatStr = formatMapping[groupBy];
  
  // Generar series para total y categorías principales
  const totalSeries: ReportingDataPoint[] = [];
  const karinSeries: ReportingDataPoint[] = [];
  const prevencionSeries: ReportingDataPoint[] = [];
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, formatStr);
    
    // Valores aleatorios pero coherentes
    const baseValue = Math.floor(Math.random() * 6) + 1;
    const karinValue = Math.floor(Math.random() * 3);
    const prevencionValue = Math.floor(Math.random() * 2);
    
    totalSeries.push({ date: dateStr, value: baseValue + karinValue + prevencionValue });
    karinSeries.push({ date: dateStr, value: karinValue });
    prevencionSeries.push({ date: dateStr, value: prevencionValue });
    
    // Avanzar al siguiente período
    switch (groupBy) {
      case 'day':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'week':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
  }
  
  return {
    series: [
      {
        id: 'total',
        name: 'Total Denuncias',
        data: totalSeries
      },
      {
        id: 'ley_karin',
        name: 'Ley Karin',
        data: karinSeries
      },
      {
        id: 'prevencion',
        name: 'Prevención de Delitos',
        data: prevencionSeries
      }
    ]
  };
}