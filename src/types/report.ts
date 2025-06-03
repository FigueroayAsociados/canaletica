// src/types/report.ts

// Tipos básicos
export type RelationshipType = 
  | 'empleado' 
  | 'proveedor' 
  | 'cliente' 
  | 'contratista' 
  | 'otro';

export type ReporterRelationType =
  | 'testigo'
  | 'victima'
  | 'conocimiento_indirecto';

export type ConductFrequencyType =
  | 'unica'
  | 'ocasional'
  | 'reiterada'
  | 'sistematica';

export type KarinSexualHarassmentType =
  | 'verbal'
  | 'no_verbal'
  | 'fisico'
  | 'digital';
  
// Tipos de preguntas relacionadas a Ley Karin para evaluación de riesgo
export type KarinRiskFactorType = 
  | 'jerarquia'         // Relación jerárquica entre las partes
  | 'aislamiento'       // Trabajo en lugares aislados
  | 'antecedentes'      // Antecedentes previos del acusado
  | 'amenazas'          // Amenazas explícitas
  | 'vulnerabilidad'    // Condición de vulnerabilidad de la víctima
  | 'salud_afectada'    // Salud mental/física afectada
  | 'temor'             // Expresión de temor a represalias
  | 'testigos'          // Existencia de testigos
  | 'pruebas'           // Existencia de pruebas concretas
  | 'reincidencia';     // Conducta reincidente

// Estados de plazos para visualización
export type DeadlineStatus = 
  | 'ok'                // Plazo en tiempo normal
  | 'warning'           // Plazo próximo a vencer (3 días o menos)
  | 'critical'          // Plazo crítico (1 día o menos)
  | 'expired'           // Plazo vencido
  | 'extended'          // Plazo prorrogado
  | 'completed';        // Tarea completada dentro del plazo

// Modelo para preguntas de evaluación de riesgo Ley Karin
export type KarinRiskQuestion = {
  id: KarinRiskFactorType;
  question: string;
  description?: string;
  riskLevel: 'high' | 'medium' | 'low';
};

// Lista predefinida de preguntas para evaluación de riesgo Ley Karin
export const KARIN_RISK_QUESTIONS: KarinRiskQuestion[] = [
  {
    id: 'jerarquia',
    question: '¿Existe relación jerárquica entre el/la denunciado/a y la persona afectada?',
    description: 'Es un factor de riesgo si la persona denunciada es superior jerárquico de la víctima.',
    riskLevel: 'high'
  },
  {
    id: 'aislamiento',
    question: '¿La persona afectada trabaja en condiciones de aislamiento con la persona denunciada?',
    description: 'Por ejemplo: turnos nocturnos, lugares apartados, o sin presencia de otras personas.',
    riskLevel: 'high'
  },
  {
    id: 'antecedentes',
    question: '¿Existen antecedentes previos de conductas similares por parte de la persona denunciada?',
    description: 'Denuncias formales previas o situaciones informalmente reportadas.',
    riskLevel: 'high'
  },
  {
    id: 'amenazas',
    question: '¿Ha recibido la persona afectada amenazas explícitas o implícitas?',
    description: 'Incluye amenazas de despido, dañar su reputación o integridad física.',
    riskLevel: 'high'
  },
  {
    id: 'vulnerabilidad',
    question: '¿La persona afectada pertenece a algún grupo en situación de vulnerabilidad?',
    description: 'Por ejemplo: migrantes, personas con discapacidad, minorías, etc.',
    riskLevel: 'medium'
  },
  {
    id: 'salud_afectada',
    question: '¿Ha presentado la persona afectada problemas de salud física o mental a raíz de los hechos?',
    description: 'Incluye licencias médicas, tratamientos psicológicos o psiquiátricos iniciados.',
    riskLevel: 'medium'
  },
  {
    id: 'temor',
    question: '¿La persona afectada ha expresado temor a represalias o a continuar trabajando con la persona denunciada?',
    riskLevel: 'medium'
  },
  {
    id: 'testigos',
    question: '¿Existen testigos de los hechos denunciados?',
    description: 'La existencia de testigos puede ayudar a corroborar los hechos.',
    riskLevel: 'low'
  },
  {
    id: 'pruebas',
    question: '¿Cuenta con pruebas como mensajes, grabaciones u otros registros de los hechos denunciados?',
    riskLevel: 'low'
  },
  {
    id: 'reincidencia',
    question: '¿Los hechos denunciados son reiterados o sistemáticos en el tiempo?',
    description: 'No se trata de un hecho aislado sino de una conducta repetida.',
    riskLevel: 'medium'
  }
];

// Etapas del proceso Ley Karin (según documento oficial actualizado)
export type KarinProcessStage =
  | 'complaint_filed'       // Etapa 1: Interposición de la Denuncia
  | 'reception'             // Etapa 2: Recepción de Denuncia
  | 'subsanation'           // Etapa 2.1: Subsanación de la Denuncia (si es necesario)
  | 'precautionary_measures'// Etapa 3: Medidas Precautorias o de Resguardo
  | 'decision_to_investigate'// Etapa 4: Decisión de Investigar
  | 'investigation'         // Etapa 5: Investigación
  | 'report_creation'       // Etapa 6: Creación del Informe Preliminar
  | 'report_approval'       // Etapa 7: Revisión Interna del Informe
  | 'dt_notification'       // Etapa 8: Notificación a DT con informe preliminar
  | 'suseso_notification'   // Etapa 9: Notificación a mutualidades/SUSESO
  | 'investigation_complete'// Etapa 10: Investigación completa (30 días máximo)
  | 'final_report'          // Etapa 11: Creación del Informe Final
  | 'dt_submission'         // Etapa 12: Envío a DT (2 días desde finalización)
  | 'dt_resolution'         // Etapa 13: Resolución de la DT (30 días hábiles)
  | 'measures_adoption'     // Etapa 14: Adopción de Medidas (15 días corridos)
  | 'sanctions'             // Etapa 15: Sanciones y su Impugnación
  | 'false_claim'           // Caso especial: Denuncias Falsas
  | 'retaliation_review'    // Caso especial: Prohibición de Represalias
  | 'third_party'           // Caso especial: Conductas por terceros
  | 'subcontracting'        // Caso especial: Régimen de Subcontratación
  | 'closed'                // Finalizado
  | 'labor_department'      // Valor antiguo (para compatibilidad, equivalente a investigation_complete)
  | 'orientation';          // Valor antiguo (mantenido para compatibilidad)

// CategoryType puede ser cualquier string (ID de la categoría)
export type CategoryType = string;

export type ModeloPrevSubcategory =
  | 'cohecho'
  | 'lavado_activos'
  | 'financiamiento_terrorismo'
  | 'receptacion'
  | 'negociacion_incompatible'
  | 'corrupcion_particulares'
  | 'otros_delitos_economicos';

export type LeyKarinSubcategory =
  | 'acoso_laboral'
  | 'acoso_sexual'
  | 'violencia_trabajo';

export type CiberseguridadSubcategory =
  | 'fraude_informatico'
  | 'acceso_no_autorizado'
  | 'interceptacion_datos'
  | 'otro';

export type EvidenceType = {
  id?: string;
  file?: File;
  description: string;
  url?: string;
};

export type AccusedPersonType = {
  id: string;
  name: string;
  position: string;
  department: string;
  relationship: string;
};

export type WitnessType = {
  id: string;
  name: string;
  contact?: string;
};

// Medidas precautorias para Ley Karin
export type PrecautionaryMeasure = {
  id: string;
  name: string;
  description: string;
};

// Lista predefinida de medidas precautorias para Ley Karin
export const DEFAULT_PRECAUTIONARY_MEASURES: PrecautionaryMeasure[] = [
  { 
    id: 'separation',
    name: 'Separación de espacios físicos', 
    description: 'Separar físicamente al denunciante y al denunciado mientras dure la investigación.'
  },
  { 
    id: 'schedule_redistribution',
    name: 'Redistribución de jornada', 
    description: 'Modificar los horarios de trabajo para evitar coincidencias entre las partes.'
  },
  { 
    id: 'reassignment',
    name: 'Redestinación de una de las partes', 
    description: 'Trasladar temporalmente a una de las partes a otro departamento o función.'
  },
  { 
    id: 'paid_leave',
    name: 'Permiso con goce de remuneraciones', 
    description: 'Otorgar permiso temporal con pago completo a una de las partes.'
  },
  { 
    id: 'accused_transfer',
    name: 'Traslado del denunciado', 
    description: 'Trasladar al denunciado a otra ubicación o departamento.'
  },
  { 
    id: 'psychological_support',
    name: 'Atención psicológica temprana', 
    description: 'Proporcionar apoyo psicológico inmediato al denunciante.'
  },
  { 
    id: 'communication_restriction',
    name: 'Restricción de comunicación directa', 
    description: 'Prohibir la comunicación directa entre las partes involucradas.'
  },
  { 
    id: 'supervisor_assignment',
    name: 'Asignación de supervisor', 
    description: 'Asignar un supervisor para monitorear la situación.'
  },
  { 
    id: 'reporting_line_change',
    name: 'Cambio de línea de reporte', 
    description: 'Modificar la estructura jerárquica para evitar que el denunciado sea superior del denunciante.'
  }
];

// Interfaz para deadlines de Ley Karin
export type KarinDeadline = {
  id: string;
  name: string;                     // Nombre descriptivo del plazo
  description: string;              // Descripción del plazo
  startDate: string;                // Fecha de inicio del plazo
  endDate: string;                  // Fecha de vencimiento
  businessDays: number;             // Días hábiles de plazo
  status: DeadlineStatus;           // Estado actual del plazo
  daysRemaining?: number;           // Días hábiles restantes (calculados)
  completedDate?: string;           // Fecha en que se completó la tarea
  completedBy?: string;             // Usuario que completó la tarea
  isLegalRequirement: boolean;      // Si es un plazo legal obligatorio
  legalReference?: string;          // Referencia legal (artículo)
  associatedStage: KarinProcessStage; // Etapa del proceso asociada
  notes?: string;                   // Notas adicionales
  notificationsEnabled?: boolean;   // Si se envían notificaciones de este plazo
  notificationsSent?: Array<{       // Registro de notificaciones enviadas
    date: string;                   // Fecha de envío
    recipient: string;              // Destinatario
    type: 'email' | 'system' | 'sms'; // Tipo de notificación
  }>;
  isExtended?: boolean;             // Si el plazo ha sido prorrogado
  originalEndDate?: string;         // Fecha original antes de prórroga
  extensionReason?: string;         // Razón de la prórroga
  extensionApprovedBy?: string;     // Quién aprobó la prórroga
  priority: 'high' | 'medium' | 'low'; // Prioridad del plazo
  dependencies?: string[];          // IDs de plazos que deben cumplirse antes
  progressPercentage?: number;      // Porcentaje de avance (0-100)
};

// Lista de plazos legales para Ley Karin
export const DEFAULT_KARIN_DEADLINES: Partial<KarinDeadline>[] = [
  {
    name: 'Notificación inicial a DT',
    description: 'Plazo para notificar a la Dirección del Trabajo sobre la denuncia',
    businessDays: 3,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-B del Código del Trabajo',
    associatedStage: 'reception',
    priority: 'high'
  },
  {
    name: 'Adopción de medidas precautorias',
    description: 'Plazo para implementar medidas de resguardo o precautorias',
    businessDays: 3,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-B del Código del Trabajo',
    associatedStage: 'reception',
    priority: 'high'
  },
  {
    name: 'Subsanación de denuncia',
    description: 'Plazo para que el denunciante subsane información faltante o incompleta',
    businessDays: 5,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-A del Código del Trabajo',
    associatedStage: 'subsanation',
    priority: 'high'
  },
  {
    name: 'Notificación a SUSESO/Mutualidad',
    description: 'Plazo para notificar a la mutualidad correspondiente',
    businessDays: 5,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-B del Código del Trabajo',
    associatedStage: 'dt_notification',
    priority: 'medium'
  },
  {
    name: 'Investigación interna',
    description: 'Plazo para completar la investigación interna',
    businessDays: 30,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-C del Código del Trabajo',
    associatedStage: 'investigation',
    priority: 'high'
  },
  {
    name: 'Prórroga investigación',
    description: 'Extensión del plazo de investigación (si se solicita)',
    businessDays: 30,
    isLegalRequirement: false,
    legalReference: 'Ley Karin, artículo 211-C del Código del Trabajo',
    associatedStage: 'investigation',
    priority: 'medium'
  },
  {
    name: 'Remisión a DT',
    description: 'Plazo para enviar el informe final y expediente a la DT',
    businessDays: 2,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-D del Código del Trabajo',
    associatedStage: 'investigation_complete',
    priority: 'high'
  },
  {
    name: 'Respuesta DT',
    description: 'Plazo para que la DT revise y responda sobre el caso',
    businessDays: 30,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-E del Código del Trabajo',
    associatedStage: 'dt_submission',
    priority: 'medium'
  },
  {
    name: 'Adopción de medidas',
    description: 'Plazo para implementar medidas dispuestas (días corridos, no hábiles)',
    businessDays: 0, // Se maneja diferente por ser días corridos
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-F del Código del Trabajo',
    associatedStage: 'measures_adoption',
    priority: 'high'
  },
  {
    name: 'Reclamación de multas',
    description: 'Plazo para reclamar las multas aplicadas',
    businessDays: 15,
    isLegalRequirement: true,
    legalReference: 'Ley Karin, artículo 211-G del Código del Trabajo',
    associatedStage: 'sanctions',
    priority: 'medium'
  }
];

// Formulario completo
export type ReportFormValues = {
  // Paso 1: Identificación del Denunciante
  relationship: RelationshipType;
  isAnonymous: boolean;
  contactInfo?: {
    name: string;
    email: string;
    phone: string;
    position?: string;
  };
  // Campos para denuncias Ley Karin
  isVictim?: boolean; // Si el denunciante es la víctima directa
  victimInfo?: {      // Información de la víctima cuando el denunciante no es la víctima
    name: string;
  };
  relationToVictim?: string; // Relación del denunciante con la víctima
  authorizationDocument?: File; // Documento que acredita representación
  acceptPrivacyPolicy: boolean;

  // Paso 2: Categorización de la Denuncia
  category: CategoryType;
  subcategory: string;
  customSubcategoryDescription?: string; // Campo adicional para cuando se selecciona "otro"
  eventDate: string;
  knowledgeDate: string;
  relationWithFacts: ReporterRelationType;
  isKarinLaw: boolean;

  // Paso 3: Datos del Denunciado
  accusedPersons: AccusedPersonType[];

  // Paso 4: Descripción Detallada
  detailedDescription: string;
  exactLocation: string;
  conductFrequency: ConductFrequencyType;
  witnesses: WitnessType[];
  impactType?: string;
  impact: string;

  // Paso 5: Evidencias y Documentación
  evidences: EvidenceType[];
  additionalEvidenceDescription: string;

  // Paso 6: Información Adicional
  previousActions: string;
  expectation: string;
  truthDeclaration: boolean;
  dataProcessingConsent: boolean;

  // Preguntas de seguridad para denuncias anónimas
  securityQuestions?: {
    question1: string;
    answer1: string;
    question2: string;
    answer2: string;
  };

  // Campos específicos Ley Karin
  karinFrequency?: ConductFrequencyType;
  karinWorkImpact?: string;
  karinSexualType?: KarinSexualHarassmentType;
  karinViolenceDescription?: string;
  karinRequestedMeasures?: string;
  karinRiskFactors?: {[key in KarinRiskFactorType]?: boolean}; // Respuestas a preguntas de evaluación de riesgo
  karinRiskLevel?: 'high' | 'medium' | 'low'; // Nivel de riesgo calculado
  
  // Campos para el procedimiento específico de Ley Karin
  karinProcess?: {
    stage: KarinProcessStage;
    stageHistory?: Array<{
      stage: KarinProcessStage;
      date: string;
      user: string;
      notes?: string;
    }>;
    
    // Etapa 1: Interposición de la Denuncia
    complaintFiledDate?: string;
    complaintChannel?: 'verbal' | 'escrita' | 'email' | 'jefe' | 'web';
    complaintDocumentId?: string; // ID del documento adjunto
    
    // Etapa 2: Recepción de Denuncia
    receivedDate?: string;
    receivedBy?: string;
    requiresSubsanation?: boolean;
    subsanationRequested?: string; // Fecha de solicitud de subsanación
    subsanationReceived?: string; // Fecha de recepción de subsanación
    subsanationDeadline?: string; // Plazo de 5 días hábiles para subsanar
    // Campos extendidos para subsanación
    subsanationItems?: Array<{
      id: string;
      description: string;
      status: 'pending' | 'completed';
      requiredDocumentType?: string;
    }>;
    subsanationDocuments?: Array<{
      id: string;
      fileId: string;
      fileName: string;
      uploadDate: string;
      itemId?: string; // Relaciona con el ítem que subsana
      description: string;
    }>;
    subsanationComments?: string;
    subsanationNotifications?: Array<{
      date: string;
      method: 'email' | 'phone' | 'letter';
      sentBy: string;
      subject: string;
    }>;
    subsanationReminderSent?: boolean; // Si se ha enviado recordatorio
    subsanationReminderDate?: string; // Fecha del último recordatorio enviado
    initialRiskAssessment?: 'high' | 'medium' | 'low';
    informedRights?: boolean; // Se informó a la víctima sobre sus derechos
    
    // Etapa 2.2: Notificación inicial a DT
    dtInitialNotificationDate?: string; // Fecha de notificación inicial a DT (3 días desde recepción)
    dtInitialNotificationId?: string; // ID o referencia de la notificación
    derivedToDT?: boolean; // Se derivó directamente a la DT por solicitud del trabajador
    derivedToDTManagement?: boolean; // Se derivó a la DT por involucrar a gerencia (Art. 4 CT)
    
    // Registros detallados de notificaciones a DT
    dtNotifications?: Array<{
      id: string;
      date: string; // Fecha de notificación
      documentId?: string; // ID del documento notificado (ej. informe, expediente)
      method: 'email' | 'presencial' | 'carta_certificada' | 'sistema_dt'; // Método de notificación
      trackingNumber?: string; // Número de seguimiento o ID
      contactPerson?: string; // Persona de contacto en DT
      contactEmail?: string; // Email de contacto
      contactPhone?: string; // Teléfono de contacto
      proofOfDeliveryId?: string; // ID del documento de comprobante
      proofOfDeliveryType?: 'acuse_recibo' | 'comprobante_envio' | 'email_confirmacion'; // Tipo de comprobante
      notes?: string; // Notas adicionales
      notifiedBy: string; // ID del usuario que notificó
      notifiedByName?: string; // Nombre del usuario que notificó
      status: 'pendiente' | 'enviada' | 'recibida' | 'respondida'; // Estado de la notificación
      responseDate?: string; // Fecha de respuesta recibida
      responseDocumentId?: string; // ID de la respuesta recibida
      oficina?: string; // Oficina de la DT
      direccion?: string; // Dirección de la oficina
    }>;
    
    // Etapa 2.3: Notificación a SUSESO/Mutualidades
    susesoNotificationDate?: string; // Fecha de notificación a mutualidades
    susesoNotificationId?: string; // ID o referencia de la notificación
    
    // Registros detallados de notificaciones a SUSESO/Mutualidades
    susesoNotifications?: Array<{
      id: string;
      date: string; // Fecha de notificación
      entity: 'suseso' | 'achs' | 'mutual_seguridad' | 'ist' | 'otra'; // Entidad notificada
      entityName?: string; // Nombre de la entidad si es 'otra'
      documentId?: string; // ID del documento notificado
      method: 'email' | 'presencial' | 'carta_certificada' | 'sistema_suseso'; // Método de notificación
      trackingNumber?: string; // Número de seguimiento o ID
      contactPerson?: string; // Persona de contacto
      contactEmail?: string; // Email de contacto
      contactPhone?: string; // Teléfono de contacto
      proofOfDeliveryId?: string; // ID del documento de comprobante
      proofOfDeliveryType?: 'acuse_recibo' | 'comprobante_envio' | 'email_confirmacion'; // Tipo de comprobante
      notes?: string; // Notas adicionales
      notifiedBy: string; // ID del usuario que notificó
      notifiedByName?: string; // Nombre del usuario que notificó
      status: 'pendiente' | 'enviada' | 'recibida' | 'respondida'; // Estado de la notificación
      responseDate?: string; // Fecha de respuesta recibida
      responseDocumentId?: string; // ID de la respuesta recibida
      oficina?: string; // Oficina o sede
      direccion?: string; // Dirección de la oficina
    }>;
    
    // Notificaciones a la Inspección del Trabajo
    inspectionNotifications?: Array<{
      id: string;
      date: string; // Fecha de notificación
      documentId?: string; // ID del documento notificado
      method: 'email' | 'presencial' | 'carta_certificada'; // Método de notificación
      trackingNumber?: string; // Número de seguimiento o ID
      contactPerson?: string; // Persona de contacto
      notes?: string; // Notas adicionales
      notifiedBy: string; // ID del usuario que notificó
      status: 'pendiente' | 'enviada' | 'recibida' | 'respondida'; // Estado de la notificación
      inspectorName?: string; // Nombre del inspector
      inspectorEmail?: string; // Email del inspector
      inspectorPhone?: string; // Teléfono del inspector
      visitScheduled?: boolean; // Visita programada
      visitDate?: string; // Fecha de visita programada
    }>;
    
    // Etapa 3: Medidas Precautorias
    precautionaryMeasures?: string[];
    precautionaryMeasuresDates?: {[key: string]: string}; // Medida -> Fecha de aplicación
    precautionaryJustification?: string;
    precautionaryAppliedDate?: string;
    precautionaryDeadline?: string; // 3 días hábiles desde recepción
    
    // Etapa 5: Decisión de Investigar
    decisionToInvestigateDate?: string;
    dtInvestigationType?: 'internal' | 'labor_department';
    laborDeptNotifiedDate?: string; // Fecha notificación a Dir. del Trabajo
    assignedInvestigator?: string;
    
    // Etapa 6: Investigación
    investigationStartDate?: string;
    investigationDeadline?: string; // Plazo de 30 días desde inicio
    investigationExtensionDate?: string;
    investigationExtensionReason?: string;
    
    // Etapa 7: Informe
    reportCreationDate?: string;
    reportApprovalDate?: string;
    reportFileId?: string;
    reportRevisions?: Array<{
      date: string;
      reviewer: string;
      comments: string;
      status: 'approved' | 'rejected' | 'needs_changes';
    }>;
    
    // Etapa 7: Remisión a la Dirección del Trabajo
    laborDepartmentReferralDate?: string; // Plazo de 2 días hábiles desde finalización investigación
    laborDepartmentReferralId?: string; // ID de seguimiento
    laborDepartmentReferralCompleteFile?: boolean; // Se envió expediente completo a DT
    laborDepartmentResponse?: string;
    laborDepartmentResponseDate?: string;
    laborDepartmentDeadline?: string; // 30 días hábiles desde remisión
    laborDepartmentNoResponse?: boolean; // La DT no respondió en plazo
    
    // Etapa 8: Adopción de Medidas
    measuresAdoptionDate?: string;
    measuresAdoptionDeadline?: string; // 15 días corridos tras pronunciamiento DT
    measuresAdopted?: Array<{
      measure: string;
      date: string;
      implementedBy: string;
      status: 'pending' | 'in_progress' | 'implemented' | 'verified';
      verificationDate?: string;
      isFromDT?: boolean; // La medida fue dispuesta por la DT
    }>;
    
    // Etapa 9: Sanciones
    sanctionsDate?: string;
    sanctionsApplied?: Array<{
      type: 'menor' | 'media' | 'economica' | 'maxima';
      description: string;
      date: string;
      appliedTo: string;
      appliedBy: string;
      legalReference?: string; // Referencia a artículo del Código del Trabajo (ej. 160.1.b, 160.1.f)
    }>;
    impugnationFiled?: boolean;
    impugnationDate?: string;
    impugnationResolution?: string;
    impugnationResolutionDate?: string;
    
    // Casos Especiales
    isThirdParty?: boolean; // Caso con terceros ajenos a la relación laboral
    thirdPartyType?: 'cliente' | 'proveedor' | 'usuario' | 'otro';
    isSubcontracting?: boolean; // Caso de subcontratación
    subcontractingType?: 'empresa_principal' | 'contratista' | 'subcontratista' | 'transitoria';
    multipleEmployersInvolved?: boolean; // Involucra trabajadores de distintas empresas
    
    // Documentación y seguimiento
    testimonies?: Array<{
      id: string;
      personName: string;
      personType: 'complainant' | 'accused' | 'witness';
      date: string;
      location: string;
      interviewer: string;
      summary: string;
      fileId?: string; // ID del documento
      folioNumber?: string; // Número de folio digital
      hasSigned?: boolean; // Testimonio firmado en todas sus hojas
      physicalCopy?: boolean; // Existe copia física en papel
      signatureDetails?: {
        signedAt?: string; // Fecha de firma
        signatureMethod?: 'fisica' | 'electronica' | 'firma_simple'; // Método de firma
        signatureVerifiedBy?: string; // ID de quien verificó la firma
        signatureVerifiedByName?: string; // Nombre de quien verificó la firma
        signatureImageId?: string; // ID de la imagen de la firma
        signatureObservations?: string; // Observaciones sobre la firma
        witnessName?: string; // Nombre del testigo de la firma
        witnessPosition?: string; // Cargo del testigo de la firma
        verifiedAt?: string; // Fecha de verificación
      };
      authorizedDisclosure?: boolean; // ¿Autorizó la divulgación del testimonio?
      attachments?: Array<{
        id: string;
        fileId: string;
        fileName: string;
        fileType: string;
        uploadDate: string;
        description: string;
      }>;
      recordingConsent?: boolean; // Consintió la grabación de la entrevista
      recordingFileId?: string; // ID del archivo de grabación
      transcriptionFileId?: string; // ID del archivo de transcripción
      interviewProtocol?: 'formal' | 'informal' | 'estructurada' | 'semi_estructurada'; // Protocolo seguido
      questions?: Array<{
        question: string;
        answer: string;
      }>;
      followUpDate?: string; // Fecha de seguimiento, si se requiere
      hasContradiction?: boolean; // ¿Contiene contradicciones?
      contradictionDetails?: string; // Detalles sobre contradicciones
      credibilityAssessment?: 'alta' | 'media' | 'baja'; // Evaluación de credibilidad
      credibilityJustification?: string; // Justificación de la evaluación de credibilidad
      privateNotes?: string; // Notas privadas del investigador
      relevanceLevel?: 'critico' | 'importante' | 'contextual' | 'minimo'; // Nivel de relevancia
      isConfidential?: boolean; // Debe mantenerse confidencial
      relatedTestimonies?: string[]; // IDs de testimonios relacionados
      requiresFollowUp?: boolean; // ¿Requiere seguimiento?
      changesFromPrevious?: string; // Cambios respecto a testimonios anteriores
    }>;
    evidence?: Array<{
      type: string;
      description: string;
      date: string;
      fileId?: string;
      folioNumber?: string;
    }>;
    
    // Estructura extendida para entrevistas en el contexto de investigación
    extendedInterviews?: Array<{
      id: string;
      interviewee: string;
      position: string;
      date: string; // Fecha de la entrevista
      location?: string; // Lugar de la entrevista
      conductedBy: string; // ID del entrevistador
      conductedByName?: string; // Nombre del entrevistador
      summary: string; // Resumen de la entrevista
      keyPoints: string[]; // Puntos clave identificados
      isConfidential: boolean; // Indica si la entrevista es confidencial
      recordingConsent?: boolean; // ¿Consintió la grabación?
      recordingFileId?: string; // ID del archivo de grabación
      notes?: string; // Notas adicionales
      testimonyId?: string; // ID del testimonio formal asociado
      status: 'draft' | 'pending_signature' | 'signed' | 'verified'; // Estado de la entrevista/testimonio
      signRequestSent?: boolean; // ¿Se ha enviado solicitud de firma?
      signRequestDate?: string; // Fecha de solicitud de firma
      signatureDate?: string; // Fecha en que se firmó
      physicalCopyGenerated?: boolean; // ¿Se generó copia física?
      isTestimony?: boolean; // Indica si es un testimonio formal para efectos legales
      validationToken?: string; // Token para validación externa
      validationQRCode?: string; // Código QR para validación externa
      attachments?: Array<{
        id: string;
        fileId: string;
        fileName: string;
        fileType: string;
        uploadDate: string;
        description: string;
      }>;
      protocol?: 'formal' | 'informal' | 'estructurada' | 'semi_estructurada'; // Protocolo seguido
      questions?: Array<{
        question: string;
        answer: string;
      }>;
      createdAt: string; // Fecha de registro en el sistema
      updatedAt?: string; // Última modificación
    }>;
    notifications?: Array<{
      type: 'complainant' | 'accused' | 'labor_dept' | 'authority' | 'suseso' | 'mutual' | 'police';
      date: string;
      method: 'email' | 'letter' | 'verbal' | 'system' | 'electronic';
      subject: string;
      recipient: string;
      sentBy: string;
      fileId?: string;
      requiresResponse?: boolean;
      responseReceived?: boolean;
      responseDate?: string;
    }>;
    
    // Sistema centralizado de plazos para Ley Karin
    deadlines?: KarinDeadline[];
    
    // Información de derechos y obligaciones legales
    rightsToCriminalReport?: boolean; // Se informó sobre derechos de denuncia penal
    rightsToDTReport?: boolean; // Se informó sobre derechos de denuncia a DT
    obligationArticle175CPP?: boolean; // Se cumplió con obligación art. 175 Código Procesal Penal
    psychologicalSupportOffered?: boolean; // Se ofreció apoyo psicológico temprano (mutualidad)
    
    // Información cierre
    resolutionDate?: string;
    closingType?: 'founded' | 'unfounded' | 'insufficient_evidence' | 'abandoned' | 'derived_to_dt';
    closingJustification?: string;
    closingFileId?: string;
    allPartiesNotified?: boolean; // Se notificó a todas las partes involucradas
    partyNotificationDate?: string; // Fecha de notificación a partes (5 días hábiles);
  };
};

// Valores iniciales para el formulario
export const initialValues: ReportFormValues = {
  // Paso 1
  relationship: 'empleado',
  isAnonymous: false,
  contactInfo: {
    name: '',
    email: '',
    phone: '',
    position: '',
  },
  isVictim: null, // Inicializado como null para permitir selección
  victimInfo: {
    name: ''
  },
  relationToVictim: '',
  acceptPrivacyPolicy: false,

  // Paso 2
  category: '',
  subcategory: '',
  customSubcategoryDescription: '',
  eventDate: '',
  knowledgeDate: '',
  relationWithFacts: 'testigo',
  isKarinLaw: false,

  // Paso 3
  accusedPersons: [],

  // Paso 4
  detailedDescription: '',
  exactLocation: '',
  conductFrequency: 'unica',
  witnesses: [],
  impactType: '',
  impact: '',

  // Paso 5
  evidences: [],
  additionalEvidenceDescription: '',

  // Paso 6
  previousActions: '',
  expectation: '',
  truthDeclaration: false,
  dataProcessingConsent: false,

  // Preguntas de seguridad para denuncias anónimas
  securityQuestions: {
    question1: '',
    answer1: '',
    question2: '',
    answer2: ''
  }
};

// Tipos para recuperación de códigos
export interface SecurityQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

// Lista de preguntas de seguridad predefinidas
export const SECURITY_QUESTIONS: SecurityQuestion[] = [
  {
    id: 'month_incident',
    question: '¿En qué mes ocurrió el incidente principal?',
    placeholder: 'Ejemplo: Enero, Febrero, etc.'
  },
  {
    id: 'department_location',
    question: '¿En qué departamento o área ocurrieron los hechos?',
    placeholder: 'Ejemplo: Administración, Ventas, etc.'
  },
  {
    id: 'day_week',
    question: '¿Qué día de la semana ocurrió principalmente?',
    placeholder: 'Ejemplo: Lunes, Martes, etc.'
  },
  {
    id: 'time_day',
    question: '¿En qué momento del día ocurrió?',
    placeholder: 'Ejemplo: Mañana, Tarde, Noche'
  },
  {
    id: 'category_selected',
    question: '¿Qué categoría seleccionó para su denuncia?',
    placeholder: 'Ejemplo: Acoso laboral, Medioambiente, etc.'
  },
  {
    id: 'people_involved',
    question: '¿Cuántas personas estuvieron directamente involucradas?',
    placeholder: 'Ejemplo: 1, 2, 3, etc.'
  },
  {
    id: 'report_length',
    question: '¿Aproximadamente cuántas líneas escribió en la descripción?',
    placeholder: 'Ejemplo: Pocas, Varias, Muchas'
  }
];

// Interfaz para datos de recuperación
export interface CodeRecoveryData {
  // Para denuncias identificadas
  email?: string;
  
  // Para denuncias anónimas  
  reportCode?: string;
  securityAnswers?: {
    question1Id: string;
    answer1: string;
    question2Id: string;
    answer2: string;
  };
  
  // Datos adicionales de verificación
  categorySelected?: string;
  eventMonth?: string;
  locationDepartment?: string;
}