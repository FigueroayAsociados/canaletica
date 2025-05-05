// src/lib/services/aiDataAdapter.ts

import { AIInsight } from './aiService';
import { Report } from '@/types/report';

/**
 * Interfaz para métricas de resumen utilizadas en insights
 */
export interface SummaryMetrics {
  totalReports: number;
  openReports: number;
  closedReports: number;
  averageResolutionTime: number; // en días
  reportsByCategory: Record<string, number>;
  reportsByStatus: Record<string, number>;
  reportsByMonth: Record<string, number>;
}

/**
 * Convierte datos reales de reportes en insights para el Dashboard de IA
 * @param reports Lista de reportes de la base de datos
 * @param timeRange Rango de tiempo para filtrar reportes
 * @returns Insights generados a partir de datos reales
 */
export function generateInsightsFromReports(
  reports: Report[], 
  timeRange: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month'
): AIInsight[] {
  // Validación de entrada
  if (!Array.isArray(reports)) {
    console.error('generateInsightsFromReports: reports no es un array');
    return [];
  }

  // Filtrar reportes por rango de tiempo
  const filteredReports = filterReportsByTimeRange(reports, timeRange);
  
  // Si no hay reportes, retornar array vacío
  if (filteredReports.length === 0) {
    return [];
  }

  // Calcular métricas de resumen
  const metrics = calculateSummaryMetrics(filteredReports);

  // Generar insights de tendencias
  const trendInsights = generateTrendInsights(filteredReports, metrics);
  
  // Generar insights de riesgos
  const riskInsights = generateRiskInsights(filteredReports, metrics);
  
  // Generar recomendaciones
  const recommendationInsights = generateRecommendationInsights(metrics);
  
  // Generar insights de eficiencia
  const efficiencyInsights = generateEfficiencyInsights(filteredReports, metrics);

  // Combinar todos los insights
  return [
    ...trendInsights,
    ...riskInsights,
    ...recommendationInsights,
    ...efficiencyInsights
  ];
}

/**
 * Filtra los reportes según el rango de tiempo especificado
 */
function filterReportsByTimeRange(
  reports: Report[],
  timeRange: 'week' | 'month' | 'quarter' | 'year' | 'all'
): Report[] {
  if (timeRange === 'all') {
    return reports;
  }

  const now = new Date();
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  
  let cutoffDate: Date;
  
  switch (timeRange) {
    case 'week':
      cutoffDate = new Date(now.getTime() - 7 * millisecondsInDay);
      break;
    case 'month':
      cutoffDate = new Date(now.getTime() - 30 * millisecondsInDay);
      break;
    case 'quarter':
      cutoffDate = new Date(now.getTime() - 90 * millisecondsInDay);
      break;
    case 'year':
      cutoffDate = new Date(now.getTime() - 365 * millisecondsInDay);
      break;
    default:
      cutoffDate = new Date(now.getTime() - 30 * millisecondsInDay);
  }

  return reports.filter(report => {
    // Usar la fecha de creación del reporte
    const reportDate = report.createdAt ? new Date(report.createdAt) : null;
    if (!reportDate) return false;
    
    return reportDate >= cutoffDate;
  });
}

/**
 * Calcula métricas de resumen a partir de reportes
 */
function calculateSummaryMetrics(reports: Report[]): SummaryMetrics {
  const reportsByCategory: Record<string, number> = {};
  const reportsByStatus: Record<string, number> = {};
  const reportsByMonth: Record<string, number> = {};
  
  let totalResolutionTime = 0;
  let completedReports = 0;

  reports.forEach(report => {
    // Categorías
    const category = report.category || 'Sin categoría';
    reportsByCategory[category] = (reportsByCategory[category] || 0) + 1;
    
    // Estados
    const status = report.status || 'pending';
    reportsByStatus[status] = (reportsByStatus[status] || 0) + 1;
    
    // Meses
    const reportDate = report.createdAt ? new Date(report.createdAt) : new Date();
    const monthKey = `${reportDate.getFullYear()}-${reportDate.getMonth() + 1}`;
    reportsByMonth[monthKey] = (reportsByMonth[monthKey] || 0) + 1;
    
    // Tiempo de resolución
    if (report.status === 'completed' && report.createdAt && report.updatedAt) {
      const creationDate = new Date(report.createdAt);
      const completionDate = new Date(report.updatedAt);
      const resolutionTime = (completionDate.getTime() - creationDate.getTime()) / (24 * 60 * 60 * 1000); // días
      
      totalResolutionTime += resolutionTime;
      completedReports++;
    }
  });

  return {
    totalReports: reports.length,
    openReports: reportsByStatus['pending'] || 0,
    closedReports: reportsByStatus['completed'] || 0,
    averageResolutionTime: completedReports > 0 ? totalResolutionTime / completedReports : 0,
    reportsByCategory,
    reportsByStatus,
    reportsByMonth
  };
}

/**
 * Genera insights de tendencias a partir de reportes
 */
function generateTrendInsights(reports: Report[], metrics: SummaryMetrics): AIInsight[] {
  const insights: AIInsight[] = [];

  // Tendencia: Categorías más comunes
  const categories = Object.entries(metrics.reportsByCategory)
    .sort((a, b) => b[1] - a[1]);
  
  if (categories.length > 0) {
    const topCategory = categories[0];
    const percentage = (topCategory[1] / metrics.totalReports * 100).toFixed(1);
    
    insights.push({
      id: `trend-categories-${Date.now()}`,
      category: 'trend',
      title: `Categoría predominante: ${topCategory[0]}`,
      description: `El ${percentage}% de las denuncias corresponden a la categoría "${topCategory[0]}". Esta es la categoría más común en el período analizado.`,
      confidence: 0.95,
      severity: topCategory[1] > metrics.totalReports / 3 ? 'high' : 'medium',
      data: {
        categories: Object.fromEntries(categories.slice(0, 5)),
        topCategory: topCategory[0],
        percentage: parseFloat(percentage)
      },
      createdAt: new Date()
    });
  }

  // Tendencia: Evolución mensual
  const monthlyData = Object.entries(metrics.reportsByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  if (monthlyData.length > 1) {
    const lastMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    
    const change = previousMonth[1] > 0 
      ? ((lastMonth[1] - previousMonth[1]) / previousMonth[1] * 100)
      : 100;
    const isIncrease = change > 0;
    
    if (Math.abs(change) > 10) {
      insights.push({
        id: `trend-monthly-${Date.now()}`,
        category: 'trend',
        title: `${isIncrease ? 'Aumento' : 'Disminución'} de denuncias respecto al mes anterior`,
        description: `Se ha detectado un ${isIncrease ? 'aumento' : 'disminución'} del ${Math.abs(change).toFixed(1)}% en el número de denuncias respecto al mes anterior.`,
        confidence: 0.88,
        severity: isIncrease ? 'medium' : 'low',
        data: {
          monthlyData: Object.fromEntries(monthlyData),
          changePercentage: change
        },
        createdAt: new Date()
      });
    }
  }

  // Analizar distribución por tipo (anónimo vs identificado)
  const anonymousReports = reports.filter(r => r.isAnonymous).length;
  const identifiedReports = reports.filter(r => !r.isAnonymous).length;
  
  if (reports.length > 0) {
    const anonymousPercentage = (anonymousReports / reports.length * 100).toFixed(1);
    
    if (parseFloat(anonymousPercentage) > 70) {
      insights.push({
        id: `trend-anonymous-${Date.now()}`,
        category: 'trend',
        title: 'Alta proporción de denuncias anónimas',
        description: `El ${anonymousPercentage}% de las denuncias son anónimas, lo que podría indicar temor a represalias o falta de confianza en el proceso.`,
        confidence: 0.82,
        severity: 'medium',
        data: {
          anonymousCount: anonymousReports,
          identifiedCount: identifiedReports,
          totalCount: reports.length
        },
        createdAt: new Date()
      });
    }
  }

  return insights;
}

/**
 * Genera insights de riesgos a partir de reportes
 */
function generateRiskInsights(reports: Report[], metrics: SummaryMetrics): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Riesgo: Porcentaje alto de denuncias abiertas
  if (metrics.totalReports > 0) {
    const openPercentage = (metrics.openReports / metrics.totalReports * 100).toFixed(1);
    
    if (parseFloat(openPercentage) > 50) {
      insights.push({
        id: `risk-open-${Date.now()}`,
        category: 'risk',
        title: 'Alta tasa de denuncias sin resolver',
        description: `El ${openPercentage}% de las denuncias permanecen abiertas. Este alto porcentaje puede indicar cuellos de botella en el proceso de investigación.`,
        confidence: 0.90,
        severity: 'high',
        data: {
          openCount: metrics.openReports,
          totalCount: metrics.totalReports,
          percentage: parseFloat(openPercentage)
        },
        createdAt: new Date()
      });
    }
  }
  
  // Riesgo: Casos de Ley Karin sin resolver
  const karinReports = reports.filter(r => 
    r.category?.toLowerCase().includes('karin') || 
    r.category?.toLowerCase().includes('acoso') ||
    (r.tags && Array.isArray(r.tags) && r.tags.some(tag => 
      tag.toLowerCase().includes('karin') || 
      tag.toLowerCase().includes('acoso')
    ))
  );
  
  const openKarinReports = karinReports.filter(r => r.status !== 'completed');
  
  if (openKarinReports.length > 0) {
    insights.push({
      id: `risk-karin-${Date.now()}`,
      category: 'risk',
      title: 'Casos de Ley Karin sin resolver',
      description: `Existen ${openKarinReports.length} casos relacionados con Ley Karin sin resolver. Estos casos tienen plazos legales estrictos y deben ser priorizados.`,
      confidence: 0.95,
      severity: 'high',
      relatedReports: openKarinReports.map(r => r.id || r.code || '').filter(Boolean),
      createdAt: new Date()
    });
  }
  
  // Riesgo: Denuncias contra altos cargos
  const reportsAgainstManagement = reports.filter(r => 
    (r.accusedPosition && 
      (r.accusedPosition.toLowerCase().includes('gerente') ||
       r.accusedPosition.toLowerCase().includes('director') ||
       r.accusedPosition.toLowerCase().includes('jefe'))) ||
    (r.involvedPersons && Array.isArray(r.involvedPersons) && 
     r.involvedPersons.some(p => 
       p.position && (
         p.position.toLowerCase().includes('gerente') ||
         p.position.toLowerCase().includes('director') ||
         p.position.toLowerCase().includes('jefe')
       )
     ))
  );
  
  if (reportsAgainstManagement.length > 0) {
    insights.push({
      id: `risk-management-${Date.now()}`,
      category: 'risk',
      title: 'Denuncias que involucran a altos cargos',
      description: `Se han identificado ${reportsAgainstManagement.length} denuncias que involucran a personal directivo o gerencial, lo que requiere especial atención para evitar conflictos de interés.`,
      confidence: 0.85,
      severity: 'high',
      relatedReports: reportsAgainstManagement.map(r => r.id || r.code || '').filter(Boolean),
      createdAt: new Date()
    });
  }

  return insights;
}

/**
 * Genera recomendaciones basadas en métricas
 */
function generateRecommendationInsights(metrics: SummaryMetrics): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Recomendación: Mejorar tiempos de resolución
  if (metrics.averageResolutionTime > 15) {
    insights.push({
      id: `rec-resolution-time-${Date.now()}`,
      category: 'recommendation',
      title: 'Reducir tiempo promedio de resolución',
      description: `El tiempo promedio de resolución es de ${metrics.averageResolutionTime.toFixed(1)} días. Se recomienda revisar el proceso de investigación para identificar y resolver cuellos de botella.`,
      confidence: 0.88,
      data: {
        currentTime: metrics.averageResolutionTime,
        recommendedTime: 15,
        potentialImprovement: `${((metrics.averageResolutionTime - 15) / metrics.averageResolutionTime * 100).toFixed(1)}%`
      },
      createdAt: new Date()
    });
  }
  
  // Recomendación: Equilibrar carga de trabajo
  if (metrics.openReports > 20) {
    insights.push({
      id: `rec-workload-${Date.now()}`,
      category: 'recommendation',
      title: 'Distribuir carga de trabajo entre investigadores',
      description: `Con ${metrics.openReports} casos abiertos, se recomienda revisar la distribución de carga entre los investigadores para asegurar un reparto equitativo y evitar sobrecarga.`,
      confidence: 0.85,
      createdAt: new Date()
    });
  }
  
  // Recomendación: Análisis de categorías predominantes
  const categories = Object.entries(metrics.reportsByCategory)
    .sort((a, b) => b[1] - a[1]);
  
  if (categories.length > 0) {
    const topCategory = categories[0];
    const percentage = (topCategory[1] / metrics.totalReports * 100).toFixed(1);
    
    if (parseFloat(percentage) > 30) {
      insights.push({
        id: `rec-category-${Date.now()}`,
        category: 'recommendation',
        title: `Implementar medidas preventivas para "${topCategory[0]}"`,
        description: `Dado que el ${percentage}% de las denuncias corresponden a "${topCategory[0]}", se recomienda implementar medidas preventivas específicas para esta categoría.`,
        confidence: 0.92,
        createdAt: new Date()
      });
    }
  }

  return insights;
}

/**
 * Genera insights de eficiencia a partir de reportes
 */
function generateEfficiencyInsights(reports: Report[], metrics: SummaryMetrics): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Eficiencia: Tiempo de respuesta inicial
  const reportsWithResponse = reports.filter(r => r.firstResponseAt);
  
  if (reportsWithResponse.length > 0) {
    let totalResponseTime = 0;
    
    reportsWithResponse.forEach(report => {
      if (report.createdAt && report.firstResponseAt) {
        const creationDate = new Date(report.createdAt);
        const responseDate = new Date(report.firstResponseAt);
        const responseTime = (responseDate.getTime() - creationDate.getTime()) / (24 * 60 * 60 * 1000); // días
        
        totalResponseTime += responseTime;
      }
    });
    
    const averageResponseTime = totalResponseTime / reportsWithResponse.length;
    
    if (averageResponseTime > 2) {
      insights.push({
        id: `eff-response-time-${Date.now()}`,
        category: 'efficiency',
        title: 'Optimizar tiempo de respuesta inicial',
        description: `El tiempo promedio de respuesta inicial es de ${averageResponseTime.toFixed(1)} días. Reducir este tiempo a 24-48 horas mejoraría la percepción y confianza en el sistema.`,
        confidence: 0.91,
        data: {
          currentTime: averageResponseTime,
          recommendedTime: 2,
          potentialImprovement: `${((averageResponseTime - 2) / averageResponseTime * 100).toFixed(1)}%`
        },
        createdAt: new Date()
      });
    }
  }
  
  // Eficiencia: Completitud de informes
  const incompleteReports = reports.filter(r => 
    !r.description || 
    r.description.length < 100 ||
    !r.category
  );
  
  if (incompleteReports.length > 0 && metrics.totalReports > 0) {
    insights.push({
      id: `eff-completeness-${Date.now()}`,
      category: 'efficiency',
      title: 'Mejorar completitud de información en denuncias',
      description: `El ${((incompleteReports.length / metrics.totalReports) * 100).toFixed(1)}% de las denuncias tienen información incompleta. Implementar formularios guiados reduciría este porcentaje.`,
      confidence: 0.87,
      data: {
        incompleteCount: incompleteReports.length,
        totalCount: metrics.totalReports,
        percentage: (incompleteReports.length / metrics.totalReports)
      },
      createdAt: new Date()
    });
  }
  
  // Eficiencia: Uso de herramientas automatizadas
  insights.push({
    id: `eff-automation-${Date.now()}`,
    category: 'efficiency',
    title: 'Implementar generación automatizada de documentos',
    description: 'El uso del asistente de generación de documentos podría reducir en un 40% el tiempo dedicado a la elaboración de informes preliminares y finales.',
    confidence: 0.89,
    data: {
      estimatedTimeSaving: '40%',
      implementationEffort: 'Bajo',
      impactArea: 'Documentación'
    },
    createdAt: new Date()
  });

  return insights;
}

export default {
  generateInsightsFromReports
};