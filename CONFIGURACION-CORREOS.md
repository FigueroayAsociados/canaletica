# Configuración del Sistema de Notificaciones por Correo Electrónico

Esta guía explica cómo configurar el sistema de notificaciones por correo electrónico en CanalEtica para que funcione correctamente con la arquitectura multi-tenant.

## Estado Actual del Sistema (actualizado)

El sistema de notificaciones por correo electrónico está **completamente implementado** y **configurado para funcionar correctamente** con las siguientes características:

- Content Security Policy (CSP) actualizada para permitir conexiones a Firebase Functions
- Manejo mejorado de errores en caso de problemas de conectividad
- Opciones de configuración por empresa

## 🚨 Requisitos Previos 🚨

Antes de utilizar el sistema de notificaciones por correo, es necesario configurar:

1. **Credenciales SMTP en Firebase Functions** (siguiente sección)
2. **Política de Seguridad de Contenido (CSP)** para permitir conexiones a Firebase Functions
   - Ya está configurada en este repositorio, en el archivo `next.config.js`
   - Si tienes problemas de CSP, revisa que tengas la última versión de este archivo

## Pasos para Habilitar las Notificaciones por Correo

### 1. Configurar Credenciales SMTP en Firebase Functions

Las credenciales SMTP están configuradas mediante "secrets" en Firebase Functions:

```bash
# Desde la terminal, ejecuta:
firebase functions:secrets:set EMAIL_PASSWORD
# Cuando se te solicite, ingresa la contraseña

# Luego configura el usuario de correo (visible, no es secreto):
firebase functions:config:set email.user="tu_correo@ejemplo.com"
```

> **⚠️ IMPORTANTE:** Para usar Gmail recomendamos seguir estos pasos:
> 
> 1. Usa una cuenta dedicada solo para envíos automáticos, no tu cuenta personal
> 2. En tu cuenta de Google > Seguridad:
>    - Activa verificación en dos pasos
>    - Ve a "Contraseñas de aplicación"
>    - Crea una nueva contraseña para "CanalEtica"
>    - Usa esta contraseña en el comando anterior
> 3. Acepta recibir "emails menos seguros" si es necesario
> 4. Verifica que el correo no esté bloqueado por límites de envío de Gmail

### 2. Redeployar las Firebase Functions

Después de configurar las variables, es necesario redesplegar las funciones para que los cambios surtan efecto:

```bash
firebase deploy --only functions
```

### 3. Verificar la Configuración

Para verificar que la configuración se estableció correctamente:

```bash
# Ver la configuración de variables (no muestra los secrets)
firebase functions:config:get

# Ver los secrets configurados (pero no sus valores)
firebase functions:secrets:list
```

### 4. Prueba de Envío de Correo

Para verificar que el sistema funciona correctamente:

1. Crea una nueva denuncia en el sistema usando un correo real
2. Verifica si recibes la notificación en tu correo electrónico
3. Si no recibes el correo, revisa los logs de Firebase Functions para identificar el problema

### 5. Activar Notificaciones a Nivel de Empresa

En el panel de administración, cada empresa puede configurar qué tipos de notificaciones desea recibir:

1. Accede a tu empresa en `https://[empresa].canaletic.app/dashboard/settings`
2. Ve a la sección "Configuración" > "Notificaciones"
3. Activa las siguientes opciones:
   - Notificaciones por email (global)
   - Notificar nuevas denuncias
   - Notificar cambios de estado
   - Notificar nuevos comentarios
   - Notificar plazos próximos a vencer

## Tipos de Notificaciones Implementadas

El sistema enviará correos electrónicos en los siguientes casos:

1. **Creación de Denuncias**:
   - Al denunciante (si proporciona correo)
   - A los administradores de la empresa

2. **Asignación de Investigador**:
   - Al investigador asignado

3. **Recomendaciones**:
   - Alertas de vencimiento próximo (3 días y 1 día antes)
   - Alertas de vencimiento (1, 3, 7 y 14 días después)
   - A los responsables y administradores

4. **Cierre de Denuncias**:
   - Al denunciante

## Personalización de Plantillas

Los correos utilizan una plantilla HTML básica con el estilo corporativo. Para personalizar las plantillas de correo:

1. **Personalización básica**:
   - El sistema usa automáticamente el nombre y colores de la empresa

2. **Personalización avanzada**:
   - Para una personalización más avanzada, es necesario modificar la función `sendEmail` en `functions/src/index.ts`
   - Busca las secciones donde se define el HTML del correo (líneas 112-129)
   - Personaliza el HTML según tus necesidades, manteniendo las variables dinámicas

## Solución de Problemas Comunes

### Error de Content Security Policy (CSP)

Si ves un error como este en la consola del navegador:
```
Refused to connect to https://us-central1-canaletica-e0f81.cloudfunctions.net/sendEmail because it does not appear in the connect-src directive of the Content Security Policy.
```

**Solución**: La política CSP debe incluir los dominios de Firebase Functions en la directiva `connect-src`. Verifica que el archivo `next.config.js` tenga una configuración similar a esta:

```javascript
connect-src 'self' ... https://*.cloudfunctions.net https://us-central1-canaletica-e0f81.cloudfunctions.net;
```

### Credenciales SMTP incorrectas

Si los correos no se envían debido a credenciales incorrectas:

1. Revisa los logs de Firebase Functions:
   ```bash
   firebase functions:log
   ```

2. Busca mensajes de error relacionados con autenticación SMTP:
   ```
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
   ```

3. Configura nuevamente las credenciales:
   ```bash
   firebase functions:secrets:set EMAIL_PASSWORD
   ```

### Límites de Gmail

Si usas Gmail como servidor SMTP, es posible que te encuentres con límites de envío:

- Gmail limita el número de correos que puedes enviar a 500 por día
- Si superas este límite, considera usar un servicio de email marketing como SendGrid o Mailchimp

### Problemas de conexión a Firebase Functions

Si los correos se crean en Firestore pero no se envían:

1. Verifica que Firebase Functions esté correctamente desplegado:
   ```bash
   firebase functions:list
   ```

2. Asegúrate de que el plan de Firebase permite el uso de Functions
   - El plan Spark (gratuito) tiene limitaciones
   - Considera actualizar a Blaze (pago por uso) para entornos de producción

## Monitoreo y Mantenimiento

Para un monitoreo efectivo del sistema de correo:

1. **Revisión periódica de los logs**:
   ```bash
   firebase functions:log --only sendEmail
   ```

2. **Verificación de notificaciones en Firestore**:
   - Revisa la colección `companies/{companyId}/notifications`
   - Los documentos con status "failed" indican problemas al enviar

3. **Pruebas periódicas**:
   - Crea denuncias de prueba cada cierto tiempo para verificar que el sistema sigue funcionando

## Referencias Técnicas

- **Implementación principal**: `functions/src/index.ts` (función `sendEmail`)
- **Servicio de notificaciones**: `src/lib/services/notificationService.ts`
- **Configuración de seguridad**: `next.config.js` (Content Security Policy)
- **Adaptador de funciones**: `src/lib/firebase/functions.ts` (función `safeCallFunction`)