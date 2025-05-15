'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MonthlyDataPoint {
  month: string;
  value: number;
}

interface MonthlyTrendCardProps {
  title: string;
  data: MonthlyDataPoint[];
  currentPeriodTotal: number;
  previousPeriodTotal: number;
  valueLabel?: string;
  colorScheme?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

export default function MonthlyTrendCard({
  title,
  data,
  currentPeriodTotal,
  previousPeriodTotal,
  valueLabel = 'Reportes',
  colorScheme = 'blue'
}: MonthlyTrendCardProps) {
  const percentageChange = previousPeriodTotal > 0 
    ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100) 
    : 0;
  
  const isIncrease = currentPeriodTotal > previousPeriodTotal;
  const isDecrease = currentPeriodTotal < previousPeriodTotal;
  const isNoChange = currentPeriodTotal === previousPeriodTotal;
  
  // Mapeo de esquemas de color
  const colorMap = {
    blue: {
      barColor: 'bg-blue-500',
      lightBarColor: 'bg-blue-200',
      textColor: 'text-blue-600',
      increaseBg: 'bg-blue-50',
      increaseText: 'text-blue-600',
      decreaseBg: 'bg-red-50',
      decreaseText: 'text-red-600'
    },
    green: {
      barColor: 'bg-green-500',
      lightBarColor: 'bg-green-200',
      textColor: 'text-green-600',
      increaseBg: 'bg-green-50',
      increaseText: 'text-green-600',
      decreaseBg: 'bg-red-50',
      decreaseText: 'text-red-600'
    },
    amber: {
      barColor: 'bg-amber-500',
      lightBarColor: 'bg-amber-200',
      textColor: 'text-amber-600',
      increaseBg: 'bg-amber-50',
      increaseText: 'text-amber-600',
      decreaseBg: 'bg-red-50',
      decreaseText: 'text-red-600'
    },
    red: {
      barColor: 'bg-red-500',
      lightBarColor: 'bg-red-200',
      textColor: 'text-red-600',
      increaseBg: 'bg-red-50',
      increaseText: 'text-red-600',
      decreaseBg: 'bg-green-50',
      decreaseText: 'text-green-600'
    },
    purple: {
      barColor: 'bg-purple-500',
      lightBarColor: 'bg-purple-200',
      textColor: 'text-purple-600',
      increaseBg: 'bg-purple-50',
      increaseText: 'text-purple-600',
      decreaseBg: 'bg-red-50',
      decreaseText: 'text-red-600'
    }
  };
  
  const colors = colorMap[colorScheme];

  // Encontrar el valor máximo para calcular porcentajes
  const maxValue = Math.max(...data.map(item => item.value), 1);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-2xl font-bold">
              {currentPeriodTotal}
              <span className="text-sm text-gray-500 ml-1">{valueLabel}</span>
            </h3>
            
            {isNoChange ? (
              <span className="bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded">
                Sin cambios
              </span>
            ) : (
              <span 
                className={`text-xs px-2 py-1 rounded flex items-center ${
                  isIncrease ? colors.increaseBg : colors.decreaseBg
                } ${
                  isIncrease ? colors.increaseText : colors.decreaseText
                }`}
              >
                {isIncrease ? (
                  <ChevronUp size={12} className="mr-1" />
                ) : (
                  <ChevronDown size={12} className="mr-1" />
                )}
                {Math.abs(percentageChange)}% vs período anterior
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-12 gap-1 h-40 items-end">
            {data.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              
              return (
                <div key={index} className="flex flex-col items-center col-span-1">
                  <div className="w-full relative" style={{ height: `${percentage}%` }}>
                    <div className={`absolute inset-0 ${colors.barColor} rounded-t-sm`}></div>
                  </div>
                  <span className="text-xs mt-1 text-gray-600">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}