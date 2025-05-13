# Problema de Creación de Empresas en Canaletica

Este documento describe el problema actual con la creación de empresas y proporciona información para facilitar su resolución.

## Problema Identificado

**Síntoma principal**: No es posible crear nuevas empresas. Al intentarlo, aparece el error: "Ya existe una empresa con el ID 'default'".

**Causa raíz**: La función `normalizeCompanyId()` en `src/lib/utils/helpers.ts` está configurada para convertir cualquier ID de empresa a "default" durante la fase de desarrollo. Esto causa que al intentar crear empresas, se verifique si existe una con ID "default" (que ya existe) y devuelva error.

## Contexto Técnico

Este comportamiento fue diseñado intencionalmente durante la fase inicial de desarrollo para:

1. Consolidar todos los datos en una única colección "default"
2. Evitar la dispersión de datos entre múltiples colecciones generadas por URLs de Vercel
3. Facilitar el desarrollo y pruebas sin preocuparse por la separación multi-tenant

Sin embargo, esto ahora impide la creación de nuevas empresas con IDs distintos.

## Archivos Clave Involucrados

1. **`/src/lib/utils/helpers.ts`**:
   - Contiene la función `normalizeCompanyId()`
   - Actualmente convierte todos los IDs a "default"

2. **`/src/lib/services/companyService.ts`**:
   - Contiene la función `createCompany()`
   - Usa `normalizeCompanyId()` lo que causa el problema en la creación

3. **`/src/lib/contexts/CompanyContext.tsx`**:
   - Detecta y asigna la empresa actual
   - También usa `normalizeCompanyId()`

4. **`/scripts/README-MIGRACION.md`**:
   - Explica la razón detrás de la normalización de IDs
   - Menciona que esta configuración debe cambiarse para producción

## Soluciones Implementadas

Se han realizado las siguientes mejoras parciales:

1. Modificación de `createCompany()` para que use el ID proporcionado sin normalizar
2. Adición de una función `companyIdExists()` para verificar explícitamente si un ID ya existe
3. Mejoras en los formularios con notas explicativas sobre el comportamiento
4. Documentación actualizada con información sobre el sistema de normalización

## Herramientas de Diagnóstico

Se ha creado un script de diagnóstico que ayuda a entender cómo funciona la normalización:

```bash
node scripts/diagnose-company-ids.js [test-id]
```

Este script muestra cómo se normaliza un ID y verifica la existencia de empresas y configuraciones tanto con el ID original como con el normalizado.

## Opciones para Solución Definitiva

### Opción 1: Enfoque Híbrido (Implementada parcialmente)

Modificar sólo la función `createCompany()` para que use el ID sin normalizar, pero mantener el comportamiento de normalización para otras operaciones. Esta es una solución de compromiso que permite crear empresas con diferentes IDs mientras se mantiene la consolidación de datos.

### Opción 2: Normalización Selectiva

Modificar `normalizeCompanyId()` para que acepte un parámetro que controle si se debe normalizar o no, y ajustar todas las funciones que la usan.

```javascript
function normalizeCompanyId(companyId, forceNormalize = true) {
  // Lógica original para casos especiales
  if (!companyId || companyId.startsWith('canaletica-')) {
    return DEFAULT_COMPANY_ID;
  }
  
  // Solo normalizar si se indica explícitamente
  if (forceNormalize && companyId !== DEFAULT_COMPANY_ID) {
    return DEFAULT_COMPANY_ID;
  }
  
  return companyId;
}
```

### Opción 3: Migración Completa a Multi-tenant

Modificar `normalizeCompanyId()` para que devuelva el ID sin normalizar y crear scripts para migrar los datos existentes a las colecciones correspondientes.

## Consideraciones para Implementación

1. **Impacto en datos existentes**:
   - ¿Qué sucede con los datos que ya están en la colección "default"?
   - ¿Cómo se migrarán a las nuevas colecciones específicas de cada empresa?

2. **Experiencia de usuario**:
   - ¿Cómo se manejará la selección y cambio entre empresas?
   - ¿Qué información debe mostrarse al usuario sobre la empresa actual?

3. **Seguridad y separación de datos**:
   - ¿Cómo asegurar que los datos de una empresa no sean accesibles desde otra?
   - ¿Qué cambios se necesitan en las reglas de seguridad de Firestore?

4. **Fase de transición**:
   - ¿Debe implementarse la solución completa de una vez o gradualmente?
   - ¿Qué estrategia de migración minimizará las interrupciones?

## Pasos Recomendados

1. Verificar la solución parcial ya implementada
2. Decidir entre las opciones para la solución definitiva
3. Implementar migración de datos si es necesario
4. Actualizar documentación y comunicar los cambios al equipo