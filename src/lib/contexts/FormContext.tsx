// src/lib/contexts/FormContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Definir la interfaz para el contexto
interface FormContextType {
  // Estado para seguimiento de campos tocados
  touchedFields: Record<string, boolean>;
  // Función para marcar un campo como tocado
  setFieldTouched: (fieldName: string, isTouched?: boolean) => void;
  // Estado para seguimiento de validación en tiempo real
  realTimeValidation: boolean;
  // Función para activar/desactivar validación en tiempo real
  setRealTimeValidation: (value: boolean) => void;
  // Función para resetear los campos tocados
  resetTouchedFields: () => void;
  // Función para verificar si un campo ha sido tocado
  isFieldTouched: (fieldName: string) => boolean;
}

// Crear el contexto con valores por defecto
const FormContext = createContext<FormContextType>({
  touchedFields: {},
  setFieldTouched: () => {},
  realTimeValidation: false,
  setRealTimeValidation: () => {},
  resetTouchedFields: () => {},
  isFieldTouched: () => false,
});

// Hook personalizado para usar el contexto
export const useFormContext = () => useContext(FormContext);

// Props para el proveedor del contexto
interface FormProviderProps {
  children: ReactNode;
}

// Componente proveedor del contexto
export const FormProvider: React.FC<FormProviderProps> = ({ children }) => {
  // Estado para campos tocados
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  // Estado para validación en tiempo real
  const [realTimeValidation, setRealTimeValidation] = useState<boolean>(false);

  // Función para marcar un campo como tocado
  const handleSetFieldTouched = (fieldName: string, isTouched: boolean = true) => {
    setTouchedFields(prev => ({
      ...prev,
      [fieldName]: isTouched
    }));
  };

  // Función para resetear los campos tocados
  const resetTouchedFields = () => {
    setTouchedFields({});
  };

  // Función para verificar si un campo ha sido tocado
  const isFieldTouched = (fieldName: string): boolean => {
    return !!touchedFields[fieldName];
  };

  // Valor del contexto
  const contextValue: FormContextType = {
    touchedFields,
    setFieldTouched: handleSetFieldTouched,
    realTimeValidation,
    setRealTimeValidation,
    resetTouchedFields,
    isFieldTouched
  };

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
};