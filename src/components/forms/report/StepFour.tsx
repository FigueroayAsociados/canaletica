// src/components/forms/report/StepFour.tsx

import React, { useState, useEffect } from 'react';
import { Field, ErrorMessage, FormikProps } from 'formik';
import { v4 as uuidv4 } from 'uuid';
import { ReportFormValues, WitnessType, KARIN_RISK_QUESTIONS, KarinRiskFactorType } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { getCompanyConfig, CompanyConfig, FormOptionValue, getFormOptions } from '@/lib/services/configService';
import { useCompany } from '@/lib/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StepFourProps {
  formikProps: FormikProps<ReportFormValues>;
}

const StepFour: React.FC<StepFourProps> = ({ formikProps }) => {
  const { values, errors, touched, setFieldValue } = formikProps;
  const { companyId } = useCompany();
  
  // Estados para almacenar la configuración
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [frequencyOptions, setFrequencyOptions] = useState<FormOptionValue[]>([]);
  const [impactOptions, setImpactOptions] = useState<FormOptionValue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para el nuevo testigo
  const [newWitness, setNewWitness] = useState<Omit<WitnessType, 'id'>>({
    name: '',
    contact: '',
  });
  
  // Cargar configuración de la empresa al montar el componente
  useEffect(() => {
    const loadConfigData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener configuración de la empresa
        const configResult = await getCompanyConfig(companyId);
        if (configResult.success && configResult.config) {
          setCompanyConfig(configResult.config);
        } else {
          setError('No se pudo cargar la configuración. Se usarán valores predeterminados.');
        }
        
        // Cargar opciones de frecuencias
        const frequenciesResult = await getFormOptions(companyId, 'frequencies');
        if (frequenciesResult.success && frequenciesResult.options) {
          // Filtrar solo opciones activas y ordenar por el campo "order"
          const activeOptions = frequenciesResult.options
            .filter(option => option.isActive)
            .sort((a, b) => a.order - b.order);
          
          setFrequencyOptions(activeOptions);
        } else {
          console.warn('No se pudieron cargar las opciones de frecuencias:', frequenciesResult.error);
          // En caso de error, se usarán las opciones por defecto definidas en el componente
        }
        
        // Cargar opciones de tipos de impacto
        const impactsResult = await getFormOptions(companyId, 'impacts');
        if (impactsResult.success && impactsResult.options) {
          // Filtrar solo opciones activas y ordenar por el campo "order"
          const activeOptions = impactsResult.options
            .filter(option => option.isActive)
            .sort((a, b) => a.order - b.order);
          
          setImpactOptions(activeOptions);
        } else {
          console.warn('No se pudieron cargar las opciones de tipos de impacto:', impactsResult.error);
          // En caso de error, se usarán las opciones por defecto definidas en el componente
        }
      } catch (err) {
        console.error('Error al cargar datos de configuración:', err);
        setError('Ocurrió un error al cargar la configuración. Se usarán valores predeterminados.');
      } finally {
        setLoading(false);
      }
    };
    
    loadConfigData();
  }, [companyId]);
  
  // Agregar nuevo testigo
  const handleAddWitness = () => {
    if (newWitness.name.trim()) {
      const witness = {
        ...newWitness,
        id: uuidv4(),
      };
      
      setFieldValue('witnesses', [...values.witnesses, witness]);
      
      // Limpiar formulario
      setNewWitness({
        name: '',
        contact: '',
      });
    }
  };
  
  // Eliminar testigo
  const handleRemoveWitness = (id: string) => {
    setFieldValue(
      'witnesses',
      values.witnesses.filter((witness) => witness.id !== id)
    );
  };
  
  // Manejar cambios en el formulario de nuevo testigo
  const handleWitnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewWitness((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Descripción Detallada
        </h3>
        <p className="text-gray-600">
          En esta sección debe proporcionar una descripción completa y detallada de los hechos
          denunciados. Cuanta más información proporcione, mejor podremos investigar su denuncia.
        </p>
      </div>

      {/* Descripción detallada */}
      <div className="mb-6">
        <Label htmlFor="detailedDescription" required>
          Describa en detalle los hechos denunciados
        </Label>
        <Field
          as={Textarea}
          id="detailedDescription"
          name="detailedDescription"
          rows={8}
          error={touched.detailedDescription && errors.detailedDescription}
          className="mt-1"
          placeholder="Describa con el mayor detalle posible qué ocurrió, cómo ocurrió, quiénes participaron, y cualquier otra información relevante."
        />
        <ErrorMessage name="detailedDescription">
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
        <p className="text-sm text-gray-500 mt-1">
          Mínimo 100 caracteres. Sea lo más específico posible e incluya fechas, nombres y detalles relevantes.
        </p>
      </div>

      {/* Lugar exacto de los hechos */}
      <div className="mb-6">
        <Label htmlFor="exactLocation" required>
          Lugar exacto donde ocurrieron los hechos
        </Label>
        <Field
          as={Input}
          id="exactLocation"
          name="exactLocation"
          error={touched.exactLocation && errors.exactLocation}
          className="mt-1"
          placeholder="Ej: Oficina principal, piso 3, sala de reuniones B, etc."
        />
        <ErrorMessage name="exactLocation">
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>

      {/* Frecuencia de la conducta */}
      <div className="mb-6">
        <Label htmlFor="conductFrequency" required>
          Frecuencia de la conducta denunciada
        </Label>
        {error && (
          <Alert variant="error" className="mb-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field
          as={Select}
          id="conductFrequency"
          name="conductFrequency"
          error={touched.conductFrequency && errors.conductFrequency}
          className="mt-1"
          disabled={loading}
        >
          <option value="">Seleccione una opción</option>
          {!loading && frequencyOptions.length > 0 ? (
            // Opciones cargadas dinámicamente desde la configuración
            frequencyOptions.map(option => (
              <option key={option.id} value={option.value}>
                {option.name}{option.description ? ` (${option.description})` : ''}
              </option>
            ))
          ) : (
            // Opciones por defecto en caso de error o carga
            <>
              <option value="unica">Única vez (evento aislado)</option>
              <option value="ocasional">Ocasional (varias veces sin un patrón claro)</option>
              <option value="reiterada">Reiterada (se repite con regularidad)</option>
              <option value="sistematica">Sistemática (constante y deliberada)</option>
            </>
          )}
        </Field>
        <ErrorMessage name="conductFrequency">
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
        
        {loading && (
          <p className="text-sm text-gray-500 mt-1">Cargando configuración...</p>
        )}
      </div>

      {/* Testigos */}
      <div className="mb-6">
        <Label>Testigos de los hechos (opcional)</Label>
        <p className="text-sm text-gray-500 mb-3">
          Si hay personas que presenciaron los hechos, puede agregarlas aquí. Esta información
          será tratada con confidencialidad.
        </p>

        {/* Lista de testigos */}
        {values.witnesses.length > 0 && (
          <div className="space-y-2 mb-4">
            {values.witnesses.map((witness) => (
              <Card key={witness.id} className="bg-gray-50">
                <CardContent className="py-3 px-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{witness.name}</p>
                    {witness.contact && (
                      <p className="text-sm text-gray-500">Contacto: {witness.contact}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveWitness(witness.id)}
                  >
                    Eliminar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Formulario para agregar testigo */}
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="witness-name">Nombre del testigo</Label>
              <Input
                id="witness-name"
                name="name"
                value={newWitness.name}
                onChange={handleWitnessChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="witness-contact">Contacto (opcional)</Label>
              <Input
                id="witness-contact"
                name="contact"
                value={newWitness.contact}
                onChange={handleWitnessChange}
                className="mt-1"
                placeholder="Email o teléfono"
              />
            </div>
            <Button
              type="button"
              onClick={handleAddWitness}
              variant="outline"
              disabled={!newWitness.name.trim()}
            >
              Agregar Testigo
            </Button>
          </div>
        </div>
      </div>

      {/* Impacto personal, laboral o económico */}
      <div className="mb-6">
        <Label htmlFor="impactType" required>
          Tipo de impacto
        </Label>
        <Field
          as={Select}
          id="impactType"
          name="impactType"
          className="mt-1 mb-3"
          disabled={loading}
        >
          <option value="">Seleccione un tipo de impacto</option>
          {!loading && impactOptions.length > 0 ? (
            // Opciones cargadas dinámicamente desde la configuración
            impactOptions.map(option => (
              <option key={option.id} value={option.value}>
                {option.name}{option.description ? ` (${option.description})` : ''}
              </option>
            ))
          ) : (
            // Opciones por defecto en caso de error o carga
            <>
              <option value="economico">Económico</option>
              <option value="laboral">Laboral</option>
              <option value="personal">Personal</option>
              <option value="reputacional">Reputacional</option>
              <option value="otro">Otro</option>
            </>
          )}
        </Field>
        <ErrorMessage name="impactType">
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>

        <div className={values.impactType === 'personal' ? "block" : "hidden"}>
          <Label htmlFor="impact">
            Descripción del impacto personal
          </Label>
          <Field
            as={Textarea}
            id="impact"
            name="impact"
            rows={4}
            className="mt-1"
            placeholder="Describa cómo esta situación le ha afectado a usted o a otras personas, tanto personal como laboralmente."
          />
          <p className="text-sm text-gray-500 mt-1">
            Esta información nos ayuda a comprender la gravedad de la situación y evaluar posibles riesgos psicológicos.
          </p>
        </div>
      </div>
      
      {/* Preguntas específicas para Ley Karin - aparecen solo cuando es denuncia Ley Karin Y el impacto es personal o laboral */}
      {values.isKarinLaw && (values.impactType === 'personal' || values.impactType === 'laboral') && (
        <div className="mt-8 border-t pt-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Evaluación de factores de riesgo
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Información importante:</strong> Las siguientes preguntas nos ayudarán a evaluar el nivel de riesgo y 
                determinar las medidas precautorias necesarias según la Ley Karin. Su respuesta a estas preguntas es confidencial
                y solo será utilizada para proteger a la persona afectada.
              </p>
            </div>
            
            <div className="space-y-4">
              {KARIN_RISK_QUESTIONS.map((question) => (
                <Card key={question.id} className={`border-l-4 ${
                  question.riskLevel === 'high' ? 'border-l-red-500' : 
                  question.riskLevel === 'medium' ? 'border-l-orange-500' : 'border-l-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <p className="font-medium mb-2">{question.question}</p>
                    {question.description && (
                      <p className="text-sm text-gray-600 mb-3">{question.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          // Actualiza el objeto karinRiskFactors con la respuesta
                          const currentFactors = values.karinRiskFactors || {};
                          setFieldValue('karinRiskFactors', {
                            ...currentFactors,
                            [question.id]: true
                          });
                        }}
                        className={`px-4 py-2 rounded-md ${
                          values.karinRiskFactors?.[question.id] === true
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Actualiza el objeto karinRiskFactors con la respuesta
                          const currentFactors = values.karinRiskFactors || {};
                          setFieldValue('karinRiskFactors', {
                            ...currentFactors,
                            [question.id]: false
                          });
                        }}
                        className={`px-4 py-2 rounded-md ${
                          values.karinRiskFactors?.[question.id] === false
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepFour;