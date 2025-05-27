// src/components/reports/ReportStatusBadge.tsx

import React from 'react';

interface ReportStatusBadgeProps {
  status: string;
}

export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status }) => {
  // Definir los colores según el estado
  const colors: Record<string, string> = {
    // Estados normales
    'Nuevo': 'bg-red-100 text-red-800',
    'Admitida': 'bg-orange-100 text-orange-800',
    'Asignada': 'bg-yellow-100 text-yellow-800',
    'En Investigación': 'bg-blue-100 text-blue-800',
    'Pendiente Información': 'bg-purple-100 text-purple-800',
    'En Evaluación': 'bg-cyan-100 text-cyan-800',
    'Resuelta': 'bg-green-100 text-green-800',
    'En Seguimiento': 'bg-lime-100 text-lime-800',
    'Cerrada': 'bg-gray-100 text-gray-800',
    'Rechazada': 'bg-gray-800 text-white',
    
    // Estados Ley Karin - Iniciales (similar a Nuevo)
    'Ley Karin - Denuncia Interpuesta': 'bg-red-100 text-red-800',
    'Ley Karin - Denuncia Recibida': 'bg-red-100 text-red-800',
    'Ley Karin - Subsanación': 'bg-orange-100 text-orange-800',
    
    // Estados Ley Karin - Intermedios (similar a En Investigación)
    'Ley Karin - Medidas Precautorias': 'bg-blue-100 text-blue-800',
    'Ley Karin - Decisión de Investigar': 'bg-blue-100 text-blue-800',
    'Ley Karin - En Investigación': 'bg-blue-100 text-blue-800',
    'Ley Karin - Creación de Informe': 'bg-cyan-100 text-cyan-800',
    'Ley Karin - Aprobación de Informe': 'bg-cyan-100 text-cyan-800',
    'Ley Karin - Notificación a DT': 'bg-purple-100 text-purple-800',
    'Ley Karin - Notificación a SUSESO': 'bg-purple-100 text-purple-800',
    'Ley Karin - Investigación Completa': 'bg-cyan-100 text-cyan-800',
    'Ley Karin - Informe Final': 'bg-cyan-100 text-cyan-800',
    'Ley Karin - Envío a DT': 'bg-purple-100 text-purple-800',
    'Ley Karin - En Dirección del Trabajo': 'bg-purple-100 text-purple-800',
    'Ley Karin - Resolución DT': 'bg-yellow-100 text-yellow-800',
    
    // Estados Ley Karin - Finales (similar a Resuelta)
    'Ley Karin - Adopción de Medidas': 'bg-green-100 text-green-800',
    'Ley Karin - Sanciones': 'bg-green-100 text-green-800',
    'Ley Karin - Cerrado': 'bg-gray-100 text-gray-800',
    
    // Casos especiales
    'Ley Karin - Denuncia Falsa': 'bg-gray-800 text-white',
    'Ley Karin - Revisión de Represalias': 'bg-lime-100 text-lime-800',
  };

  // Usar un color predeterminado si el estado no está exactamente en la lista
  // Primero intentamos una coincidencia exacta
  let colorClass = colors[status] || '';
  
  // Si no hay coincidencia exacta y es un estado Ley Karin, buscamos coincidencia parcial
  if (!colorClass && status.includes('Ley Karin')) {
    if (status.includes('Denuncia') || status.includes('Recepción') || status.includes('Subsanación')) {
      colorClass = 'bg-red-100 text-red-800'; // Estados iniciales
    } else if (status.includes('Medidas') || status.includes('Investigación') || status.includes('Informe') || 
              status.includes('Notificación') || status.includes('DT') || status.includes('SUSESO')) {
      colorClass = 'bg-blue-100 text-blue-800'; // Estados intermedios
    } else if (status.includes('Adopción') || status.includes('Sanciones') || status.includes('Cerrado')) {
      colorClass = 'bg-green-100 text-green-800'; // Estados finales
    } else {
      colorClass = 'bg-gray-100 text-gray-800'; // Otros estados Ley Karin
    }
  } else if (!colorClass) {
    // Estado desconocido que no es Ley Karin
    colorClass = 'bg-gray-100 text-gray-800';
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {status}
    </span>
  );
};