'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { FloatingAssistant } from '@/components/ai/FloatingAssistant';
import { SmartAlertSystem } from '@/components/alerts/SmartAlertSystem';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentUser, loading: authLoading, logout } = useAuth();
  const { isAdmin, isLoading, error, profile } = useCurrentUser();
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Redireccionar a login si no hay usuario
  useEffect(() => {
    if (!authLoading && !currentUser) {
      window.location.href = '/login';
    }
  }, [currentUser, authLoading]);
  
  // Si está cargando, mostrar spinner
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Si no hay usuario autenticado, no mostrar nada
  if (!currentUser) {
    return null;
  }
  
  // Si hay un error con el perfil
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen flex-col space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
        <button 
          onClick={logout} 
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90"
        >
          Volver al inicio de sesión
        </button>
      </div>
    );
  }
  
  const isActive = (path: string) => {
    return pathname?.startsWith(path) ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900";
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <div className={`${showMobileMenu ? 'block' : 'hidden'} fixed inset-0 z-40 lg:hidden`} role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setShowMobileMenu(false)}></div>
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button 
              type="button" 
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setShowMobileMenu(false)}
            >
              <span className="sr-only">Cerrar menú</span>
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-shrink-0 flex items-center px-4">
            <img className="h-8 w-auto" src="/logo.png" alt="Logo" />
          </div>
          <div className="mt-5 flex-1 h-0 overflow-y-auto">
            <nav className="px-2 space-y-1">
              <Link href="/dashboard" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard')}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              
              <Link href="/dashboard/reports" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/reports')}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Denuncias
              </Link>

              <Link href="/dashboard/reports/analytics" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/reports/analytics')}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Reportes Avanzados
              </Link>
              
              <Link href="/dashboard/investigation" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/investigation')}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Investigaciones
              </Link>
              
              <Link href="/dashboard/follow-up" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/follow-up')}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Seguimiento
              </Link>

              <Link href="/dashboard/alerts" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/alerts')}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Alertas <span className="ml-1 bg-red-100 text-red-600 py-0.5 px-2 text-xs rounded-full">Nuevo</span>
              </Link>
              
              {isAdmin && (
                <>
                  <div className="mt-8 mb-2 px-3">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Administración
                    </h3>
                  </div>
                  
                  <Link href="/dashboard/users" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/users')}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Usuarios
                  </Link>
                  
                  <Link href="/dashboard/settings" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/settings')}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuración
                  </Link>
                </>
              )}
              
              {profile?.role === 'super_admin' && (
                <>
                  <div className="mt-8 mb-2 px-3">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Super Admin
                    </h3>
                  </div>
                  
                  <Link href="/dashboard/admin/companies" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/admin/companies')}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Empresas
                  </Link>
                  
                  <Link href="/dashboard/admin/initialize" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/admin/initialize')}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Inicialización
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
        
        <div className="flex-shrink-0 w-14" aria-hidden="true">
          {/* Dummy element to force sidebar to shrink to fit close icon */}
        </div>
      </div>
      
      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b border-gray-200">
              <img className="h-8 w-auto" src="/logo.png" alt="Logo" />
              <span className="ml-2 text-xl font-semibold text-gray-800">Canaletica</span>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 bg-white space-y-1">
                <Link href="/dashboard" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard')}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
                
                <Link href="/dashboard/reports" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/reports')}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Denuncias
                </Link>

                <Link href="/dashboard/reports/analytics" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/reports/analytics')}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  Reportes Avanzados
                </Link>
                
                <Link href="/dashboard/investigation" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/investigation')}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Investigaciones
                </Link>
                
                <Link href="/dashboard/follow-up" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/follow-up')}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Seguimiento
                </Link>

                <Link href="/dashboard/alerts" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/alerts')}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Alertas <span className="ml-1 bg-red-100 text-red-600 py-0.5 px-2 text-xs rounded-full">Nuevo</span>
                </Link>
                
                {isAdmin && (
                  <>
                    <div className="mt-8 mb-2 px-3">
                      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Administración
                      </h3>
                    </div>
                    
                    <Link href="/dashboard/users" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/users')}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Usuarios
                    </Link>
                    
                    <Link href="/dashboard/settings" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/settings')}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </Link>
                  </>
                )}
                
                {isSuperAdmin && (
                  <>
                    <div className="mt-8 mb-2 px-3">
                      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Super Admin
                      </h3>
                    </div>
                    
                    <Link href="/dashboard/admin/companies" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/admin/companies')}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Empresas
                    </Link>
                    
                    <Link href="/dashboard/admin/initialize" className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard/admin/initialize')}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Inicialización
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-1.5">
            <div>
              <img className="h-8 w-auto" src="/logo.png" alt="Logo" />
            </div>
            <div>
              <button
                type="button"
                className="-mr-3 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
                onClick={() => setShowMobileMenu(true)}
              >
                <span className="sr-only">Abrir menú</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 relative z-0 flex overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            {/* Topbar */}
            <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
              <div className="flex-1 px-4 flex justify-between">
                <div className="flex-1 flex items-center">
                  <div className="max-w-2xl w-full lg:max-w-xs">
                    {/* Aquí podría ir un buscador u otra información */}
                  </div>
                </div>
                <div className="ml-4 flex items-center md:ml-6">
                  {/* Componente de Alertas Inteligentes (modo compacto para la barra superior) */}
                  <div className="mr-3">
                    <SmartAlertSystem mode="compact" maxAlerts={3} />
                  </div>
                  
                  {/* Menú de usuario */}
                  <div className="relative">
                    <div className="flex items-center">
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          {user?.displayName || user?.email}
                        </p>
                        <button
                          onClick={signOut}
                          className="text-xs font-medium text-gray-500 group-hover:text-gray-700"
                        >
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main content */}
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
          
          {/* Asistente de IA Flotante */}
          <FloatingAssistant />
        </div>
      </div>
    </div>
  );
}