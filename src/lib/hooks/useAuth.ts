// src/lib/hooks/useAuth.ts
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UserRole } from '@/lib/utils/constants/index';

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/report', '/track'];

// Mapa de rutas por rol
const roleRoutes: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['/dashboard/admin', '/dashboard/settings', '/dashboard/users', '/dashboard'],
  [UserRole.INVESTIGATOR]: ['/dashboard/investigation', '/dashboard/reports', '/dashboard'],
  [UserRole.USER]: ['/dashboard/reports', '/dashboard']
};

/**
 * Hook para proteger rutas basado en la autenticación y roles
 * @param requiredRoles Roles que pueden acceder a la ruta actual
 * @returns void
 */
export function useAuthProtection(requiredRoles?: UserRole[]) {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';
  
  useEffect(() => {
    // Si todavía está cargando, no hacer nada
    if (loading) return;
    
    // Verificar si la ruta actual es pública
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    
    // Si es una ruta pública, no necesitamos verificar autenticación
    if (isPublicRoute) return;
    
    // Si no hay usuario autenticado y la ruta requiere autenticación, redirigir al login
    if (!currentUser) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    
    // Si requiere roles específicos y el usuario no tiene el rol adecuado
    if (requiredRoles && userRole && !requiredRoles.includes(userRole)) {
      // Redirigir a una página a la que el usuario tenga acceso según su rol
      const allowedRoutes = roleRoutes[userRole] || ['/dashboard'];
      router.push(allowedRoutes[0]);
    }
    
  }, [currentUser, loading, pathname, router, userRole, requiredRoles]);
}

export default useAuthProtection;