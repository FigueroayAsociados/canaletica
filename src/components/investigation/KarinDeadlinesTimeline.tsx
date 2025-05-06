// src/components/investigation/KarinDeadlinesTimeline.tsx

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { 
  KarinDeadline, 
  DeadlineStatus, 
  DEFAULT_KARIN_DEADLINES
} from '@/types/report';
import { 
  initializeKarinDeadlines, 
  updateDeadlinesStatus, 
  getNextCriticalDeadline,
  generateDeadlinesReport,
  completeDeadline,
  extendDeadline
} from '@/lib/utils/deadlineUtils';

interface KarinDeadlinesTimelineProps {
  report: any;
  onUpdateDeadlines: (deadlines: KarinDeadline[]) => Promise<void>;
}

export const KarinDeadlinesTimeline: React.FC<KarinDeadlinesTimelineProps> = ({
  report,
  onUpdateDeadlines
}) => {
  const { uid, isAdmin, isInvestigator } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<KarinDeadline[]>([]);
  const [expandedDeadline, setExpandedDeadline] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState<number>(0);
  const [extendReason, setExtendReason] = useState<string>('');
  const [deadlineReport, setDeadlineReport] = useState<any>(null);
  
  const canEdit = isAdmin || isInvestigator || uid === report?.assignedTo;

  // Inicializar o actualizar plazos cuando cambia el reporte
  useEffect(() => {
    if (report && report.isKarinLaw) {
      let deadlinesData: KarinDeadline[] = [];
      
      // Si ya existen plazos, usarlos; si no, inicializarlos
      if (report.karinProcess?.deadlines && report.karinProcess.deadlines.length > 0) {
        deadlinesData = updateDeadlinesStatus(report.karinProcess.deadlines);
      } else {
        // Determinar fecha de inicio adecuada
        const startDate = report.karinProcess?.receivedDate 
          ? new Date(report.karinProcess.receivedDate)
          : report.createdAt?.toDate 
            ? new Date(report.createdAt.toDate())
            : new Date(report.createdAt);
        
        deadlinesData = initializeKarinDeadlines(startDate);
      }
      
      setDeadlines(deadlinesData);
      setDeadlineReport(generateDeadlinesReport(deadlinesData));
    }
  }, [report]);

  // Manejar la actualización de plazos
  const handleUpdateDeadlines = async (updatedDeadlines: KarinDeadline[]) => {
    if (!canEdit) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onUpdateDeadlines(updatedDeadlines);
      setDeadlines(updatedDeadlines);
      setDeadlineReport(generateDeadlinesReport(updatedDeadlines));
    } catch (error) {
      console.error('Error al actualizar plazos:', error);
      setError('Error al actualizar los plazos');
    } finally {
      setLoading(false);
    }
  };

  // Marcar un plazo como completado
  const handleCompleteDeadline = async (deadlineId: string) => {
    if (!canEdit) return;
    
    const updatedDeadlines = completeDeadline(deadlines, deadlineId, uid);
    await handleUpdateDeadlines(updatedDeadlines);
  };

  // Extender un plazo
  const handleExtendDeadline = async (deadlineId: string) => {
    if (!canEdit || extendDays <= 0 || !extendReason) return;
    
    const updatedDeadlines = extendDeadline(
      deadlines, 
      deadlineId, 
      extendDays, 
      extendReason, 
      uid
    );
    
    await handleUpdateDeadlines(updatedDeadlines);
    setExtendDays(0);
    setExtendReason('');
    setExpandedDeadline(null);
  };

  // Renderizar el color según el estado del plazo
  const getStatusColor = (status: DeadlineStatus): string => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-300 border';
      case 'extended':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Convertir estado a texto legible
  const getStatusText = (status: DeadlineStatus): string => {
    switch (status) {
      case 'ok':
        return 'En plazo';
      case 'warning':
        return 'Próximo a vencer';
      case 'critical':
        return 'Vence hoy o mañana';
      case 'expired':
        return 'Plazo vencido';
      case 'extended':
        return 'Plazo prorrogado';
      case 'completed':
        return 'Completado';
      default:
        return 'Desconocido';
    }
  };

  // Formatear fecha en formato legible
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (!report?.isKarinLaw) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Plazos y Seguimiento Ley Karin</span>
            {deadlineReport && (
              <div className="flex space-x-2">
                <Badge className="bg-green-100 text-green-800">
                  {deadlineReport.completionRate}% Completados
                </Badge>
                {deadlineReport.expired > 0 && (
                  <Badge className="bg-red-100 text-red-800">
                    {deadlineReport.expired} Vencidos
                  </Badge>
                )}
                {deadlineReport.critical > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {deadlineReport.critical} Críticos
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadlineReport?.nextDeadline && (
            <Alert className={`mb-4 ${getStatusColor(deadlineReport.nextDeadline.status)}`}>
              <AlertDescription>
                <strong>Próximo plazo crítico:</strong> {deadlineReport.nextDeadline.name} - 
                Vence el {formatDate(deadlineReport.nextDeadline.endDate)}
                {deadlineReport.nextDeadline.daysRemaining !== undefined && (
                  <> ({deadlineReport.nextDeadline.daysRemaining} días hábiles restantes)</>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {deadlines.map(deadline => (
              <div 
                key={deadline.id} 
                className={`border rounded-md p-3 ${
                  expandedDeadline === deadline.id ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium flex items-center">
                      {deadline.name}
                      {deadline.isLegalRequirement && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Obligatorio
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500">{deadline.description}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge className={getStatusColor(deadline.status)}>
                        {getStatusText(deadline.status)}
                      </Badge>
                      {deadline.daysRemaining !== undefined && deadline.status !== 'completed' && (
                        <span className="text-xs">
                          {deadline.daysRemaining < 0 
                            ? `${Math.abs(deadline.daysRemaining)} días de atraso` 
                            : `${deadline.daysRemaining} días restantes`}
                        </span>
                      )}
                      {deadline.completedDate && (
                        <span className="text-xs text-green-600">
                          Completado el {formatDate(deadline.completedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {deadline.status !== 'completed' && canEdit && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCompleteDeadline(deadline.id)}
                        disabled={loading}
                      >
                        Completar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedDeadline(
                        expandedDeadline === deadline.id ? null : deadline.id
                      )}
                    >
                      {expandedDeadline === deadline.id ? 'Menos' : 'Más'}
                    </Button>
                  </div>
                </div>

                {expandedDeadline === deadline.id && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-medium">Etapa asociada</p>
                        <p>{deadline.associatedStage}</p>
                      </div>
                      <div>
                        <p className="font-medium">Fecha de vencimiento</p>
                        <p>{formatDate(deadline.endDate)}</p>
                      </div>
                      {deadline.legalReference && (
                        <div className="col-span-2">
                          <p className="font-medium">Referencia legal</p>
                          <p>{deadline.legalReference}</p>
                        </div>
                      )}
                      {deadline.notes && (
                        <div className="col-span-2">
                          <p className="font-medium">Notas</p>
                          <p>{deadline.notes}</p>
                        </div>
                      )}
                      {deadline.isExtended && (
                        <>
                          <div className="col-span-2">
                            <p className="font-medium">Fecha original</p>
                            <p>{formatDate(deadline.originalEndDate || '')}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="font-medium">Razón de prórroga</p>
                            <p>{deadline.extensionReason}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {canEdit && deadline.status !== 'completed' && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium mb-2">Extender plazo</p>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            className="w-16 px-2 py-1 text-xs border rounded"
                            placeholder="Días"
                            min="1"
                            value={extendDays}
                            onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                          />
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 text-xs border rounded"
                            placeholder="Razón de la extensión"
                            value={extendReason}
                            onChange={(e) => setExtendReason(e.target.value)}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleExtendDeadline(deadline.id)}
                            disabled={loading || extendDays <= 0 || !extendReason}
                          >
                            Extender
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Barra de progreso */}
                {deadline.progressPercentage !== undefined && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        deadline.status === 'completed' 
                          ? 'bg-green-500' 
                          : deadline.status === 'expired' 
                            ? 'bg-red-500' 
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${deadline.progressPercentage}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <Alert className="mt-4 bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};