'use client';

// src/components/dashboard/SummaryStatCard.tsx
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ChevronRight
} from 'lucide-react';

interface SummaryStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: 'day' | 'week' | 'month';
  };
  urgent?: {
    count: number;
    type: 'expiring' | 'overdue' | 'pending';
  };
  linkUrl?: string;
  linkText?: string;
  colorScheme?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export default function SummaryStatCard({
  title,
  value,
  subtitle,
  change,
  urgent,
  linkUrl,
  linkText,
  colorScheme = 'default'
}: SummaryStatCardProps) {
  // Determinar colores basados en el esquema
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'primary':
        return {
          card: 'bg-primary/5 border-primary/20',
          title: 'text-primary',
          value: 'text-primary',
        };
      case 'success':
        return {
          card: 'bg-green-50 border-green-200',
          title: 'text-green-700',
          value: 'text-green-700',
        };
      case 'warning':
        return {
          card: 'bg-amber-50 border-amber-200',
          title: 'text-amber-700',
          value: 'text-amber-700',
        };
      case 'danger':
        return {
          card: 'bg-red-50 border-red-200',
          title: 'text-red-700',
          value: 'text-red-700',
        };
      case 'info':
        return {
          card: 'bg-blue-50 border-blue-200',
          title: 'text-blue-700',
          value: 'text-blue-700',
        };
      default:
        return {
          card: '',
          title: 'text-gray-500',
          value: 'text-gray-900',
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <Card className={`${colorClasses.card}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium ${colorClasses.title}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${colorClasses.value}`}>{value}</span>
              {subtitle && (
                <span className="text-sm text-gray-600">{subtitle}</span>
              )}
            </div>
            
            {change && (
              <div className="flex items-center text-xs font-medium">
                {change.type === 'increase' ? (
                  <>
                    <TrendingUp size={14} className="text-green-500 mr-1" />
                    <span className="text-green-600">+{change.value} este {change.period === 'day' ? 'día' : change.period === 'week' ? 'semana' : 'mes'}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={14} className="text-red-500 mr-1" />
                    <span className="text-red-600">-{change.value} este {change.period === 'day' ? 'día' : change.period === 'week' ? 'semana' : 'mes'}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {urgent && (
            <div className="flex items-center">
              {urgent.type === 'expiring' && (
                <div className="flex items-center text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                  <Clock size={12} className="mr-1" />
                  <span>{urgent.count} por vencer</span>
                </div>
              )}
              {urgent.type === 'overdue' && (
                <div className="flex items-center text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">
                  <AlertTriangle size={12} className="mr-1" />
                  <span>{urgent.count} vencidas</span>
                </div>
              )}
              {urgent.type === 'pending' && (
                <div className="flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                  <CheckCircle size={12} className="mr-1" />
                  <span>{urgent.count} pendientes</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {linkUrl && linkText && (
          <div className="mt-3">
            <Link 
              href={linkUrl} 
              className="text-sm font-medium text-primary hover:underline flex items-center"
              title={`Ver detalles: ${linkText}`}
            >
              {linkText}
              <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}