# Configuración de Políticas de Seguridad de Contenido (CSP)

Este documento describe la configuración de las Políticas de Seguridad de Contenido (CSP) implementadas en la aplicación CanalEtica para cumplir con los requisitos de la ISO 37002:2021.

## Directivas CSP Implementadas

Las directivas de Content Security Policy (CSP) están configuradas en `next.config.js` y proporcionan múltiples capas de protección contra ataques XSS y otras vulnerabilidades de seguridad.

### Directivas Principales

- **default-src 'self'**: Restringe por defecto todos los recursos para que se carguen únicamente desde el mismo origen.
- **script-src**: Controla los orígenes válidos para JavaScript.
- **style-src**: Controla los orígenes válidos para hojas de estilo CSS.
- **img-src**: Controla los orígenes válidos para imágenes.
- **connect-src**: Restringe los destinos para conexiones mediante fetch, XHR, WebSocket.
- **frame-src**: Controla los orígenes que pueden ser cargados como iframes.
- **object-src 'none'**: Bloquea todos los plugins (Flash, Java, etc).
- **trusted-types 'none'**: Configura Trusted Types para prevenir ataques DOM-based XSS.

## Trusted Types

Se ha implementado soporte para Trusted Types, una característica avanzada de seguridad que ayuda a prevenir ataques XSS basados en DOM. La configuración incluye:

1. **Directiva CSP**: Se ha añadido `trusted-types 'none'` a la política CSP para desactivar temporalmente la validación estricta mientras se implementa correctamente.

2. **Políticas de Trusted Types**: En el archivo `/public/trusted-types-policy.js` se han definido políticas para:
   - **next-js-policy**: Seguridad para Next.js
   - **firebase-policy**: Seguridad para Firebase
   - **default**: Política por defecto como fallback

3. **Integración en Layout**: Se ha agregado el script de políticas en el layout principal para cargarlo antes que cualquier otro código.

## Implementación ISO 37002:2021

Esta configuración cumple con los requisitos de seguridad de la ISO 37002:2021 para sistemas de gestión de denuncias, proporcionando:

- **Protección contra XSS**: Múltiples capas de defensa contra ataques de Cross-Site Scripting.
- **Integridad de datos**: Asegura que solo se carguen recursos de fuentes confiables.
- **Confidencialidad**: Previene la filtración de información a dominios no autorizados.
- **Control de acceso**: Limita los recursos que pueden ser cargados por la aplicación.

## Solución a Problemas con `require-trusted-types-for`

La aplicación estaba experimentando problemas con la directiva `require-trusted-types-for` implícita en algunos navegadores. Se ha implementado la siguiente solución:

1. Agregar explícitamente `trusted-types 'none'` a la política CSP para desactivar temporalmente la validación estricta.
2. Implementar políticas de Trusted Types para permitir operaciones específicas y controladas.
3. Cargar estas políticas antes que cualquier otro código mediante el componente `Script` de Next.js con estrategia `beforeInteractive`.

## Mantenimiento y Actualizaciones

La configuración de CSP debe ser revisada periódicamente para:
- Asegurar compatibilidad con nuevas bibliotecas y funcionalidades
- Actualizar las políticas según evolucionen las amenazas de seguridad
- Verificar el cumplimiento continuo con ISO 37002:2021 y otras normativas

## Referencias

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Trusted Types](https://web.dev/trusted-types/)
- [ISO 37002:2021 - Sistemas de gestión de denuncias](https://www.iso.org/standard/65035.html)