// src/components/forms/report/StepTwo.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Field, ErrorMessage, FormikProps } from 'formik';
import { ReportFormValues, CategoryType } from '@/types/report';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCategories, getSubcategories, Category, Subcategory } from '@/lib/services/configService';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { logger } from '@/lib/utils/logger';

interface StepTwoProps {
  formikProps: FormikProps<ReportFormValues>;
}

const StepTwo: React.FC<StepTwoProps> = ({ formikProps }) => {
  const { values, errors, touched, setFieldValue } = formikProps;
  const { companyId } = useCompany();

  // Estados para almacenar las categorías y subcategorías cargadas
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<{ [categoryId: string]: Subcategory[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar las categorías y subcategorías al montar el componente
  useEffect(() => {
    const loadCategoriesAndSubcategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Usar empresa "default" para formularios públicos si no hay companyId
        const effectiveCompanyId = companyId || 'default';
        logger.info(`Cargando categorías para la empresa: ${effectiveCompanyId}`, null, { prefix: 'StepTwo' });

        // Obtener categorías
        const categoriesResult = await getCategories(effectiveCompanyId);
        logger.debug('Resultado de getCategories:', categoriesResult, { prefix: 'StepTwo' });
        
        if (!categoriesResult.success || !categoriesResult.categories || categoriesResult.categories.length === 0) {
          logger.warn('No se pudieron cargar las categorías o no hay categorías en la colección default.', null, { prefix: 'StepTwo' });
          logger.warn('Si ha creado categorías y no aparecen, es posible que estén en otra colección.', null, { prefix: 'StepTwo' });
          logger.warn('Ejecute el script scripts/migrate-categories.js para migrar las categorías.', null, { prefix: 'StepTwo' });
          logger.warn('Utilizando valores predeterminados por ahora...', null, { prefix: 'StepTwo' });
          useDefaultCategoriesAndSubcategories();
          return;
        }

        // Filtrar solo categorías activas
        const activeCategories = categoriesResult.categories.filter(cat => cat.isActive);
        
        if (activeCategories.length === 0) {
          logger.warn('No hay categorías activas en la colección default.', null, { prefix: 'StepTwo' });
          logger.warn('Todas las categorías existentes están marcadas como inactivas.', null, { prefix: 'StepTwo' });
          logger.warn('Active las categorías desde el panel de administración o cree nuevas categorías.', null, { prefix: 'StepTwo' });
          logger.warn('Utilizando valores predeterminados por ahora...', null, { prefix: 'StepTwo' });
          useDefaultCategoriesAndSubcategories();
          return;
        }
        
        logger.info(`Se encontraron ${activeCategories.length} categorías activas en la colección default.`, null, { prefix: 'StepTwo' });
        setCategories(activeCategories);

        // Cargar subcategorías para cada categoría
        const subcatsMap: { [categoryId: string]: Subcategory[] } = {};
        
        for (const category of activeCategories) {
          logger.info(`Cargando subcategorías para categoría ${category.id}`, null, { prefix: 'StepTwo' });
          const subcategoriesResult = await getSubcategories(effectiveCompanyId, category.id);
          logger.debug(`Resultado subcategorías para ${category.id}:`, subcategoriesResult, { prefix: 'StepTwo' });
          
          if (subcategoriesResult.success && subcategoriesResult.subcategories) {
            // Filtrar solo subcategorías activas
            subcatsMap[category.id] = subcategoriesResult.subcategories.filter(subcat => subcat.isActive);
            logger.debug(`${subcategoriesResult.subcategories.filter(subcat => subcat.isActive).length} subcategorías activas encontradas para ${category.name}`, null, { prefix: 'StepTwo' });
          } else {
            subcatsMap[category.id] = [];
            logger.debug(`No se encontraron subcategorías para ${category.name}`, null, { prefix: 'StepTwo' });
          }
        }

        setSubcategoriesByCategory(subcatsMap);
        logger.info('Todas las subcategorías cargadas correctamente', null, { prefix: 'StepTwo' });
      } catch (err) {
        logger.error('Error al cargar categorías y subcategorías', err, { prefix: 'StepTwo' });
        setError('Ocurrió un error al cargar los datos. Se usarán valores predeterminados.');
        useDefaultCategoriesAndSubcategories();
      } finally {
        setLoading(false);
      }
    };
    
    // Función para establecer valores predeterminados en caso de error
    const useDefaultCategoriesAndSubcategories = useCallback(() => {
      logger.warn('No se pudieron cargar categorías desde Firebase. Usando categorías predeterminadas.', null, { prefix: 'StepTwo' });
      
      // Proporcionar categorías predeterminadas para que el formulario pueda funcionar
      const defaultCategories = [
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
      
      // Establecer subcategorías predeterminadas
      const defaultSubcategories = {
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
      
      setCategories(defaultCategories);
      setSubcategoriesByCategory(defaultSubcategories);
      
      // Actualizar el mensaje de error para indicar que se están usando valores predeterminados
      setError('No se pudieron cargar las categorías desde la base de datos. Se están utilizando categorías predeterminadas.');
    }, [setCategories, setSubcategoriesByCategory, setError]);

    loadCategoriesAndSubcategories();
  }, [companyId]);

  // Actualizar subcategoría cuando cambia la categoría
  useEffect(() => {
    setFieldValue('subcategory', '');
    
    // Determinar si es denuncia Ley Karin basado en la categoría seleccionada
    const selectedCategory = categories.find(cat => cat.id === values.category);
    
    // Forma simplificada y más eficiente de detectar categorías Ley Karin
    const categoryIsKarin = !!selectedCategory && (
      selectedCategory.isKarinLaw === true || 
      selectedCategory.id === 'ley_karin' ||
      (selectedCategory.name && selectedCategory.name.toLowerCase().includes('karin'))
    );
    
    // Registrar información de depuración sobre la categoría
    if (selectedCategory) {
      logger.debug(`Categoría seleccionada: ${selectedCategory.name} (isKarinLaw: ${selectedCategory.isKarinLaw})`, null, { prefix: 'StepTwo' });
    }
    
    // Solo ajustar isKarinLaw si está en conflicto con la categoría seleccionada
    if (categoryIsKarin !== values.isKarinLaw && selectedCategory) {
      logger.info(`Ajustando isKarinLaw=${categoryIsKarin} basado en categoría seleccionada`, null, { prefix: 'StepTwo' });
      setFieldValue('isKarinLaw', categoryIsKarin);
    }
    
    // Si es Ley Karin, asegurarse de que no sea anónima
    if ((values.isKarinLaw || categoryIsKarin) && values.isAnonymous) {
      logger.warn("Detectada categoría Ley Karin - forzando denuncia no anónima", null, { prefix: 'StepTwo' });
      setFieldValue('isAnonymous', false);
    }
  }, [values.category, values.isAnonymous, values.isKarinLaw, setFieldValue, categories]);

  // Obtener opciones de subcategoría según la categoría seleccionada desde la base de datos
  const getSubcategoryOptions = () => {
    if (!values.category) {
      return (
        <>
          <option value="">Seleccione primero una categoría</option>
        </>
      );
    }

    const selectedCategoryId = values.category;
    const subcategories = subcategoriesByCategory[selectedCategoryId] || [];

    if (subcategories.length === 0) {
      return (
        <>
          <option value="">No hay subcategorías disponibles</option>
          <option value="otra_subcategoria">Otra situación no listada</option>
        </>
      );
    }

    return (
      <>
        <option value="">Seleccione una subcategoría</option>
        {subcategories.map(subcategory => (
          <option key={subcategory.id} value={subcategory.id}>
            {subcategory.name}
          </option>
        ))}
        <option value="otra_subcategoria">Otra situación no listada</option>
      </>
    );
  };

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

      {/* Categoría principal */}
      <div className="mb-6">
        <Label htmlFor="category" required>
          Categoría principal de la denuncia
        </Label>
        {error && (
          <Alert variant="error" className="mb-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <div className="text-sm text-gray-500 mt-2">Cargando categorías...</div>
        ) : (
          <Field
            as={Select}
            id="category"
            name="category"
            error={touched.category && errors.category}
            className="mt-1"
          >
            <option value="">Seleccione una categoría</option>
            {categories
              // Filtrar categorías duplicadas - usar un Set para extraer ids únicos
              .filter((category, index, self) => 
                index === self.findIndex(c => c.id === category.id)
              )
              // Filtrar categorías según si es Ley Karin o no
              .filter(category => {
                const isKarinCategory = 
                  category.isKarinLaw || 
                  category.name?.includes('Karin') || 
                  category.id === 'ley_karin';
                
                // Si values.isKarinLaw es true, mostrar solo categorías Ley Karin
                // Si values.isKarinLaw es false, mostrar solo categorías que NO son Ley Karin
                return values.isKarinLaw ? isKarinCategory : !isKarinCategory;
              })
              .map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            }
          </Field>
        )}
        <ErrorMessage name="category">
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>

      {/* Subcategoría */}
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
          disabled={!values.category || loading}
        >
          {loading ? (
            <option value="">Cargando subcategorías...</option>
          ) : (
            getSubcategoryOptions()
          )}
        </Field>
        <ErrorMessage name="subcategory">
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>
      
      {/* Campo para descripción personalizada cuando se selecciona "otro" como subcategoría */}
      {(values.subcategory === 'otro' || values.subcategory === 'otra_subcategoria') && (
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
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
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
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
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
          {(msg) => <div className="text-error text-sm mt-1">{msg}</div>}
        </ErrorMessage>
      </div>
    </div>
  );
};

export default StepTwo;