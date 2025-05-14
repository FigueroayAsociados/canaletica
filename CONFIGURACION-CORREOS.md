# Configuración del Sistema de Notificaciones por Correo Electrónico

Esta guía explica cómo configurar el sistema de notificaciones por correo electrónico en CanalEtica para que funcione correctamente con la arquitectura multi-tenant.

## Estado Actual del Sistema

El sistema de notificaciones por correo electrónico está **completamente implementado**, pero actualmente **deshabilitado** debido a la falta de configuración de las credenciales SMTP en Firebase Functions.

## Pasos para Habilitar las Notificaciones por Correo

### 1. Configurar Credenciales SMTP en Firebase Functions

Las credenciales SMTP están configuradas mediante variables de entorno en Firebase Functions:

```bash
# Desde la terminal, ejecuta:
firebase functions:config:set email.user="tu_correo@ejemplo.com" email.password="tu_contraseña"
```

Si estás usando Gmail, es recomendable crear una "Contraseña de aplicación" en lugar de usar tu contraseña principal para mayor seguridad:
1. Ve a tu cuenta de Google > Seguridad
2. Activa verificación en dos pasos si aún no está activa
3. Ve a "Contraseñas de aplicación"
4. Crea una nueva contraseña para "CanalEtica"
5. Usa esta contraseña en el comando anterior

### 2. Redeployar las Firebase Functions

Después de configurar las variables, es necesario redesplegar las funciones para que los cambios surtan efecto:

```bash
firebase deploy --only functions
```

### 3. Verificar la Configuración

Para verificar que las variables se configuraron correctamente:

```bash
firebase functions:config:get
```

Deberías ver algo como:
```json
{
  "email": {
    "user": "tu_correo@ejemplo.com",
    "password": "[HIDDEN]"
  }
}
```

### 4. Activar Notificaciones a Nivel de Empresa

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

## Configuración por Empresa

En la estructura multi-tenant, cada empresa puede tener sus propias configuraciones de notificación:

1. **Configuración global**:
   ```javascript
   emailNotifications: true,  // Activar/desactivar todas las notificaciones
   ```

2. **Configuración específica**:
   ```javascript
   notifications: {
     notifyNewReport: true,    // Nuevas denuncias
     notifyStatusChange: true, // Cambios de estado
     notifyNewComment: true,   // Nuevos comentarios
     notifyDueDate: true       // Plazos por vencer
   }
   ```

## Solución de Problemas

Si los correos no se envían correctamente, verifica:

1. **Logs de Firebase**:
   - Revisa los logs en la consola de Firebase (Functions > Logs)
   - Busca errores relacionados con el envío de correos

2. **Configuración SMTP**:
   - Verifica que las credenciales sean correctas
   - Si usas Gmail, asegúrate de que la "Contraseña de aplicación" sea válida

3. **Permisos de Firebase**:
   - Verifica que la cuenta de servicio tenga permisos para acceder a Firestore
   - Verifica que el plan de Firebase incluya el uso de Functions

4. **Notificaciones en Firestore**:
   - Revisa la colección `companies/{companyId}/notifications`
   - Los documentos con status "failed" indican problemas al enviar