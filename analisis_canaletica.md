# Análisis de CanalEtica: Errores, Mejoras y Propuestas

## 1. Inteligencia Artificial

La implementación actual de IA en CanalEtica existe pero no está activada en producción. El código está diseñado correctamente pero parece estar en estado de desarrollo.

### Estado actual

- Servicios de IA (`aiService.ts`) implementados pero no conectados a modelos reales de IA
- Hooks preparados para consumir los servicios (`useAI.ts`)
- La implementación actual es una simulación (mock) con respuestas predefinidas

### Propuesta de acción

- **Fase 1**: Crear una rama específica `feature/ai-implementation` para el desarrollo de IA
- **Fase 2**: Integrar con OpenAI u otro servicio externo real
- **Fase 3**: Probar exhaustivamente antes de activar en producción
- **Fase 4**: Implementar con feature flags para activar por empresa

## 2. Multi-tenant y Permisos de Administradores

Existe un error crítico relacionado con los permisos de administradores. Un administrador de una empresa específica puede acceder a datos de otras empresas cuando no ingresa por su subdominio.

### Problemas identificados

1. **Detección inconsistente de empresa**: 
   - El sistema detecta la empresa principalmente por el subdominio
   - Cuando un administrador accede por una URL diferente, el sistema puede fallar en restringir adecuadamente su acceso

2. **Verificación insuficiente de permisos**:
   - La función `hasCompanyAccess()` parece no verificar correctamente los permisos en todas las rutas de acceso
   - Algunos controles de seguridad están comentados en código

### Propuesta de solución

```typescript
// 1. Actualizar la función hasCompanyAccess en src/lib/utils/accessControl.ts
export function hasCompanyAccess(user: UserProfile | null, companyId: string): boolean {
  // Si no hay usuario, no tiene acceso
  if (!user) return false;
  
  // Super admins siempre tienen acceso a todas las empresas
  if (isSuperAdmin(user.role)) return true;
  
  // Admins e investigadores solo tienen acceso a su empresa asignada
  if (user.companyId && user.companyId !== companyId) {
    logger.warn(`Usuario ${user.id} intentó acceder a empresa ${companyId} pero está asignado a ${user.companyId}`);
    return false;
  }
  
  return true;
}

// 2. Implementar middleware de seguridad en src/middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Solo aplicar a rutas del dashboard
  if (pathname.startsWith('/dashboard')) {
    const companyId = getCompanyIdFromRequest(request);
    const session = getServerSession();
    
    if (!session || !hasCompanyAccess(session.user, companyId)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}
```

## 3. Formulario de Denuncias (Paso 1)

Hemos identificado inconsistencias en las opciones que se muestran en el campo "¿Cuál es su relación con la empresa?" en el primer paso del formulario de denuncias.

### Estado actual

- Las opciones se cargan dinámicamente desde Firestore para cada empresa
- Existe un fallback de opciones predeterminadas cuando no se encuentran en la base de datos:
```
Empleado, Proveedor, Cliente, Contratista, Otro
```
- Algunos subdominios muestran opciones incorrectas: "Jefe Directo, subordinado, colega"

### Causa del problema

El problema ocurre porque algunas empresas tienen opciones personalizadas configuradas incorrectamente en la base de datos.

### Propuesta de solución

1. **Corrección inmediata**: Normalizar las opciones para todas las empresas
```typescript
// Función para corregir las opciones en todas las empresas
async function normalizeRelationshipOptions() {
  const companies = await getCompanies();
  const defaultOptions = [
    { id: '1', name: 'Empleado', value: 'empleado', isActive: true, order: 0 },
    { id: '2', name: 'Proveedor', value: 'proveedor', isActive: true, order: 1 },
    { id: '3', name: 'Cliente', value: 'cliente', isActive: true, order: 2 },
    { id: '4', name: 'Contratista', value: 'contratista', isActive: true, order: 3 },
    { id: '5', name: 'Otro', value: 'otro', isActive: true, order: 4 }
  ];
  
  for (const company of companies) {
    await setFormOptions(company.id, 'relationships', defaultOptions);
  }
}
```

2. **Prevención futura**: Agregar validación en el Panel de Admin
```typescript
// En el componente de edición de opciones de formulario
function validateOptions(options: FormOptionValue[]) {
  const requiredValues = ['empleado', 'proveedor', 'cliente', 'contratista', 'otro'];
  const missingValues = requiredValues.filter(
    req => !options.some(opt => opt.value === req)
  );
  
  if (missingValues.length > 0) {
    return {
      valid: false,
      error: `Faltan las siguientes opciones requeridas: ${missingValues.join(', ')}`
    };
  }
  
  return { valid: true };
}
```

## 4. Correo Electrónico de Soporte

El correo de soporte actual es `soporte@canaletica.com`, pero debería ser `soporte@canaletica.cl` según lo requerido.

### Ubicaciones encontradas

- `src/app/page.tsx` (línea 315): El footer de la página principal contiene el correo incorrecto

### Propuesta de solución

Actualizar todas las instancias del dominio de correo:

```typescript
// En src/app/page.tsx, línea 314-316
<a href="mailto:soporte@canaletica.cl" className="block text-primary-light hover:text-white transition-colors mt-1">
  soporte@canaletica.cl
</a>
```

Además, sería conveniente centralizar esta información en un archivo de configuración:

```typescript
// src/lib/utils/constants.ts
export const SUPPORT_EMAIL = 'soporte@canaletica.cl';

// Luego usado en los componentes
<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
```

## 5. Sistema de Reportes y Estadísticas

El sistema actual podría beneficiarse de mejoras en reportes y estadísticas para obtener datos fidedignos y completos.

### Mejoras propuestas

1. **Panel de estadísticas mejorado**:
   - Filtros más granulares (período, categoría, estado)
   - Exportación a Excel/CSV
   - Gráficos interactivos

2. **Reportes personalizables**:
   - Permitir a administradores crear reportes personalizados
   - Programar generación automática de reportes periódicos
   - Envío por correo de reportes a destinatarios configurables

3. **Integración de datos**:
   - Asegurar que todos los datos estén correctamente vinculados por companyId
   - Implementar validaciones para garantizar la integridad de los datos
   - Crear una API interna para consulta consistente de datos

### Ejemplo de implementación de reportes personalizados

```typescript
// Modelo de reporte personalizado
interface CustomReport {
  id: string;
  name: string;
  companyId: string;
  filters: {
    dateRange?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
    customStartDate?: Date;
    customEndDate?: Date;
    categories?: string[];
    status?: string[];
    investigators?: string[];
  };
  columns: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 para weekly
    dayOfMonth?: number; // 1-31 para monthly
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
  };
}
```

## 6. Conclusiones y Plan de Acción

### Prioridades para resolución inmediata

1. **CRÍTICO**: Corregir el problema de permisos multi-tenant para administradores
2. **ALTA**: Normalizar las opciones de "relación con la empresa" en todas las compañías
3. **MEDIA**: Actualizar el correo de soporte a `soporte@canaletica.cl`

### Plan de desarrollo a medio plazo

1. **Mejora de reportes y estadísticas** (2-3 semanas)
   - Implementar filtros avanzados
   - Crear exportación de datos
   - Mejorar visualizaciones

2. **Implementación gradual de IA** (4-6 semanas)
   - Desarrollar en rama separada
   - Integrar con proveedores reales de IA
   - Pruebas exhaustivas antes de despliegue

3. **Mejoras generales de UX** (2-3 semanas)
   - Mensajes de error más descriptivos
   - Validaciones mejoradas
   - Optimización de rendimiento

### Metodología de desarrollo propuesta

Para todas las mejoras e implementaciones se recomienda:

1. Desarrollar en ramas de feature separadas
2. Pruebas unitarias y e2e para cada cambio
3. Revisión de código antes de la fusión
4. Despliegue primero en ambiente de pruebas
5. Validación con usuarios reales
6. Documentación de cambios

Este enfoque minimizará los riesgos y asegurará una implementación gradual y controlada de las mejoras.