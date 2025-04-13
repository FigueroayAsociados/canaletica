# CanalEtica - Sistema de Gestión de Denuncias Éticas

CanalEtica es una aplicación web desarrollada con Next.js para la gestión de denuncias éticas dentro de organizaciones. Permite a los usuarios realizar denuncias de forma anónima o identificada, y a los administradores e investigadores gestionarlas de manera eficiente y segura.

## Características Principales

- **Autenticación segura**: Sistema completo de autenticación con Firebase
- **Multi-tenant**: Soporte para múltiples organizaciones en la misma plataforma
- **Denuncias anónimas**: Permite realizar denuncias sin identificarse
- **Panel de administración**: Gestión completa de denuncias, usuarios y configuraciones
- **Módulo de investigación**: Herramientas para investigadores y seguimiento de casos
- **Comunicación segura**: Canal de comunicación anónimo entre denunciantes y gestores
- **Informes y estadísticas**: Reportes detallados y análisis de datos

## Requisitos Previos

- Node.js (versión 16 o superior)
- npm o yarn
- Cuenta en Firebase
- Entorno de desarrollo para Next.js
- [Opcional] Docker para despliegue

## Configuración

1. Clona el repositorio:

```bash
git clone https://github.com/tuusuario/canaletica.git
cd canaletica
```

2. Instala las dependencias:

```bash
npm install
```

3. Copia el archivo `.env.example` a `.env.local` y configura las variables de entorno:

```bash
cp .env.example .env.local
```

4. Configura las variables de entorno con tus credenciales de Firebase y otras configuraciones.

5. Inicia el servidor de desarrollo:

```bash
npm run dev
```

## Estructura del Proyecto

```
canaletica/
├── functions/           # Funciones de Firebase (backend serverless)
├── public/              # Archivos estáticos
├── src/
│   ├── app/             # Rutas de la aplicación (Next.js App Router)
│   │   ├── (auth)/      # Rutas de autenticación
│   │   ├── (dashboard)/ # Panel de administración
│   │   └── (public)/    # Páginas públicas
│   ├── components/      # Componentes reutilizables
│   ├── lib/             # Utilidades y configuraciones
│   │   ├── contexts/    # Contextos de React
│   │   ├── firebase/    # Configuración de Firebase
│   │   ├── hooks/       # Hooks personalizados
│   │   ├── services/    # Servicios de la aplicación
│   │   └── utils/       # Utilidades generales
│   └── types/           # Definiciones de tipos
└── firestore.rules      # Reglas de seguridad de Firestore
```

## Seguridad

El sistema implementa múltiples capas de seguridad:

1. **Autenticación**: Mediante Firebase Auth
2. **Autorización**: Control de acceso basado en roles
3. **Reglas de Firestore**: Protección de datos a nivel de base de datos
4. **Middleware**: Verificación de rutas y permisos
5. **API segura**: Endpoints protegidos y validados
6. **Validación de datos**: Verificación de entradas en cliente y servidor

## Implementación Multi-tenant

La aplicación soporta múltiples organizaciones mediante:

1. **Subdominios**: Cada organización puede tener su propio subdominio
2. **Rutas personalizadas**: Acceso mediante `/empresa/[id]`
3. **Parámetros URL**: Soporte para `?company=id`
4. **Aislamiento de datos**: Estructura de Firestore con separación clara entre organizaciones

## Despliegue

La aplicación puede desplegarse en:

1. **Vercel**: Integración sencilla con Next.js
2. **Firebase Hosting**: Para la aplicación y funciones
3. **Docker**: Contenedorización disponible para despliegues personalizados

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.
