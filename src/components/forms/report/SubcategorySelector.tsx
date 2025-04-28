// src/components/forms/report/SubcategorySelector.tsx
import React, { useEffect, useState } from 'react';
import { FormikProps } from 'formik';
import { ReportFormValues } from '@/types/report';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getSubcategories, Subcategory } from '@/lib/services/configService';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { ErrorMessage } from 'formik';

// Subcategorías predeterminadas 
const DEFAULT_SUBCATEGORIES: Record<string, Subcategory[]> = {
  'modelo_prevencion': [
    { id: 'cohecho', name: 'Cohecho', isActive: true, categoryId: 'modelo_prevencion', order: 1 },
    { id: 'lavado_activos', name: 'Lavado de Activos', isActive: true, categoryId: 'modelo_prevencion', order: 2 },
    { id: 'financiamiento_terrorismo', name: 'Financiamiento del Terrorismo', isActive: true, categoryId: 'modelo_prevencion', order: 3 }
  ],
  'ley_karin': [
    { id: 'acoso_laboral', name: 'Acoso Laboral', isActive: true, categoryId: 'ley_karin', order: 1 },
    { id: 'acoso_sexual', name: 'Acoso Sexual', isActive: true, categoryId: 'ley_karin', order: 2 },
    { id: 'violencia_trabajo', name: 'Violencia en el Trabajo', isActive: true, categoryId: 'ley_karin', order: 3 }
  ],
  'represalias': [
    { id: 'represalia_denuncia', name: 'Represalia por Denuncia', isActive: true, categoryId: 'represalias', order: 1 }
  ]
};

interface SubcategorySelectorProps {
  formikProps: FormikProps<ReportFormValues>;
}

const SubcategorySelector: React.FC<SubcategorySelectorProps> = ({ formikProps }) => {
  const { values, touched, errors, setFieldValue } = formikProps;
  const { companyId } = useCompany();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Solo cargar subcategorías cuando cambia la categoría seleccionada
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!values.category) {
        setSubcategories([]);
        return;
      }

      setLoading(true);
      console.log(`SubcategorySelector: Cargando subcategorías para categoría ${values.category}`);

      try {
        const effectiveCompanyId = companyId || 'default';
        const result = await getSubcategories(effectiveCompanyId, values.category);

        if (result.success && result.subcategories && result.subcategories.length > 0) {
          console.log(`SubcategorySelector: ${result.subcategories.length} subcategorías encontradas en Firebase`);
          setSubcategories(result.subcategories.filter(sc => sc.isActive));
        } else if (DEFAULT_SUBCATEGORIES[values.category]) {
          console.log(`SubcategorySelector: Usando subcategorías por defecto para ${values.category}`);
          setSubcategories(DEFAULT_SUBCATEGORIES[values.category]);
        } else {
          console.log(`SubcategorySelector: No se encontraron subcategorías para ${values.category}`);
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error cargando subcategorías:', error);
        
        // En caso de error, intentar usar las predeterminadas
        if (DEFAULT_SUBCATEGORIES[values.category]) {
          setSubcategories(DEFAULT_SUBCATEGORIES[values.category]);
        } else {
          setSubcategories([]);
        }
      } finally {
        setLoading(false);
      }
    };

    // Resetear subcategoría cuando cambia la categoría
    if (values.subcategory && values.subcategory !== 'otra_subcategoria') {
      console.log('SubcategorySelector: Reseteando selección de subcategoría');
      setFieldValue('subcategory', '');
    }

    fetchSubcategories();
  }, [values.category, companyId, setFieldValue]);

  return (
    <>
      <div className="mb-6">
        <Label htmlFor="subcategory" required>
          Subcategoría específica
        </Label>
        <Select
          id="subcategory"
          name="subcategory"
          value={values.subcategory}
          onChange={(e) => {
            const value = e.target.value;
            console.log(`SubcategorySelector: Subcategoría seleccionada: ${value}`);
            setFieldValue('subcategory', value);
          }}
          className={`mt-1 ${touched.subcategory && errors.subcategory ? 'border-error' : ''}`}
          disabled={!values.category || loading}
        >
          <option value="">
            {!values.category 
              ? "Seleccione primero una categoría" 
              : loading 
                ? "Cargando subcategorías..." 
                : "Seleccione una subcategoría"}
          </option>
          
          {subcategories.map(subcategory => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
          
          {values.category && !loading && (
            <option value="otra_subcategoria">Otra situación no listada</option>
          )}
        </Select>
        {touched.subcategory && errors.subcategory && (
          <div className="text-error text-sm mt-1">{errors.subcategory as string}</div>
        )}
      </div>
      
      {/* Campo para descripción personalizada */}
      {values.subcategory === 'otra_subcategoria' && (
        <div className="mb-6">
          <Label htmlFor="customSubcategoryDescription" required>
            Describa la subcategoría
          </Label>
          <Input
            id="customSubcategoryDescription"
            name="customSubcategoryDescription"
            value={values.customSubcategoryDescription || ''}
            onChange={(e) => setFieldValue('customSubcategoryDescription', e.target.value)}
            placeholder="Describa el tipo específico de situación que desea reportar"
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Por favor, proporcione una breve descripción del tipo específico de situación que está reportando.
          </p>
        </div>
      )}
    </>
  );
};

export default SubcategorySelector;