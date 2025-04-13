// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/report',
  '/track',
  '/track/[code]'
];

// Rutas de API que no requieren verificación de token
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/report/anonymous'
];

// Rutas que solo pueden acceder los administradores
const adminRoutes = [
  '/dashboard/admin',
  '/dashboard/settings',
  '/dashboard/users'
];

// Rutas de API que solo pueden acceder los administradores
const adminApiRoutes = [
  '/api/admin'
];

// Función auxiliar para verificar si la ruta actual coincide con cualquiera de las rutas del array
function matchesRoute(currentPath: string, routes: string[]): boolean {
  // Manejo especial para las rutas dinámicas con parámetros
  return routes.some(route => {
    if (route.includes('[') && route.includes(']')) {
      // Convertir la ruta con parámetros a una expresión regular
      const regexPattern = route.replace(/\[\w+\]/g, '[^/]+');
      const regex = new RegExp(`^${regexPattern.replace(/\//g, '\\/')}$`);
      return regex.test(currentPath);
    }
    return currentPath === route || currentPath.startsWith(`${route}/`);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Comprobar si la ruta es pública (no requiere autenticación)
  if (matchesRoute(pathname, publicRoutes) || 
      matchesRoute(pathname, publicApiRoutes) || 
      pathname.startsWith('/_next') || 
      pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Obtener la cookie de sesión
  const session = request.cookies.get('session')?.value;
  
  // Si no hay sesión y no es una ruta pública, redirigir a login
  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // Para rutas de administración, verificar que el usuario sea administrador
  if (matchesRoute(pathname, adminRoutes) || matchesRoute(pathname, adminApiRoutes)) {
    // La verificación real del rol se hace en los componentes/API
    // En un sistema más seguro, aquí se verificaría contra una API
    const userRole = request.cookies.get('user_role')?.value;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}