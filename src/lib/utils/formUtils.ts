// src/lib/utils/formUtils.ts

import { ReportFormValues } from '@/types/report';

/**
 * Tipo para definir reglas de visibilidad condicional de secciones del formulario
 */
export interface FormSection {
  id: string;
  name: string;
  description?: string;
  isVisible: (values: ReportFormValues) => boolean;
  isRequired?: (values: ReportFormValues) => boolean;
  dependsOn?: string[];
}

/**
 * Determina si una sección del formulario debe mostrarse basado en valores actuales
 * @param sectionId ID de la sección a verificar
 * @param values Valores actuales del formulario
 * @param sections Configuración de todas las secciones
 * @returns boolean indicando si la sección debe mostrarse
 */
export const shouldShowSection = (
  sectionId: string,
  values: ReportFormValues,
  sections: FormSection[]
): boolean => {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return true; // Si no hay configuración, mostramos por defecto
  
  return section.isVisible(values);
};

/**
 * Determina si una sección es obligatoria basada en los valores actuales
 * @param sectionId ID de la sección a verificar
 * @param values Valores actuales del formulario
 * @param sections Configuración de todas las secciones
 * @returns boolean indicando si la sección es obligatoria
 */
export const isSectionRequired = (
  sectionId: string,
  values: ReportFormValues,
  sections: FormSection[]
): boolean => {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return false; // Si no hay configuración, no es obligatorio por defecto
  
  return section.isRequired ? section.isRequired(values) : false;
};

/**
 * Configuración global de secciones condicionales del formulario
 */
export const formSections: FormSection[] = [
  // Secciones relacionadas con Paso 1
  {
    id: 'contactInfo',
    name: 'Información de contacto',
    description: 'Datos personales del denunciante',
    isVisible: (values) => !values.isAnonymous,
    isRequired: (values) => !values.isAnonymous
  },
  {
    id: 'victimInfo',
    name: 'Información de la víctima',
    description: 'Datos de la persona afectada',
    isVisible: (values) => values.isKarinLaw && values.isVictim === false,
    isRequired: (values) => values.isKarinLaw && values.isVictim === false,
    dependsOn: ['isKarinLaw', 'isVictim']
  },
  
  // Secciones relacionadas con Paso 3
  {
    id: 'accusedPersons',
    name: 'Personas denunciadas',
    description: 'Información sobre las personas involucradas',
    isVisible: () => true, // Siempre visible
    isRequired: (values) => values.isKarinLaw // Obligatorio solo para Ley Karin
  },
  
  // Secciones relacionadas con Paso 4
  {
    id: 'karinRiskQuestions',
    name: 'Evaluación de factores de riesgo',
    description: 'Preguntas específicas para casos Ley Karin',
    isVisible: (values) => values.isKarinLaw && (values.impactType === 'personal' || values.impactType === 'laboral'),
    dependsOn: ['isKarinLaw', 'impactType']
  },
  {
    id: 'impactDescription',
    name: 'Descripción del impacto',
    description: 'Detalles sobre cómo la situación ha afectado',
    isVisible: (values) => values.impactType === 'personal' || values.impactType === 'laboral',
    dependsOn: ['impactType']
  },
  
  // Secciones relacionadas con Paso 5
  {
    id: 'evidences',
    name: 'Evidencias',
    description: 'Archivos o enlaces que respaldan la denuncia',
    isVisible: () => true // Siempre visible pero opcional
  },
  
  // Secciones relacionadas con Paso 6
  {
    id: 'previousActions',
    name: 'Acciones previas',
    description: 'Medidas tomadas anteriormente',
    isVisible: () => true // Siempre visible pero opcional
  }
];

/**
 * Calcula el porcentaje de compleción del formulario basado en los campos obligatorios y opcionales
 * @param values Valores actuales del formulario
 * @returns Número entre 0 y 100 representando el porcentaje de compleción
 */
export const calculateCompletionPercentage = (values: ReportFormValues): number => {
  // Lista de verificaciones de compleción para campos obligatorios
  const requiredChecks = [
    // Paso 1: Identificación
    { field: 'relationship', check: () => !!values.relationship },
    { field: 'isAnonymous', check: () => values.isAnonymous !== undefined },
    { field: 'contactInfo', check: () => values.isAnonymous || (
      !!values.contactInfo?.name && 
      !!values.contactInfo?.email && 
      !!values.contactInfo?.phone
    )},
    { field: 'victimInfo', check: () => !values.isKarinLaw || values.isVictim !== false || (
      !!values.victimInfo?.name && 
      !!values.relationToVictim
    )},
    { field: 'acceptPrivacyPolicy', check: () => !!values.acceptPrivacyPolicy },
    
    // Paso 2: Categorización
    { field: 'category', check: () => !!values.category },
    { field: 'subcategory', check: () => !!values.subcategory },
    { field: 'eventDate', check: () => !!values.eventDate },
    { field: 'knowledgeDate', check: () => !!values.knowledgeDate },
    { field: 'relationWithFacts', check: () => !!values.relationWithFacts },
    
    // Paso 3: Denunciados
    { field: 'accusedPersons', check: () => !values.isKarinLaw || values.accusedPersons.length > 0 },
    
    // Paso 4: Descripción
    { field: 'detailedDescription', check: () => !!values.detailedDescription && values.detailedDescription.length >= 100 },
    { field: 'exactLocation', check: () => !!values.exactLocation },
    { field: 'conductFrequency', check: () => !!values.conductFrequency },
    
    // Paso 6: Confirmación
    { field: 'truthDeclaration', check: () => !!values.truthDeclaration },
    { field: 'dataProcessingConsent', check: () => !!values.dataProcessingConsent },
  ];
  
  // Lista de verificaciones para campos opcionales que suman puntos adicionales
  const optionalChecks = [
    { field: 'witnesses', check: () => values.witnesses.length > 0 },
    { field: 'evidences', check: () => values.evidences.length > 0 },
    { field: 'previousActions', check: () => !!values.previousActions },
    { field: 'expectation', check: () => !!values.expectation },
  ];
  
  // Calcular el porcentaje de campos obligatorios completados
  const requiredCompleted = requiredChecks.filter(item => item.check()).length;
  const requiredPercentage = (requiredCompleted / requiredChecks.length) * 100;
  
  // Calcular el porcentaje de campos opcionales completados
  // Estos suman hasta un 10% adicional al porcentaje total
  const optionalCompleted = optionalChecks.filter(item => item.check()).length;
  const optionalPercentage = (optionalCompleted / optionalChecks.length) * 10;
  
  // El porcentaje total está limitado a 100%
  return Math.min(requiredPercentage + optionalPercentage, 100);
};

/**
 * Estima el tiempo restante para completar el formulario basado en el paso actual y los campos completados
 * @param currentStep Paso actual del formulario (0-5)
 * @param values Valores actuales del formulario
 * @returns Tiempo estimado en minutos
 */
export const estimateRemainingTime = (currentStep: number, values: ReportFormValues): number => {
  // Tiempo base estimado por paso (en minutos)
  const baseTimePerStep = [3, 2, 3, 4, 2, 1];
  
  // Calcular tiempo para pasos futuros
  let remainingTime = 0;
  for (let i = currentStep; i < baseTimePerStep.length; i++) {
    remainingTime += baseTimePerStep[i];
  }
  
  // Ajustar según la complejidad de la denuncia
  if (values.isKarinLaw) {
    remainingTime += 2; // Las denuncias Ley Karin requieren más tiempo
  }
  
  // Reducir tiempo si ya hay campos completados en el paso actual
  const completionPercentage = calculateCompletionPercentage(values);
  const currentStepCompletion = Math.min((completionPercentage / 100) * 6, currentStep + 1) - currentStep;
  
  remainingTime -= baseTimePerStep[currentStep] * currentStepCompletion;
  
  return Math.max(1, Math.round(remainingTime)); // Mínimo 1 minuto
};