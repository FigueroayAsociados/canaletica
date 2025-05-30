// src/components/ui/form-field.tsx

import React, { useState, useEffect } from 'react';
import { Field, ErrorMessage, useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from '@/lib/contexts/FormContext';

// Propiedades para el componente FormField
interface FormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string, label: string }>;
  className?: string;
  disabled?: boolean;
  description?: string;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  required = false,
  placeholder,
  options = [],
  className = '',
  disabled = false,
  description,
  id
}) => {
  // Acceder al contexto de Formik
  const formik = useFormikContext<any>();
  // Acceder al contexto de formulario personalizado
  const { setFieldTouched, isFieldTouched, realTimeValidation } = useFormContext();
  
  // Estado local para la validación
  const [fieldTouched, setLocalFieldTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Obtener el error de Formik para este campo
  const formikError = name.split('.').reduce((obj, key) => 
    obj && obj[key] !== undefined ? obj[key] : undefined, formik.errors);
  
  // Comprobar si el campo ha sido tocado en Formik
  const formikTouched = name.split('.').reduce((obj, key) => 
    obj && obj[key] !== undefined ? obj[key] : undefined, formik.touched);
  
  // Combinar el estado local y de Formik
  const isInvalid = (fieldTouched || formikTouched) && !!formikError;
  
  // Efecto para actualizar el estado de error cuando cambia Formik
  useEffect(() => {
    if ((formikTouched || fieldTouched) && formikError) {
      setError(formikError);
    } else {
      setError(null);
    }
  }, [formikError, formikTouched, fieldTouched]);
  
  // Manejar eventos de blur
  const handleBlur = (e: React.FocusEvent<any>) => {
    // Marcar el campo como tocado en nuestro contexto
    setFieldTouched(name, true);
    // Marcar el campo como tocado localmente
    setLocalFieldTouched(true);
    // Llamar a handleBlur de Formik
    formik.handleBlur(e);
  };
  
  // Generar un ID para el campo si no se proporciona
  const fieldId = id || `field-${name.replace(/\./g, '-')}`;
  
  // Generar un ID para el mensaje de error
  const errorId = `${fieldId}-error`;
  
  // Renderizar el componente apropiado según el tipo
  const renderField = () => {
    const commonProps = {
      id: fieldId,
      name,
      disabled,
      placeholder,
      onBlur: handleBlur,
      className: `mt-1 ${className}`,
      'aria-invalid': isInvalid ? 'true' : 'false',
      'aria-required': required ? 'true' : 'false',
      'aria-describedby': error ? errorId : undefined,
    };
    
    switch (type) {
      case 'textarea':
        return (
          <Field
            as={Textarea}
            {...commonProps}
            error={isInvalid}
          />
        );
        
      case 'select':
        return (
          <Field
            as={Select}
            {...commonProps}
            error={isInvalid}
          >
            <option value="">{placeholder || 'Seleccione una opción'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>
        );
        
      default:
        return (
          <Field
            as={Input}
            type={type}
            {...commonProps}
            error={isInvalid}
          />
        );
    }
  };
  
  return (
    <div className={`form-field ${className}`}>
      <Label 
        htmlFor={fieldId} 
        required={required}
        className="mb-1"
      >
        {label}
      </Label>
      
      {renderField()}
      
      {error && (
        <div id={errorId} className="text-error text-sm mt-1" role="alert">
          {error}
        </div>
      )}
      
      {description && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {description}
        </p>
      )}
    </div>
  );
};

export default FormField;