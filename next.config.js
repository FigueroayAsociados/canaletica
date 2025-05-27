/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // !! ADVERTENCIA !!
    // ¡Esto es temporal! Para permitir que la aplicación web funcione mientras se corrigen
    // los errores en las Cloud Functions
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignorar errores de ESLint durante la construcción
    ignoreDuringBuilds: true,
  },
  // Paquetes que deben ser externalizados en el servidor
  serverExternalPackages: ['pdfkit', 'blob-stream', 'linebreak'],
  output: 'standalone',
  
  // Configuración de cabeceras de seguridad (ISO 37002:2021)
  async headers() {
    return [
      {
        // Aplicar a todas las rutas
        source: '/:path*',
        headers: [
          // Protección XSS
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Prevenir inferencia de tipo MIME
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Política de referencia estricta
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy para prevenir XSS (ISO 37002:2021)
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.firebaseapp.com https://*.googletagmanager.com https://www.googletagmanager.com https://*.google-analytics.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https://storage.googleapis.com https://*.googleapis.com https://firebasestorage.googleapis.com https://*.ytimg.com;
              font-src 'self' data:;
              connect-src 'self' https://*.firebaseio.com https://*.firebaseapp.com https://firestore.googleapis.com https://*.googleapis.com https://*.google-analytics.com https://*.cloudfunctions.net https://us-central1-canaletica-e0f81.cloudfunctions.net https://southamerica-east1-canaletica-e0f81.cloudfunctions.net https://southamerica-west1-canaletica-e0f81.cloudfunctions.net;
              frame-src 'self' https://*.firebaseapp.com https://www.youtube.com https://youtube.com https://*.youtube-nocookie.com;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'self';
              trusted-types 'none';
              block-all-mixed-content;
              upgrade-insecure-requests;
            `.replace(/\s{2,}/g, ' ').trim()
          },
          // Permisos de características del navegador
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Strict Transport Security para forzar HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // Añadir fallbacks para módulos de Node.js que no funcionan en el navegador
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      zlib: require.resolve('browserify-zlib'),
      util: require.resolve('util/'),
      assert: require.resolve('assert/'),
      events: require.resolve('events/'),
    };
    
    // No reemplazar todas las reglas del módulo, solo añadir la nuestra
    config.module.rules.unshift({
      test: /\.(js|mjs|jsx|ts|tsx)$/,
      include: [
        /node_modules\/pdfkit/,
        /node_modules\/jpeg-exif/,
        /node_modules\/linebreak/,
        /node_modules\/blob-stream/,
      ],
      use: {
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          presets: ['next/babel'],
          plugins: [
            '@babel/plugin-transform-modules-commonjs',
          ],
        },
      },
    });
    
    return config;
  },
};

module.exports = nextConfig;
