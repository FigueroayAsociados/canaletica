// src/app/(dashboard)/dashboard/settings/page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import {
  getCompanyConfig,
  saveCompanyConfig,
  uploadCompanyLogo,
  CompanyConfig,
  NotificationSettings
} from '@/lib/services/configService';

// Importar los nuevos componentes y el contexto de empresa
import CategoriesManager from '@/components/settings/CategoriesManager';
import TemplatesManager from '@/components/settings/TemplatesManager';
import RolesManager from '@/components/settings/RolesManager';
import IntegrationsManager from '@/components/settings/IntegrationsManager';
import CompaniesManager from '@/components/settings/CompaniesManager';
import FormOptionsManager from '@/components/settings/FormOptionsManager';
import RiskQuestionManager from '@/components/settings/RiskQuestionManager';
import VideosManager from '@/components/settings/VideosManager';
import { LegalDocumentsManager } from '@/components/settings/LegalDocumentsManager';
import { useCompany } from '@/lib/hooks';

export default function SettingsPage() {
  const { uid, isAdmin, isSuperAdmin } = useCurrentUser();
  const { companyId, refreshCompanyData } = useCompany(); // Usar el ID y la función de recarga del contexto
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para los datos
  const [settings, setSettings] = useState<CompanyConfig>({
    companyName: 'Mi Empresa',
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    emailNotifications: true,
    defaultLanguage: 'es',
    retentionPolicy: 365,
    slaForRegular: 30,
    slaForKarin: 10,
    notifications: {
      notifyNewReport: true,
      notifyStatusChange: true,
      notifyNewComment: true,
      notifyDueDate: true
    }
  });

  const [logoUrl, setLogoUrl] = useState('/logo.png');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración al montar el componente
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        // Usar companyId del contexto en lugar de 'default'
        const result = await getCompanyConfig(companyId);
        if (result.success && result.config) {
          setSettings(result.config);
          if (result.config.logoUrl) {
            setLogoUrl(result.config.logoUrl);
          }
        } else {
          setError(result.error || 'Error al cargar la configuración');
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        setError('Ha ocurrido un error al cargar la configuración');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [companyId]); // Dependencia del useEffect

  const handleSaveSettings = async () => {
    if (!uid) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Usar companyId del contexto en lugar de 'default'
      const result = await saveCompanyConfig(
        companyId,
        uid,
        settings
      );

      if (result.success) {
        setSaveSuccess(true);
        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setError(result.error || 'Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setError('Ha ocurrido un error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);

    try {
      // Usar companyId del contexto en lugar de 'default'
      const result = await uploadCompanyLogo(
        companyId,
        file
      );

      if (result.success && result.logoUrl) {
        setLogoUrl(result.logoUrl);
        
        // Refrescar el contexto para que se actualice el logo en toda la aplicación
        console.log("Refrescando datos de la compañía después de subir un nuevo logo");
        refreshCompanyData();
      } else {
        setError(result.error || 'Error al subir el logo');
      }
    } catch (error) {
      console.error('Error al subir logo:', error);
      setError('Ha ocurrido un error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Manejador para cambios en las notificaciones
  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications!,
        [id]: checked
      }
    }));
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertDescription>
            No tiene permisos para acceder a esta página. Esta sección está reservada para administradores.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert variant="success">
          <AlertDescription>
            La configuración se ha guardado correctamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Pestañas de configuración */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-md overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'general'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'appearance'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('appearance')}
          >
            Apariencia
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'categories'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('categories')}
          >
            Categorías
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'formoptions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('formoptions')}
          >
            Opciones de Formularios
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'riskquestions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('riskquestions')}
          >
            Factores de Riesgo
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            Plantillas
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'roles'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('roles')}
          >
            Roles
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'integrations'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('integrations')}
          >
            Integraciones
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'videos'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'notifications'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            Notificaciones
          </button>
          {/* La gestión de empresas se ha movido al panel de super admin */}
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'legal'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('legal')}
          >
            Documentos Legales
          </button>
          <button
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'advanced'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('advanced')}
          >
            Avanzado
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la Empresa</CardTitle>
                  <CardDescription>
                    Configura la información básica de tu empresa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Nombre de la Empresa</Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyLogo">Logo de la Empresa</Label>
                    <div className="mt-1 flex items-center">
                      <div className="h-12 w-12 rounded border border-gray-300 overflow-hidden">
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="ml-4"
                        onClick={handleLogoClick}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="defaultLanguage">Idioma Predeterminado</Label>
                    <Select
                      id="defaultLanguage"
                      value={settings.defaultLanguage}
                      onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                      className="mt-1"
                    >
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Apariencia</CardTitle>
                  <CardDescription>
                    Personaliza la apariencia de la aplicación
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="primaryColor">Color Primario</Label>
                    <div className="flex mt-1">
                      <input
                        type="color"
                        id="primaryColor"
                        value={settings.primaryColor}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        className="h-10 w-10 rounded border border-gray-300"
                      />
                      <Input
                        value={settings.primaryColor}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        className="ml-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondaryColor">Color Secundario</Label>
                    <div className="flex mt-1">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={settings.secondaryColor}
                        onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                        className="h-10 w-10 rounded border border-gray-300"
                      />
                      <Input
                        value={settings.secondaryColor}
                        onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                        className="ml-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'categories' && (
            <CategoriesManager companyId={companyId} />
          )}
          
          {activeTab === 'formoptions' && (
            <FormOptionsManager companyId={companyId} />
          )}
          
          {activeTab === 'riskquestions' && (
            <RiskQuestionManager companyId={companyId} />
          )}

          {activeTab === 'templates' && (
            <TemplatesManager companyId={companyId} />
          )}

          {activeTab === 'roles' && (
            <RolesManager companyId={companyId} />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsManager companyId={companyId} />
          )}
          
          {activeTab === 'videos' && (
            <VideosManager />
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Notificaciones</CardTitle>
                  <CardDescription>
                    Personaliza cómo y cuándo se envían notificaciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                      className="h-4 w-4 text-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="emailNotifications" className="ml-2">
                      Habilitar notificaciones por correo electrónico
                    </Label>
                  </div>

                  <div>
                    <Label>Eventos para enviar notificaciones</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifyNewReport"
                          checked={settings.notifications?.notifyNewReport}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <label htmlFor="notifyNewReport" className="ml-2 block text-sm text-gray-700">
                          Nueva denuncia recibida
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifyStatusChange"
                          checked={settings.notifications?.notifyStatusChange}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <label htmlFor="notifyStatusChange" className="ml-2 block text-sm text-gray-700">
                          Cambio de estado en una denuncia
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifyNewComment"
                          checked={settings.notifications?.notifyNewComment}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <label htmlFor="notifyNewComment" className="ml-2 block text-sm text-gray-700">
                          Nuevo mensaje del denunciante
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notifyDueDate"
                          checked={settings.notifications?.notifyDueDate}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                        <label htmlFor="notifyDueDate" className="ml-2 block text-sm text-gray-700">
                          Recordatorio de fecha límite de investigación
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* La gestión de empresas se ha movido al panel de super admin */}
          
          {activeTab === 'legal' && (
            <LegalDocumentsManager companyId={companyId} />
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración Avanzada</CardTitle>
                  <CardDescription>
                    Configuraciones avanzadas del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="retentionPolicy">Política de Retención de Datos (días)</Label>
                    <Input
                      id="retentionPolicy"
                      type="number"
                      value={settings.retentionPolicy.toString()}
                      onChange={(e) => setSettings({
                        ...settings,
                        retentionPolicy: parseInt(e.target.value) || 365
                      })}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tiempo que se conservarán las denuncias después de ser cerradas.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="slaForRegular">SLA para Denuncias Regulares (días)</Label>
                    <Input
                      id="slaForRegular"
                      type="number"
                      value={settings.slaForRegular.toString()}
                      onChange={(e) => setSettings({
                        ...settings,
                        slaForRegular: parseInt(e.target.value) || 30
                      })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slaForKarin">SLA para Denuncias Ley Karin (días)</Label>
                    <Input
                      id="slaForKarin"
                      type="number"
                      value={settings.slaForKarin.toString()}
                      onChange={(e) => setSettings({
                        ...settings,
                        slaForKarin: parseInt(e.target.value) || 10
                      })}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tiempo máximo para resolver denuncias relacionadas con Ley Karin.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Botón de guardar para pestañas que usan settings */}
          {(activeTab === 'general' || activeTab === 'appearance' || activeTab === 'notifications' || activeTab === 'advanced') && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}