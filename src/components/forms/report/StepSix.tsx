// src/components/forms/report/StepSix.tsx

import React from 'react';
import { Field, ErrorMessage, FormikProps } from 'formik';
import { ReportFormValues } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StepSixProps {
  formikProps: FormikProps<ReportFormValues>;
}

const StepSix: React.FC<StepSixProps> = ({ formikProps }) => {
  const { values, errors, touched } = formikProps;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Información Adicional y Confirmación
        </h3>
        <p className="text-gray-600">
          Esta es la última etapa del proceso de denuncia. Por favor, revise toda la información
          proporcionada antes de enviar la denuncia.
        </p>
      </div>

      {/* Resumen de la denuncia */}
      <div className="mb-6 bg-gray-50 rounded-md p-6 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Resumen de la denuncia</h4>
        
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Tipo de denuncia:</p>
              <p className="text-gray-700">
                {values.category === 'modelo_prevencion' && 'Modelo de Prevención de Delitos'}
                {values.category === 'ley_karin' && 'Ley Karin (Acoso laboral/sexual)'}
                {values.category === 'ciberseguridad' && 'Ciberseguridad'}
                {values.category === 'reglamento_interno' && 'Infracciones al Reglamento Interno'}
                {values.category === 'politicas_codigos' && 'Infracciones a Políticas y Códigos'}
                {values.category === 'represalias' && 'Represalias'}
                {values.category === 'otros' && 'Otros'}
              </p>
            </div>
            
            <div>
              <p className="font-medium">Denunciante:</p>
              <p className="text-gray-700">
                {values.isAnonymous ? 'Anónimo' : 'Identificado'}
              </p>
            </div>
            
            <div>
              <p className="font-medium">Fecha de los hechos:</p>
              <p className="text-gray-700">{values.eventDate}</p>
            </div>
            
            <div>
              <p className="font-medium">Personas denunciadas:</p>
              <p className="text-gray-700">{values.accusedPersons.length}</p>
            </div>
            
            <div>
              <p className="font-medium">Evidencias aportadas:</p>
              <p className="text-gray-700">{values.evidences.length}</p>
            </div>
            
            <div>
              <p className="font-medium">Testigos incluidos:</p>
              <p className="text-gray-700">{values.witnesses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta Ley Karin */}
      {values.isKarinLaw && (
        <Alert variant="info" className="mb-6">
          <AlertDescription>
            <p className="font-medium">Denuncia bajo Ley Karin</p>
            <p className="text-sm mt-1">
              Su denuncia será tratada según el procedimiento especial establecido por la
              Ley Karin (Ley N° 21.363), con plazos estrictos y medidas específicas.
              La investigación tendrá una duración máxima de 30 días hábiles administrativos.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Acciones previas realizadas */}
      <div className="mb-6">
        <Label htmlFor="previousActions">
          ¿Ha realizado alguna acción previa relacionada con esta situación? (opcional)
        </Label>
        <Field
          as={Textarea}
          id="previousActions"
          name="previousActions"
          rows={3}
          className="mt-1"
          placeholder="Por ejemplo, reportó a su jefe, habló con Recursos Humanos, presentó otro tipo de denuncia, etc."
        />
      </div>

      {/* Expectativas sobre la resolución */}
      <div className="mb-6">
        <Label htmlFor="expectation">
          ¿Qué expectativas tiene sobre la resolución de esta denuncia? (opcional)
        </Label>
        <Field
          as={Textarea}
          id="expectation"
          name="expectation"
          rows={3}
          className="mt-1"
          placeholder="Describa qué espera que suceda como resultado de esta denuncia."
        />
      </div>

      {/* Declaración de veracidad */}
      <div className="mt-8">
        <div className="flex items-start mb-4">
          <div className="flex items-center h-5">
            <Field
              type="checkbox"
              id="truthDeclaration"
              name="truthDeclaration"
              className="h-4 w-4 text-primary rounded border-gray-300"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="truthDeclaration" className="font-medium text-gray-700">
              Declaro que la información proporcionada es veraz y completa
            </label>
            <p className="text-gray-500">
              Entiendo que proporcionar información falsa puede tener consecuencias legales.
            </p>
          </div>
        </div>
        <ErrorMessage name="truthDeclaration">
          {(msg) => <div className="text-error text-sm mb-4">{msg}</div>}
        </ErrorMessage>

        {/* Consentimiento para tratamiento de datos */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <Field
              type="checkbox"
              id="dataProcessingConsent"
              name="dataProcessingConsent"
              className="h-4 w-4 text-primary rounded border-gray-300"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="dataProcessingConsent" className="font-medium text-gray-700">
              Doy mi consentimiento para el tratamiento de datos personales
            </label>
            <p className="text-gray-500">
              Autorizo el uso de la información proporcionada para la investigación
              de esta denuncia y la comunicación con las partes involucradas conforme a la <a 
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
        <ErrorMessage name="dataProcessingConsent">
          {(msg) => <div className="text-error text-sm">{msg}</div>}
        </ErrorMessage>
      </div>

      {/* Instrucciones finales */}
      <Alert variant="info" className="mt-8">
        <AlertDescription>
          <p className="font-medium">Instrucciones para el seguimiento</p>
          <p className="text-sm mt-1">
            Después de enviar esta denuncia, recibirá un código único que le permitirá
            realizar un seguimiento del estado de su caso. Guarde este código en un
            lugar seguro.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default StepSix;