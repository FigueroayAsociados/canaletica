'use client';

// src/components/dashboard/CategoryDistributionCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryItem {
  category: string;
  count: number;
  color?: string;
}

interface CategoryDistributionCardProps {
  title: string;
  categories: CategoryItem[];
  totalCount?: number;
}

export default function CategoryDistributionCard({
  title,
  categories,
  totalCount
}: CategoryDistributionCardProps) {
  // Si no se proporciona el total, calcularlo
  const total = totalCount || categories.reduce((sum, item) => sum + item.count, 0);
  
  // Mapeo de categorías a nombres legibles y colores
  const getCategoryInfo = (category: string): { name: string; color: string } => {
    const categoryMap: Record<string, { name: string; color: string }> = {
      'modelo_prevencion': { 
        name: 'Prev. Delitos', 
        color: 'bg-blue-600' 
      },
      'ley_karin': { 
        name: 'Ley Karin', 
        color: 'bg-red-600' 
      },
      'ciberseguridad': { 
        name: 'Ciberseguridad', 
        color: 'bg-purple-600' 
      },
      'reglamento_interno': { 
        name: 'Regl. Interno', 
        color: 'bg-amber-600' 
      },
      'politicas_codigos': { 
        name: 'Políticas', 
        color: 'bg-green-600' 
      },
      'represalias': { 
        name: 'Represalias', 
        color: 'bg-pink-600' 
      },
      'otros': { 
        name: 'Otros', 
        color: 'bg-gray-600' 
      }
    };
    
    return categoryMap[category] || { name: category, color: 'bg-gray-500' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {categories.map((item) => {
            const { name, color } = getCategoryInfo(item.category);
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            
            return (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${color}`}></div>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.count}</span>
                    <span className="text-xs text-gray-500">({percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${color} h-2 rounded-full`} 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}