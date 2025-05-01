'use client';

// src/app/(dashboard)/layout.tsx
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import FloatingAssistant from '@/components/ai/FloatingAssistant';
import SmartAlertSystem from '@/components/alerts/SmartAlertSystem';
import EnvironmentIndicatorClient from '@/components/ui/environment-indicator-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, loading: authLoading, logout } = useAuth();
  const { profile, isLoading, error, isAdmin, isInvestigator } = useCurrentUser();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    if (!authLoading && !currentUser) {
      // No hay usuario autenticado, redirigir al login
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  const handleLogout = async () => {
    try {
      // Primero hacer logout en Firebase Auth
      await logout();
      
      // Luego llamar a nuestra API para limpiar cookies de sesión
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Redirigir al login
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-neutral-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Verificar si hay un error con el perfil de usuario
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6">
          <Alert variant="error" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleLogout} className="w-full">Volver al Inicio de Sesión</Button>
        </div>
      </div>
    );
  }

  // Verificar si el usuario está activo y tiene un rol válido
  if (!profile?.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6">
          <Alert variant="error" className="mb-4">
            <AlertDescription>
              Su cuenta ha sido desactivada. Por favor, contacte al administrador del sistema.
            </AlertDescription>
          </Alert>
          <Button onClick={handleLogout} className="w-full">Volver al Inicio de Sesión</Button>
        </div>
      </div>
    );
  }

  // Verificar si el usuario tiene permisos según su rol
  if (profile && !profile.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6">
          <Alert variant="error" className="mb-4">
            <AlertDescription>
              Su cuenta ha sido desactivada. Por favor, contacte al administrador del sistema.
            </AlertDescription>
          </Alert>
          <Button onClick={handleLogout} className="w-full">Volver al Inicio de Sesión</Button>
        </div>
      </div>
    );
  }
  
  // Permitir acceso si el usuario es superadmin, admin o investigador
  // Desactiva temporalmente esta verificación hasta que arreglemos los roles
  /*
  if (!isAdmin && !isInvestigator && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6">
          <Alert variant="error" className="mb-4">
            <AlertDescription>
              No tiene permisos para acceder a esta sección. Por favor, contacte al administrador del sistema.
            </AlertDescription>
          </Alert>
          <Button onClick={handleLogout} className="w-full">Volver al Inicio de Sesión</Button>
        </div>
      </div>
    );
  }
  */

  return (
    <div className="min-h-screen bg-neutral-100 flex">
      {/* Sidebar fija para escritorio */}
      <div className="hidden md:block w-64 bg-white shadow-sm overflow-y-auto h-screen fixed">
        <div className="p-6 flex items-center">
          <div className="h-8 w-8 relative mr-2">
            <Image 
              src="/logo.png" 
              alt="CanalEtica Logo" 
              fill 
              style={{ objectFit: 'contain' }} 
              priority
            />
          </div>
          <span className="font-bold text-xl text-neutral-900">CanalEtica</span>
        </div>
        <nav className="mt-5 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname === '/dashboard' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
          >
            <svg className={`mr-3 h-5 w-5 ${pathname === '/dashboard' ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>

          <Link 
            href="/dashboard/reports" 
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/reports') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
          >
            <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/reports') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Denuncias
          </Link>

          <Link 
            href="/dashboard/investigation" 
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/investigation') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
          >
            <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/investigation') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Investigaciones
          </Link>
          
          <Link 
            href="/dashboard/alerts" 
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/alerts') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
          >
            <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/alerts') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Alertas
          </Link>

          <Link
            href="/dashboard/follow-up"
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
            pathname.startsWith('/dashboard/follow-up') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
           <svg 
            className={`mr-3 h-5 w-5 ${
            pathname.startsWith('/dashboard/follow-up') ? 'text-white' : 'text-neutral-500'
            }`} 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
           <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" 
          />
           </svg>
           Seguimiento
         </Link>

          {(isAdmin || profile?.role === 'super_admin') && (
            <>
              <Link 
                href="/dashboard/settings" 
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/settings') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/settings') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración
              </Link>

              <Link 
                href="/dashboard/users" 
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/users') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/users') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Usuarios
              </Link>
              
              <Link 
                href="/dashboard/admin/ai-dashboard" 
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/admin/ai-dashboard') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/admin/ai-dashboard') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Dashboard IA
              </Link>

              <Link 
                href="/dashboard/admin/ley-karin" 
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/admin/ley-karin') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/admin/ley-karin') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ley Karin
              </Link>
              
              <Link 
                href="/dashboard/admin/delete-reports" 
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${pathname.startsWith('/dashboard/admin/delete-reports') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                <svg className={`mr-3 h-5 w-5 ${pathname.startsWith('/dashboard/admin/delete-reports') ? 'text-white' : 'text-neutral-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar Denuncias
              </Link>
            </>
          )}
        </nav>

        {/* Información de usuario en la parte inferior del sidebar */}
        <div className="absolute bottom-0 w-full p-4 border-t border-neutral-200">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {profile?.displayName?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{profile?.displayName}</p>
              <p className="text-xs text-neutral-500 truncate">{profile?.role === 'admin' ? 'Administrador' : profile?.role === 'super_admin' ? 'Super Administrador' : 'Investigador'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded-md text-neutral-500 hover:text-primary hover:bg-neutral-100"
              title="Cerrar sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 md:ml-64">
        {/* Barra superior para móvil */}
        <header className="bg-white shadow-sm md:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-neutral-500 hover:text-primary hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <span className="sr-only">Abrir menú</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <Link href="/dashboard" className="flex items-center ml-2">
                  <div className="h-8 w-8 relative mr-2">
                    <Image 
                      src="/logo.png" 
                      alt="CanalEtica Logo" 
                      fill 
                      style={{ objectFit: 'contain' }} 
                      priority
                    />
                  </div>
                  <span className="font-bold text-xl text-neutral-900">CanalEtica</span>
                </Link>
              </div>
              <div className="flex items-center space-x-1">
                {/* Componente de alertas compacto */}
                <SmartAlertSystem compact />

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-md text-neutral-500 hover:text-primary hover:bg-neutral-100"
                >
                  <span className="sr-only">Cerrar sesión</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Menú móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-neutral-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="/dashboard" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/dashboard' ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                Dashboard
              </Link>
              <Link 
                href="/dashboard/reports" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname.startsWith('/dashboard/reports') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                Denuncias
              </Link>
              <Link 
                href="/dashboard/investigation" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname.startsWith('/dashboard/investigation') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                Investigaciones
              </Link>
              <Link 
                href="/dashboard/alerts" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname.startsWith('/dashboard/alerts') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                Alertas
              </Link>
              {(isAdmin || profile?.role === 'super_admin') && (
                <>

              <Link
                href="/dashboard/follow-up"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith('/dashboard/follow-up') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                Seguimiento
              </Link>
              
                  <Link 
                    href="/dashboard/settings" 
                    className={`block px-3 py-2 rounded-md text-base font-medium ${pathname.startsWith('/dashboard/settings') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
                  >
                    Configuración
                  </Link>
                  <Link 
                    href="/dashboard/users" 
                    className={`block px-3 py-2 rounded-md text-base font-medium ${pathname.startsWith('/dashboard/users') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
                  >
                    Usuarios
                  </Link>
                  <Link 
                    href="/dashboard/admin/ai-dashboard" 
                    className={`block px-3 py-2 rounded-md text-base font-medium ${pathname.startsWith('/dashboard/admin/ai-dashboard') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
                  >
                    Dashboard IA
                  </Link>
                  <Link 
                    href="/dashboard/admin/delete-reports" 
                    className={`block px-3 py-2 rounded-md text-base font-medium ${pathname.startsWith('/dashboard/admin/delete-reports') ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
                  >
                    Eliminar Denuncias
                  </Link>
                </>
              )}
            </div>
            <div className="pt-4 pb-3 border-t border-neutral-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                    <span className="text-lg font-medium text-primary">
                      {profile?.displayName?.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-neutral-800">{profile?.displayName}</div>
                  <div className="text-sm font-medium text-neutral-500">{profile?.email}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
        
        {/* Indicador de entorno */}
        <EnvironmentIndicatorClient />
        
        {/* Asistente Virtual IA Flotante */}
        <FloatingAssistant />
      </div>
    </div>
  );
}