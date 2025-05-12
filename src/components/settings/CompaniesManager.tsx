// src/components/settings/CompaniesManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCompanies, getCompany, updateCompany, deleteCompany, Company } from '@/lib/services/configService';
import { createCompany } from '@/lib/services/companyService';
import { httpsCallable } from 'firebase/functions';
import { functions, safeCallFunction } from '@/lib/firebase/functions';
import { CompanyDocumentsManager } from '@/components/settings/CompanyDocumentsManager';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants';

interface CompanyFormData {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  contactEmail: string;
  contactPhone: string;
  address: string;
  industry: string;
  maxUsers: number;
}

export default function CompaniesManager() {
  // Estados para las empresas
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edición
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeepDeleteConfirm, setShowDeepDeleteConfirm] = useState<string | null>(null);

  // Formulario
  const [companyForm, setCompanyForm] = useState<CompanyFormData>({
    name: '',
    description: '',
    isActive: true,
    contactEmail: '',
    contactPhone: '',
    address: '',
    industry: '',
    maxUsers: 10
  });

  // Industrias disponibles
  const industries = [
    { value: 'finance', label: 'Financiero y Banca' },
    { value: 'healthcare', label: 'Salud' },
    { value: 'manufacturing', label: 'Manufactura' },
    { value: 'technology', label: 'Tecnología' },
    { value: 'retail', label: 'Retail y Comercio' },
    { value: 'education', label: 'Educación' },
    { value: 'government', label: 'Gobierno y Sector Público' },
    { value: 'energy', label: 'Energía y Servicios Públicos' },
    { value: 'transportation', label: 'Transporte y Logística' },
    { value: 'construction', label: 'Construcción' },
    { value: 'agriculture', label: 'Agricultura' },
    { value: 'telecommunications', label: 'Telecomunicaciones' },
    { value: 'hospitality', label: 'Hotelería y Turismo' },
    { value: 'media', label: 'Medios y Entretenimiento' },
    { value: 'nonprofit', label: 'Organizaciones sin fines de lucro' },
    { value: 'other', label: 'Otro' }
  ];

  // Cargar datos al montar el componente
  useEffect(() => {
    loadCompanies();
  }, []);

  // Cargar empresas
  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar empresas
      const result = await getCompanies();
      
      if (result.success && result.companies) {
        setCompanies(result.companies);
      } else {
        setError(result.error || 'Error al cargar las empresas');
      }
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      setError('Ha ocurrido un error al cargar las empresas');
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

  // Función para depurar un objeto de empresa en la consola
  const debugCompany = (company: any, label: string) => {
    console.log(`--- ${label} ---`);
    console.log('name:', company.name);
    console.log('description:', company.description);
    console.log('isActive:', company.isActive);
    console.log('contactEmail:', company.contactEmail);
    console.log('contactPhone:', company.contactPhone);
    console.log('address:', company.address);
    console.log('industry:', company.industry);
    console.log('maxUsers:', company.maxUsers);
    console.log('-------------------');
  };

  // Funciones para manejo de empresas
  const handleAddCompany = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Validaciones básicas
      if (!companyForm.name || !companyForm.name.trim()) {
        setError('El nombre de la empresa es obligatorio');
        setLoading(false);
        return;
      }
      
      if (!companyForm.id || !companyForm.id.trim()) {
        setError('El ID de la empresa es obligatorio');
        setLoading(false);
        return;
      }

      // Validar formato del ID (solo letras minúsculas, números y guiones)
      const idFormat = /^[a-z0-9-]+$/;
      if (!idFormat.test(companyForm.id)) {
        setError('El ID de la empresa solo puede contener letras minúsculas, números y guiones');
        setLoading(false);
        return;
      }
      
      if (companyForm.contactEmail && !isValidEmail(companyForm.contactEmail)) {
        setError('El correo electrónico de contacto no es válido');
        setLoading(false);
        return;
      }
      
      // Asegurar tipos de datos correctos
      const maxUsers = parseInt(String(companyForm.maxUsers));
      if (isNaN(maxUsers) || maxUsers < 1) {
        setError('El número máximo de usuarios debe ser un número positivo');
        setLoading(false);
        return;
      }
      
      // Preparar datos para creación, asegurando tipos correctos
      const createData = {
        id: companyForm.id.trim(),
        name: companyForm.name.trim(),
        description: companyForm.description || '',
        isActive: companyForm.isActive === false ? false : true,
        contactEmail: companyForm.contactEmail || '',
        contactPhone: companyForm.contactPhone || '',
        address: companyForm.address || '',
        industry: companyForm.industry || '',
        maxUsers: maxUsers,
        environment: 'production'
      };
      
      console.log("Creando empresa con datos:", createData);
      // Obtenemos un ID de usuario del sistema para el creador
      const result = await createCompany(createData, 'system');
      
      if (result.success) {
        showSuccessMessage('Empresa creada correctamente');
        await loadCompanies();
        setIsAddingCompany(false);
        resetCompanyForm();
      } else {
        console.error("Error al crear empresa:", result.error);
        setError(result.error || 'Error al crear la empresa');
        
        // Intentar diagnóstico
        if (result.error?.includes('already exists') || result.error?.includes('ya existe')) {
          setError('Ya existe una empresa con este ID. Por favor, utilice otro ID.');
        }
      }
    } catch (err) {
      console.error('Error al añadir empresa:', err);
      setError('Ha ocurrido un error al crear la empresa. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (companyId: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Validaciones básicas
      if (!companyForm.name || !companyForm.name.trim()) {
        setError('El nombre de la empresa es obligatorio');
        setLoading(false);
        return;
      }
      
      if (companyForm.contactEmail && !isValidEmail(companyForm.contactEmail)) {
        setError('El correo electrónico de contacto no es válido');
        setLoading(false);
        return;
      }
      
      // Asegurar tipos de datos correctos
      const maxUsers = parseInt(String(companyForm.maxUsers));
      if (isNaN(maxUsers) || maxUsers < 1) {
        setError('El número máximo de usuarios debe ser un número positivo');
        setLoading(false);
        return;
      }
      
      // Preparar datos para actualización, asegurando tipos correctos
      const updateData = {
        name: companyForm.name.trim(),
        description: companyForm.description || '',
        isActive: companyForm.isActive === false ? false : true, // Asegura que sea booleano
        contactEmail: companyForm.contactEmail || '',
        contactPhone: companyForm.contactPhone || '',
        address: companyForm.address || '',
        industry: companyForm.industry || '',
        maxUsers: maxUsers
      };
      
      console.log("Actualizando empresa con datos:", updateData);
      const result = await updateCompany(companyId, updateData);
      
      if (result.success) {
        showSuccessMessage('Empresa actualizada correctamente');
        await loadCompanies();
        setIsEditingCompany(null);
      } else {
        console.error("Error al actualizar empresa:", result.error);
        setError(result.error || 'Error al actualizar la empresa');
        
        // Intentar diagnóstico
        if (result.error?.includes('already exists') || result.error?.includes('ya existe')) {
          setError('Ya existe una empresa con este nombre. Por favor, elija un nombre diferente.');
        }
      }
    } catch (err) {
      console.error('Error al actualizar empresa:', err);
      setError('Ha ocurrido un error al actualizar la empresa. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      setError(null);
      setIsDeleting(true);
      
      const result = await deleteCompany(companyId);
      
      if (result.success) {
        showSuccessMessage('Empresa eliminada correctamente');
        await loadCompanies();
        setShowConfirmDelete(null);
      } else {
        // Si el error es por usuarios o denuncias existentes, ofrecer eliminación completa
        if (
          result.error?.includes('tiene usuarios asociados') || 
          result.error?.includes('tiene denuncias registradas')
        ) {
          setError(result.error + ' ¿Desea eliminar la empresa y todos sus datos asociados?');
          setShowDeepDeleteConfirm(companyId);
          setShowConfirmDelete(null);
        } else {
          setError(result.error || 'Error al eliminar la empresa');
        }
      }
    } catch (err) {
      console.error('Error al eliminar empresa:', err);
      setError('Ha ocurrido un error al eliminar la empresa');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleDeepDeleteCompany = async (companyId: string) => {
    try {
      setError(null);
      setIsDeleting(true);
      
      // Desactivar la empresa primero para cumplir con la precondición de la función
      await updateCompany(companyId, { isActive: false });
      
      // Llamar a la función de Firebase para eliminar la empresa y todos sus datos
      const result = await safeCallFunction('deleteCompanyAndData', { companyId });
      
      // Verificar el resultado
      const data = result.data as { success: boolean; message?: string; error?: string };
      
      if (data.success) {
        showSuccessMessage('Empresa y todos sus datos eliminados correctamente');
        await loadCompanies();
        setShowDeepDeleteConfirm(null);
      } else {
        setError(data.error || 'Error al eliminar la empresa y sus datos');
      }
    } catch (err: any) {
      console.error('Error al eliminar empresa y datos:', err);
      // Mostrar el mensaje de error específico de la función de Firebase si está disponible
      const errorMessage = err.message || 'Ha ocurrido un error al eliminar la empresa y sus datos';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditCompany = async (company: Company) => {
    debugCompany(company, "Datos iniciales de empresa");
    
    // Verificar que tengamos un ID válido
    if (!company || !company.id) {
      setError('Error: No se puede editar una empresa sin ID');
      return;
    }
    
    // Primero limpiamos el formulario para evitar datos parciales
    resetCompanyForm();
    
    // Iniciar estado de edición inmediatamente
    setIsEditingCompany(company.id);
    setIsAddingCompany(false);
    
    // Mostrar un mensaje mientras cargamos
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Obtener datos completos y actualizados directamente desde Firestore
      const result = await getCompany(company.id);
      
      let companyData: Partial<Company> = company;
      let loadedSuccessfully = false;
      
      if (result.success && result.company) {
        companyData = result.company;
        debugCompany(companyData, "Datos actualizados de empresa");
        loadedSuccessfully = true;
      } else {
        console.warn(`No se pudieron obtener datos actualizados para la empresa ${company.id}`);
        console.warn('Usando datos disponibles localmente');
      }
      
      // Asegurar que todos los campos requeridos existen
      // con valores por defecto en caso de que falten
      const formData = {
        name: companyData.name || company.name || 'Empresa sin nombre',
        description: companyData.description || company.description || '',
        isActive: companyData.isActive !== undefined 
          ? companyData.isActive 
          : (company.isActive !== undefined ? company.isActive : true),
        contactEmail: companyData.contactEmail || company.contactEmail || '',
        contactPhone: companyData.contactPhone || company.contactPhone || '',
        address: companyData.address || company.address || '',
        industry: companyData.industry || company.industry || '',
        maxUsers: companyData.maxUsers || company.maxUsers || 10
      };
      
      // Asegurar que todos los campos se establecen correctamente
      debugCompany(formData, "Datos preparados para formulario");
      
      // Actualizar el formulario
      setCompanyForm(formData);
      
      // Si no pudimos cargar los datos actualizados pero tenemos suficientes datos locales,
      // ofrecer la opción de reparar la empresa
      if (!loadedSuccessfully && company.name) {
        setSuccess('Datos locales cargados. Después de editar, considere utilizar "Reparar Datos" para completar información faltante.');
      }
    } catch (error) {
      console.error('Error al obtener datos completos de la empresa:', error);
      setError('Error al cargar datos de la empresa. Se utilizarán los datos disponibles localmente.');
      
      // En caso de error, usamos los datos que tenemos aplicando valores por defecto
      // para cualquier campo que falte
      const formData = {
        name: company.name || 'Empresa sin nombre',
        description: company.description || '',
        isActive: company.isActive !== undefined ? company.isActive : true,
        contactEmail: company.contactEmail || '',
        contactPhone: company.contactPhone || '',
        address: company.address || '',
        industry: company.industry || '',
        maxUsers: company.maxUsers || 10
      };
      
      debugCompany(formData, "Datos de respaldo para formulario (después de error)");
      setCompanyForm(formData);
    } finally {
      setLoading(false);
    }
  };

  const resetCompanyForm = () => {
    // Limpiar todos los campos del formulario
    setCompanyForm({
      id: '',
      name: '',
      description: '',
      isActive: true,
      contactEmail: '',
      contactPhone: '',
      address: '',
      industry: '',
      maxUsers: 10
    });
  };
  
  // Validación de email
  const isValidEmail = (email: string) => {
    if (!email) return true; // Permitir vacío
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  if (loading && !isEditingCompany) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-neutral-600 mb-2">Cargando empresas...</p>
          <p className="text-sm text-neutral-500">
            Estamos obteniendo la lista de empresas y sus datos. Por favor, espere un momento.
          </p>
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
      
      {/* Cabecera y botones */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestión de Empresas</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                setLoading(true);
                setError(null);
                setSuccess(null);
                
                // Obtener todas las empresas
                const result = await getCompanies();
                
                if (!result.success) {
                  setError('Error al obtener empresas para reparación');
                  return;
                }
                
                let repaired = 0;
                let failed = 0;
                let skipped = 0;
                
                // Procesar cada empresa para asegurarnos de que tenga todos los campos
                for (const company of result.companies || []) {
                  // Verificar si es una empresa válida con ID
                  if (!company.id) {
                    console.warn('Empresa sin ID encontrada, omitiendo');
                    skipped++;
                    continue;
                  }
                  
                  try {
                    // Verificar si faltan campos
                    const hasAllFields = 
                      company.name !== undefined && 
                      company.isActive !== undefined &&
                      company.description !== undefined &&
                      company.contactEmail !== undefined &&
                      company.contactPhone !== undefined &&
                      company.address !== undefined &&
                      company.industry !== undefined &&
                      company.maxUsers !== undefined;
                    
                    // Verificar si los campos tienen tipos correctos
                    const needsTypeRepair = 
                      company.isActive !== undefined && typeof company.isActive !== 'boolean' ||
                      company.maxUsers !== undefined && typeof company.maxUsers !== 'number';
                    
                    // Si faltan campos o hay problemas de tipo, actualizar la empresa
                    if (!hasAllFields || needsTypeRepair) {
                      console.log(`Reparando empresa: ${company.id} - ${company.name || 'Sin nombre'}`);
                      
                      // Preparar datos para actualización
                      const updateData = {
                        name: company.name || 'Empresa sin nombre',
                        isActive: company.isActive === false ? false : true, // Asegura que sea booleano
                        description: company.description || '',
                        contactEmail: company.contactEmail || '',
                        contactPhone: company.contactPhone || '',
                        address: company.address || '',
                        industry: company.industry || '',
                        maxUsers: parseInt(String(company.maxUsers || 10)) // Asegura que sea número
                      };
                      
                      const updateResult = await updateCompany(company.id, updateData);
                      
                      if (updateResult.success) {
                        repaired++;
                      } else {
                        console.error(`Error al actualizar empresa ${company.id}:`, updateResult.error);
                        failed++;
                      }
                    } else {
                      skipped++;
                    }
                  } catch (err) {
                    console.error(`Error procesando la empresa ${company.id}:`, err);
                    failed++;
                  }
                }
                
                // Construir mensaje de éxito
                if (repaired > 0) {
                  setSuccess(`Operación completada: ${repaired} empresas reparadas, ${skipped} sin cambios, ${failed} fallidas.`);
                } else if (failed > 0) {
                  setError(`No se pudo reparar ninguna empresa. ${failed} empresas fallidas.`);
                } else {
                  setSuccess('Todas las empresas tienen datos completos y válidos.');
                }
                
                // Recargar empresas
                await loadCompanies();
                
              } catch (error) {
                console.error('Error al reparar empresas:', error);
                setError('Error al reparar empresas. Por favor, intente nuevamente.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            Reparar Datos
          </Button>
          
          {companies.find(c => c.id === 'default') ? (
            <Button 
              variant="default"
              onClick={() => {
                const defaultCompany = companies.find(c => c.id === 'default');
                if (defaultCompany) {
                  handleEditCompany(defaultCompany);
                  // Set default tab to documents
                  setTimeout(() => {
                    const documentsTab = document.querySelector('[value="documents"]') as HTMLButtonElement;
                    if (documentsTab) documentsTab.click();
                  }, 100);
                }
              }}
            >
              Documentos Página Principal
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => {
                // Crear empresa default si no existe
                resetCompanyForm();
                setCompanyForm({
                  ...companyForm,
                  name: 'Empresa Principal',
                  description: 'Esta es la empresa principal, cuyos documentos se mostrarán en la página de inicio.',
                  isActive: true
                });
                setIsAddingCompany(true);
              }}
            >
              Crear Empresa Principal
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => {
              resetCompanyForm();
              setIsAddingCompany(true);
              setIsEditingCompany(null);
            }}
          >
            Añadir Empresa
          </Button>
        </div>
      </div>
      
      {/* Formulario para añadir empresa */}
      {isAddingCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Añadir Nueva Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="companyId">ID de la Empresa*</Label>
                <Input
                  id="companyId"
                  value={companyForm.id}
                  onChange={(e) => setCompanyForm({ ...companyForm, id: e.target.value.toLowerCase() })}
                  className="mt-1"
                  placeholder="ejemplo-sa"
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones. Este ID será único y no podrá cambiarse después.</p>
                <p className="text-xs text-amber-600 mt-1">
                  Nota: Durante la fase de desarrollo, algunas operaciones se redireccionen a la empresa "default".
                </p>
              </div>

              <div>
                <Label htmlFor="companyName">Nombre de la Empresa*</Label>
                <Input
                  id="companyName"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="mt-1"
                  placeholder="Ejemplo S.A."
                />
              </div>
              
              <div>
                <Label htmlFor="companyIndustry">Industria</Label>
                <Select
                  id="companyIndustry"
                  value={companyForm.industry}
                  onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  className="mt-1"
                >
                  <option value="">Seleccione una industria</option>
                  {industries.map(industry => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="companyDescription">Descripción</Label>
                <Textarea
                  id="companyDescription"
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="companyEmail">Correo Electrónico de Contacto</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={companyForm.contactEmail}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="companyPhone">Teléfono de Contacto</Label>
                <Input
                  id="companyPhone"
                  value={companyForm.contactPhone}
                  onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="companyAddress">Dirección</Label>
                <Input
                  id="companyAddress"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="companyMaxUsers">Número Máximo de Usuarios</Label>
                <Input
                  id="companyMaxUsers"
                  type="number"
                  min="1"
                  value={companyForm.maxUsers.toString()}
                  onChange={(e) => setCompanyForm({ ...companyForm, maxUsers: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="companyActive"
                  checked={companyForm.isActive}
                  onChange={(e) => setCompanyForm({ ...companyForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-primary border-neutral-300 rounded"
                />
                <Label htmlFor="companyActive" className="ml-2">
                  Empresa Activa
                </Label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsAddingCompany(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCompany}>
                Guardar Empresa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Formulario para editar empresa */}
      {isEditingCompany && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-gray-600 text-center">Cargando datos de la empresa...</span>
                <p className="text-sm text-gray-500 mt-2 text-center max-w-md">
                  Esto puede tomar unos momentos mientras se obtienen los datos más recientes de la empresa.
                  Si la carga tarda demasiado, puede cancelar y volver a intentarlo.
                </p>
              </div>
            ) : (
              <Tabs defaultValue={window.location.hash === '#documents' ? 'documents' : 'general'} className="w-full" onValueChange={(value) => {
                // Actualizar el hash en la URL para mantener la pestaña seleccionada
                if (value === 'documents') {
                  window.location.hash = 'documents';
                } else {
                  window.location.hash = '';
                }
              }}>
                <TabsList className="mb-4">
                  <TabsTrigger value="general">Información General</TabsTrigger>
                  <TabsTrigger value="documents">Documentos Corporativos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="editCompanyName">Nombre de la Empresa*</Label>
                      <Input
                        id="editCompanyName"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="editCompanyIndustry">Industria</Label>
                      <Select
                        id="editCompanyIndustry"
                        value={companyForm.industry}
                        onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                        className="mt-1"
                      >
                        <option value="">Seleccione una industria</option>
                        {industries.map(industry => (
                          <option key={industry.value} value={industry.value}>
                            {industry.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="editCompanyDescription">Descripción</Label>
                      <Textarea
                        id="editCompanyDescription"
                        value={companyForm.description}
                        onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="editCompanyEmail">Correo Electrónico de Contacto</Label>
                      <Input
                        id="editCompanyEmail"
                        type="email"
                        value={companyForm.contactEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="editCompanyPhone">Teléfono de Contacto</Label>
                      <Input
                        id="editCompanyPhone"
                        value={companyForm.contactPhone}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="editCompanyAddress">Dirección</Label>
                      <Input
                        id="editCompanyAddress"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="editCompanyMaxUsers">Número Máximo de Usuarios</Label>
                      <Input
                        id="editCompanyMaxUsers"
                        type="number"
                        min="1"
                        value={companyForm.maxUsers.toString()}
                        onChange={(e) => setCompanyForm({ ...companyForm, maxUsers: parseInt(e.target.value) || 1 })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="editCompanyActive"
                        checked={companyForm.isActive}
                        onChange={(e) => setCompanyForm({ ...companyForm, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary border-neutral-300 rounded"
                      />
                      <Label htmlFor="editCompanyActive" className="ml-2">
                        Empresa Activa
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setIsEditingCompany(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => handleUpdateCompany(isEditingCompany)}>
                      Actualizar Empresa
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="documents">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Gestiona los documentos corporativos de la empresa. Los documentos marcados como "públicos" se mostrarán en la página de inicio.
                    </p>
                    <CompanyDocumentsManager companyId={isEditingCompany} />
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setIsEditingCompany(null)}>
                      Cerrar
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Lista de empresas en formato tabla */}
      {companies.length > 0 && !isEditingCompany && !isAddingCompany && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-4">Empresas Configuradas</h2>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Información
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map(company => (
                  <tr key={company.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {company.name}
                        </div>
                        {company.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {company.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {company.isActive ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Activa
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactiva
                          </span>
                        )}
                        {company.id === DEFAULT_COMPANY_ID && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Principal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1 text-xs text-gray-500">
                        {company.industry && (
                          <div>
                            <span className="font-medium">Industria:</span>
                            <span className="ml-1">
                              {industries.find(i => i.value === company.industry)?.label || company.industry}
                            </span>
                          </div>
                        )}
                        {company.contactEmail && (
                          <div>
                            <span className="font-medium">Email:</span>
                            <span className="ml-1">{company.contactEmail}</span>
                          </div>
                        )}
                        {company.contactPhone && (
                          <div>
                            <span className="font-medium">Teléfono:</span>
                            <span className="ml-1">{company.contactPhone}</span>
                          </div>
                        )}
                        {company.id === DEFAULT_COMPANY_ID && (
                          <div className="text-blue-600 font-medium">
                            Sus documentos públicos se muestran en la página principal
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col space-y-2 items-end">
                        <button
                          onClick={() => setIsEditingCompany(company.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar Empresa
                        </button>
                        <button
                          onClick={() => {
                            // Establecer el hash primero para que se use cuando se monte el componente
                            window.location.hash = 'documents';
                            // Luego abrir el editor
                            setIsEditingCompany(company.id);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Gestionar Documentos
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(company.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar Empresa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Mensaje cuando no hay empresas */}
      {companies.length === 0 && !isEditingCompany && !isAddingCompany && (
        <div className="bg-gray-50 rounded-lg p-8 text-center mt-6">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay empresas configuradas</h3>
          <p className="mt-1 text-sm text-gray-500">
            Crea tu primera empresa para comenzar a gestionar el canal de denuncias.
          </p>
        </div>
      )}
      
      {/* Diálogo de confirmación para eliminar empresa */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar Eliminación</h3>
            <p className="text-sm text-gray-500 mb-4">
              ¿Está seguro que desea eliminar esta empresa? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmDelete(null)} 
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDeleteCompany(showConfirmDelete)} 
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Empresa'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Diálogo de confirmación para eliminación completa */}
      {showDeepDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-red-600 mb-4">Eliminación Completa</h3>
            <p className="text-sm text-gray-700 mb-2 font-medium">
              ¡Atención! Esta es una operación destructiva.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Está a punto de eliminar la empresa y todos sus datos relacionados, incluyendo:
            </p>
            <ul className="list-disc pl-5 mb-4 text-sm text-gray-500">
              <li>Todos los usuarios asociados</li>
              <li>Todas las denuncias y reportes</li>
              <li>Todos los documentos subidos</li>
              <li>Toda la configuración personalizada</li>
            </ul>
            <p className="text-sm text-red-500 font-medium mb-4">
              Esta acción no se puede deshacer y resultará en la pérdida permanente de datos.
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeepDeleteConfirm(null)} 
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDeepDeleteCompany(showDeepDeleteConfirm)} 
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Empresa y Todos sus Datos'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}