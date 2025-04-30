// src/components/forms/report/StepTwo.tsx

import React, { useEffect, useState } from 'react';
import { Field, ErrorMessage, FormikProps } from 'formik';
import { ReportFormValues } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCategories, getSubcategories, Category, Subcategory } from '@/lib/services/configService';
import { useCompany } from '@/lib/contexts/CompanyContext';

interface StepTwoProps {
  formikProps: FormikProps<ReportFormValues>;
}

// Categorías predeterminadas para usar en caso de error
const DEFAULT_CATEGORIES = [
  { 
    id: 'modelo_prevencion', 
    name: 'Prevención de Delitos', 
    description: 'Denuncias relacionadas con el modelo de prevención de delitos',
    isActive: true,
    isKarinLaw: false,
    order: 1
  },
  { 
    id: 'ley_karin', 
    name: 'Ley Karin', 
    description: 'Denuncias relacionadas con acoso laboral o sexual',
    isActive: true,
    isKarinLaw: true,
    order: 2
  },
  { 
    id: 'reglamento_interno', 
    name: 'Reglamento Interno', 
    description: 'Denuncias relacionadas con el reglamento interno',
    isActive: true,
    isKarinLaw: false,
    order: 3
  },
  { 
    id: 'politicas_codigos', 
    name: 'Políticas y Códigos', 
    description: 'Denuncias relacionadas con incumplimiento de políticas o códigos',
    isActive: true,
    isKarinLaw: false,
    order: 4
  },
  { 
    id: 'represalias', 
    name: 'Represalias', 
    description: 'Denuncias de represalias',
    isActive: true,
    isKarinLaw: false,
    order: 5
  },
  { 
    id: 'otros', 
    name: 'Otros', 
    description: 'Otras denuncias',
    isActive: true,
    isKarinLaw: false,
    order: 6
  }
];

// Subcategorías predeterminadas para usar en caso de error
const DEFAULT_SUBCATEGORIES = {
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

const StepTwo: React.FC<StepTwoProps> = ({ formikProps }) => {
  const { values, errors, touched, setFieldValue } = formikProps;
  const { companyId } = useCompany();

  // Estados para almacenar datos
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Usar empresa "default" para formularios públicos si no hay companyId
        const effectiveCompanyId = companyId || 'default';
        console.log(`Cargando categorías para la empresa: ${effectiveCompanyId}`);

        // Obtener categorías
        const categoriesResult = await getCategories(effectiveCompanyId);
        
        if (!categoriesResult.success || !categoriesResult.categories || categoriesResult.categories.length === 0) {
          console.log('No se pudieron cargar las categorías, usando valores predeterminados');
          setCategories(DEFAULT_CATEGORIES.filter(cat => 
            values.isKarinLaw ? (cat.isKarinLaw || cat.id === 'ley_karin') : !(cat.isKarinLaw || cat.id === 'ley_karin')
          ));
          setError('No se pudieron cargar las categorías desde la base de datos. Se están utilizando categorías predeterminadas.');
        } else {
          // Filtrar solo categorías activas y relevantes
          const filteredCategories = categoriesResult.categories.filter(cat => 
            cat.isActive && (values.isKarinLaw ? (cat.isKarinLaw || cat.id === 'ley_karin') : !(cat.isKarinLaw || cat.id === 'ley_karin'))
          );
          
          if (filteredCategories.length === 0) {
            console.log('No hay categorías activas, usando valores predeterminados');
            setCategories(DEFAULT_CATEGORIES.filter(cat => 
              values.isKarinLaw ? (cat.isKarinLaw || cat.id === 'ley_karin') : !(cat.isKarinLaw || cat.id === 'ley_karin')
            ));
            setError('No hay categorías activas disponibles. Se están utilizando categorías predeterminadas.');
          } else {
            setCategories(filteredCategories);
          }
        }
      } catch (err) {
        console.error('Error al cargar categorías:', err);
        setCategories(DEFAULT_CATEGORIES.filter(cat => 
          values.isKarinLaw ? (cat.isKarinLaw || cat.id === 'ley_karin') : !(cat.isKarinLaw || cat.id === 'ley_karin')
        ));
        setError('Ocurrió un error al cargar las categorías. Se están utilizando categorías predeterminadas.');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [companyId, values.isKarinLaw]);

  // Actualizar preferencias cuando cambia la categoría
  useEffect(() => {
    if (!values.category) return;
    
    // Verificar si es denuncia Ley Karin
    const selectedCategory = categories.find(cat => cat.id === values.category);
    if (!selectedCategory) return;
    
    console.log('Categoría seleccionada:', selectedCategory);
    
    const isKarinCategory = 
      selectedCategory.isKarinLaw === true || 
      selectedCategory.id === 'ley_karin' ||
      (selectedCategory.name && selectedCategory.name.toLowerCase().includes('karin'));
    
    // Actualizar si hay discrepancia
    if (isKarinCategory !== values.isKarinLaw) {
      console.log('Actualizando isKarinLaw a:', isKarinCategory);
      setFieldValue('isKarinLaw', isKarinCategory);
    }
    
    // Si es Ley Karin, asegurarse de que no sea anónima
    if (isKarinCategory && values.isAnonymous) {
      console.log('Desactivando anonimato para denuncia Ley Karin');
      setFieldValue('isAnonymous', false);
    }
  }, [values.category, categories, values.isKarinLaw, values.isAnonymous, setFieldValue]);

  // Estado para subcategorías
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState<boolean>(false);

  // Cargar subcategorías cuando cambia la categoría seleccionada
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!values.category) {
        setSubcategories([]);
        return;
      }
      
      try {
        setLoadingSubcategories(true);
        console.log(`Cargando subcategorías para categoría ${values.category}`);
        
        const effectiveCompanyId = companyId || 'default';
        const result = await getSubcategories(effectiveCompanyId, values.category);
        
        if (result.success && result.subcategories && result.subcategories.length > 0) {
          console.log(`${result.subcategories.length} subcategorías cargadas`);
          setSubcategories(result.subcategories.filter(sub => sub.isActive));
        } else if (DEFAULT_SUBCATEGORIES[values.category]) {
          console.log(`Usando subcategorías predeterminadas para ${values.category}`);
          setSubcategories(DEFAULT_SUBCATEGORIES[values.category]);
        } else {
          console.log(`No hay subcategorías para ${values.category}`);
          setSubcategories([]);
        }
      } catch (err) {
        console.error('Error cargando subcategorías:', err);
        setSubcategories(DEFAULT_SUBCATEGORIES[values.category] || []);
      } finally {
        setLoadingSubcategories(false);
      }
    };
    
    loadSubcategories();
  }, [values.category, companyId]);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Categorización de la Denuncia
        </h3>
        <p className="text-gray-600">
          En esta sección necesitamos clasificar su denuncia para asignarla al equipo adecuado
          y aplicar el procedimiento correcto según el tipo de situación reportada.
        </p>
      </div>

      {/* Mostrar mensaje de error si lo hay */}
      {error && (
        <Alert variant="error" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Categoría principal */}
      <div className="mb-6">
        <Label htmlFor="category" required>
          Categoría principal de la denuncia
        </Label>
        <Field
          as={Select}
          id="category"
          name="category"
          error={touched.category && errors.category}
          className="mt-1"
          disabled={loading}
        >
          <option value="">Seleccione una categoría</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Field>
        <ErrorMessage name="category">
          {msg => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>

      {/* Subcategoría - Implementación directa simplificada */}
      <div className="mb-6">
        <Label htmlFor="subcategory" required>
          Subcategoría específica
        </Label>
        <Field
          as={Select}
          id="subcategory"
          name="subcategory"
          error={touched.subcategory && errors.subcategory}
          className="mt-1"
          disabled={!values.category || loadingSubcategories}
        >
          <option value="">
            {!values.category 
              ? "Seleccione primero una categoría" 
              : loadingSubcategories 
                ? "Cargando subcategorías..." 
                : "Seleccione una subcategoría"}
          </option>
          
          {subcategories.map(subcategory => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
          
          {values.category && !loadingSubcategories && (
            <option value="otra_subcategoria">Otra situación no listada</option>
          )}
        </Field>
        <ErrorMessage name="subcategory">
          {msg => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>
      
      {/* Campo para descripción personalizada */}
      {values.subcategory === 'otra_subcategoria' && (
        <div className="mb-6">
          <Label htmlFor="customSubcategoryDescription" required>
            Describa la subcategoría
          </Label>
          <Field
            as={Input}
            id="customSubcategoryDescription"
            name="customSubcategoryDescription"
            placeholder="Describa el tipo específico de situación que desea reportar"
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Por favor, proporcione una breve descripción del tipo específico de situación que está reportando.
          </p>
        </div>
      )}

      {/* Alerta Ley Karin */}
      {values.isKarinLaw && (
        <Alert variant="info" className="mb-6">
          <AlertDescription>
            <p className="font-medium">Denuncia bajo Ley Karin</p>
            <p className="text-sm mt-1">
              Ha seleccionado una categoría relacionada con la Ley Karin (Ley N° 21.363).
              Este tipo de denuncias tienen un tratamiento especial y plazos más estrictos
              según la normativa chilena. Solicitaremos información adicional específica para
              estos casos.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Fecha aproximada de los hechos */}
      <div className="mb-6">
        <Label htmlFor="eventDate" required>
          Fecha aproximada de los hechos
        </Label>
        <Field
          as={Input}
          type="date"
          id="eventDate"
          name="eventDate"
          error={touched.eventDate && errors.eventDate}
          className="mt-1"
          max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
        />
        <ErrorMessage name="eventDate">
          {msg => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
        <p className="text-sm text-gray-500 mt-1">
          Si los hechos ocurrieron durante un período, indique la fecha más reciente.
        </p>
      </div>

      {/* Fecha en que tomó conocimiento */}
      <div className="mb-6">
        <Label htmlFor="knowledgeDate" required>
          Fecha en que tomó conocimiento de los hechos
        </Label>
        <Field
          as={Input}
          type="date"
          id="knowledgeDate"
          name="knowledgeDate"
          error={touched.knowledgeDate && errors.knowledgeDate}
          className="mt-1"
          max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
        />
        <ErrorMessage name="knowledgeDate">
          {msg => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>

      {/* Relación con los hechos */}
      <div className="mb-6">
        <Label htmlFor="relationWithFacts" required>
          Su relación con los hechos
        </Label>
        <Field
          as={Select}
          id="relationWithFacts"
          name="relationWithFacts"
          error={touched.relationWithFacts && errors.relationWithFacts}
          className="mt-1"
        >
          <option value="">Seleccione una opción</option>
          <option value="testigo">Testigo directo</option>
          <option value="victima">Víctima</option>
          <option value="conocimiento_indirecto">Conocimiento indirecto</option>
        </Field>
        <ErrorMessage name="relationWithFacts">
          {msg => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>
    </div>
  );
};

export default StepTwo;