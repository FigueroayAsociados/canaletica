'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCompany } from '@/lib/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAI } from '@/lib/hooks/useAI';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import ConversationalAssistant from '@/components/ai/ConversationalAssistant';
import InsightsDashboard from '@/components/ai/InsightsDashboard';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { Spinner } from '@/components/ui/spinner';
import { Bot, Brain, TrendingUp, FileText, Shield, MessageSquare } from 'lucide-react';

export default function AIDashboardPage() {
  const { companyId } = useCompany();
  const { profile } = useCurrentUser();
  const { isEnabled } = useFeatureFlags();
  const { generateInsights, isGeneratingInsights, insights, error } = useAI();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Verificar si la IA está habilitada
  const isAIEnabled = isEnabled('aiEnabled') && isEnabled('intelligentRiskAnalysisEnabled');

  // Generar insights al cargar la página
  useEffect(() => {
    if (isAIEnabled && companyId) {
      handleRefreshInsights();
    }
  }, [companyId, isAIEnabled]);

  const handleRefreshInsights = async () => {
    setRefreshing(true);
    try {
      await generateInsights({
        timeRange: 'month',
        focusAreas: ['trends', 'risks', 'recommendations', 'efficiency'],
        maxResults: 20
      });
    } catch (error) {
      console.error('Error al generar insights:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Determinar el rol del usuario para el asistente
  const getUserRole = (): 'super_admin' | 'admin' | 'investigator' => {
    if (profile?.role === 'super_admin') return 'super_admin';
    if (profile?.role === 'admin') return 'admin';
    return 'investigator';
  };

  if (!isAIEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Inteligencia Artificial</h1>
        </div>

        <Alert className="border-amber-200 bg-amber-50">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Las funcionalidades de IA no están habilitadas para esta empresa. 
            Contacte al administrador para activar las funciones premium de inteligencia artificial.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Inteligencia Artificial</h1>
        <Button 
          onClick={handleRefreshInsights}
          disabled={refreshing || isGeneratingInsights}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {refreshing || isGeneratingInsights ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Actualizando...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Actualizar Análisis
            </>
          )}
        </Button>
      </div>

      <Alert className="border-green-200 bg-green-50">
        <Bot className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          <strong>🚀 Sistema de IA Activo</strong> - Todas las funcionalidades están operativas con Claude API. 
          Las funciones incluyen análisis de riesgo, asistencia conversacional, generación de insights y documentos legales.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Estado Actual</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="assistant">Asistente IA</TabsTrigger>
          <TabsTrigger value="capabilities">Capacidades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Estado de Funcionalidades IA
                </CardTitle>
                <CardDescription>Todas las funciones operativas con Claude API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Análisis de Riesgo Inteligente</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ Operativo</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Asistente Conversacional</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ Operativo</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Categorización Automática</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ Operativo</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Generación de Documentos</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ Operativo</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Análisis de Insights</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ Operativo</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Beneficios Implementados
                </CardTitle>
                <CardDescription>Valor real entregado por la IA de Claude</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Análisis de riesgo automatizado en tiempo real</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Asistencia inteligente contextualizada</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Categorización inteligente de denuncias</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Generación automática de documentos legales</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Insights y recomendaciones inteligentes</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertDescription className="text-red-700">
                Error al generar insights: {error}
              </AlertDescription>
            </Alert>
          )}
          
          <InsightsDashboard 
            insights={insights}
            isLoading={isGeneratingInsights}
            onRefresh={handleRefreshInsights}
          />
        </TabsContent>

        <TabsContent value="assistant">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Asistente Conversacional IA
              </CardTitle>
              <CardDescription>
                Asistente inteligente especializado en gestión de denuncias y compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: '600px' }}>
                <ConversationalAssistant
                  userRole={getUserRole()}
                  userName={profile?.displayName}
                  context={{
                    currentModule: 'ai-dashboard',
                    caseType: undefined,
                    reportId: undefined
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Análisis Inteligente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <span>Análisis de riesgo híbrido (IA + Compliance)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <span>Evaluación de severidad automática</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <span>Detección de indicadores de riesgo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <span>Recomendaciones contextualizadas</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Asistencia Conversacional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Respuestas contextualizadas por rol</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Asistencia en investigaciones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Orientación sobre Ley Karin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Recordatorios de plazos legales</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Generación de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Informes preliminares automáticos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Informes finales estructurados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Planes de investigación</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Cartas de recomendaciones</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Insights y Patrones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <span>Análisis de tendencias automático</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <span>Detección de riesgos emergentes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <span>Recomendaciones de mejora</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <span>Métricas de eficiencia</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}