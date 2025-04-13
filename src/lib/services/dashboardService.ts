// src/lib/services/dashboardService.ts

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    orderBy,
    limit,
    Timestamp,
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase/config';
  
  /**
   * Obtiene métricas para el dashboard desde Firestore
   */
  export async function getDashboardMetrics(companyId: string) {
    try {
      const metricsData: any = {
        newReports: 0,
        inProgressReports: 0,
        resolvedReports: 0,
        totalReports: 0,
        averageResolutionTime: 0,
        reportsByCategory: [],
        recentActivity: [],
        reportsByMonth: []
      };
  
      // Referencia a la colección de denuncias
      const reportsRef = collection(db, `companies/${companyId}/reports`);
      
      // Obtener todas las denuncias para análisis
      const allReportsSnapshot = await getDocs(reportsRef);
      const totalReports = allReportsSnapshot.size;
      metricsData.totalReports = totalReports;
  
      // Contar por estado
      const newReportsQuery = query(reportsRef, where('status', '==', 'Nuevo'));
      const newReportsSnapshot = await getDocs(newReportsQuery);
      metricsData.newReports = newReportsSnapshot.size;
  
      const inProgressStates = ['Asignada', 'En Investigación', 'Pendiente Información', 'En Evaluación'];
      let inProgressCount = 0;
      for (const state of inProgressStates) {
        const stateQuery = query(reportsRef, where('status', '==', state));
        const stateSnapshot = await getDocs(stateQuery);
        inProgressCount += stateSnapshot.size;
      }
      metricsData.inProgressReports = inProgressCount;
  
      const resolvedStates = ['Resuelta', 'En Seguimiento', 'Cerrada'];
      let resolvedCount = 0;
      for (const state of resolvedStates) {
        const stateQuery = query(reportsRef, where('status', '==', state));
        const stateSnapshot = await getDocs(stateQuery);
        resolvedCount += stateSnapshot.size;
      }
      metricsData.resolvedReports = resolvedCount;
  
      // Calcular tiempo promedio de resolución
      let totalResolutionTimeInDays = 0;
      let completedReportsCount = 0;
      
      allReportsSnapshot.forEach(doc => {
        const data = doc.data();
        if (resolvedStates.includes(data.status) && data.createdAt && data.updatedAt) {
          const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          const updatedDate = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
          const diffTime = Math.abs(updatedDate.getTime() - createdDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalResolutionTimeInDays += diffDays;
          completedReportsCount++;
        }
      });
      
      metricsData.averageResolutionTime = completedReportsCount > 0 
        ? (totalResolutionTimeInDays / completedReportsCount).toFixed(1) 
        : 0;
  
      // Contar por categoría
      const categories = [
        'modelo_prevencion',
        'ley_karin',
        'ciberseguridad',
        'reglamento_interno',
        'politicas_codigos',
        'represalias',
        'otros'
      ];
      
      const categoryPromises = categories.map(async category => {
        const categoryQuery = query(reportsRef, where('category', '==', category));
        const categorySnapshot = await getDocs(categoryQuery);
        return {
          category,
          count: categorySnapshot.size
        };
      });
      
      metricsData.reportsByCategory = await Promise.all(categoryPromises);
  
      // Obtener actividad reciente desde las actividades de todas las denuncias
      const recentActivities: any[] = [];
      
      for (const reportDoc of allReportsSnapshot.docs) {
        const reportId = reportDoc.id;
        const activitiesRef = collection(db, `companies/${companyId}/reports/${reportId}/activities`);
        const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'), limit(5));
        const activitiesSnapshot = await getDocs(activitiesQuery);
        
        activitiesSnapshot.forEach(activityDoc => {
          const activityData = activityDoc.data();
          let type = 'other';
          
          if (activityData.actionType === 'reportCreation' || activityData.actionType === 'create') {
            type = 'report_created';
          } else if (activityData.actionType === 'assignmentChange') {
            type = 'report_assigned';
          } else if (activityData.actionType === 'statusChange' && 
                    (activityData.newStatus === 'Resuelta' || 
                    activityData.newStatus === 'Cerrada')) {
            type = 'report_resolved';
          }
          
          recentActivities.push({
            id: activityDoc.id,
            reportId,
            type,
            description: activityData.description,
            date: activityData.timestamp?.toDate?.() || new Date()
          });
        });
      }
      
      // Ordenar y limitar actividades
      recentActivities.sort((a, b) => b.date - a.date);
      metricsData.recentActivity = recentActivities.slice(0, 5).map(activity => ({
        ...activity,
        date: activity.date.toISOString()
      }));
  
      // Generar datos para gráfico de denuncias por mes
      const last6Months = [];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = month.toLocaleString('default', { month: 'short' });
        last6Months.push({
          month: monthName,
          startDate: new Date(month.getFullYear(), month.getMonth(), 1),
          endDate: new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59),
          count: 0
        });
      }
      
      allReportsSnapshot.forEach(reportDoc => {
        const data = reportDoc.data();
        if (data.createdAt) {
          const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          
          for (const monthData of last6Months) {
            if (createdAt >= monthData.startDate && createdAt <= monthData.endDate) {
              monthData.count++;
              break;
            }
          }
        }
      });
      
      metricsData.reportsByMonth = last6Months.map(({ month, count }) => ({ month, count }));
  
      return {
        success: true,
        metrics: metricsData
      };
    } catch (error) {
      console.error('Error al obtener métricas del dashboard:', error);
      return {
        success: false,
        error: 'Error al obtener métricas del dashboard'
      };
    }
  }