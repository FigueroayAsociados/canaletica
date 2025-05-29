# Plan de Solución para Sistema de Testimonios en CanalEtica

Este documento detalla el plan para resolver los problemas fundamentales en el sistema de gestión de testimonios y entrevistas.

## Problema Identificado

El sistema mantiene dos estructuras de datos paralelas:
- `karinProcess.extendedInterviews`: Almacena las entrevistas
- `karinProcess.testimonies`: Almacena los testimonios formales

Esto causa inconsistencias cuando:
1. Se convierte una entrevista en testimonio
2. Se firma un testimonio
3. Se intenta mostrar el estado actual de testimonios (pendientes vs. firmados)

## Solución Integral

### 1. Modificar testimonyService.ts

#### Función convertInterviewToTestimony
- Asegurar que cuando se crea un testimonio a partir de una entrevista, la entrevista siempre reciba el campo `testimonyId`
- Implementar operación atómica para actualizar tanto el nuevo testimonio como la entrevista original

#### Función signTestimony
- Mejorar la búsqueda de testimonios para que:
  1. Primero busque por ID directo en `karinProcess.testimonies`
  2. Si no lo encuentra, busque entrevistas con campo `testimonyId` que coincida
  3. Como último recurso, busque la entrevista por su ID y cree un testimonio

### 2. Modificar InterviewList.tsx

#### Mejorar la gestión de estado
- Actualizar cómo se filtran y muestran los testimonios pendientes vs. firmados
- Asegurar que `handleSignTestimony` utilice el ID correcto y verifique previamente la existencia del testimonio

#### Actualización de UI
- Implementar actualizaciones de estado locales correctas después de firmar un testimonio
- Eliminar la necesidad de recargar la página completa

### 3. Modificar investigation/[id]/page.tsx

- Asegurar que los datos pasados a InterviewList incluyan toda la información necesaria
- Verificar la lógica de carga de datos después de actualizaciones

## Pasos de Implementación

1. Primero modificar testimonyService.ts (núcleo del problema)
2. Luego actualizar InterviewList.tsx
3. Finalmente revisar investigation/[id]/page.tsx si es necesario

## Pruebas Necesarias

Después de implementar los cambios, probar:
1. Creación de entrevistas
2. Conversión de entrevistas a testimonios
3. Firma de testimonios
4. Visualización correcta en las pestañas correspondientes

## Notas Adicionales

- No se deben utilizar recargas de página como solución
- Todas las referencias entre entrevistas y testimonios deben mantenerse consistentes
- Las operaciones críticas deben ser atómicas (updateDoc en batch cuando sea posible)