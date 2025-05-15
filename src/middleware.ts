// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// Modo demo controlado por variable de entorno
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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

// Lista de dominios principales para la aplicación
const mainDomains = [
  // Nuevo dominio principal (canaletic.app)
  'canaletic.app',
  'www.canaletic.app',
  
  // Dominios anteriores (por compatibilidad)
  'canaletica.cl',
  'www.canaletica.cl',
  'canaletica.com',
  'www.canaletica.com',
  'canaletica.vercel.app',
  'localhost:3000'
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

/**
 * Middleware para manejar redirecciones basadas en subdominio
 * y configurar correctamente el contexto de empresa, además de la autenticación
 */
export default function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Verificar si el modo demo está activo
  if (DEMO_MODE) {
    // En modo demo, permitimos acceso a todas las rutas sin ninguna restricción
    return NextResponse.next();
  }
  
  // Ignorar solicitudes de API, estáticas y otros recursos
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('.') // Archivos como .jpg, .css, etc.
  ) {
    return NextResponse.next();
  }
  
  // Extraer el subdominio o dominio personalizado
  let companyId = null;
  
  // Caso 1: Subdominio (ej: empresa1.canaletic.app o empresa1.canaletica.cl)
  if (!mainDomains.includes(hostname)) {
    // Verificar si es un subdominio
    const hostParts = hostname.split('.');
    
    // Dominio con subdominio (ej: empresa1.canaletic.app)
    if (hostParts.length > 1 && hostParts[0] !== 'www') {
      companyId = hostParts[0];
      console.log(`Middleware: Detectado subdominio ${companyId}`);
    }
    // Dominio personalizado de cliente (ej: denuncias.empresa.com)
    else {
      // Aquí podríamos implementar una búsqueda en la base de datos
      // para encontrar qué empresa corresponde a este dominio personalizado
      console.log(`Middleware: Detectado posible dominio personalizado ${hostname}`);
    }
  }
  
  // Caso 2: Parámetro en URL (ej: canaletic.app?company=empresa1)
  if (!companyId && searchParams.has('company')) {
    companyId = searchParams.get('company');
    console.log(`Middleware: Detectada empresa por parámetro: ${companyId}`);
  }
  
  // Caso 3: Ruta de empresa (ej: canaletic.app/empresa/empresa1/...)
  if (!companyId && pathname.startsWith('/empresa/')) {
    const pathParts = pathname.split('/');
    if (pathParts.length > 2) {
      companyId = pathParts[2];
      console.log(`Middleware: Detectada empresa en ruta: ${companyId}`);
    }
  }
  
  // Si estamos en la ruta principal sin contexto de empresa
  // y no es una ruta pública como /login, /register, etc.
  if (
    !companyId && 
    mainDomains.includes(hostname) && 
    pathname === '/' && 
    !matchesRoute(pathname, publicRoutes)
  ) {
    // Redirigir a una página de selección de empresa o a la página principal
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // TODO: Para producción, implementar lógica de autenticación real aquí
  // Redirigir a login si no hay sesión válida en rutas protegidas
  
  // En otros casos, continuamos con la solicitud normalmente
  // El CompanyContext.tsx manejará la detección del ID de empresa
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