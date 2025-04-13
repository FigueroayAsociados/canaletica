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
import { getCompanies, createCompany, updateCompany, deleteCompany, Company } from '@/lib/services/configService';
import { httpsCallable } from 'firebase/functions';
import { functions, safeCallFunction } from '@/lib/firebase/functions';

interface CompanyFormData {
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

  // Funciones para manejo de empresas
  const handleAddCompany = async () => {
    try {
      setError(null);
      
      if (!companyForm.name.trim()) {
        setError('El nombre de la empresa es obligatorio');
        return;
      }
      
      if (!isValidEmail(companyForm.contactEmail)) {
        setError('El correo electrónico de contacto no es válido');
        return;
      }
      
      const result = await createCompany({
        name: companyForm.name,
        description: companyForm.description,
        isActive: companyForm.isActive,
        contactEmail: companyForm.contactEmail,
        contactPhone: companyForm.contactPhone,
        address: companyForm.address,
        industry: companyForm.industry,
        maxUsers: companyForm.maxUsers
      });
      
      if (result.success) {
        showSuccessMessage('Empresa creada correctamente');
        await loadCompanies();
        setIsAddingCompany(false);
        resetCompanyForm();
      } else {
        setError(result.error || 'Error al crear la empresa');
      }
    } catch (err) {
      console.error('Error al añadir empresa:', err);
      setError('Ha ocurrido un error al crear la empresa');
    }
  };

  const handleUpdateCompany = async (companyId: string) => {
    try {
      setError(null);
      
      if (!companyForm.name.trim()) {
        setError('El nombre de la empresa es obligatorio');
        return;
      }
      
      if (!isValidEmail(companyForm.contactEmail)) {
        setError('El correo electrónico de contacto no es válido');
        return;
      }
      
      const result = await updateCompany(companyId, {
        name: companyForm.name,
        description: companyForm.description,
        isActive: companyForm.isActive,
        contactEmail: companyForm.contactEmail,
        contactPhone: companyForm.contactPhone,
        address: companyForm.address,
        industry: companyForm.industry,
        maxUsers: companyForm.maxUsers
      });
      
      if (result.success) {
        showSuccessMessage('Empresa actualizada correctamente');
        await loadCompanies();
        setIsEditingCompany(null);
      } else {
        setError(result.error || 'Error al actualizar la empresa');
      }
    } catch (err) {
      console.error('Error al actualizar empresa:', err);
      setError('Ha ocurrido un error al actualizar la empresa');
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

  const handleEditCompany = (company: Company) => {
    setCompanyForm({
      name: company.name,
      description: company.description || '',
      isActive: company.isActive,
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
      address: company.address || '',
      industry: company.industry || '',
      maxUsers: company.maxUsers || 10
    });
    
    setIsEditingCompany(company.id);
    setIsAddingCompany(false);
  };

  const resetCompanyForm = () => {
    setCompanyForm({
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
          <p className="text-neutral-600">Cargando empresas...</p>
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
        <h2 className="text-xl font-semibold">Gestión de Empresas</h2>
        <Button 
          onClick={() => {
            resetCompanyForm();
            setIsAddingCompany(true);
            setIsEditingCompany(null);
          }}
        >
          Añadir Empresa
        </Button>
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
                <Label htmlFor="companyName">Nombre de la Empresa*</Label>
                <Input
                  id="companyName"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="mt-1"
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
          </CardContent>
        </Card>
      )}
      
      {/* Lista de empresas */}
      <div className="space-y-4">
        {companies.length === 0 ? (
          <p className="text-neutral-500 text-center py-4">No hay empresas configuradas</p>
        ) : (
          companies.map(company => (
            <Card key={company.id} className={!company.isActive ? 'border-neutral-300 bg-neutral-50' : ''}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 flex items-center">
                      {company.name}
                      {!company.isActive && (
                        <span className="ml-2 bg-neutral-200 text-neutral-600 text-xs px-2 py-1 rounded">Inactiva</span>
                      )}
                    </h3>
                    {company.description && (
                      <p className="text-neutral-600 mt-1">{company.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-4">
                      {company.industry && (
                        <div>
                          <span className="text-sm font-medium text-neutral-500">Industria:</span>
                          <span className="text-sm text-neutral-700 ml-2">
                            {industries.find(i => i.value === company.industry)?.label || company.industry}
                          </span>
                        </div>
                      )}
                      
                      {company.contactEmail && (
                        <div>
                          <span className="text-sm font-medium text-neutral-500">Email:</span>
                          <span className="text-sm text-neutral-700 ml-2">{company.contactEmail}</span>
                        </div>
                      )}
                      
                      {company.contactPhone && (
                        <div>
                          <span className="text-sm font-medium text-neutral-500">Teléfono:</span>
                          <span className="text-sm text-neutral-700 ml-2">{company.contactPhone}</span>
                        </div>
                      )}
                      
                      {company.maxUsers && (
                        <div>
                          <span className="text-sm font-medium text-neutral-500">Usuarios máximos:</span>
                          <span className="text-sm text-neutral-700 ml-2">{company.maxUsers}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCompany(company)}
                    >
                      Editar
                    </Button>
                    {showConfirmDelete === company.id ? (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowConfirmDelete(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCompany(company.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Eliminando...' : 'Confirmar'}
                        </Button>
                      </div>
                    ) : showDeepDeleteConfirm === company.id ? (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowDeepDeleteConfirm(null);
                            setError(null);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeepDeleteCompany(company.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Eliminando...' : 'Eliminar Todo'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-error hover:text-error-dark"
                        onClick={() => setShowConfirmDelete(company.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}