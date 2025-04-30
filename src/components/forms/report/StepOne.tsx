// src/components/forms/report/StepOne.tsx

import React, { useState, useEffect } from 'react';
import { Field, ErrorMessage, FormikProps } from 'formik';
import { ReportFormValues } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCompanyConfig, CompanyConfig, FormOptionValue, getFormOptions } from '@/lib/services/configService';
import { useCompany } from '@/lib/contexts/CompanyContext';

interface StepOneProps {
  formikProps: FormikProps<ReportFormValues>;
}

const StepOne: React.FC<StepOneProps> = ({ formikProps }) => {
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

      {/* Tipo de relación con la empresa */}
      <div className="mb-6">
        <Label htmlFor="relationship" required>
          ¿Cuál es su relación con la empresa?
        </Label>
        {error && (
          <Alert variant="error" className="mb-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field
          as={Select}
          id="relationship"
          name="relationship"
          error={touched.relationship && errors.relationship}
          className="mt-1"
          disabled={loading}
        >
          <option value="">Seleccione una opción</option>
          {!loading && relationshipOptions.length > 0 ? (
            // Opciones cargadas dinámicamente desde la configuración
            <>
              {relationshipOptions.map(option => (
                <option key={option.id} value={option.value}>
                  {option.name}
                </option>
              ))}
            </>
          ) : (
            // Opciones por defecto en caso de error o carga
            <>
              <option value="empleado">Empleado</option>
              <option value="proveedor">Proveedor</option>
              <option value="cliente">Cliente</option>
              <option value="contratista">Contratista</option>
              <option value="otro">Otro</option>
            </>
          )}
        </Field>
        <ErrorMessage name="relationship">
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
        
        {loading && (
          <p className="text-sm text-gray-500 mt-1">Cargando configuración...</p>
        )}
      </div>

      {/* Opción de denuncia anónima - Solo visible si NO es Ley Karin */}
      {!values.isKarinLaw ? (
        <div className="mb-6">
          <Label required>¿Desea realizar una denuncia anónima?</Label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center">
              <Field
                type="radio"
                id="anonymous-yes"
                name="isAnonymous"
                value="true"
                checked={values.isAnonymous === true}
                onChange={handleAnonymousChange}
                className="h-4 w-4 text-primary"
                disabled={values.isKarinLaw} // Desactivar si es Ley Karin
              />
              <label htmlFor="anonymous-yes" className={`ml-2 text-sm ${values.isKarinLaw ? 'text-gray-400' : 'text-gray-700'}`}>
                Sí, quiero mantener mi identidad anónima
              </label>
              {values.isKarinLaw && (
                <span className="ml-2 text-xs text-red-500">(No disponible para Ley Karin)</span>
              )}
            </div>
            <div className="flex items-center">
              <Field
                type="radio"
                id="anonymous-no"
                name="isAnonymous"
                value="false"
                checked={values.isAnonymous === false}
                onChange={handleAnonymousChange}
                className="h-4 w-4 text-primary"
              />
              <label htmlFor="anonymous-no" className="ml-2 text-sm text-gray-700">
                No, acepto proporcionar mis datos de contacto
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
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
        <div className="bg-gray-50 p-4 rounded-md space-y-4 border border-gray-200">
          <h4 className="font-medium text-gray-900">Información de contacto</h4>
          
          <div>
            <Label htmlFor="contactInfo.name" required>
              Nombre completo
            </Label>
            <Field
              as={Input}
              id="contactInfo.name"
              name="contactInfo.name"
              error={touched.contactInfo?.name && errors.contactInfo?.name}
              className="mt-1"
            />
            <ErrorMessage name="contactInfo.name">
              {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
            </ErrorMessage>
          </div>
          
          <div>
            <Label htmlFor="contactInfo.email" required>
              Correo electrónico
            </Label>
            <Field
              as={Input}
              type="email"
              id="contactInfo.email"
              name="contactInfo.email"
              error={touched.contactInfo?.email && errors.contactInfo?.email}
              className="mt-1"
            />
            <ErrorMessage name="contactInfo.email">
              {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
            </ErrorMessage>
          </div>
          
          <div>
            <Label htmlFor="contactInfo.phone" required>
              Teléfono de contacto
            </Label>
            <Field
              as={Input}
              id="contactInfo.phone"
              name="contactInfo.phone"
              error={touched.contactInfo?.phone && errors.contactInfo?.phone}
              className="mt-1"
            />
            <ErrorMessage name="contactInfo.phone">
              {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
            </ErrorMessage>
          </div>
          
          <div>
            <Label htmlFor="contactInfo.position">
              Cargo o posición (opcional)
            </Label>
            <Field
              as={Input}
              id="contactInfo.position"
              name="contactInfo.position"
              className="mt-1"
            />
          </div>

          {/* Sección adicional para Ley Karin - Denuncias de terceros */}
          {values.isKarinLaw && (
            <div className="mt-4 border-t pt-4">
              <Label required>¿Es usted la persona afectada directamente?</Label>
              
              {/* Inicializar valor de isVictim si no está definido */}
              {values.isVictim === undefined && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-3">
                  <p className="text-sm text-blue-700">
                    Por favor seleccione si usted es la persona afectada o si realiza la denuncia por otra persona.
                  </p>
                </div>
              )}
              
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    console.log("Estableciendo isVictim=true");
                    setFieldValue('isVictim', true);
                  }}
                  className={`w-full text-left p-3 rounded-md ${values.isVictim === true 
                    ? 'bg-blue-100 border-blue-400 border-2' 
                    : 'bg-gray-50 border border-gray-300 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center">
                    <div className={`h-4 w-4 rounded-full mr-2 ${values.isVictim === true ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <span className="font-medium">Sí, soy la víctima directa</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    console.log("Estableciendo isVictim=false");
                    setFieldValue('isVictim', false);
                  }}
                  className={`w-full text-left p-3 rounded-md ${values.isVictim === false 
                    ? 'bg-blue-100 border-blue-400 border-2' 
                    : 'bg-gray-50 border border-gray-300 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center">
                    <div className={`h-4 w-4 rounded-full mr-2 ${values.isVictim === false ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <span className="font-medium">No, denuncio en representación de la persona afectada</span>
                  </div>
                </button>
              </div>

              {/* Campos adicionales si denuncia por otra persona */}
              {values.isVictim === false && (
                <div className="mt-4 space-y-4 p-3 bg-gray-100 rounded-md">
                  <div>
                    <Label htmlFor="victimInfo.name" required>
                      Nombre completo de la persona afectada
                    </Label>
                    <Field
                      as={Input}
                      id="victimInfo.name"
                      name="victimInfo.name"
                      error={touched.victimInfo?.name && errors.victimInfo?.name}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
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
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Adjunte un documento que acredite su autorización para presentar esta denuncia (poder simple, mandato, correo electrónico u otro).
                      Formatos aceptados: PDF, DOC, DOCX, JPG, JPEG, PNG. Máximo 5MB.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="relationToVictim" required>
                      Relación con la persona afectada
                    </Label>
                    <Field
                      as={Select}
                      id="relationToVictim"
                      name="relationToVictim"
                      error={touched.relationToVictim && errors.relationToVictim}
                      className="mt-1"
                    >
                      <option value="">Seleccione una opción</option>
                      <option value="familiar">Familiar</option>
                      <option value="companero_trabajo">Compañero/a de trabajo</option>
                      <option value="jefatura">Jefatura</option>
                      <option value="representante_legal">Representante legal</option>
                      <option value="otro">Otra relación</option>
                    </Field>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mensaje sobre anonimato */}
      {values.isAnonymous && (
        <Alert variant="info" className="mb-6">
          <AlertDescription>
            <p className="text-sm">
              <strong>Importante:</strong> Al realizar una denuncia anónima, recibirá un código de acceso único.
              Guarde este código en un lugar seguro, lo necesitará para dar seguimiento a su denuncia.
            </p>
          </AlertDescription>
        </Alert>
      )}


      {/* Aceptación de política de privacidad */}
      <div className="mt-8">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <Field
              type="checkbox"
              id="acceptPrivacyPolicy"
              name="acceptPrivacyPolicy"
              className="h-4 w-4 text-primary rounded border-gray-300"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="acceptPrivacyPolicy" className="font-medium text-gray-700">
              Acepto la política de privacidad y el tratamiento de mis datos personales
            </label>
            <p className="text-gray-500">
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
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>
    </div>
  );
};

export default StepOne;