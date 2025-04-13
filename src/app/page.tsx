'use client';

// src/app/page.tsx
// Este es un archivo restaurado para evitar problemas de rutas

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [activeVideo, setActiveVideo] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const router = useRouter();
  
  const handleAcceptTerms = () => {
    // Guardar estado de aceptación de términos en localStorage
    localStorage.setItem('termsAccepted', 'true');
    setShowTermsModal(false);
    router.push('/report');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
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
          </div>
          <Link href="/login">
            <button className="btn-outline">Acceso Administración</button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Canal de Denuncias
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              Una plataforma segura y confidencial para reportar conductas inapropiadas
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button 
                className="btn-primary"
                onClick={() => setShowTermsModal(true)}
              >
                Realizar Denuncia
              </button>
              <Link href="/track">
                <button className="btn-outline">Seguimiento</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Características de nuestro Canal de Denuncias
            </h2>
          </div>
          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1: Confidencialidad */}
              <div className="card">
                <div className="text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Confidencialidad</h3>
                <p className="mt-2 text-base text-gray-500">
                  Todas las denuncias son tratadas con la máxima confidencialidad,
                  protegiendo la identidad del denunciante.
                </p>
              </div>

              {/* Feature 2: Anonimato */}
              <div className="card">
                <div className="text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Anonimato</h3>
                <p className="mt-2 text-base text-gray-500">
                  Puede realizar denuncias de forma anónima si así lo prefiere,
                  manteniendo su identidad protegida.
                </p>
              </div>

              {/* Feature 3: Seguimiento */}
              <div className="card">
                <div className="text-primary mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Seguimiento</h3>
                <p className="mt-2 text-base text-gray-500">
                  Podrá realizar un seguimiento de su denuncia en cualquier momento
                  utilizando el código único que se le proporcionará.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">CanalEtica</h3>
              <p className="text-gray-300 text-sm">
                Canal de denuncias seguro y confidencial, diseñado conforme a la norma ISO 37002:2021
                y adaptado para cumplir con la Ley Karin de Chile.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><Link href="/report" className="hover:text-white transition-colors">Realizar Denuncia</Link></li>
                <li><Link href="/track" className="hover:text-white transition-colors">Seguimiento de Denuncia</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Acceso Administración</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contacto</h3>
              <p className="text-gray-300 text-sm">
                Para soporte técnico, contáctenos en:
                <a href="mailto:soporte@canaletica.com" className="block text-primary-light hover:text-white transition-colors mt-1">
                  soporte@canaletica.com
                </a>
              </p>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-700 text-center text-gray-300 text-sm">
            <p>© {new Date().getFullYear()} CanalEtica. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Modal de Términos y Condiciones */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-2xl mx-4 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Términos y Condiciones del Canal de Denuncias
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowTermsModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                Al utilizar este Canal de Denuncias, usted acepta que la información proporcionada
                es verídica y completa. Nos comprometemos a mantener la confidencialidad de su identidad
                y de la información proporcionada, salvo que la ley nos obligue a revelarla.
              </p>
              
              <h4 className="font-medium text-gray-900 mt-4 mb-2">Confidencialidad</h4>
              <p className="text-sm text-gray-600 mb-4">
                En CanalEtica priorizamos la confidencialidad de todas las denuncias recibidas. 
                La información proporcionada será tratada con la máxima reserva y solo tendrán 
                acceso a ella las personas estrictamente necesarias para la correcta gestión e 
                investigación de la denuncia.
              </p>

              <h4 className="font-medium text-gray-900 mt-4 mb-2">Protección contra represalias</h4>
              <p className="text-sm text-gray-600 mb-4">
                Está estrictamente prohibido tomar cualquier tipo de represalia contra una persona 
                que haya presentado una denuncia de buena fe o que haya participado en una investigación. 
                Cualquier acto de represalia será considerado una violación grave de nuestras políticas.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                className="btn-outline mb-3 sm:mb-0 order-2 sm:order-1" 
                onClick={() => setShowTermsModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary order-1 sm:order-2" 
                onClick={handleAcceptTerms}
              >
                Aceptar términos y continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}