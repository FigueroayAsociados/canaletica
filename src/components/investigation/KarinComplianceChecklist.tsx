'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatChileanDate } from '@/lib/utils/dateUtils';

interface KarinComplianceChecklistProps {
  investigation: any;
  canEdit: boolean;
  onUpdate: () => Promise<void>;
}

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  stage: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export const KarinComplianceChecklist: React.FC<KarinComplianceChecklistProps> = ({
  investigation,
  canEdit,
  onUpdate
}) => {
  const [checklist, setChecklist] = useState<ComplianceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const currentStage = investigation.karinProcess?.stage || 'complaint_filed';

  useEffect(() => {
    generateComplianceChecklist();
  }, [investigation]);

  const generateComplianceChecklist = () => {
    const items: ComplianceItem[] = [
      // Recepción y procesamiento inicial
      {
        id: 'inform_rights',
        title: 'Informar Derechos al Denunciante',
        description: 'Notificar al denunciante sobre sus derechos en el proceso Ley Karin',
        required: true,
        completed: !!investigation.karinProcess?.informedRights,
        stage: 'reception',
        deadline: '3 días desde recepción',
        priority: 'high',
        category: 'Procesamiento'
      },
      {
        id: 'dt_initial_notification',
        title: 'Notificación Inicial a Dirección del Trabajo',
        description: 'Informar a la DT sobre la recepción de la denuncia',
        required: true,
        completed: !!investigation.karinProcess?.dtInitialNotificationDate,
        stage: 'reception',
        deadline: '3 días desde recepción',
        priority: 'high',
        category: 'Notificaciones'
      },
      {
        id: 'precautionary_evaluation',
        title: 'Evaluación de Medidas Precautorias',
        description: 'Evaluar necesidad de medidas de protección inmediatas',
        required: true,
        completed: !!investigation.karinProcess?.precautionaryMeasuresEvaluated,
        stage: 'precautionary_measures',
        deadline: 'Inmediato',
        priority: 'high',
        category: 'Protección'
      },
      {
        id: 'investigation_plan',
        title: 'Plan de Investigación',
        description: 'Crear plan detallado de investigación',
        required: true,
        completed: !!investigation.plan,
        stage: 'decision_to_investigate',
        deadline: '5 días desde decisión',
        priority: 'high',
        category: 'Investigación'
      },
      {
        id: 'interviews_completion',
        title: 'Entrevistas Completadas',
        description: 'Realizar todas las entrevistas planificadas',
        required: true,
        completed: (investigation.interviews?.length || 0) > 0 && 
                  investigation.karinProcess?.testimonies?.every((t: any) => t.hasSigned === true),
        stage: 'investigation',
        deadline: '30 días (prorrogable a 60)',
        priority: 'high',
        category: 'Investigación'
      },
      {
        id: 'preliminary_report',
        title: 'Informe Preliminar',
        description: 'Crear informe preliminar con hallazgos iniciales',
        required: true,
        completed: !!investigation.preliminaryReport,
        stage: 'report_creation',
        deadline: 'Al finalizar investigación',
        priority: 'high',
        category: 'Documentación'
      },
      {
        id: 'report_approval',
        title: 'Aprobación del Informe',
        description: 'Revisión y aprobación interna del informe preliminar',
        required: true,
        completed: !!investigation.karinProcess?.reportApproved,
        stage: 'report_approval',
        deadline: '3 días desde creación',
        priority: 'medium',
        category: 'Documentación'
      },
      {
        id: 'suseso_notification',
        title: 'Notificación a SUSESO/Mutualidad',
        description: 'Informar a SUSESO o Mutualidad según corresponda',
        required: false,
        completed: !!investigation.karinProcess?.susesoNotificationDate,
        stage: 'suseso_notification',
        deadline: 'Según caso',
        priority: 'medium',
        category: 'Notificaciones'
      },
      {
        id: 'final_report',
        title: 'Informe Final',
        description: 'Crear informe final con conclusiones y recomendaciones',
        required: true,
        completed: !!investigation.finalReport,
        stage: 'final_report',
        deadline: 'Al completar investigación',
        priority: 'high',
        category: 'Documentación'
      },
      {
        id: 'dt_submission',
        title: 'Envío Formal a Dirección del Trabajo',
        description: 'Remitir expediente completo a la DT',
        required: true,
        completed: !!investigation.karinProcess?.dtSubmissionDate,
        stage: 'dt_submission',
        deadline: '2 días desde aprobación',
        priority: 'high',
        category: 'Notificaciones'
      },
      {
        id: 'measures_implementation',
        title: 'Implementación de Medidas',
        description: 'Ejecutar medidas ordenadas por la Dirección del Trabajo',
        required: true,
        completed: !!investigation.karinProcess?.measuresImplemented,
        stage: 'measures_adoption',
        deadline: '15 días corridos desde resolución DT',
        priority: 'high',
        category: 'Implementación'
      },
      {
        id: 'evidence_preservation',
        title: 'Preservación de Evidencias',
        description: 'Asegurar conservación de todas las evidencias',
        required: true,
        completed: (investigation.evidences?.length || 0) > 0,
        stage: 'investigation',
        deadline: 'Durante todo el proceso',
        priority: 'medium',
        category: 'Evidencias'
      },
      {
        id: 'confidentiality',
        title: 'Confidencialidad del Proceso',
        description: 'Mantener confidencialidad según normativa',
        required: true,
        completed: true, // Asumimos que se mantiene siempre
        stage: 'complaint_filed',
        deadline: 'Durante todo el proceso',
        priority: 'high',
        category: 'Protección'
      },
      {
        id: 'deadline_compliance',
        title: 'Cumplimiento de Plazos',
        description: 'Verificar cumplimiento de todos los plazos legales',
        required: true,
        completed: false, // Se evalúa dinámicamente
        stage: currentStage,
        deadline: 'Continuo',
        priority: 'high',
        category: 'Cumplimiento'
      }
    ];

    setChecklist(items);
  };

  const getStageOrder = (stage: string): number => {
    const order: {[key: string]: number} = {
      'complaint_filed': 0,
      'reception': 1,
      'subsanation': 1.5,
      'precautionary_measures': 2,
      'decision_to_investigate': 3,
      'investigation': 4,
      'report_creation': 5,
      'report_approval': 6,
      'dt_notification': 7,
      'suseso_notification': 8,
      'investigation_complete': 9,
      'final_report': 10,
      'dt_submission': 11,
      'dt_resolution': 12,
      'measures_adoption': 13,
      'closed': 14
    };
    return order[stage] || 0;
  };

  const isItemActive = (item: ComplianceItem): boolean => {
    const currentStageOrder = getStageOrder(currentStage);
    const itemStageOrder = getStageOrder(item.stage);
    return itemStageOrder <= currentStageOrder;
  };

  const getComplianceStats = () => {
    const activeItems = checklist.filter(item => isItemActive(item));
    const completedItems = activeItems.filter(item => item.completed);
    const requiredItems = activeItems.filter(item => item.required);
    const completedRequired = requiredItems.filter(item => item.completed);

    return {
      total: activeItems.length,
      completed: completedItems.length,
      required: requiredItems.length,
      completedRequired: completedRequired.length,
      percentage: activeItems.length > 0 ? Math.round((completedItems.length / activeItems.length) * 100) : 0,
      requiredPercentage: requiredItems.length > 0 ? Math.round((completedRequired.length / requiredItems.length) * 100) : 100
    };
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'Procesamiento': return '📋';
      case 'Notificaciones': return '📧';
      case 'Protección': return '🛡️';
      case 'Investigación': return '🔍';
      case 'Documentación': return '📄';
      case 'Implementación': return '⚙️';
      case 'Evidencias': return '📁';
      case 'Cumplimiento': return '✅';
      default: return '📌';
    }
  };

  const stats = getComplianceStats();
  const categories = [...new Set(checklist.map(item => item.category))];

  return (
    <div className="space-y-6">
      {/* Resumen de cumplimiento */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Resumen de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedRequired}</div>
              <div className="text-sm text-gray-600">Requeridos Completados</div>
              <div className="text-xs text-gray-500">de {stats.required}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Total Completados</div>
              <div className="text-xs text-gray-500">de {stats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.requiredPercentage}%</div>
              <div className="text-sm text-gray-600">Cumplimiento Obligatorio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.percentage}%</div>
              <div className="text-sm text-gray-600">Cumplimiento General</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de verificación por categorías */}
      <div className="space-y-4">
        {categories.map(category => {
          const categoryItems = checklist.filter(item => 
            item.category === category && isItemActive(item)
          );

          if (categoryItems.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="mr-2">{getCategoryIcon(category)}</span>
                  {category}
                  <Badge variant="outline" className="ml-2">
                    {categoryItems.filter(item => item.completed).length} / {categoryItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-md border-2 ${
                        item.completed 
                          ? 'bg-green-50 border-green-200' 
                          : item.required 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              item.completed 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'border-gray-300'
                            }`}>
                              {item.completed && '✓'}
                            </div>
                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                            {item.required && (
                              <Badge variant="destructive" className="text-xs">
                                Obligatorio
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 ml-7">{item.description}</p>
                          <div className="flex items-center space-x-4 mt-2 ml-7 text-xs text-gray-500">
                            <span>Plazo: {item.deadline}</span>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority === 'high' ? 'Alta' : 
                               item.priority === 'medium' ? 'Media' : 'Baja'} Prioridad
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {item.completed ? (
                            <Badge className="bg-green-100 text-green-800">
                              Completado
                            </Badge>
                          ) : item.required ? (
                            <Badge variant="destructive">
                              Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Opcional
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas de cumplimiento */}
      {stats.requiredPercentage < 100 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>⚠️ Atención:</strong> Hay elementos obligatorios pendientes de completar. 
            El proceso no puede avanzar hasta cumplir todos los requisitos legales.
          </AlertDescription>
        </Alert>
      )}

      {stats.requiredPercentage === 100 && stats.percentage < 100 && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertDescription className="text-yellow-800">
            <strong>✅ Cumplimiento Legal:</strong> Todos los requisitos obligatorios están completos. 
            Considere completar los elementos opcionales para una mejor gestión.
          </AlertDescription>
        </Alert>
      )}

      {stats.percentage === 100 && (
        <Alert className="border-green-300 bg-green-50">
          <AlertDescription className="text-green-800">
            <strong>🎉 Excelente:</strong> Todos los elementos de la lista de verificación están completos. 
            El proceso cumple con todos los estándares de la Ley Karin.
          </AlertDescription>
        </Alert>
      )}

      {/* Notas adicionales */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Notas de Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="compliance-notes">
                  Observaciones adicionales sobre el cumplimiento
                </Label>
                <Textarea
                  id="compliance-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregue observaciones sobre el cumplimiento normativo, acciones correctivas tomadas, o cualquier información relevante..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => {
                  // Aquí se guardarían las notas
                  setNotes('');
                  onUpdate();
                }}
                disabled={loading || !notes.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Guardando...' : 'Guardar Notas'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};