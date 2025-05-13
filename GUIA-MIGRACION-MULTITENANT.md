# Guía para Migración a Arquitectura Multi-tenant

Este documento explica los pasos para implementar correctamente el soporte multi-tenant en CanalEtica, permitiendo tener múltiples empresas con datos separados.

## Resumen de la Solución

Hemos implementado una solución que permite:
1. Crear y gestionar múltiples empresas con IDs distintos
2. Separar completamente los datos entre empresas
3. Mantener la compatibilidad con la empresa "default" existente

## Pasos para Implementar

Sigue estos pasos en orden para completar la migración:

### 1. Crear una copia de seguridad (opcional pero recomendado)

Si tienes datos importantes en la aplicación, crea una copia de seguridad usando Firebase:

1. Ve a la Consola de Firebase
2. Selecciona tu proyecto
3. Ve a Firestore > Exportar e importar
4. Sigue las instrucciones para exportar tus datos

### 2. Limpiar la base de datos

Si quieres empezar desde cero (recomendado para un ambiente limpio):

```bash
# Primero prepara las credenciales de servicio
# 1. Ve a la Consola de Firebase > Configuración del proyecto > Cuentas de servicio
# 2. Genera una nueva clave privada
# 3. Guarda el archivo JSON como "scripts/serviceAccountKey.json"

# Ejecuta el script de limpieza
node scripts/clean-database.js
```

> ⚠️ **ADVERTENCIA**: Este script elimina TODOS los datos de empresas y denuncias.

### 3. Actualizar la función de normalización (ya implementado)

Hemos modificado la función `normalizeCompanyId()` en `src/lib/utils/helpers.ts` para que:
- Devuelva el ID original de la empresa (habilitando multi-tenant real)
- Solo normalice a "default" los IDs generados automáticamente por Vercel o IDs no válidos

### 4. Crear empresas de demostración

Para verificar que todo funciona correctamente:

```bash
# Ejecuta el script para crear empresas de demostración
node scripts/setup-demo-company.js
```

Esto creará dos empresas con datos de ejemplo:
- "demo" (Empresa Demostración)
- "acme" (ACME Corporation)

### 5. Verificar el funcionamiento

1. Despliega los cambios a Vercel:
```bash
git add .
git commit -m "Implementar arquitectura multi-tenant"
git push
```

2. Accede a las empresas de demostración de las siguientes formas:
   - URL con parámetro: `https://tu-dominio.com/?company=demo`
   - Ruta específica: `https://tu-dominio.com/empresa/demo/dashboard`
   - A través del panel de super administrador

## Cómo funciona

### Cambios principales

1. **Función normalizeCompanyId**:
   - Ahora devuelve el ID original (habilitando multi-tenant real)
   - Solo normaliza IDs no válidos o generados por Vercel

2. **Estructura de datos**:
   - Cada empresa tiene sus propias colecciones en Firestore
   - La estructura es `companies/{companyId}/...`
   - Incluye configuraciones, categorías, usuarios, denuncias, etc.

3. **Detección de empresa**:
   - La aplicación detecta la empresa desde la URL, parámetros o subdominio
   - No se fuerza la normalización a "default"
   - Cada usuario ve solo los datos de su empresa

## Consideraciones futuras

1. **Subdominio por empresa**:
   Para habilitar acceso por subdominio (ej: `empresa1.canaletica.com`):
   - Configura DNS para apuntar subdominios a tu aplicación en Vercel
   - Verifica que la detección de subdominio funcione correctamente

2. **Seguridad**:
   - Revisa las reglas de seguridad de Firestore para asegurar separación entre empresas
   - Asegúrate de que los usuarios solo puedan acceder a los datos de su empresa

3. **Escalabilidad**:
   - Monitorea el rendimiento con múltiples empresas
   - Considera implementar caché por empresa para consultas frecuentes

## Solución de problemas

Si encuentras problemas después de la migración:

1. **Empresa no detectada correctamente**:
   - Verifica que la URL o parámetro de empresa sea correcto
   - Revisa los logs para ver qué ID se está detectando
   - Confirma que la empresa existe en Firestore

2. **Datos no aparecen**:
   - Verifica que los datos estén en la colección correcta (`companies/{companyId}/...`)
   - Comprueba los permisos del usuario para esa empresa

3. **Revertir los cambios**:
   Si necesitas volver a la versión anterior temporalmente:
   - Restaura la función `normalizeCompanyId()` original
   - Despliega los cambios

## Conclusión

Con estos cambios, CanalEtica ahora tiene una verdadera arquitectura multi-tenant donde:
- Cada empresa tiene sus propios datos separados
- Se pueden crear y gestionar múltiples empresas
- La interfaz muestra claramente en qué empresa se está trabajando

Esto proporciona una base sólida para continuar el desarrollo, vender a múltiples clientes y escalar la plataforma.