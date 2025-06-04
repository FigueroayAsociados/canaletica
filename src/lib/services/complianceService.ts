// src/lib/services/complianceService.ts
// Servicio de compliance y evaluación de riesgos para CanalEtica

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  CatalogoCompliance, 
  DelitoCatalogo, 
  DelitoIdentificado, 
  EvaluacionRiesgo, 
  ReporteCompliance, 
  ResultadoEvaluacion,
  ComplianceConfig 
} from '@/types/compliance';
import { ReportFormValues } from '@/types/report';
import delitosData from '@/lib/data/delitos-aplicables.json';

/**
 * Motor de Evaluación de Riesgos para CanalEtica
 */
export class MotorEvaluacionRiesgos {
  private catalogo: CatalogoCompliance;

  constructor() {
    this.catalogo = delitosData as CatalogoCompliance;
  }

  /**
   * Evalúa automáticamente una denuncia contra la matriz de riesgos
   */
  evaluarDenuncia(reportData: ReportFormValues & { id: string }, companyId: string): EvaluacionRiesgo {
    const evaluacion: EvaluacionRiesgo = {
      reportId: reportData.id,
      companyId,
      delitos_identificados: [],
      probabilidad: 1,
      impacto: 1,
      valor_riesgo: 1,
      nivel_riesgo: 'Aceptable',
      urgencia: 'Baja',
      controles_sugeridos: [],
      acciones_recomendadas: [],
      created_at: new Date(),
      updated_at: new Date()
    };

    // 1. Identificar delitos aplicables por keywords
    evaluacion.delitos_identificados = this.identificarDelitos(reportData);

    // 2. Calcular probabilidad basada en factores de la denuncia
    evaluacion.probabilidad = this.calcularProbabilidad(reportData, evaluacion.delitos_identificados);

    // 3. Calcular impacto basado en severidad de delitos
    evaluacion.impacto = this.calcularImpacto(evaluacion.delitos_identificados);

    // 4. Calcular valor total del riesgo
    evaluacion.valor_riesgo = evaluacion.probabilidad * evaluacion.impacto;

    // 5. Determinar nivel de riesgo final
    evaluacion.nivel_riesgo = this.determinarNivelRiesgo(evaluacion.valor_riesgo);

    // 6. Asignar urgencia
    evaluacion.urgencia = this.determinarUrgencia(evaluacion);

    // 7. Sugerir controles
    evaluacion.controles_sugeridos = this.sugerirControles(evaluacion);

    // 8. Recomendar acciones
    evaluacion.acciones_recomendadas = this.recomendarAcciones(evaluacion);

    return evaluacion;
  }

  /**
   * Identifica delitos aplicables basado en el contenido de la denuncia
   */
  private identificarDelitos(reportData: ReportFormValues): DelitoIdentificado[] {
    const delitosEncontrados: DelitoIdentificado[] = [];
    
    // Construir texto completo para análisis
    const textoCompleto = [
      reportData.detailedDescription,
      reportData.category,
      reportData.subcategory,
      reportData.exactLocation,
      reportData.previousActions || '',
      reportData.expectation || ''
    ].join(' ').toLowerCase();

    this.catalogo.delitos_aplicables.forEach(delito => {
      const coincidencias = delito.keywords.filter(keyword => 
        textoCompleto.includes(keyword.toLowerCase())
      );

      if (coincidencias.length > 0) {
        delitosEncontrados.push({
          ...delito,
          coincidencias,
          relevancia: coincidencias.length / delito.keywords.length
        });
      }
    });

    // Ordenar por relevancia descendente
    return delitosEncontrados.sort((a, b) => b.relevancia - a.relevancia);
  }

  /**
   * Calcula probabilidad considerando factores específicos de CanalEtica
   */
  private calcularProbabilidad(reportData: ReportFormValues, delitosIdentificados: DelitoIdentificado[]): number {
    let probabilidad = 2; // Base moderada

    // Factor 1: Gravedad de delitos identificados
    if (delitosIdentificados.some(d => d.nivel_riesgo === 'Crítico')) {
      probabilidad += 2;
    } else if (delitosIdentificados.some(d => d.nivel_riesgo === 'Alto')) {
      probabilidad += 1;
    }

    // Factor 2: Es denuncia Ley Karin (mayor probabilidad por obligaciones legales)
    if (reportData.isKarinLaw) {
      probabilidad += 1;
    }

    // Factor 3: Múltiples personas denunciadas
    if (reportData.accusedPersons && reportData.accusedPersons.length > 1) {
      probabilidad += 1;
    }

    // Factor 4: Evidencias aportadas (indica mayor seriedad)
    if (reportData.evidences && reportData.evidences.length > 0) {
      probabilidad += 1;
    }

    // Factor 5: Frecuencia de la conducta
    switch (reportData.conductFrequency) {
      case 'sistematica':
        probabilidad += 2;
        break;
      case 'reiterada':
        probabilidad += 1;
        break;
      default:
        break;
    }

    return Math.min(5, Math.max(1, probabilidad));
  }

  /**
   * Calcula impacto basado en los delitos identificados
   */
  private calcularImpacto(delitosIdentificados: DelitoIdentificado[]): number {
    if (delitosIdentificados.length === 0) return 1;

    let maxImpacto = 1;

    delitosIdentificados.forEach(delito => {
      switch (delito.nivel_riesgo) {
        case 'Crítico':
          maxImpacto = Math.max(maxImpacto, 5);
          break;
        case 'Alto':
          maxImpacto = Math.max(maxImpacto, 4);
          break;
        case 'Medio':
          maxImpacto = Math.max(maxImpacto, 3);
          break;
        case 'Bajo':
          maxImpacto = Math.max(maxImpacto, 2);
          break;
      }
    });

    return maxImpacto;
  }

  /**
   * Determina el nivel de riesgo final según la matriz
   */
  private determinarNivelRiesgo(valorRiesgo: number): 'Aceptable' | 'Tolerable' | 'Importante' | 'Intolerable' {
    if (valorRiesgo >= 17) return 'Intolerable';
    if (valorRiesgo >= 10) return 'Importante';
    if (valorRiesgo >= 5) return 'Tolerable';
    return 'Aceptable';
  }

  /**
   * Determina la urgencia de la investigación
   */
  private determinarUrgencia(evaluacion: EvaluacionRiesgo): 'Baja' | 'Media' | 'Alta' | 'Crítica' {
    if (evaluacion.nivel_riesgo === 'Intolerable') return 'Crítica';
    if (evaluacion.nivel_riesgo === 'Importante') return 'Alta';
    if (evaluacion.valor_riesgo >= 6) return 'Media';
    return 'Baja';
  }

  /**
   * Sugiere controles específicos basados en los delitos identificados
   */
  private sugerirControles(evaluacion: EvaluacionRiesgo): string[] {
    const controles = new Set<string>();

    evaluacion.delitos_identificados.forEach(delito => {
      switch (delito.categoria) {
        case 'Delitos de Corrupción y Fraude':
          controles.add('Política anti-corrupción');
          controles.add('Due diligence de terceros');
          controles.add('Declaración de conflictos de interés');
          controles.add('Capacitación en prevención de corrupción');
          break;
        case 'Lavado de Activos y Financiamiento del Terrorismo':
          controles.add('Sistema KYC (Conoce a tu Cliente)');
          controles.add('Monitoreo de transacciones');
          controles.add('Reporte de operaciones sospechosas');
          controles.add('Capacitación en prevención de lavado');
          break;
        case 'Delitos Societarios y del Mercado de Valores':
          controles.add('Política de información privilegiada');
          controles.add('Períodos de silencio');
          controles.add('Lista de personas con acceso privilegiado');
          controles.add('Supervisión de transacciones bursátiles');
          break;
        case 'Delitos Laborales y Previsionales':
          controles.add('Política contra el acoso laboral');
          controles.add('Canales de denuncia confidenciales');
          controles.add('Capacitación en respeto laboral');
          controles.add('Comité de convivencia laboral');
          break;
        case 'Delitos Ambientales':
          controles.add('Sistema de gestión ambiental');
          controles.add('Monitoreo de emisiones');
          controles.add('Capacitación ambiental');
          controles.add('Auditorías ambientales periódicas');
          break;
        default:
          controles.add('Código de ética empresarial');
          controles.add('Capacitación en compliance');
          controles.add('Auditoría interna');
          controles.add('Revisión de procesos');
      }
    });

    return Array.from(controles);
  }

  /**
   * Recomienda acciones específicas según el nivel de urgencia
   */
  private recomendarAcciones(evaluacion: EvaluacionRiesgo): string[] {
    const acciones: string[] = [];

    switch (evaluacion.urgencia) {
      case 'Crítica':
        acciones.push(
          'Notificar inmediatamente a CEO y Comité de Ética',
          'Considerar suspensión preventiva de involucrados',
          'Contactar asesoría legal externa especializada',
          'Evaluar reporte inmediato a autoridades competentes',
          'Implementar medidas de preservación de evidencia',
          'Comunicación interna controlada'
        );
        break;
      case 'Alta':
        acciones.push(
          'Asignar investigador senior experimentado',
          'Programar reunión de Comité de Ética en 48 horas',
          'Revisar y reforzar controles en área afectada',
          'Evaluar medidas precautorias',
          'Documentar cronología detallada'
        );
        break;
      case 'Media':
        acciones.push(
          'Realizar investigación con procedimiento estándar',
          'Programar entrevistas con testigos',
          'Solicitar documentación relevante',
          'Revisar controles existentes',
          'Mantener confidencialidad del proceso'
        );
        break;
      case 'Baja':
        acciones.push(
          'Realizar seguimiento regular del caso',
          'Documentar adecuadamente en sistema',
          'Verificar aplicación de controles básicos',
          'Evaluar necesidad de capacitación preventiva'
        );
        break;
    }

    return acciones;
  }

  /**
   * Genera reporte completo de la evaluación
   */
  generarReporte(evaluacion: EvaluacionRiesgo): ReporteCompliance {
    return {
      resumen_ejecutivo: `Denuncia evaluada con riesgo ${evaluacion.nivel_riesgo}, requiere atención ${evaluacion.urgencia.toLowerCase()}. ${evaluacion.delitos_identificados.length} delito(s) potencial(es) identificado(s).`,
      
      detalle_riesgos: evaluacion.delitos_identificados.map(delito => ({
        delito: delito.categoria,
        ley: delito.ley,
        articulo: delito.articulo,
        relevancia: `${Math.round(delito.relevancia * 100)}%`
      })),

      matriz_riesgo: {
        probabilidad: evaluacion.probabilidad,
        impacto: evaluacion.impacto,
        valor_total: evaluacion.valor_riesgo,
        clasificacion: evaluacion.nivel_riesgo
      },

      plan_accion: {
        urgencia: evaluacion.urgencia,
        controles_aplicar: evaluacion.controles_sugeridos,
        acciones_inmediatas: evaluacion.acciones_recomendadas.slice(0, 3),
        seguimiento: evaluacion.acciones_recomendadas.slice(3)
      }
    };
  }
}

// Instancia singleton del motor
const motorRiesgos = new MotorEvaluacionRiesgos();

/**
 * Evalúa una denuncia y guarda el resultado en Firestore
 */
export async function evaluarRiesgoDenuncia(
  companyId: string, 
  reportId: string, 
  reportData: ReportFormValues
): Promise<ResultadoEvaluacion> {
  try {
    // Evaluar con el motor
    const evaluacion = motorRiesgos.evaluarDenuncia(
      { ...reportData, id: reportId }, 
      companyId
    );

    // Generar reporte
    const reporte = motorRiesgos.generarReporte(evaluacion);

    // Guardar en Firestore
    const evaluacionRef = await addDoc(
      collection(db, `companies/${companyId}/reports/${reportId}/compliance_evaluations`),
      {
        ...evaluacion,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
    );

    evaluacion.id = evaluacionRef.id;

    return {
      success: true,
      evaluacion,
      reporte,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error evaluando riesgo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Obtiene la evaluación de riesgo de una denuncia
 */
export async function obtenerEvaluacionRiesgo(
  companyId: string, 
  reportId: string
): Promise<EvaluacionRiesgo | null> {
  try {
    const evaluacionesRef = collection(
      db, 
      `companies/${companyId}/reports/${reportId}/compliance_evaluations`
    );
    const q = query(evaluacionesRef, orderBy('created_at', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date()
      } as EvaluacionRiesgo;
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo evaluación:', error);
    return null;
  }
}

/**
 * Obtiene estadísticas de riesgo para dashboard
 */
export async function obtenerEstadisticasCompliance(companyId: string) {
  try {
    // Esta función se implementará cuando tengamos más datos
    // Por ahora retornamos estructura básica
    return {
      total_evaluaciones: 0,
      por_nivel_riesgo: {
        'Aceptable': 0,
        'Tolerable': 0,
        'Importante': 0,
        'Intolerable': 0
      },
      por_urgencia: {
        'Baja': 0,
        'Media': 0,
        'Alta': 0,
        'Crítica': 0
      },
      delitos_mas_frecuentes: []
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas compliance:', error);
    throw error;
  }
}

/**
 * Verifica si el módulo de compliance está habilitado para una empresa
 */
export async function isComplianceEnabled(companyId: string): Promise<boolean> {
  try {
    const configDoc = await getDoc(doc(db, `companies/${companyId}/config/compliance`));
    if (configDoc.exists()) {
      const config = configDoc.data() as ComplianceConfig;
      return config.enabled || false;
    }
    return false;
  } catch (error) {
    console.error('Error verificando configuración compliance:', error);
    return false;
  }
}

/**
 * Configura el módulo de compliance para una empresa
 */
export async function configurarCompliance(
  companyId: string, 
  config: ComplianceConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, `companies/${companyId}/config/compliance`), {
      ...config,
      updated_at: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error configurando compliance:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Obtiene información del catálogo de delitos
 */
export function obtenerCatalogoDelitos() {
  return {
    total_delitos: motorRiesgos['catalogo'].delitos_aplicables.length,
    categorias: [...new Set(motorRiesgos['catalogo'].delitos_aplicables.map(d => d.categoria))],
    delitos_persona_juridica: motorRiesgos['catalogo'].delitos_aplicables.filter(d => d.aplicable_persona_juridica).length
  };
}