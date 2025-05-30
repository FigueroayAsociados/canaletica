// src/components/forms/report/StepThree.tsx

import React, { useState } from 'react';
import { ErrorMessage, FormikProps } from 'formik';
import { v4 as uuidv4 } from 'uuid';
import { ReportFormValues, AccusedPersonType } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { FormSection } from '@/lib/utils/formUtils';
import FormField from '@/components/ui/form-field';
import { useFormContext } from '@/lib/contexts/FormContext';

interface StepThreeProps {
  formikProps: FormikProps<ReportFormValues>;
  visibleSections?: FormSection[];
  shouldShowSection?: (sectionId: string) => boolean;
}

const StepThree: React.FC<StepThreeProps> = ({ formikProps, visibleSections = [], shouldShowSection }) => {
  const { values, errors, touched, setFieldValue } = formikProps;
  const [newAccused, setNewAccused] = useState<AccusedPersonType>({
    id: '',
    name: '',
    position: '',
    department: '',
    relationship: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Validar formulario de nuevo denunciado
  const validateAccusedForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newAccused.name.trim()) {
      errors.name = 'El nombre es obligatorio';
    }
    
    if (!newAccused.position.trim()) {
      errors.position = 'El cargo es obligatorio';
    }
    
    if (!newAccused.department.trim()) {
      errors.department = 'El departamento es obligatorio';
    }
    
    if (!newAccused.relationship.trim()) {
      errors.relationship = 'La relación es obligatoria';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Agregar nuevo denunciado
  const handleAddAccused = () => {
    if (validateAccusedForm()) {
      const accused = {
        ...newAccused,
        id: uuidv4(),
      };
      
      setFieldValue('accusedPersons', [...values.accusedPersons, accused]);
      
      // Limpiar formulario
      setNewAccused({
        id: '',
        name: '',
        position: '',
        department: '',
        relationship: '',
      });
      setFormErrors({});
    }
  };

  // Eliminar denunciado
  const handleRemoveAccused = (id: string) => {
    setFieldValue(
      'accusedPersons',
      values.accusedPersons.filter((person) => person.id !== id)
    );
  };

  // Manejar cambios en el formulario de nuevo denunciado
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAccused((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpiar error cuando el usuario comienza a escribir
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Datos de la(s) Persona(s) Denunciada(s)
        </h3>
        {values.isKarinLaw ? (
          <p className="text-gray-600">
            En esta sección debe proporcionar información sobre la(s) persona(s) involucrada(s) en
            los hechos denunciados. Para denuncias relacionadas con Ley Karin, es obligatorio
            identificar al menos a una persona denunciada. Puede añadir tantas personas como sea necesario.
          </p>
        ) : (
          <p className="text-gray-600">
            En esta sección puede proporcionar información sobre la(s) persona(s) involucrada(s) en
            los hechos denunciados. Para este tipo de denuncia, añadir personas denunciadas es opcional.
            Puede añadir tantas personas como sea necesario o dejar esta sección vacía.
          </p>
        )}
      </div>

      {/* Lista de denunciados o mensaje de lista vacía */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Personas denunciadas</h4>
        {values.accusedPersons.length > 0 ? (
          <div className="space-y-3">
            {values.accusedPersons.map((person) => (
              <Card key={person.id} className="bg-gray-50">
                <CardHeader className="py-3 px-4 flex flex-row justify-between items-center">
                  <h5 className="font-medium">{person.name}</h5>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveAccused(person.id)}
                  >
                    Eliminar
                  </Button>
                </CardHeader>
                <CardContent className="py-3 px-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="font-medium">Cargo/Función:</span> {person.position}
                    </div>
                    <div>
                      <span className="font-medium">Departamento:</span> {person.department}
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium">Relación con el denunciante:</span> {person.relationship}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className={`p-4 border rounded-md ${values.isKarinLaw ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            {values.isKarinLaw ? (
              <p className="text-red-800 font-medium">
                No ha añadido ninguna persona denunciada. Para denuncias de Ley Karin, es <strong>obligatorio</strong> identificar al menos a una persona.
              </p>
            ) : (
              <p className="text-blue-800">
                No ha añadido ninguna persona denunciada. Para este tipo de denuncia, esto es <strong>opcional</strong>. 
                Si no conoce la identidad de la persona responsable, puede continuar sin añadir denunciados.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Formulario para agregar nuevo denunciado */}
      <div className="bg-white border border-gray-200 rounded-md p-5">
        <h4 className="font-medium text-gray-900 mb-4">Agregar persona denunciada</h4>
        
        <div className="space-y-4">
          {/* Nombre del denunciado */}
          <div>
            <Label htmlFor="name" required>
              Nombre completo
            </Label>
            <Input
              id="name"
              name="name"
              value={newAccused.name}
              onChange={handleInputChange}
              error={!!formErrors.name}
              className="mt-1"
            />
            {formErrors.name && (
              <div className="text-error text-sm mt-1">{formErrors.name}</div>
            )}
          </div>
          
          {/* Cargo o función */}
          <div>
            <Label htmlFor="position" required>
              Cargo o función
            </Label>
            <Input
              id="position"
              name="position"
              value={newAccused.position}
              onChange={handleInputChange}
              error={!!formErrors.position}
              className="mt-1"
            />
            {formErrors.position && (
              <div className="text-error text-sm mt-1">{formErrors.position}</div>
            )}
          </div>
          
          {/* Departamento o área */}
          <div>
            <Label htmlFor="department" required>
              Departamento o área
            </Label>
            <Input
              id="department"
              name="department"
              value={newAccused.department}
              onChange={handleInputChange}
              error={!!formErrors.department}
              className="mt-1"
            />
            {formErrors.department && (
              <div className="text-error text-sm mt-1">{formErrors.department}</div>
            )}
          </div>
          
          {/* Relación jerárquica con el denunciante */}
          <div>
            <Label htmlFor="relationship" required>
              Relación con usted
            </Label>
            <Input
              id="relationship"
              name="relationship"
              value={newAccused.relationship}
              onChange={handleInputChange}
              error={!!formErrors.relationship}
              className="mt-1"
              placeholder="Ej: Jefe directo, Compañero de trabajo, etc."
            />
            {formErrors.relationship && (
              <div className="text-error text-sm mt-1">{formErrors.relationship}</div>
            )}
          </div>
          
          <Button
            type="button"
            onClick={handleAddAccused}
            className="mt-3"
          >
            Agregar Persona
          </Button>
        </div>
      </div>

      {/* Errores a nivel de array */}
      {errors.accusedPersons && typeof errors.accusedPersons === 'string' && (
        <div className="text-error text-sm mt-3">
          {errors.accusedPersons}
        </div>
      )}
      
      {/* Instrucciones finales según tipo de denuncia */}
      {values.accusedPersons.length === 0 && (
        <div className={`mt-6 p-4 border rounded-md ${values.isKarinLaw ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          {values.isKarinLaw ? (
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm text-red-800 font-medium">
                  Debe agregar al menos una persona denunciada para continuar.
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Para las denuncias relacionadas con Ley Karin, la identificación del denunciado es un requisito legal.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Puede continuar sin agregar personas denunciadas.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Si no conoce la identidad de la persona responsable pero desea reportar el hecho, puede avanzar al siguiente paso.
                  Su denuncia será igualmente investigada.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepThree;