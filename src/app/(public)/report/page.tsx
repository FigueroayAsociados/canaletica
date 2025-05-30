// src/app/(public)/report/page.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { initialValues, ReportFormValues } from '@/types/report';
import StepOne from '@/components/forms/report/StepOne';
import StepTwo from '@/components/forms/report/StepTwo';
import StepThree from '@/components/forms/report/StepThree';
import StepFour from '@/components/forms/report/StepFour';
import StepFive from '@/components/forms/report/StepFive';
import StepSix from '@/components/forms/report/StepSix';
import SuccessStep from '@/components/forms/report/SuccessStep';
import { createReport, uploadEvidence } from '@/lib/services/reportService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/lib/hooks';
import { FormProvider } from '@/lib/contexts/FormContext';
import { calculateCompletionPercentage, estimateRemainingTime, shouldShowSection, formSections } from '@/lib/utils/formUtils';

// Validación para cada paso del formulario
const validationSchemas = [
  // Paso 1: Identificación del Denunciante
  Yup.object({
    relationship: Yup.string().required('Debe seleccionar su relación con la empresa'),
    isAnonymous: Yup.boolean(),
    isKarinLaw: Yup.boolean(),
    isVictim: Yup.boolean().when(['isKarinLaw', 'isAnonymous'], {
      is: (isKarinLaw, isAnonymous) => isKarinLaw === true && isAnonymous === false,
      then: () => Yup.boolean().required('Debe indicar si es la persona afectada'),
      otherwise: () => Yup.boolean().notRequired()
    }),
    contactInfo: Yup.object().when('isAnonymous', {
      is: false,
      then: () => Yup.object({
        name: Yup.string().required('El nombre es obligatorio'),
        email: Yup.string().email('Ingrese un email válido').required('El email es obligatorio'),
        phone: Yup.string().required('El teléfono es obligatorio'),
      }),
      otherwise: () => Yup.object().notRequired()
    }),
    // Validación para cuando es denuncia Ley Karin y no es la víctima directa
    victimInfo: Yup.object().when(['isKarinLaw', 'isVictim'], {
      is: (isKarinLaw, isVictim) => isKarinLaw === true && isVictim === false,
      then: () => Yup.object({
        name: Yup.string().required('El nombre de la persona afectada es obligatorio'),
      }),
      otherwise: () => Yup.object().notRequired()
    }),
    relationToVictim: Yup.string().when(['isKarinLaw', 'isVictim'], {
      is: (isKarinLaw, isVictim) => isKarinLaw === true && isVictim === false,
      then: () => Yup.string().required('La relación con la persona afectada es obligatoria'),
      otherwise: () => Yup.string().notRequired()
    }),
    authorizationDocument: Yup.mixed().when(['isKarinLaw', 'isVictim'], {
      is: (isKarinLaw, isVictim) => isKarinLaw === true && isVictim === false,
      then: () => Yup.mixed().required('Debe adjuntar el documento de autorización'),
      otherwise: () => Yup.mixed().notRequired()
    }),
    acceptPrivacyPolicy: Yup.boolean()
      .oneOf([true], 'Debe aceptar la política de privacidad')
      .required('Debe aceptar la política de privacidad'),
  }),

  // Paso 2: Categorización de la Denuncia
  Yup.object({
    category: Yup.string().required('Debe seleccionar una categoría'),
    subcategory: Yup.string().required('Debe seleccionar una subcategoría'),
    eventDate: Yup.date()
      .max(new Date(), 'La fecha no puede ser futura')
      .required('Debe indicar la fecha aproximada de los hechos'),
    knowledgeDate: Yup.date()
      .max(new Date(), 'La fecha no puede ser futura')
      .required('Debe indicar la fecha en que tomó conocimiento'),
    relationWithFacts: Yup.string().required('Debe seleccionar su relación con los hechos'),
  }),

  // Paso 3: Datos del Denunciado
  Yup.object({
    accusedPersons: Yup.array().when('isKarinLaw', {
      is: true,
      then: () => Yup.array()
        .min(1, 'Para denuncias Ley Karin debe añadir al menos una persona denunciada')
        .of(
          Yup.object({
            name: Yup.string().required('El nombre es obligatorio'),
            position: Yup.string().required('El cargo es obligatorio'),
            department: Yup.string().required('El departamento es obligatorio'),
            relationship: Yup.string().required('La relación es obligatoria'),
          })
        ),
      otherwise: () => Yup.array()
        // No se requiere mínimo para denuncias que no son Ley Karin
        .of(
          Yup.object({
            name: Yup.string().required('El nombre es obligatorio'),
            position: Yup.string().required('El cargo es obligatorio'),
            department: Yup.string().required('El departamento es obligatorio'),
            relationship: Yup.string().required('La relación es obligatoria'),
          })
        ),
    }),
  }),

  // Paso 4: Descripción Detallada
  Yup.object({
    detailedDescription: Yup.string()
      .min(100, 'La descripción debe tener al menos 100 caracteres')
      .required('Debe proporcionar una descripción detallada'),
    exactLocation: Yup.string().required('Debe indicar el lugar exacto de los hechos'),
    conductFrequency: Yup.string().required('Debe indicar la frecuencia de la conducta'),
  }),

  // Paso 5: Evidencias y Documentación - Simplificado al máximo
  Yup.object({
    evidences: Yup.array().of(
      Yup.object({
        description: Yup.string().required('Debe proporcionar una descripción de la evidencia')
      })
    )
  }),

  // Paso 6: Información Adicional y Confirmación
  Yup.object({
    truthDeclaration: Yup.boolean()
      .oneOf([true], 'Debe declarar la veracidad de la información')
      .required('Debe declarar la veracidad de la información'),
    dataProcessingConsent: Yup.boolean()
      .oneOf([true], 'Debe dar su consentimiento para el tratamiento de datos')
      .required('Debe dar su consentimiento para el tratamiento de datos'),
  }),
];

export default function ReportPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fileErrors, setFileErrors] = useState<{ file: string, error: string }[]>([]);
  const [reportResult, setReportResult] = useState<{
    success: boolean;
    reportCode?: string;
    accessCode?: string;
    error?: string;
  } | null>(null);
  // Estado para errores de validación entre pasos
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(true);
  const router = useRouter();
  const { companyId: contextCompanyId } = useCompany();
  
  // Verificar que el usuario haya aceptado los términos antes de acceder al formulario
  useEffect(() => {
    // Implementamos una verificación simple usando localStorage para rastrear aceptación
    const termsAccepted = localStorage.getItem('termsAccepted');
    if (!termsAccepted) {
      // Redirigir a la página principal si no se han aceptado los términos
      router.push('/');
    } else {
      setShowTermsModal(false);
    }
  }, [router]);

  const isLastStep = activeStep === 5;

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    window.scrollTo(0, 0);
  };

  // Estado para el modal inicial (preguntar si es Ley Karin)
  const [showKarinModal, setShowKarinModal] = useState(true);
  const [initialAsked, setInitialAsked] = useState(false);

  // Efecto para mostrar el modal de Ley Karin al iniciar
  useEffect(() => {
    // Solo mostrar si los términos ya fueron aceptados
    if (!showTermsModal && !initialAsked) {
      setShowKarinModal(true);
    }
  }, [showTermsModal, initialAsked]);

  // Variable para rastrear si el usuario seleccionó Ley Karin
  const [isKarinReport, setIsKarinReport] = useState(false);

  // Función para manejar la respuesta del modal
  const handleKarinModalResponse = (isKarin: boolean) => {
    setShowKarinModal(false);
    setInitialAsked(true);
    setIsKarinReport(isKarin);
    setValidationError(null);
    
    if (isKarin) {
      // Si es Ley Karin, establecer los valores correspondientes
      console.log("Usuario indicó que es denuncia Ley Karin");
    } else {
      console.log("Usuario indicó que NO es denuncia Ley Karin");
    }
    
    // Añadir un pequeño retardo para asegurar que el estado se actualice correctamente
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  };

  // Validación adicional entre pasos para manejar reglas específicas
  const validateBeforeNextStep = (values: ReportFormValues, currentStep: number) => {
    console.log(`Validando paso ${currentStep}:`, values);
    
    // Si el usuario indicó inicialmente que es una denuncia Ley Karin, verificar que no sea anónima
    if (isKarinReport && values.isAnonymous) {
      console.error("Intento de denuncia anónima para Ley Karin detectado en validación");
      return "Las denuncias de Ley Karin no pueden ser anónimas. Por favor, proporcione sus datos para continuar.";
    }
    
    // Si estamos en el Paso 1 y la denuncia es anónima, verificamos que no sea Ley Karin en el Paso 2
    if (currentStep === 0 && values.isAnonymous) {
      // Si ya hay una categoría seleccionada, comprobar que no sea Ley Karin
      if (values.category) {
        // Verificar si la categoría es Ley Karin
        const isKarinCategory = values.category === 'ley_karin' || 
                              values.isKarinLaw || 
                              false;
        
        if (isKarinCategory) {
          return "Las denuncias de Ley Karin no pueden ser anónimas. Por favor, proporcione sus datos para continuar.";
        }
      }
    }
    
    // Si estamos en el Paso 2 y se seleccionó una categoría Ley Karin, verificar que no sea anónima
    if (currentStep === 1) {
      const isKarinCategory = values.category === 'ley_karin' || 
                            values.isKarinLaw || 
                            false;
      
      if (isKarinCategory && values.isAnonymous) {
        return "Las denuncias de Ley Karin no pueden ser anónimas. Por favor, regrese al Paso 1 y proporcione sus datos.";
      }
    }
    
    // Si estamos en el Paso 3 (Datos del Denunciado) y es una denuncia Ley Karin, verificar que haya al menos un denunciado
    if (currentStep === 2 && values.isKarinLaw && (!values.accusedPersons || values.accusedPersons.length === 0)) {
      return "Para denuncias relacionadas con Ley Karin, es obligatorio identificar al menos a una persona denunciada.";
    }
    
    // No se requieren denunciados para denuncias que no son Ley Karin
    // Eliminar la validación entre pasos para denuncias que no son Ley Karin
    
    // Verificación específica para el Paso 1
    if (currentStep === 0) {
      // Si no es anónimo, verificar que tenga datos de contacto completos
      if (!values.isAnonymous) {
        const contactInfo = values.contactInfo || {};
        if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
          console.log("Datos de contacto incompletos:", contactInfo);
          // No retornamos error aquí porque Formik ya lo validará con el esquema
        }
      }
      
      // Verificar la aceptación de la política de privacidad
      if (!values.acceptPrivacyPolicy) {
        console.log("Política de privacidad no aceptada");
        // No retornamos error aquí porque Formik ya lo validará con el esquema
      }
    }
    
    console.log(`Validación del paso ${currentStep} completada correctamente`);
    // Todo correcto, no hay errores
    return null;
  };

  const handleSubmit = async (values: ReportFormValues) => {
    // Verificar y corregir la coherencia de isKarinLaw e isAnonymous
    if (isKarinReport && values.isAnonymous) {
      // Esto no debería ocurrir, pero por seguridad lo corregimos
      console.error("INCONSISTENCIA DETECTADA: Denuncia Ley Karin marcada como anónima");
      values.isAnonymous = false;
    }
    
    if (!isLastStep) {
      // Validación adicional antes de pasar al siguiente paso
      const error = validateBeforeNextStep(values, activeStep);
      if (error) {
        // Mostrar error y no permitir avanzar
        setValidationError(error);
        // Limpiar el error después de 5 segundos
        setTimeout(() => setValidationError(null), 5000);
        return;
      } else {
        // Limpiar cualquier error de validación anterior
        setValidationError(null);
      }
      
      // Registrar en consola el paso actual de la validación
      console.log(`Avanzando del paso ${activeStep} al paso ${activeStep + 1}`);
      console.log("Valores actuales del formulario:", values);
      
      handleNext();
      return;
    }

    setSubmitting(true);
    setFileErrors([]);

    try {
      // Usar el companyId del contexto
      const companyId = contextCompanyId;

      // Verificar si hay archivos para subir
      const hasFiles = values.evidences && values.evidences.some(evidence => evidence.file);

      // Crear la denuncia
      const result = await createReport(companyId, values);

      if (result.success && result.reportId) {
        // Guardar la información básica de la denuncia
        let denunciaResult = {
          success: true,
          reportCode: result.reportCode,
          accessCode: result.accessCode,
        };

        // Subir las evidencias si existen
        if (hasFiles) {
          const fileUploadErrors = [];
          let filesProcessed = 0;
          const totalFiles = values.evidences.filter(e => e.file).length;
          
          // Procesar los archivos en secuencia para evitar sobrecarga
          for (const evidence of values.evidences) {
            if (evidence.file) {
              try {
                // Función para actualizar el progreso de la carga actual
                const trackProgress = (progress: number) => {
                  // Aquí se podría implementar una actualización UI si es necesario
                  console.log(`Progreso de subida de ${evidence.file?.name}: ${progress}%`);
                };
                
                const uploadResult = await uploadEvidence(
                  companyId,
                  result.reportId,
                  evidence.file,
                  evidence.description,
                  trackProgress // Pasar la función de seguimiento
                );
                
                if (!uploadResult.success) {
                  fileUploadErrors.push({
                    file: evidence.file.name,
                    error: uploadResult.error || 'Error al subir el archivo'
                  });
                }
              } catch (error) {
                console.error('Error al subir archivo:', error);
                fileUploadErrors.push({
                  file: evidence.file.name,
                  error: 'Error inesperado durante la carga'
                });
              }
              
              filesProcessed++;
            }
          }
          
          // Guardar errores de subida de archivos, si los hay
          if (fileUploadErrors.length > 0) {
            setFileErrors(fileUploadErrors);
            
            // Si hay errores en TODOS los archivos, considerar esto un problema crítico
            if (fileUploadErrors.length === totalFiles) {
              denunciaResult = {
                ...denunciaResult,
                error: 'La denuncia se creó pero ninguno de los archivos pudo subirse. Por favor, intente subir los archivos más tarde a través del seguimiento de la denuncia.'
              };
            } else {
              denunciaResult = {
                ...denunciaResult,
                error: 'La denuncia se creó correctamente, pero algunos archivos no pudieron subirse.'
              };
            }
          }
        }

        // Establecer el resultado final de la denuncia
        setReportResult(denunciaResult);

        // Avanzar al paso de éxito
        handleNext();
      } else {
        setReportResult({
          success: false,
          error: result.error || 'Error al crear la denuncia',
        });
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setReportResult({
        success: false,
        error: 'Error al procesar la solicitud',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Función para renderizar el paso actual con secciones condicionales
  const renderStep = (step: number, formikProps: any) => {
    const { values } = formikProps;
    
    // Validar qué secciones mostrar en cada paso según el estado actual
    const visibleSections = useMemo(() => {
      return formSections.filter(section => shouldShowSection(section.id, values, formSections));
    }, [values]);
    
    // Pasar las secciones visibles a cada componente de paso
    const stepProps = {
      formikProps,
      visibleSections,
      shouldShowSection: (sectionId: string) => shouldShowSection(sectionId, values, formSections)
    };
    
    switch (step) {
      case 0:
        return <StepOne {...stepProps} />;
      case 1:
        return <StepTwo {...stepProps} />;
      case 2:
        return <StepThree {...stepProps} />;
      case 3:
        return <StepFour {...stepProps} />;
      case 4:
        return <StepFive {...stepProps} />;
      case 5:
        return (
          <>
            {fileErrors.length > 0 && (
              <Alert variant="warning" className="mb-6">
                <AlertDescription>
                  <p className="mb-2 font-medium">Advertencia: Hay errores pendientes con archivos previamente añadidos.</p>
                  <ul className="list-disc pl-5 text-sm">
                    {fileErrors.map((error, index) => (
                      <li key={index}>{error.file}: {error.error}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">Puede continuar con su denuncia o volver atrás para corregir los archivos.</p>
                </AlertDescription>
              </Alert>
            )}
            <StepSix {...stepProps} />
          </>
        );
      case 6:
        return <SuccessStep result={reportResult} />;
      default:
        return null;
    }
  };

  const getStepIndicator = (step: number) => {
    switch (step) {
      case 0:
        return { title: 'Paso 1', subtitle: 'Identificación del Denunciante' };
      case 1:
        return { title: 'Paso 2', subtitle: 'Categorización de la Denuncia' };
      case 2:
        return { title: 'Paso 3', subtitle: 'Datos del Denunciado' };
      case 3:
        return { title: 'Paso 4', subtitle: 'Descripción Detallada' };
      case 4:
        return { title: 'Paso 5', subtitle: 'Evidencias y Documentación' };
      case 5:
        return { title: 'Paso 6', subtitle: 'Información Adicional y Confirmación' };
      case 6:
        return { title: 'Finalizado', subtitle: 'Denuncia Registrada' };
      default:
        return { title: '', subtitle: '' };
    }
  };

  // Si estamos en el paso final (confirmación), no necesitamos mostrar el formulario
  if (activeStep === 6) {
    return <SuccessStep result={reportResult} />;
  }

  return (
    <div>
      {/* Modal inicial para preguntar si es Ley Karin */}
      {showKarinModal && !showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tipo de denuncia</h3>
            <p className="text-gray-600 mb-6">
              ¿Está realizando una denuncia relacionada con la Ley Karin (acoso laboral, acoso sexual o violencia en el trabajo)?
            </p>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => handleKarinModalResponse(true)}
                className="btn-primary"
              >
                Sí, es una denuncia Ley Karin
              </button>
              <button 
                onClick={() => handleKarinModalResponse(false)}
                className="btn-outline"
              >
                No, es otro tipo de denuncia
              </button>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800 mb-1">Información importante:</p>
              <ul className="text-xs text-blue-700 list-disc pl-4 space-y-1">
                <li>Las denuncias relacionadas con la Ley Karin (Ley N° 21.363) <strong>no pueden ser anónimas</strong> y requieren identificación del denunciante conforme a la normativa legal vigente.</li>
                <li>Si selecciona "Sí", solo verá categorías relacionadas con Ley Karin.</li>
                <li>Si selecciona "No", no se mostrarán categorías de Ley Karin.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de progreso mejorado */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            {/* Número y título del paso actual con animación */}
            <div className="flex items-center">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white font-medium mr-3 transition-all duration-300 transform">
                {activeStep + 1}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {getStepIndicator(activeStep).title}
                </h3>
                <p className="text-sm text-gray-500">
                  {getStepIndicator(activeStep).subtitle}
                </p>
              </div>
            </div>
            
            {/* Tiempo estimado - usando la función de estimación */}
            <div className="text-sm text-gray-500 hidden md:block">
              <span>Tiempo estimado: {(6 - activeStep)} min</span>
            </div>
          </div>
          
          {/* Barra de progreso animada - usando la función de cálculo de progreso */}
          <div className="relative pt-1">
            <div className="flex justify-between mb-1">
              <div className="text-xs text-gray-500">
                Progreso: {Math.round(((activeStep + 1) / 6) * 100)}%
              </div>
              <div className="text-xs text-gray-500">
                Paso {activeStep + 1} de 6
              </div>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div 
                style={{ width: `${((activeStep + 1) / 6) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500 ease-in-out"
              ></div>
            </div>
            
            {/* Pasos visuales */}
            <div className="flex justify-between mt-1">
              {[0, 1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div 
                    className={`h-3 w-3 rounded-full transition-all duration-300 ${
                      step < activeStep 
                        ? 'bg-primary' 
                        : step === activeStep 
                          ? 'bg-primary ring-4 ring-primary-100' 
                          : 'bg-gray-300'
                    }`}
                  ></div>
                  <span className="text-xs text-gray-500 hidden md:inline-block mt-1">
                    {step + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de error de validación entre pasos */}
      {validationError && (
        <div className="p-4 mx-6 mt-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error de validación</h3>
              <div className="mt-1 text-sm text-red-700">
                {validationError}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Formulario */}
      <Formik
        enableReinitialize={true}
        initialValues={{
          ...initialValues,
          // Establecer isKarinLaw basado en la selección del usuario
          isKarinLaw: isKarinReport,
          // Asegurarnos de que isAnonymous es siempre false para denuncias Ley Karin
          isAnonymous: isKarinReport ? false : initialValues.isAnonymous,
          // Asegurar que otros campos relacionados estén inicializados correctamente
          acceptPrivacyPolicy: initialValues.acceptPrivacyPolicy || false
        }}
        validationSchema={validationSchemas[activeStep]}
        onSubmit={handleSubmit}
        validateOnMount={false}
        validateOnChange={true}
        validateOnBlur={true}
        // Opciones adicionales para mejorar la validación en tiempo real
        validateOnInput={true}
      >
        {(formikProps) => (
          <FormProvider>
            <Form className="p-6">
              {renderStep(activeStep, formikProps)}

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
                {activeStep > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="btn-outline"
                  >
                    Anterior
                  </button>
                ) : (
                  <div></div> /* Espacio vacío para mantener la alineación */
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn-primary ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLastStep ? 'Enviar Denuncia' : 'Siguiente'}
                  {submitting && (
                    <span className="ml-2 inline-block animate-spin">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </Form>
          </FormProvider>
        )}
      </Formik>
    </div>
  );
}