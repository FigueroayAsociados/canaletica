'use client';

// src/app/(public)/track/layout.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con logo y título */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <div className="h-10 w-10 relative mr-3">
              <Image 
                src="/logo.png" 
                alt="CanalEtica Logo" 
                fill 
                style={{ objectFit: 'contain' }} 
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CanalEtica</h1>
          </Link>
          <div className="flex space-x-4">
            <Link href="/">
              <button className="btn-outline">Volver al Inicio</button>
            </Link>
            <Link href="/report">
              <button className="btn-outline">Realizar Denuncia</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Seguimiento de Denuncia</h2>
            <p className="mt-2 text-gray-600">
              Consulte el estado de su denuncia utilizando el código único proporcionado.
            </p>
          </div>
          {children}
        </div>
      </main>

      {/* Footer simplificado */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© {new Date().getFullYear()} CanalEtica. Todos los derechos reservados.</p>
          <p className="mt-1">
            Canal de denuncias seguro y confidencial, diseñado conforme a la norma ISO 37002:2021
          </p>
        </div>
      </footer>
    </div>
  );
}