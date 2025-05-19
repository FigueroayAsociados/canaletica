'use client';

// src/app/page.tsx
// Este es un archivo restaurado para evitar problemas de rutas

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { CorporateDocuments } from '@/components/public/CorporateDocuments';
import { VideoPlayer } from '@/components/public/VideoPlayer';
import { VideoGallery } from '@/components/public/VideoGallery';
import { DEFAULT_COMPANY_ID } from '@/lib/utils/constants';
import { getTermsDocument, getPrivacyDocument } from '@/lib/services/documentService';
import { Spinner } from '@/components/ui/spinner';
import { CompanyLogo, CompanyHero } from '@/components/ui/company-logo';
import { useCompany } from '@/lib/contexts/CompanyContext';

export default function Home() {
  const [showVideo, setShowVideo] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(false);
  const router = useRouter();

  // Función para procesar markdown a HTML
  const processMarkdown = async (markdown) => {
    try {
      return marked.parse(markdown, {
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert line breaks to <br>
        sanitize: true, // Sanitize HTML for security
        smartLists: true, // Use smarter list behavior
        smartypants: true // Use smart typography
      });
    } catch (error) {
      console.error("Error al procesar markdown:", error);
      return `<p class="text-red-500">Error al procesar el contenido. Por favor, contacte al administrador.</p>`;
    }
  };
  
  // Cargar documentos legales desde Firestore
  useEffect(() => {
    async function loadLegalDocuments() {
      try {
        // Cargar términos y condiciones si está visible o va a mostrarse
        if (showTermsModal) {
          setIsLoadingTerms(true);
          try {
            const termsDoc = await getTermsDocument(DEFAULT_COMPANY_ID);
            
            if (termsDoc && termsDoc.fileURL) {
              // Intentar obtener el contenido del archivo
              const response = await fetch(termsDoc.fileURL);
              if (!response.ok) throw new Error(`Error al cargar documento: ${response.status}`);
              
              const content = await response.text();
              // Convertir markdown a HTML para mejor presentación
              const processedContent = await processMarkdown(content);
              setTermsContent(processedContent);
            } else {
              // Si no hay documentos en Firestore, usar los estáticos
              const staticTermsResponse = await fetch('/terminos-condiciones.md');
              if (!staticTermsResponse.ok) throw new Error(`Error al cargar documento estático: ${staticTermsResponse.status}`);
              
              const staticContent = await staticTermsResponse.text();
              // Convertir markdown a HTML para mejor presentación
              const processedContent = await processMarkdown(staticContent);
              setTermsContent(processedContent);
            }
          } catch (docError) {
            console.error('Error al cargar términos y condiciones:', docError);
            setTermsContent(`<p class="text-red-500">No se pudo cargar el documento. Por favor, inténtelo más tarde.</p>`);
          } finally {
            setIsLoadingTerms(false);
          }
        }
        
        // Cargar política de privacidad si está visible o va a mostrarse
        if (showPrivacyModal) {
          setIsLoadingPrivacy(true);
          try {
            const privacyDoc = await getPrivacyDocument(DEFAULT_COMPANY_ID);
            
            if (privacyDoc && privacyDoc.fileURL) {
              // Intentar obtener el contenido del archivo
              const response = await fetch(privacyDoc.fileURL);
              if (!response.ok) throw new Error(`Error al cargar documento: ${response.status}`);
              
              const content = await response.text();
              // Convertir markdown a HTML para mejor presentación
              const processedContent = await processMarkdown(content);
              setPrivacyContent(processedContent);
            } else {
              // Si no hay documentos en Firestore, usar los estáticos
              const staticPrivacyResponse = await fetch('/politica-privacidad.md');
              if (!staticPrivacyResponse.ok) throw new Error(`Error al cargar documento estático: ${staticPrivacyResponse.status}`);
              
              const staticContent = await staticPrivacyResponse.text();
              // Convertir markdown a HTML para mejor presentación
              const processedContent = await processMarkdown(staticContent);
              setPrivacyContent(processedContent);
            }
          } catch (docError) {
            console.error('Error al cargar política de privacidad:', docError);
            setPrivacyContent(`<p class="text-red-500">No se pudo cargar el documento. Por favor, inténtelo más tarde.</p>`);
          } finally {
            setIsLoadingPrivacy(false);
          }
        }
      } catch (error) {
        console.error('Error general al cargar documentos legales:', error);
        setIsLoadingTerms(false);
        setIsLoadingPrivacy(false);
      }
    }
    
    loadLegalDocuments();
  }, [showTermsModal, showPrivacyModal]);
  
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
          <CompanyLogo size="medium" showName={true} />
          <Link href="/login">
            <button className="btn-outline">Acceso Administración</button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CompanyHero subtitle="Una plataforma segura y confidencial para reportar conductas inapropiadas" />
          <div className="text-center mt-8">
            <div className="flex justify-center gap-4">
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
      
      {/* Video Instructivo Section */}
      {showVideo && (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Cómo Usar el Canal de Denuncias
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500">
                Vea el siguiente video para conocer cómo utilizar el canal y proteger su identidad
              </p>
            </div>
            
            {/* Video Player Component */}
            <div className="mx-auto max-w-4xl">
              <VideoPlayer 
                companyId={DEFAULT_COMPANY_ID} 
                category="instructional"
                showControls={true}
              />
            </div>
          </div>
        </section>
      )}
      
      {/* Ley Karin Video Gallery Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Videos Informativos - Ley Karin
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500">
              Conozca más sobre la Ley Karin, normativa que sanciona el acoso laboral y sexual
            </p>
          </div>
          
          {/* Video Gallery Component */}
          <div className="mx-auto">
            <VideoGallery 
              companyId={DEFAULT_COMPANY_ID} 
              category="ley-karin"
              maxInitialVideos={3}
            />
          </div>
        </div>
      </section>
      
      {/* Documentos Corporativos */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Documentos Corporativos
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500">
              Acceda a nuestros documentos institucionales y políticas de prevención
            </p>
          </div>
          
          {/* Componente de documentos corporativos */}
          <div className="mx-auto max-w-4xl">
            <CorporateDocuments companyId={DEFAULT_COMPANY_ID} />
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
                <li><button onClick={() => setShowTermsModal(true)} className="hover:text-white transition-colors text-left w-full">Términos y Condiciones</button></li>
                <li><button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors text-left w-full">Política de Privacidad</button></li>
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
          <div className="bg-white w-full max-w-4xl mx-4 rounded-lg shadow-xl overflow-hidden">
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
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto markdown-content text-sm text-gray-600">
              {isLoadingTerms ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner />
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: termsContent }} />
              )}
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
      
      {/* Modal de Política de Privacidad */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-4xl mx-4 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Política de Privacidad y Tratamiento de Datos Personales
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowPrivacyModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto markdown-content text-sm text-gray-600">
              {isLoadingPrivacy ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner />
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: privacyContent }} />
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button 
                className="btn-primary" 
                onClick={() => setShowPrivacyModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}