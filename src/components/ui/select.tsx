// src/components/ui/select.tsx

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

// Componente Select básico y sus subcomponentes
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

// Select base para mantener compatibilidad con el código existente
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-error focus:ring-error',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

// Implementación mínima de componentes para compatibilidad con AI Dashboard
// Estos componentes solo emulan la API de Radix UI sin dependencias externas

// Contexto para Select personalizado
const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {},
});

const CustomSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, onValueChange, children }) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

// Trigger (botón que abre el dropdown)
const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <button
      ref={ref}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <span className="ml-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 opacity-50"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </button>
  );
});

SelectTrigger.displayName = 'SelectTrigger';

// Valor seleccionado (dentro del trigger)
const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext);
  
  return <span>{value || placeholder}</span>;
};

SelectValue.displayName = 'SelectValue';

// Contenedor del dropdown
const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  children, 
  ...props 
}) => {
  return (
    <div 
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-md',
        'mt-1 p-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

SelectContent.displayName = 'SelectContent';

// Item del dropdown
const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const { onValueChange } = React.useContext(SelectContext);
  
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </div>
  );
});

SelectItem.displayName = 'SelectItem';

// Componentes adicionales para la API completa
const SelectLabel: React.FC<React.HTMLAttributes<HTMLLabelElement>> = ({ 
  className, 
  ...props 
}) => (
  <label 
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props} 
  />
);

const SelectGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
const SelectSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  ...props 
}) => (
  <div
    className={cn("-mx-1 my-1 h-px bg-gray-200", className)}
    {...props}
  />
);

// Exportamos todos los componentes
export {
  Select,
  CustomSelect as SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};

// Soporte para las aplicaciones que utilizan Select como export default
export default Select;