// src/components/settings/CategoriesManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Category, Subcategory, getCategories, createCategory, updateCategory, deleteCategory, getSubcategories, createSubcategory, updateSubcategory, deleteSubcategory } from '@/lib/services/configService';

interface CategoryFormData {
  name: string;
  description: string;
  isActive: boolean;
  isKarinLaw: boolean;
}

interface SubcategoryFormData {
  name: string;
  description: string;
  isActive: boolean;
  categoryId: string;
}

export default function CategoriesManager({ companyId = 'default' }: { companyId?: string }) {
  // Estados para las categorías
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<{ [key: string]: Subcategory[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edición
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState<string | null>(null);
  const [isEditingSubcategory, setIsEditingSubcategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});

  // Formularios
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    isActive: true,
    isKarinLaw: false
  });

  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormData>({
    name: '',
    description: '',
    isActive: true,
    categoryId: ''
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadCategories();
  }, []);

  // Cargar categorías y subcategorías
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar categorías
      const result = await getCategories(companyId);
      
      if (result.success && result.categories) {
        setCategories(result.categories);
        
        // Inicializar estados de expansión
        const expanded: { [key: string]: boolean } = {};
        result.categories.forEach(cat => {
          expanded[cat.id] = false;
        });
        setExpandedCategories(expanded);
        
        // Cargar subcategorías para cada categoría
        const subcats: { [key: string]: Subcategory[] } = {};
        
        for (const category of result.categories) {
          const subResult = await getSubcategories(companyId, category.id);
          if (subResult.success && subResult.subcategories) {
            subcats[category.id] = subResult.subcategories;
          }
        }
        
        setSubcategories(subcats);
      } else {
        setError(result.error || 'Error al cargar las categorías');
      }
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      setError('Ha ocurrido un error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar mensaje de éxito temporal
  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  // Funciones para manejo de categorías
  const handleAddCategory = async () => {
    try {
      setError(null);
      
      if (!categoryForm.name.trim()) {
        setError('El nombre de la categoría es obligatorio');
        return;
      }
      
      // Calcular el siguiente orden
      const nextOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order)) + 1 
        : 0;
      
      const result = await createCategory(companyId, {
        name: categoryForm.name,
        description: categoryForm.description,
        isActive: categoryForm.isActive,
        isKarinLaw: categoryForm.isKarinLaw,
        order: nextOrder
      });
      
      if (result.success) {
        showSuccessMessage('Categoría creada correctamente');
        await loadCategories();
        setIsAddingCategory(false);
        resetCategoryForm();
      } else {
        setError(result.error || 'Error al crear la categoría');
      }
    } catch (err) {
      console.error('Error al añadir categoría:', err);
      setError('Ha ocurrido un error al crear la categoría');
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    try {
      setError(null);
      
      if (!categoryForm.name.trim()) {
        setError('El nombre de la categoría es obligatorio');
        return;
      }
      
      const result = await updateCategory(companyId, categoryId, {
        name: categoryForm.name,
        description: categoryForm.description,
        isActive: categoryForm.isActive,
        isKarinLaw: categoryForm.isKarinLaw
      });
      
      if (result.success) {
        showSuccessMessage('Categoría actualizada correctamente');
        await loadCategories();
        setIsEditingCategory(null);
      } else {
        setError(result.error || 'Error al actualizar la categoría');
      }
    } catch (err) {
      console.error('Error al actualizar categoría:', err);
      setError('Ha ocurrido un error al actualizar la categoría');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta categoría? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setError(null);
      
      const result = await deleteCategory(companyId, categoryId);
      
      if (result.success) {
        showSuccessMessage('Categoría eliminada correctamente');
        await loadCategories();
      } else {
        setError(result.error || 'Error al eliminar la categoría');
      }
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      setError('Ha ocurrido un error al eliminar la categoría');
    }
  };

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
      isKarinLaw: category.isKarinLaw || false
    });
    
    setIsEditingCategory(category.id);
    setIsAddingCategory(false);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      isActive: true,
      isKarinLaw: false
    });
  };

  // Funciones para manejo de subcategorías
  const handleAddSubcategory = async () => {
    try {
      setError(null);
      
      if (!subcategoryForm.name.trim()) {
        setError('El nombre de la subcategoría es obligatorio');
        return;
      }
      
      if (!subcategoryForm.categoryId) {
        setError('Debe seleccionar una categoría');
        return;
      }
      
      console.log('Añadiendo subcategoría con datos:', subcategoryForm);
      
      // Calcular el siguiente orden para esta categoría
      const currentSubcategories = subcategories[subcategoryForm.categoryId] || [];
      const nextOrder = currentSubcategories.length > 0 
        ? Math.max(...currentSubcategories.map(s => s.order)) + 1 
        : 0;
      
      const result = await createSubcategory(companyId, {
        name: subcategoryForm.name,
        description: subcategoryForm.description,
        isActive: subcategoryForm.isActive,
        categoryId: subcategoryForm.categoryId,
        order: nextOrder
      });
      
      if (result.success) {
        showSuccessMessage('Subcategoría creada correctamente');
        await loadCategories();
        
        // Mantener la categoría expandida después de añadir
        setExpandedCategories(prev => ({
          ...prev,
          [subcategoryForm.categoryId]: true
        }));
        
        setIsAddingSubcategory(null);
        resetSubcategoryForm();
      } else {
        setError(result.error || 'Error al crear la subcategoría');
      }
    } catch (err) {
      console.error('Error al añadir subcategoría:', err);
      setError('Ha ocurrido un error al crear la subcategoría');
    }
  };

  const handleUpdateSubcategory = async (subcategoryId: string) => {
    try {
      setError(null);
      
      if (!subcategoryForm.name.trim()) {
        setError('El nombre de la subcategoría es obligatorio');
        return;
      }
      
      const result = await updateSubcategory(companyId, subcategoryId, {
        name: subcategoryForm.name,
        description: subcategoryForm.description,
        isActive: subcategoryForm.isActive,
        categoryId: subcategoryForm.categoryId
      });
      
      if (result.success) {
        showSuccessMessage('Subcategoría actualizada correctamente');
        await loadCategories();
        setIsEditingSubcategory(null);
      } else {
        setError(result.error || 'Error al actualizar la subcategoría');
      }
    } catch (err) {
      console.error('Error al actualizar subcategoría:', err);
      setError('Ha ocurrido un error al actualizar la subcategoría');
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar esta subcategoría? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setError(null);
      
      const result = await deleteSubcategory(companyId, subcategoryId);
      
      if (result.success) {
        showSuccessMessage('Subcategoría eliminada correctamente');
        await loadCategories();
      } else {
        setError(result.error || 'Error al eliminar la subcategoría');
      }
    } catch (err) {
      console.error('Error al eliminar subcategoría:', err);
      setError('Ha ocurrido un error al eliminar la subcategoría');
    }
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setSubcategoryForm({
      name: subcategory.name,
      description: subcategory.description || '',
      isActive: subcategory.isActive,
      categoryId: subcategory.categoryId
    });
    
    setIsEditingSubcategory(subcategory.id);
    setIsAddingSubcategory(null);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      name: '',
      description: '',
      isActive: true,
      categoryId: ''
    });
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensajes de error y éxito */}
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Cabecera y botón de añadir */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestión de Categorías y Subcategorías</h2>
        <Button 
          onClick={() => {
            resetCategoryForm();
            setIsAddingCategory(true);
            setIsEditingCategory(null);
            setIsAddingSubcategory(null);
            setIsEditingSubcategory(null);
          }}
        >
          Añadir Categoría
        </Button>
      </div>
      
      {/* Formulario para añadir categoría */}
      {isAddingCategory && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Añadir Nueva Categoría</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Nombre de la Categoría*</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="categoryDescription">Descripción</Label>
              <Input
                id="categoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="categoryActive"
                checked={categoryForm.isActive}
                onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="categoryActive" className="ml-2">
                Categoría Activa
              </Label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="categoryKarin"
                checked={categoryForm.isKarinLaw}
                onChange={(e) => setCategoryForm({ ...categoryForm, isKarinLaw: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="categoryKarin" className="ml-2">
                Es Categoría de Ley Karin
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCategory}>
                Guardar Categoría
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulario para editar categoría */}
      {isEditingCategory && (
        <div className="bg-gray-50 p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-4">Editar Categoría</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editCategoryName">Nombre de la Categoría*</Label>
              <Input
                id="editCategoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="editCategoryDescription">Descripción</Label>
              <Input
                id="editCategoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editCategoryActive"
                checked={categoryForm.isActive}
                onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="editCategoryActive" className="ml-2">
                Categoría Activa
              </Label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editCategoryKarin"
                checked={categoryForm.isKarinLaw}
                onChange={(e) => setCategoryForm({ ...categoryForm, isKarinLaw: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <Label htmlFor="editCategoryKarin" className="ml-2">
                Es Categoría de Ley Karin
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingCategory(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleUpdateCategory(isEditingCategory)}>
                Actualizar Categoría
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de categorías */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay categorías configuradas</p>
        ) : (
          categories.map(category => (
            <div key={category.id} className="border rounded-md overflow-hidden">
              <div className="bg-gray-100 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCategoryExpansion(category.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className={`h-5 w-5 transition-transform ${expandedCategories[category.id] ? 'transform rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <span className="font-medium">{category.name}</span>
                  {!category.isActive && (
                    <span className="bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded">Inactiva</span>
                  )}
                  {category.isKarinLaw && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Ley Karin</span>
                  )}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Expandir la categoría automáticamente
                      setExpandedCategories(prev => ({
                        ...prev,
                        [category.id]: true
                      }));
                      
                      // Configurar formulario de subcategoría
                      setIsAddingSubcategory(category.id);
                      setSubcategoryForm({
                        ...subcategoryForm,
                        categoryId: category.id
                      });
                      
                      // Resetear otros estados
                      setIsEditingSubcategory(null);
                      setIsAddingCategory(false);
                      setIsEditingCategory(null);
                    }}
                  >
                    Añadir Subcategoría
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCategory(category)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
              
              {/* Subcategorías y formulario de añadir subcategoría */}
              {(expandedCategories[category.id] || isAddingSubcategory === category.id) && (
                <div className="p-4 space-y-4">
                  {/* Formulario para añadir subcategoría */}
                  {isAddingSubcategory === category.id && (
                    <div className="bg-yellow-50 p-4 rounded-md border mb-4">
                      <h4 className="text-md font-medium mb-3">Añadir Nueva Subcategoría para: <span className="font-bold text-primary">{category.name}</span></h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="subcategoryName">Nombre de la Subcategoría*</Label>
                          <Input
                            id="subcategoryName"
                            value={subcategoryForm.name}
                            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="subcategoryDescription">Descripción</Label>
                          <Input
                            id="subcategoryDescription"
                            value={subcategoryForm.description}
                            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="subcategoryActive"
                            checked={subcategoryForm.isActive}
                            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, isActive: e.target.checked })}
                            className="h-4 w-4 text-primary border-gray-300 rounded"
                          />
                          <Label htmlFor="subcategoryActive" className="ml-2">
                            Subcategoría Activa
                          </Label>
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button variant="outline" onClick={() => setIsAddingSubcategory(null)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleAddSubcategory}
                            className="bg-primary hover:bg-primary-dark focus:ring-primary-light"
                          >
                            Guardar Subcategoría
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Formulario para editar subcategoría */}
                  {isEditingSubcategory && subcategoryForm.categoryId === category.id && (
                    <div className="bg-gray-50 p-4 rounded-md border mb-4">
                      <h4 className="text-md font-medium mb-3">Editar Subcategoría</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="editSubcategoryName">Nombre de la Subcategoría*</Label>
                          <Input
                            id="editSubcategoryName"
                            value={subcategoryForm.name}
                            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="editSubcategoryDescription">Descripción</Label>
                          <Input
                            id="editSubcategoryDescription"
                            value={subcategoryForm.description}
                            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="editSubcategoryActive"
                            checked={subcategoryForm.isActive}
                            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, isActive: e.target.checked })}
                            className="h-4 w-4 text-primary border-gray-300 rounded"
                          />
                          <Label htmlFor="editSubcategoryActive" className="ml-2">
                            Subcategoría Activa
                          </Label>
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsEditingSubcategory(null)}>
                            Cancelar
                          </Button>
                          <Button onClick={() => handleUpdateSubcategory(isEditingSubcategory)}>
                            Actualizar Subcategoría
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Lista de subcategorías */}
                  {subcategories[category.id]?.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-gray-50 py-2 px-4">
                        <h4 className="font-medium">Subcategorías</h4>
                      </div>
                      <div className="divide-y">
                        {subcategories[category.id].map(subcat => (
                          <div key={subcat.id} className="py-2 px-4 flex justify-between items-center">
                            <div className="flex items-center">
                              <span>{subcat.name}</span>
                              {!subcat.isActive && (
                                <span className="ml-2 bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded">Inactiva</span>
                              )}
                            </div>
                            <div className="space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSubcategory(subcat)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteSubcategory(subcat.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-2">No hay subcategorías configuradas</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}