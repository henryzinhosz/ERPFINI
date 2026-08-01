
'use client';

import { useEffect } from 'react';

/**
 * Componente responsável por registrar o Service Worker do PWA no navegador do cliente.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA Service Worker registrado com sucesso:', registration.scope);
          })
          .catch((error) => {
            console.error('Falha ao registrar o PWA Service Worker:', error);
          });
      });
    }
  }, []);

  return null;
}
