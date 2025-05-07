'use client';

// src/components/dashboard/RecentActivityCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { FileText, AlertCircle, Activity, User, HelpCircle } from 'lucide-react';
import { formatChileanDate } from '@/lib/utils/dateUtils';

interface ActivityItem {
  id: string;
  type: 'report' | 'investigation' | 'followup' | 'user';
  title: string;
  description: string;
  date: Date;
  status?: string;
  url?: string;
}

interface RecentActivityCardProps {
  title: string;
  activities: ActivityItem[];
  maxItems?: number;
  viewAllUrl?: string;
}

export default function RecentActivityCard({
  title,
  activities,
  maxItems = 5,
  viewAllUrl
}: RecentActivityCardProps) {
  const displayActivities = activities.slice(0, maxItems);
  
  // Obtener el ícono basado en el tipo de actividad
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'report':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
            <FileText size={16} />
          </div>
        );
      case 'investigation':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600">
            <AlertCircle size={16} />
          </div>
        );
      case 'followup':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
            <Activity size={16} />
          </div>
        );
      case 'user':
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600">
            <User size={16} />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600">
            <HelpCircle size={16} />
          </div>
        );
    }
  };

  // Obtener el color de estado basado en el status
  const getStatusColor = (status?: string) => {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'new':
      case 'nuevo':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
      case 'en_progreso':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pendiente':
        return 'bg-purple-100 text-purple-800';
      case 'urgent':
      case 'urgente':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return formatChileanDate(date);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {viewAllUrl && (
          <Link 
            href={viewAllUrl}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Ver todo
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {displayActivities.length > 0 ? (
            displayActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                {getActivityIcon(activity.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">
                      {activity.url ? (
                        <Link 
                          href={activity.url} 
                          className="hover:text-blue-600 hover:underline"
                        >
                          {activity.title}
                        </Link>
                      ) : (
                        activity.title
                      )}
                    </h4>
                    {activity.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{activity.description}</p>
                  <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No hay actividad reciente</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}