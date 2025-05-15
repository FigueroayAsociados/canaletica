# Guía de Uso de canaletic.app con Subdominios

Esta guía explica cómo utilizar el nuevo dominio `canaletic.app` con la arquitectura multi-tenant para permitir que cada empresa tenga su propio espacio.

## Formas de Acceso para Empresas

Cada empresa puede acceder a su espacio en CanalEtica de tres formas diferentes:

### 1. Usando Subdominios (Recomendado)

Cada empresa tiene su propio subdominio:

```
https://[nombre-empresa].canaletic.app
```

**Ejemplos:**
- https://demo.canaletic.app
- https://acme.canaletic.app
- https://empresa1.canaletic.app

Este método es el más profesional y fácil de usar para los clientes. Les permite tener un enlace único y personalizado.

### 2. Usando Parámetro en URL

Si un cliente prefiere no usar subdominios, puede acceder mediante un parámetro en la URL:

```
https://canaletic.app/?company=[nombre-empresa]
```

**Ejemplos:**
- https://canaletic.app/?company=demo
- https://canaletic.app/?company=acme

### 3. Usando Ruta Específica

También se puede acceder mediante una ruta específica:

```
https://canaletic.app/empresa/[nombre-empresa]/dashboard
```

**Ejemplos:**
- https://canaletic.app/empresa/demo/dashboard
- https://canaletic.app/empresa/acme/dashboard

## Formulario de Denuncias para Clientes

Para proporcionar a sus clientes un enlace directo al formulario de denuncias, use:

```
https://[nombre-empresa].canaletic.app/report
```

**Ejemplos:**
- https://demo.canaletic.app/report
- https://acme.canaletic.app/report

Este enlace puede ser integrado en el sitio web del cliente, en sus comunicaciones internas o en su intranet.

## Seguimiento de Denuncias

El enlace para seguimiento de denuncias es:

```
https://[nombre-empresa].canaletic.app/track
```

**Ejemplos:**
- https://demo.canaletic.app/track
- https://acme.canaletic.app/track

## Panel de Administración

El panel de administración para cada empresa es:

```
https://[nombre-empresa].canaletic.app/dashboard
```

**Ejemplos:**
- https://demo.canaletic.app/dashboard
- https://acme.canaletic.app/dashboard

## Consideraciones para Vender el Servicio

Al ofrecer el servicio a clientes, considerar estas opciones:

1. **Nivel Básico**: Acceso mediante parámetro de URL o ruta específica
   - Más económico
   - Funcionalidad completa
   - Menos personalización

2. **Nivel Premium**: Subdominio personalizado
   - Más profesional y fácil de recordar
   - URL corporativa personalizada
   - Mejor experiencia de usuario

3. **Nivel Corporativo**: Dominio completamente personalizado
   - El cliente usa su propio dominio (ej: denuncias.empresa-cliente.com)
   - Requiere configuración DNS adicional por parte del cliente
   - Máxima personalización y branding

## Creación de Nuevas Empresas

Para crear nuevas empresas con este sistema:

1. Accede al panel de super administrador: https://canaletic.app/super-admin
2. Utiliza la sección de "Gestión de Empresas"
3. Crea una nueva empresa con un ID único (este será el subdominio)
4. La empresa estará inmediatamente disponible en su subdominio

## Soporte para Dominios Personalizados

Si un cliente desea usar su propio dominio (ej: denuncias.empresa-cliente.com):

1. El cliente debe configurar un registro CNAME en su DNS para apuntar a `cname.vercel-dns.com`
2. Añade el dominio personalizado en la configuración de la empresa
3. Agrega el mapeo en el archivo `CompanyContext.tsx` para conectar el dominio personalizado con el ID de empresa