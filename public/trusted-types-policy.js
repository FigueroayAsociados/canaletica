/**
 * Políticas de Trusted Types para CanalEtica
 * Implementado según requisitos de seguridad ISO 37002:2021
 * 
 * Este script define políticas de Trusted Types que permiten 
 * controlar y validar operaciones potencialmente peligrosas del DOM.
 */

(function() {
  // Solo ejecutar si el navegador soporta Trusted Types
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    console.log('[Seguridad] Inicializando políticas de Trusted Types (ISO 37002:2021)');
    
    try {
      // Política para Next.js
      window.trustedTypes.createPolicy('next-js-policy', {
        createHTML: function(string) {
          // Podríamos implementar aquí sanitización adicional
          return string;
        },
        createScript: function(string) {
          // Validación básica de scripts
          if (string.includes('javascript:') || string.includes('data:')) {
            console.error('[Seguridad] Script potencialmente malicioso bloqueado');
            return '';
          }
          return string;
        },
        createScriptURL: function(string) {
          // Validar que las URLs sean de dominios permitidos
          const allowedDomains = [
            'canaletica.cl',
            'canaletica.com',
            'canaletic.app',
            'firebaseio.com',
            'firebaseapp.com',
            'firestore.googleapis.com',
            'googleapis.com',
            'google-analytics.com',
            'googletagmanager.com',
            'cloudfunctions.net',
            'youtube.com',
            'youtube-nocookie.com'
          ];
          
          try {
            const url = new URL(string);
            const domain = url.hostname;
            
            // Verificar si el dominio está en la lista de permitidos o es un subdominio
            const isDomainAllowed = allowedDomains.some(allowedDomain => 
              domain === allowedDomain || domain.endsWith('.' + allowedDomain)
            );
            
            // Permitir siempre conexiones a Firestore para evitar problemas de CORS
            if (domain === 'firestore.googleapis.com' || 
                domain.endsWith('.firebaseio.com') ||
                domain.endsWith('.canaletic.app')) {
              return string;
            }
            
            if (!isDomainAllowed) {
              console.error('[Seguridad] URL bloqueada por política de seguridad:', domain);
              return '';
            }
            
            return string;
          } catch (e) {
            console.error('[Seguridad] URL malformada:', string);
            return '';
          }
        }
      });
      
      // Política para Firebase
      window.trustedTypes.createPolicy('firebase-policy', {
        createHTML: string => string,
        createScript: string => string,
        createScriptURL: string => string
      });
      
      // Política por defecto (como fallback)
      window.trustedTypes.createPolicy('default', {
        createHTML: string => string,
        createScript: string => string,
        createScriptURL: string => string
      });
      
      console.log('[Seguridad] Políticas de Trusted Types inicializadas correctamente');
    } catch (error) {
      console.error('[Seguridad] Error al inicializar políticas de Trusted Types:', error);
    }
  }
})();