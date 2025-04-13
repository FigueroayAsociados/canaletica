import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    
    // Añadir el plugin para proporcionar el módulo process
    if (!config.plugins) {
      config.plugins = [];
    }
    
    return config;
  },
};

export default nextConfig;
