'use client';

// src/app/investigation/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvestigationRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir al panel de investigación
    router.push('/dashboard/investigation');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin text-primary mb-4">
          <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-gray-600">Redirigiendo al panel de investigación...</p>
      </div>
    </div>
  );
}