// src/components/investigation/SmartKarinController.tsx
// Componente unificado que reemplaza: KarinTimeline, KarinStageManager, KarinDeadlinesTimeline, UnifiedKarinController
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Clock, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  MessageSquare,
  Zap,
  ArrowRight,
  Bot
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Servicios
import { KarinProcessService } from '@/lib/services/karinProcessService';
import { useAI } from '@/lib/hooks/useAI';

// Tipos
import { 
  KarinProcessStage, 
  KarinDeadline,
  ReportFormValues 
} from '@/types/report';

interface SmartKarinControllerProps {
  reportId: string;
  reportData: ReportFormValues;
  onStageChange?: (newStage: KarinProcessStage) => void;
  onGenerateDocument?: (type: string) => void;
  className?: string;
}

interface AIAssistantState {
  isOpen: boolean;
  isGenerating: boolean;
  suggestions: string[];
  lastAnalysis?: any;
}

export default function SmartKarinController({
  reportId,
  reportData,
  onStageChange,
  onGenerateDocument,
  className
}: SmartKarinControllerProps) {
  
  // Estados locales
  const [currentStage, setCurrentStage] = useState<KarinProcessStage>(
    reportData.karinProcess?.stage || 'reception'
  );
  const [deadlines, setDeadlines] = useState<KarinDeadline[]>([]);
  const [aiAssistant, setAiAssistant] = useState<AIAssistantState>({
    isOpen: false,
    isGenerating: false,
    suggestions: []
  });

  // Hook de IA
  const { 
    analyzeRisk, 
    generateDocument, 
    chatWithAssistant,
    isLoading: aiLoading 
  } = useAI();

  // Inicialización
  useEffect(() => {
    initializeProcess();
  }, [reportId, reportData]);

  /**
   * Inicializa el proceso y calcula todos los plazos
   */
  const initializeProcess = async () => {
    try {
      const context = {
        reportId,
        companyId: reportData.companyId || 'default',
        currentStage,
        receptionDate: reportData.karinProcess?.receivedDate || new Date().toISOString(),
        requiresSubsanation: reportData.karinProcess?.requiresSubsanation || false,
        isDirectToDT: reportData.karinProcess?.derivedToDT || false,
        extensionRequested: reportData.karinProcess?.investigationExtensionDate ? true : false
      };

      const calculatedDeadlines = KarinProcessService.calculateApplicableDeadlines(context);
      setDeadlines(calculatedDeadlines);

      // Obtener sugerencias iniciales de IA
      await getAISuggestions();
      
    } catch (error) {
      console.error('Error inicializando proceso Karin:', error);
    }
  };

  /**
   * Obtiene sugerencias de IA para el estado actual
   */
  const getAISuggestions = async () => {
    try {
      const context = {
        stage: currentStage,
        deadlines: deadlines.filter(d => d.status === 'active' || d.status === 'warning'),
        reportData: {
          category: reportData.category,
          description: reportData.detailedDescription,
          impact: reportData.impact
        }
      };

      const response = await chatWithAssistant(
        `Analiza el estado actual del proceso Ley Karin y dame 3 sugerencias específicas de acciones a realizar.`,
        context,
        'investigator'
      );

      if (response.success && response.response) {
        setAiAssistant(prev => ({
          ...prev,
          suggestions: [
            response.response.content
          ]
        }));
      }
    } catch (error) {
      console.error('Error obteniendo sugerencias de IA:', error);
    }
  };

  /**
   * Avanza a la siguiente etapa del proceso
   */
  const advanceToNextStage = async () => {
    const validation = KarinProcessService.canAdvanceToNextStage(currentStage, deadlines);
    
    if (!validation.canAdvance) {
      alert(`No se puede avanzar: ${validation.reason}`);
      return;
    }

    const nextStage = KarinProcessService.getNextStage(currentStage, {
      requiresSubsanation: reportData.karinProcess?.requiresSubsanation,
      isDirectToDT: reportData.karinProcess?.derivedToDT,
      extensionRequested: reportData.karinProcess?.investigationExtensionDate ? true : false
    });

    if (nextStage) {
      setCurrentStage(nextStage);
      onStageChange?.(nextStage);
      
      // Regenerar plazos para nueva etapa
      await initializeProcess();
    }
  };

  /**
   * Genera todos los documentos automáticamente
   */
  const generateAllDocuments = async () => {
    setAiAssistant(prev => ({ ...prev, isGenerating: true }));

    try {
      const documentsToGenerate = [
        'Plan de Investigación',
        'Notificación a DT',
        'Notificación a SUSESO',
        'Formato de Entrevista',
        'Acta de Medidas Precautorias'
      ];

      for (const docType of documentsToGenerate) {
        await generateDocument(docType, reportData);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Evitar saturar API
      }

      alert('¡Todos los documentos han sido generados exitosamente!');
      
    } catch (error) {
      console.error('Error generando documentos:', error);
      alert('Hubo un error al generar algunos documentos. Revisa los logs para más detalles.');
    } finally {
      setAiAssistant(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // Calcular resumen ejecutivo
  const executiveSummary = KarinProcessService.generateExecutiveSummary(
    {
      reportId,
      companyId: reportData.companyId || 'default',
      currentStage,
      receptionDate: reportData.karinProcess?.receivedDate || new Date().toISOString(),
      requiresSubsanation: reportData.karinProcess?.requiresSubsanation || false,
      isDirectToDT: reportData.karinProcess?.derivedToDT || false,
      extensionRequested: reportData.karinProcess?.investigationExtensionDate ? true : false
    },
    deadlines
  );

  const criticalAlerts = KarinProcessService.getCriticalAlerts(deadlines);
  const nextDeadline = deadlines.find(d => d.status === 'active');

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Asistente IA Flotante */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Bot className="w-5 h-5" />
            Asistente IA - Proceso Ley Karin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              onClick={generateAllDocuments}
              disabled={aiAssistant.isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              {aiAssistant.isGenerating ? 'Generando...' : 'Generar Todo'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setAiAssistant(prev => ({ ...prev, isOpen: !prev.isOpen }))}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat con IA
            </Button>
            
            <Button variant="outline" onClick={getAISuggestions}>
              <Bot className="w-4 h-4 mr-2" />
              Sugerencias
            </Button>
          </div>

          {aiAssistant.suggestions.length > 0 && (
            <Alert>
              <Bot className="w-4 h-4" />
              <AlertDescription>
                <strong>Sugerencia de IA:</strong><br />
                {aiAssistant.suggestions[0]}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Panel de Estado Principal */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">
                {KarinProcessService.getStageDisplayName(currentStage)}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Caso #{reportId.slice(-8).toUpperCase()}
              </p>
            </div>
            <Badge 
              variant={executiveSummary.complianceStatus === 'compliant' ? 'default' : 
                     executiveSummary.complianceStatus === 'at_risk' ? 'destructive' : 'secondary'}
            >
              {executiveSummary.complianceStatus === 'compliant' ? 'En Cumplimiento' :
               executiveSummary.complianceStatus === 'at_risk' ? 'En Riesgo' : 'Incumplimiento'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          
          {/* Progreso Visual */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progreso General</span>
              <span className="text-sm text-muted-foreground">
                {executiveSummary.progress}%
              </span>
            </div>
            <Progress value={executiveSummary.progress} className="mb-2" />
            <p className="text-xs text-muted-foreground">
              Finalización estimada: {executiveSummary.estimatedCompletionDate}
            </p>
          </div>

          {/* Próximo Vencimiento */}
          {nextDeadline && (
            <Alert className="mb-4">
              <Clock className="w-4 h-4" />
              <AlertDescription>
                <strong>Próximo vencimiento:</strong> {nextDeadline.name}<br />
                <span className="text-sm">
                  Vence: {format(new Date(nextDeadline.endDate), "dd 'de' MMMM 'de' yyyy", { locale: es })} 
                  ({nextDeadline.daysRemaining} días restantes)
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Alertas Críticas */}
          {criticalAlerts.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Alertas críticas ({criticalAlerts.length}):</strong><br />
                {criticalAlerts.slice(0, 2).map((alert, index) => (
                  <div key={index} className="text-sm">• {alert.message}</div>
                ))}
                {criticalAlerts.length > 2 && (
                  <div className="text-sm">• Y {criticalAlerts.length - 2} más...</div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Acciones Rápidas */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={advanceToNextStage} className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Avanzar Etapa
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onGenerateDocument?.('informe_preliminar')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generar Informe
            </Button>
            
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Ver Calendario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Visual Simplificado */}
      <Card>
        <CardHeader>
          <CardTitle>Línea de Tiempo del Proceso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deadlines.slice(0, 5).map((deadline, index) => (
              <div key={deadline.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {deadline.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : deadline.status === 'overdue' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-sm">{deadline.name}</h4>
                  <p className="text-xs text-muted-foreground">{deadline.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vence: {format(new Date(deadline.endDate), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
                <Badge 
                  variant={deadline.status === 'completed' ? 'default' : 
                          deadline.status === 'overdue' ? 'destructive' : 'secondary'}
                >
                  {deadline.daysRemaining || 0} días
                </Badge>
              </div>
            ))}
            
            {deadlines.length > 5 && (
              <Button variant="ghost" className="w-full">
                Ver todos los plazos ({deadlines.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}