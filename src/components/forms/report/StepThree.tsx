// src/components/forms/report/StepThree.tsx

import React, { useState } from 'react';
import { ErrorMessage, FormikProps } from 'formik';
import { v4 as uuidv4 } from 'uuid';
import { ReportFormValues, AccusedPersonType } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface StepThreeProps {
  formikProps: FormikProps<ReportFormValues>;
}

const StepThree: React.FC<StepThreeProps> = ({ formikProps }) => {
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
        <p className="text-gray-600">
          En esta sección debe proporcionar información sobre la(s) persona(s) involucrada(s) en
          los hechos denunciados. Puede añadir tantas personas como sea necesario.
        </p>
      </div>

      {/* Lista de denunciados */}
      {values.accusedPersons.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Personas denunciadas</h4>
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
        </div>
      )}

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
    </div>
  );
};

export default StepThree;