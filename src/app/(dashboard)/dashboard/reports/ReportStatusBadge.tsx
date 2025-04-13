// src/components/reports/ReportStatusBadge.tsx

import React from 'react';

interface ReportStatusBadgeProps {
  status: string;
}

export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status }) => {
  // Definir los colores según el estado
  const colors = {
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
  };

  // Usar un color predeterminado si el estado no está en la lista
  const colorClass = colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {status}
    </span>
  );
};