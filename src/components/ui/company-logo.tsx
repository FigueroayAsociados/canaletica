'use client';

import React from 'react';
import Image from 'next/image';
import { useCompany } from '@/lib/contexts/CompanyContext';

interface CompanyLogoProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  className?: string;
  showName?: boolean;
  nameClassName?: string;
}

/**
 * Componente reutilizable para mostrar el logo de la empresa
 * 
 * @param size - Tamaño del logo: 'small' (default), 'medium', 'large', o 'hero'
 * @param className - Clases adicionales para el contenedor del logo
 * @param showName - Si debe mostrar el nombre de la empresa junto al logo
 * @param nameClassName - Clases adicionales para el nombre de la empresa
 */
export function CompanyLogo({ 
  size = 'small', 
  className = '', 
  showName = false,
  nameClassName = ''
}: CompanyLogoProps) {
  const { companyLogo, companyName } = useCompany();
  
  // Determinar las dimensiones del logo según el tamaño
  const dimensions = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-20 w-20',
    hero: 'h-32 w-32 md:h-48 md:w-48'
  };
  
  // Determinar las clases para el nombre según el tamaño
  const nameSize = {
    small: 'text-lg font-semibold',
    medium: 'text-xl font-bold',
    large: 'text-2xl font-bold',
    hero: 'text-3xl md:text-4xl font-bold'
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`relative ${dimensions[size]}`}>
        <Image
          src={companyLogo || "/logo.png"}
          alt={`${companyName} Logo`}
          fill
          style={{ objectFit: 'contain' }}
          priority
          unoptimized={true} // Desactivar optimización de Next.js para evitar caché
          className="transition-opacity duration-300 ease-in-out"
        />
      </div>
      
      {showName && (
        <span className={`ml-2 ${nameSize[size]} ${nameClassName}`}>
          {companyName}
        </span>
      )}
    </div>
  );
}

/**
 * Componente hero para la página de inicio con logo grande y título
 */
export function CompanyHero({ 
  subtitle,
  className = ''
}: { 
  subtitle?: string, 
  className?: string 
}) {
  const { companyName } = useCompany();
  
  return (
    <div className={`flex flex-col items-center text-center px-4 py-12 ${className}`}>
      <CompanyLogo size="hero" showName={false} />
      
      <h1 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900">
        {companyName}
      </h1>
      
      {subtitle && (
        <p className="mt-4 text-xl text-gray-600 max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default CompanyLogo;