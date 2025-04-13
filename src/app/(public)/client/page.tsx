'use client';

import { useEffect, useState } from 'react';

const ClientPage = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Intentar importar pdfkit y blob-stream
    async function testImports() {
      try {
        const BlobStreamModule = await import('blob-stream');
        const PDFKit = await import('pdfkit/js/pdfkit.standalone.js');
        console.log('✅ PDFKit cargado correctamente:', PDFKit);
        console.log('✅ BlobStream cargado correctamente:', BlobStreamModule);
        
        // Intentar crear un documento PDF básico
        try {
          const PDFDocument = PDFKit.default;
          const blobStream = BlobStreamModule.default || BlobStreamModule;
          
          console.log('BlobStream type:', typeof blobStream);
          
          const doc = new PDFDocument();
          const stream = doc.pipe(blobStream());
          
          doc.text('Prueba de PDFKit en el navegador');
          doc.end();
          
          // Esperar a que termine
          stream.on('finish', () => {
            const blob = stream.toBlob('application/pdf');
            const url = URL.createObjectURL(blob);
            console.log('✅ PDF generado correctamente:', url);
            
            // Mostrar el PDF en un iframe
            const iframe = document.getElementById('pdf-frame');
            if (iframe) {
              (iframe as HTMLIFrameElement).src = url;
            }
          });
          
        } catch (e) {
          console.error('❌ Error al crear el PDF:', e);
        }
        
      } catch (e) {
        console.error('❌ Error al cargar las dependencias:', e);
      }
    }
    
    // Ejecutar la prueba
    testImports();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Prueba PDF Client Side</h1>
      
      <div className="mb-4">
        <p>Estado: {isClient ? '✅ Cliente renderizado' : '⏳ Cargando...'}</p>
      </div>
      
      <div className="border border-gray-300 rounded p-4 w-full h-[600px]">
        <iframe id="pdf-frame" className="w-full h-full" />
      </div>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Instrucciones:</h2>
        <p>Este componente intenta cargar PDF.js en el navegador y crear un documento PDF básico.</p>
        <p>Revisa la consola del navegador para ver los mensajes de estado detallados.</p>
      </div>
    </div>
  );
};

export default ClientPage;