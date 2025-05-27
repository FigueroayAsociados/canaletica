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
  
      // Contar reportes nuevos - incluye tanto "Nuevo" como "Ley Karin - Denuncia Interpuesta" o "Ley Karin - Denuncia Recibida"
      let newReportsCount = 0;
      
      // Contar denuncias regulares nuevas
      const newReportsQuery = query(reportsRef, where('status', '==', 'Nuevo'));
      const newReportsSnapshot = await getDocs(newReportsQuery);
      newReportsCount += newReportsSnapshot.size;
      
      // Contar denuncias Ley Karin en etapa inicial
      const karinNewQuery1 = query(reportsRef, where('status', '==', 'Ley Karin - Denuncia Interpuesta'));
      const karinNewSnapshot1 = await getDocs(karinNewQuery1);
      newReportsCount += karinNewSnapshot1.size;
      
      const karinNewQuery2 = query(reportsRef, where('status', '==', 'Ley Karin - Denuncia Recibida'));
      const karinNewSnapshot2 = await getDocs(karinNewQuery2);
      newReportsCount += karinNewSnapshot2.size;
      
      metricsData.newReports = newReportsCount;
  
      // Estados en progreso regulares
      const regularInProgressStates = ['Asignada', 'En Investigación', 'Pendiente Información', 'En Evaluación'];
      let inProgressCount = 0;
      
      // Contar reportes regulares en progreso
      for (const state of regularInProgressStates) {
        const stateQuery = query(reportsRef, where('status', '==', state));
        const stateSnapshot = await getDocs(stateQuery);
        const count = stateSnapshot.size;
        inProgressCount += count;
        console.log(`Estado ${state}: ${count} denuncias`);
      }
      
      // Estados en progreso para Ley Karin (siguiendo el orden exacto del proceso)
      const karinInProgressStates = [
        'Ley Karin - Medidas Precautorias',              // Etapa 3
        'Ley Karin - Decisión de Investigar',            // Etapa 4
        'Ley Karin - En Investigación',                  // Etapa 5
        'Ley Karin - Creación de Informe',               // Etapa 6
        'Ley Karin - Aprobación de Informe',             // Etapa 7
        'Ley Karin - Notificación a DT',                 // Etapa 8
        'Ley Karin - Notificación a SUSESO',             // Etapa 9
        'Ley Karin - Investigación Completa',            // Etapa 10
        'Ley Karin - Informe Final',                     // Etapa 11
        'Ley Karin - Envío a DT',                        // Etapa 12
        'Ley Karin - En Dirección del Trabajo',          // Valor antiguo (para compatibilidad)
        'Ley Karin - Resolución DT'                      // Etapa 13
      ];
      
      // Contar reportes Ley Karin en progreso
      for (const state of karinInProgressStates) {
        const stateQuery = query(reportsRef, where('status', '==', state));
        const stateSnapshot = await getDocs(stateQuery);
        const count = stateSnapshot.size;
        inProgressCount += count;
        console.log(`Estado ${state}: ${count} denuncias`);
      }
      
      metricsData.inProgressReports = inProgressCount;
  
      // Estados resueltos para reportes regulares
      const regularResolvedStates = ['Resuelta', 'En Seguimiento', 'Cerrada'];
      let resolvedCount = 0;
      for (const state of regularResolvedStates) {
        const stateQuery = query(reportsRef, where('status', '==', state));
        const stateSnapshot = await getDocs(stateQuery);
        resolvedCount += stateSnapshot.size;
      }
      
      // Estados resueltos para reportes Ley Karin
      const karinResolvedStates = [
        'Ley Karin - Adopción de Medidas',           // Etapa 14
        'Ley Karin - Sanciones',                     // Etapa 15
        'Ley Karin - Cerrado',                       // Finalizado
        'Ley Karin - Denuncia Falsa',                // Caso especial
        'Ley Karin - Revisión de Represalias'        // Caso especial
      ];
      
      // Contar reportes Ley Karin resueltos
      for (const state of karinResolvedStates) {
        const stateQuery = query(reportsRef, where('status', '==', state));
        const stateSnapshot = await getDocs(stateQuery);
        resolvedCount += stateSnapshot.size;
      }
      
      metricsData.resolvedReports = resolvedCount;
  
      // Calcular tiempo promedio de resolución
      let totalResolutionTimeInDays = 0;
      let completedReportsCount = 0;
      
      // Combinar todos los estados que se consideran resueltos (tanto regulares como Ley Karin)
      const allResolvedStates = [...regularResolvedStates, ...karinResolvedStates];
      
      allReportsSnapshot.forEach(doc => {
        const data = doc.data();
        if (allResolvedStates.includes(data.status) && data.createdAt && data.updatedAt) {
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
      
      // Verificar que todas las denuncias tienen una categoría válida
      let categorizedReportsCount = 0;
      let reportsByCategory = [];
      
      // Uso de un solo loop para procesar todas las denuncias y contar por categoría
      // Esto es más eficiente que hacer una consulta por cada categoría
      const categoryCounts = {};
      categories.forEach(category => {
        categoryCounts[category] = 0;
      });
      
      // Contar manualmente por categoría usando los documentos ya obtenidos
      allReportsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          // Verificar si la categoría está en nuestra lista predefinida
          if (categories.includes(data.category)) {
            categoryCounts[data.category]++;
            categorizedReportsCount++;
          } else {
            // Si la categoría no está en la lista, contarla como "otros"
            console.log(`Categoría no reconocida encontrada: ${data.category}, asignando a "otros"`)
            categoryCounts['otros']++;
            categorizedReportsCount++;
          }
        } else {
          // Si no hay categoría definida, contarla como "otros"
          console.log(`Denuncia sin categoría encontrada: ID=${doc.id}, asignando a "otros"`)
          categoryCounts['otros']++;
          categorizedReportsCount++;
        }
      });
      
      // Convertir los conteos a la estructura esperada
      reportsByCategory = categories.map(category => ({
        category,
        count: categoryCounts[category] || 0
      }));
      
      metricsData.reportsByCategory = reportsByCategory;
      
      // Verificar si hay discrepancia con el total de reportes
      if (categorizedReportsCount !== totalReports) {
        console.warn(`Discrepancia en conteo de categorías: Total=${totalReports}, Suma de categorías=${categorizedReportsCount}`);
        // Actualizar metrics.totalReports para reflejar el número real de reportes categorizados
        // Esto asegura que los porcentajes mostrados en CategoryDistributionCard sean correctos
        metricsData.totalReports = categorizedReportsCount;
      }
      
      // Registro detallado del conteo de denuncias por estado para depuración
      console.log('==== RESUMEN DE CONTEO DE DENUNCIAS ====');
      console.log(`Total de denuncias: ${totalReports}`);
      console.log(`Nuevas denuncias: ${metricsData.newReports}`);
      console.log(`En investigación: ${metricsData.inProgressReports}`);
      console.log(`Resueltas: ${metricsData.resolvedReports}`);
      console.log(`Por categoría: ${categorizedReportsCount}`);
      console.log('=======================================');
  
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