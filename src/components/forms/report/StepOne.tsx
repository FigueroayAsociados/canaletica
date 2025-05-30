// src/components/forms/report/StepOne.tsx

import React, { useState, useEffect } from 'react';
import { Field, ErrorMessage, FormikProps } from 'formik';
import { ReportFormValues } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCompanyConfig, CompanyConfig, FormOptionValue, getFormOptions } from '@/lib/services/configService';
import { useCompany } from '@/lib/hooks';
import { useFormContext } from '@/lib/contexts/FormContext';
import FormField from '@/components/ui/form-field';
import { FormSection } from '@/lib/utils/formUtils';

interface StepOneProps {
  formikProps: FormikProps<ReportFormValues>;
  visibleSections?: FormSection[];
  shouldShowSection?: (sectionId: string) => boolean;
}

const StepOne: React.FC<StepOneProps> = ({ formikProps, visibleSections = [], shouldShowSection }) => {
  const { values, errors, touched, setFieldValue } = formikProps;
  const { companyId } = useCompany();
  
  // Efecto para forzar isAnonymous a false cuando es Ley Karin
  useEffect(() => {
    if (values.isKarinLaw) {
      if (values.isAnonymous) {
        console.log("Detectada denuncia Ley Karin: forzando denuncia no anónima");
        setFieldValue('isAnonymous', false);
      }
      
      console.log("Ley Karin detectada. Mostrando campos adicionales para representación");
    }
  }, [values.isKarinLaw, values.isAnonymous, setFieldValue]);

  // Cuando se carga el componente o cuando cambia isKarinLaw, forzar isAnonymous=false
  useEffect(() => {
    if (values.isKarinLaw) {
      console.log("StepOne: Denuncia identificada como Ley Karin", values);
      // Asegurarnos que cualquier denuncia Ley Karin SIEMPRE sea no anónima
      if (values.isAnonymous === true) {
        console.log("Forzando denuncia no anónima porque es Ley Karin");
        setFieldValue('isAnonymous', false);
      }
    }
  }, [values.isKarinLaw, values.isAnonymous, setFieldValue]);
  
  // Estados para almacenar la configuración
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [relationshipOptions, setRelationshipOptions] = useState<FormOptionValue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar configuración de la empresa al montar el componente
  useEffect(() => {
    const loadConfigData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Cargando configuración para companyId:", companyId);
        
        // Usar empresa "default" para formularios públicos si no hay companyId
        const effectiveCompanyId = companyId || 'default';
        
        // Obtener configuración de la empresa
        const configResult = await getCompanyConfig(effectiveCompanyId);
        if (configResult.success && configResult.config) {
          setCompanyConfig(configResult.config);
          console.log("Configuración cargada correctamente:", configResult.config);
        } else {
          console.warn("Error al cargar configuración:", configResult.error);
          setError('No se pudo cargar la configuración. Se usarán valores predeterminados.');
        }
        
        try {
          // Cargar opciones de relaciones
          console.log("Intentando cargar opciones de relaciones...");
          const relationshipsResult = await getFormOptions(effectiveCompanyId, 'relationships');
          console.log("Resultado de cargar relaciones:", relationshipsResult);
          
          if (relationshipsResult.success && relationshipsResult.options) {
            // Filtrar solo opciones activas y ordenar por el campo "order"
            const activeOptions = relationshipsResult.options
              .filter(option => option.isActive)
              .sort((a, b) => a.order - b.order);
            
            if (activeOptions.length > 0) {
              setRelationshipOptions(activeOptions);
              console.log("Opciones de relaciones cargadas:", activeOptions);
            } else {
              console.log("No hay opciones de relaciones activas, usando valores predeterminados");
              useDefaultRelationshipOptions();
            }
          } else {
            console.warn('No se pudieron cargar las opciones de relaciones:', relationshipsResult.error);
            useDefaultRelationshipOptions();
          }
        } catch (relationError) {
          console.error("Error específico al cargar relaciones:", relationError);
          useDefaultRelationshipOptions();
        }
      } catch (err) {
        console.error('Error al cargar datos de configuración:', err);
        setError('Ocurrió un error al cargar la configuración. Se usarán valores predeterminados.');
        useDefaultRelationshipOptions();
      } finally {
        setLoading(false);
      }
    };
    
    // Función para establecer valores predeterminados cuando hay un error
    const useDefaultRelationshipOptions = () => {
      setRelationshipOptions([
        { id: '1', name: 'Empleado', value: 'empleado', description: 'Persona que trabaja en la empresa', isActive: true, order: 0 },
        { id: '2', name: 'Proveedor', value: 'proveedor', description: 'Empresa o persona que provee bienes o servicios', isActive: true, order: 1 },
        { id: '3', name: 'Cliente', value: 'cliente', description: 'Persona o empresa que recibe nuestros servicios', isActive: true, order: 2 },
        { id: '4', name: 'Contratista', value: 'contratista', description: 'Persona contratada para un proyecto específico', isActive: true, order: 3 },
        { id: '5', name: 'Otro', value: 'otro', description: 'Otra relación no especificada', isActive: true, order: 4 }
      ]);
    };
    
    loadConfigData();
  }, [companyId]);

  const handleAnonymousChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isAnonymous = e.target.value === 'true';
    setFieldValue('isAnonymous', isAnonymous);
    
    // Si cambia de anónimo a no anónimo, asegurarse de que contactInfo esté inicializado
    if (!isAnonymous && (!values.contactInfo || Object.keys(values.contactInfo).length === 0)) {
      console.log('Inicializando contactInfo al cambiar a denuncia no anónima');
      setFieldValue('contactInfo', {
        name: '',
        email: '',
        phone: '',
        position: ''
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Identificación del Denunciante
        </h3>
        <p className="text-gray-600">
          En esta sección recopilaremos información sobre usted y su relación con la empresa.
          {!values.isKarinLaw && " Puede optar por realizar una denuncia anónima si lo prefiere."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Tipo de relación con la empresa */}
        <div className="md:col-span-2">
          {error && (
            <Alert variant="error" className="mb-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="animate-pulse">
              <Label htmlFor="relationship" required>
                ¿Cuál es su relación con la empresa?
              </Label>
              <div className="h-10 bg-gray-200 rounded mt-1"></div>
              <p className="text-sm text-gray-500 mt-1">Cargando opciones...</p>
            </div>
          ) : (
            <FormField
              name="relationship"
              label="¿Cuál es su relación con la empresa?"
              type="select"
              required
              disabled={loading}
              options={relationshipOptions.length > 0 ? 
                relationshipOptions.map(option => ({
                  value: option.value,
                  label: option.name
                })) : [
                  { value: 'empleado', label: 'Empleado' },
                  { value: 'proveedor', label: 'Proveedor' },
                  { value: 'cliente', label: 'Cliente' },
                  { value: 'contratista', label: 'Contratista' },
                  { value: 'otro', label: 'Otro' }
                ]}
              description="Seleccione cómo se relaciona usted con la empresa denunciada"
            />
          )}
        </div>

        {/* Opción de denuncia anónima - Solo visible si NO es Ley Karin */}
        {!values.isKarinLaw ? (
          <div className="md:col-span-2 mb-6">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-900 mb-2">
                <span className="text-red-500">*</span> ¿Desea realizar una denuncia anónima?
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setFieldValue('isAnonymous', true)}
                  disabled={values.isKarinLaw}
                  className={`p-4 rounded-lg border-2 text-left ${
                    values.isAnonymous && !values.isKarinLaw 
                      ? 'border-primary bg-primary-50' 
                      : values.isKarinLaw 
                        ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed' 
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                  aria-pressed={values.isAnonymous === true}
                  aria-disabled={values.isKarinLaw}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <div className="text-left">
                      <h4 className="font-medium mb-1">Denuncia Anónima</h4>
                      <p className="text-sm text-gray-600">Su identidad se mantendrá confidencial</p>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFieldValue('isAnonymous', false)}
                  className={`p-4 rounded-lg border-2 text-left ${
                    !values.isAnonymous 
                      ? 'border-primary bg-primary-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  aria-pressed={values.isAnonymous === false}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div className="text-left">
                      <h4 className="font-medium mb-1">Denuncia Identificada</h4>
                      <p className="text-sm text-gray-600">Proporcione sus datos de contacto</p>
                    </div>
                  </div>
                </button>
                
                {/* Campos ocultos para Formik */}
                <Field type="radio" id="anonymous-yes-hidden" name="isAnonymous" value="true" className="hidden" />
                <Field type="radio" id="anonymous-no-hidden" name="isAnonymous" value="false" className="hidden" />
              </div>
            </fieldset>
          </div>
        ) : (
          <div className="md:col-span-2 mb-6">
            <Alert variant="warning">
              <AlertDescription>
                <p className="font-medium">Identificación obligatoria para denuncias Ley Karin</p>
                <p className="text-sm mt-1">
                  Las denuncias bajo Ley Karin <strong>no pueden ser anónimas</strong>. Se requiere identificación 
                  del denunciante conforme a la normativa legal vigente. Si está denunciando en nombre
                  de otra persona, deberá acreditar su representación.
                </p>
              </AlertDescription>
            </Alert>
            {/* Ocultar este campo del formulario pero asegurar que siempre sea false para Ley Karin */}
            <input type="hidden" name="isAnonymous" value="false" />
          </div>
        )}

        {/* Información de contacto (si no es anónima) */}
        {!values.isAnonymous && (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 md:col-span-2">
            <h4 className="font-medium text-gray-900 mb-4">Información de contacto</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="contactInfo.name"
                label="Nombre completo"
                required
                placeholder="Ingrese su nombre completo"
                description="Nombre y apellidos de la persona que realiza la denuncia"
              />
              
              <FormField
                name="contactInfo.email"
                label="Correo electrónico"
                type="email"
                required
                placeholder="ejemplo@correo.com"
                description="Se utilizará para notificaciones relacionadas con su denuncia"
              />
              
              <FormField
                name="contactInfo.phone"
                label="Teléfono de contacto"
                type="tel"
                required
                placeholder="+56 9 XXXX XXXX"
                description="Número de teléfono donde podamos contactarle si es necesario"
              />
              
              <FormField
                name="contactInfo.position"
                label="Cargo o posición (opcional)"
                placeholder="Ej: Analista, Gerente, etc."
                description="Su cargo o posición en la empresa, si aplica"
              />
            </div>

            {/* Sección adicional para Ley Karin - Denuncias de terceros */}
            {values.isKarinLaw && (
              <div className="mt-6 border-t pt-5 md:col-span-2">
                <fieldset>
                  <legend className="text-sm font-medium text-gray-900 mb-3">
                    <span className="text-red-500">*</span> ¿Es usted la persona afectada directamente?
                  </legend>
                  
                  {/* Inicializar valor de isVictim si no está definido */}
                  {values.isVictim === undefined && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-3">
                      <p className="text-sm text-blue-700">
                        Por favor seleccione si usted es la persona afectada o si realiza la denuncia por otra persona.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Estableciendo isVictim=true");
                        setFieldValue('isVictim', true);
                      }}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${values.isVictim === true 
                        ? 'bg-blue-50 border-blue-400' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                      aria-pressed={values.isVictim === true}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium">Sí, soy la víctima directa</div>
                          <p className="text-xs text-gray-500 mt-1">Soy la persona que ha experimentado los hechos denunciados</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Estableciendo isVictim=false");
                        setFieldValue('isVictim', false);
                      }}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${values.isVictim === false 
                        ? 'bg-blue-50 border-blue-400' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                      aria-pressed={values.isVictim === false}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium">No, denuncio en representación de otra persona</div>
                          <p className="text-xs text-gray-500 mt-1">Actúo como representante de la persona afectada</p>
                        </div>
                      </div>
                    </button>

                    {/* Campo oculto para Formik */}
                    <Field type="hidden" id="isVictim-hidden" name="isVictim" />
                  </div>

                  {/* Campos adicionales si denuncia por otra persona */}
                  {values.isVictim === false && (
                    <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h5 className="font-medium mb-4">Información de la persona afectada</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <FormField
                            name="victimInfo.name"
                            label="Nombre completo de la persona afectada"
                            required
                            placeholder="Ingrese el nombre de la persona afectada"
                            description="Nombre completo de la persona que ha sufrido la situación denunciada"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor="authorizationDocument" required>
                            Documento que acredita representación o autorización
                          </Label>
                          <input
                            type="file"
                            id="authorizationDocument"
                            name="authorizationDocument"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              if (file) {
                                setFieldValue('authorizationDocument', file);
                              }
                            }}
                            className="mt-1 w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-white file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-primary file:text-white file:cursor-pointer"
                            aria-required="true"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Adjunte un documento que acredite su autorización para presentar esta denuncia (poder simple, mandato, correo electrónico u otro).
                            Formatos aceptados: PDF, DOC, DOCX, JPG, JPEG, PNG. Máximo 5MB.
                          </p>
                        </div>
                        
                        <div className="md:col-span-2">
                          <FormField
                            name="relationToVictim"
                            label="Relación con la persona afectada"
                            type="select"
                            required
                            options={[
                              { value: 'familiar', label: 'Familiar' },
                              { value: 'companero_trabajo', label: 'Compañero/a de trabajo' },
                              { value: 'jefatura', label: 'Jefatura' },
                              { value: 'representante_legal', label: 'Representante legal' },
                              { value: 'otro', label: 'Otra relación' }
                            ]}
                            description="Indique cómo se relaciona usted con la persona afectada"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>
              </div>
            )}
          </div>
        )}

        {/* Mensaje sobre anonimato */}
        {values.isAnonymous && (
          <Alert variant="info" className="mb-6 md:col-span-2">
            <AlertDescription>
              <p className="text-sm">
                <strong>Importante:</strong> Al realizar una denuncia anónima, recibirá un código de acceso único.
                Guarde este código en un lugar seguro, lo necesitará para dar seguimiento a su denuncia.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Aceptación de política de privacidad */}
        <div className="mt-6 md:col-span-2 border-t pt-6">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <Field
                type="checkbox"
                id="acceptPrivacyPolicy"
                name="acceptPrivacyPolicy"
                className="h-4 w-4 text-primary rounded border-gray-300"
                aria-required="true"
                aria-invalid={touched.acceptPrivacyPolicy && errors.acceptPrivacyPolicy ? "true" : "false"}
                aria-describedby="privacy-policy-description privacy-policy-error"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptPrivacyPolicy" className="font-medium text-gray-700">
                Acepto la política de privacidad y el tratamiento de mis datos personales
              </label>
              <p id="privacy-policy-description" className="text-gray-500">
                Al marcar esta casilla, acepta que la información proporcionada sea utilizada para
                la investigación de esta denuncia conforme a nuestra <a 
                  href="/politica-privacidad.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  política de privacidad
                </a>.
              </p>
            </div>
          </div>
          <ErrorMessage name="acceptPrivacyPolicy">
            {(msg) => <div id="privacy-policy-error" className="text-error text-sm mt-1" role="alert">{msg}</div>}
          </ErrorMessage>
        </div>
      </div>
    </div>
  );
};

export default StepOne;