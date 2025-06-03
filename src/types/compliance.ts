// src/types/compliance.ts
// Tipos para el módulo de compliance y matriz de riesgos

export interface DelitoCatalogo {
  id: number;
  categoria: string;
  ley: string;
  articulo: string;
  descripcion: string;
  aplicable_persona_juridica: boolean;
  nivel_riesgo: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  keywords: string[];
}

export interface EscalasEvaluacion {
  probabilidad: {
    [key: number]: {
      nivel: string;
      descripcion: string;
    };
  };
  impacto: {
    [key: number]: {
      nivel: string;
      descripcion: string;
    };
  };
  riesgo_final: {
    [key: string]: 'Aceptable' | 'Tolerable' | 'Importante' | 'Intolerable';
  };
}

export interface ConfiguracionCompliance {
  modulos_empresa: string[];
  tipos_denuncia: string[];
  niveles_urgencia: ('Baja' | 'Media' | 'Alta' | 'Crítica')[];
  estados_investigacion: string[];
}

export interface CatalogoCompliance {
  delitos_aplicables: DelitoCatalogo[];
  escalas_evaluacion: EscalasEvaluacion;
  configuracion_canal_etica: ConfiguracionCompliance;
}

export interface DelitoIdentificado extends DelitoCatalogo {
  coincidencias: string[];
  relevancia: number;
}

export interface EvaluacionRiesgo {
  id?: string;
  reportId: string;
  companyId: string;
  delitos_identificados: DelitoIdentificado[];
  probabilidad: number; // 1-5
  impacto: number; // 1-5
  valor_riesgo: number; // probabilidad * impacto
  nivel_riesgo: 'Aceptable' | 'Tolerable' | 'Importante' | 'Intolerable';
  urgencia: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  controles_sugeridos: string[];
  acciones_recomendadas: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ReporteCompliance {
  resumen_ejecutivo: string;
  detalle_riesgos: {
    delito: string;
    ley: string;
    articulo: string;
    relevancia: string;
  }[];
  matriz_riesgo: {
    probabilidad: number;
    impacto: number;
    valor_total: number;
    clasificacion: string;
  };
  plan_accion: {
    urgencia: string;
    controles_aplicar: string[];
    acciones_inmediatas: string[];
    seguimiento: string[];
  };
}

export interface ResultadoEvaluacion {
  success: boolean;
  evaluacion?: EvaluacionRiesgo;
  reporte?: ReporteCompliance;
  error?: string;
  timestamp: string;
}

// Configuración por empresa para habilitar/deshabilitar compliance
export interface ComplianceConfig {
  enabled: boolean;
  auto_evaluate: boolean; // Evaluación automática al crear denuncia
  alert_levels: ('Crítica' | 'Alta')[];
  notification_emails: string[];
}