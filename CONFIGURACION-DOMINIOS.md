# Configuración de Dominios y Subdominios para CanalEtica

Esta guía te ayudará a configurar tu dominio principal y subdominios para clientes en CanalEtica.

## 1. Configurar el Dominio Principal en Vercel

### Pasos para configurar canaletica.cl en Vercel:

1. **Accede al Panel de Vercel**:
   - Ve a https://vercel.com/dashboard
   - Selecciona tu proyecto de CanalEtica

2. **Configura el Dominio**:
   - Ve a "Settings" > "Domains"
   - Haz clic en "Add"
   - Ingresa tu dominio: `canaletica.cl`
   - Sigue las instrucciones para verificar la propiedad del dominio

3. **Configura los Registros DNS**:
   - Vercel te proporcionará una lista de registros DNS que debes configurar en tu proveedor de dominio
   - Típicamente, necesitarás configurar un registro A o CNAME que apunte a los servidores de Vercel
   - También necesitarás agregar registros para verificar la propiedad del dominio

4. **Espera a la Propagación DNS**:
   - Los cambios en DNS pueden tardar hasta 48 horas en propagarse completamente
   - Vercel mostrará el estado de verificación en tiempo real

### Ejemplo de Registros DNS para canaletica.cl:

```
Tipo    Nombre    Valor                            TTL
A       @         76.76.21.21                     300
CNAME   www       cname.vercel-dns.com.           300
```

## 2. Configurar Subdominios para Empresas

### Método 1: Subdominio Comodín (Wildcard)

Para permitir subdominios ilimitados como `empresa1.canaletica.cl`, `empresa2.canaletica.cl`, etc.:

1. **Configura un registro DNS comodín**:
   ```
   Tipo    Nombre    Valor                   TTL
   CNAME   *         cname.vercel-dns.com.  300
   ```

2. **Agrega el dominio comodín en Vercel**:
   - Ve a "Settings" > "Domains"
   - Agrega `*.canaletica.cl`
   - Confirma la configuración

3. **Verifica que el sistema detecte el subdominio**:
   - El componente `CompanyContext.tsx` ya está configurado para detectar subdominios
   - Asegúrate de que la función `normalizeCompanyId()` no modifique estos IDs

### Método 2: Subdominios Específicos

Si prefieres configurar cada subdominio individualmente:

1. **Para cada empresa, configura un registro DNS**:
   ```
   Tipo    Nombre         Valor                   TTL
   CNAME   empresa1       cname.vercel-dns.com.  300
   CNAME   empresa2       cname.vercel-dns.com.  300
   ```

2. **Agrega cada subdominio en Vercel**:
   - Ve a "Settings" > "Domains"
   - Agrega cada subdominio (ej. `empresa1.canaletica.cl`)
   - Confirma la configuración

## 3. Configurar Dominios Personalizados para Clientes Premium

Para clientes que deseen usar su propio dominio (ej. `denuncias.empresa.com`):

1. **El cliente debe configurar un registro CNAME en su DNS**:
   ```
   Tipo    Nombre         Valor                   TTL
   CNAME   denuncias      cname.vercel-dns.com.  300
   ```

2. **Agrega el dominio personalizado en Vercel**:
   - Ve a "Settings" > "Domains"
   - Agrega el dominio personalizado (ej. `denuncias.empresa.com`)
   - Sigue las instrucciones para la verificación

3. **Actualiza la detección de empresa**:
   - Asegúrate de que el código detecte correctamente estos dominios personalizados
   - Crea un mapeo de dominio-a-empresa en la configuración de la aplicación

## 4. Implementación de Redirección Inteligente

Para redirigir a los usuarios al subdominio correcto:

```javascript
// Código para middleware.js o en el componente raíz
export function middleware(req) {
  const hostname = req.headers.get('host');
  
  // Si es la página principal sin subdominio
  if (hostname === 'canaletica.cl' || hostname === 'www.canaletica.cl') {
    // Redirigir a página de selección de empresa o página principal
    return NextResponse.rewrite(new URL('/seleccionar-empresa', req.url));
  }
  
  // Si tiene subdominio
  const subdomain = hostname.split('.')[0];
  if (subdomain !== 'www' && subdomain !== 'canaletica') {
    // Establecer el contexto de empresa basado en el subdominio
    // Esto ya lo hace CompanyContext.tsx
  }
  
  return NextResponse.next();
}
```

## 5. Consejos para la Configuración

1. **Certificados SSL**:
   - Vercel proporciona certificados SSL automáticamente para todos los dominios
   - No necesitas configuración adicional para HTTPS

2. **Prueba de Subdominios en Desarrollo**:
   - Para probar subdominios localmente, puedes usar:
     - `empresa1.localhost:3000` (Chrome y Edge)
     - O agregar entradas en tu archivo hosts

3. **Monitoreo**:
   - Verifica regularmente el estado de tus dominios en el panel de Vercel
   - Configura alertas para problemas de certificados o DNS

## Recursos Adicionales

- [Documentación de Vercel sobre dominios](https://vercel.com/docs/concepts/projects/domains)
- [Configuración de DNS para varios proveedores](https://vercel.com/docs/concepts/projects/domains/dns-providers)
- [Solución de problemas de dominios en Vercel](https://vercel.com/docs/concepts/projects/domains/troubleshooting)