// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// Modo demo controlado por variable de entorno
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'; // Controla demo desde variable de entorno

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

export default function middleware(request: NextRequest) {
  // Verificar si el modo demo está activo
  if (DEMO_MODE) {
    // En modo demo, permitimos acceso a todas las rutas sin ninguna restricción
    return NextResponse.next();
  }
  
  // TODO: Para producción, implementar lógica de autenticación real aquí
  // Redirigir a login si no hay sesión válida en rutas protegidas
  // Por ahora, permitimos acceso a todo
  return NextResponse.next();
}

// Configurar las rutas a las que aplicamos middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};