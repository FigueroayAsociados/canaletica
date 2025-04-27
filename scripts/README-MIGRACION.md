# Migración de Categorías y Subcategorías a la Colección Default

Este documento explica cómo resolver el problema de las múltiples colecciones de empresas creadas por Vercel y cómo consolidar todas las categorías y subcategorías en la colección principal `default`.

## Problema

Vercel genera diferentes entornos de despliegue con URLs únicas (como `canaletica-2w9zry4wf-ricardo-figueroas-projects-25a4cb4e.vercel.app`). 

La aplicación detecta estas URLs y las interpreta como empresas distintas, creando colecciones independientes para cada despliegue:
- `companies/default/...` (colección principal)
- `companies/canaletica-2w9zry4wf-ricardo-figueroas-projects-25a4cb4e/...` (generada por Vercel)
- `companies/canaletica-5vajn5xtc-ricardo-figueroas-projects-25a4cb4e/...` (generada por Vercel)

Esto causa que las categorías y subcategorías se dispersen en múltiples colecciones, haciendo que no aparezcan correctamente en el formulario de denuncias y en la configuración.

## Solución Implementada

1. **Normalización de IDs**: La función `normalizeCompanyId()` en `src/lib/utils/helpers.ts` ha sido actualizada para asegurar que todas las operaciones se realicen en la colección `default`.

2. **Script de Migración**: Se ha creado un script para migrar todas las categorías existentes a la colección `default`.

3. **Logs Detallados**: Se han añadido logs más detallados en las funciones `getCategories()` y `getSubcategories()` para facilitar la depuración.

## Cómo Ejecutar el Script de Migración

Para migrar todas las categorías y subcategorías existentes a la colección `default`, siga estos pasos:

1. **Obtenga las credenciales de Firebase Admin**:
   - Vaya a la consola de Firebase: https://console.firebase.google.com/
   - Seleccione su proyecto
   - Vaya a Configuración del proyecto > Cuentas de servicio
   - Genere una nueva clave privada
   - Guarde el archivo JSON como `scripts/serviceAccountKey.json`

2. **Ejecute el script de migración**:
   ```bash
   node scripts/migrate-categories.js
   ```

El script detectará automáticamente todas las colecciones con categorías y las migrará a la colección `default`.

## Verificación

Después de ejecutar el script, verifique que:

1. Las categorías aparecen correctamente en el panel de administración.
2. Las categorías aparecen correctamente en el formulario de denuncias.
3. Los logs en la consola del navegador muestran `getCategories: Encontradas X categorías en companies/default/categories` con valores mayores a cero.

## Notas Importantes

- La solución actual está configurada para consolidar todo en la colección `default` durante la fase de desarrollo.
- Cuando esté listo para implementar la aplicación en producción con soporte multi-tenant, deberá revisar la función `normalizeCompanyId()` para permitir IDs de empresa distintos.
- Los cambios son seguros y no afectan los datos existentes en otras colecciones. El script solo copia las categorías y subcategorías a la colección `default`.