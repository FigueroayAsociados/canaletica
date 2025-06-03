'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/lib/hooks';
import { SECURITY_QUESTIONS } from '@/types/report';

export default function RecoverPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('email');

  // Para recuperación por email
  const [email, setEmail] = useState('');

  // Para recuperación por preguntas de seguridad
  const [reportCode, setReportCode] = useState('');
  const [question1, setQuestion1] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer2, setAnswer2] = useState('');

  const handleEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Por favor, ingrese su correo electrónico');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // TODO: Implementar servicio de recuperación por email
      const response = await fetch('/api/recover/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          companyId
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(
          'Se ha enviado un correo electrónico con instrucciones para recuperar el acceso a su denuncia. ' +
          'Revise su bandeja de entrada y carpeta de spam.'
        );
        setEmail('');
      } else {
        setError(result.error || 'No se encontraron denuncias asociadas a este correo electrónico');
      }
    } catch (error) {
      console.error('Error en recuperación por email:', error);
      setError('Ha ocurrido un error al procesar su solicitud. Inténtelo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityQuestionsRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportCode || !question1 || !answer1 || !question2 || !answer2) {
      setError('Por favor, complete todos los campos requeridos');
      return;
    }

    if (question1 === question2) {
      setError('Debe seleccionar preguntas de seguridad diferentes');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // TODO: Implementar servicio de recuperación por preguntas de seguridad
      const response = await fetch('/api/recover/security-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportCode,
          companyId,
          securityAnswers: {
            question1Id: question1,
            answer1: answer1.toLowerCase().trim(),
            question2Id: question2,
            answer2: answer2.toLowerCase().trim(),
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirigir directamente al seguimiento con el código de acceso recuperado
        router.push(`/track/${reportCode}?accessCode=${encodeURIComponent(result.accessCode)}`);
      } else {
        setError(result.error || 'Las respuestas no coinciden con las registradas en la denuncia');
      }
    } catch (error) {
      console.error('Error en recuperación por preguntas:', error);
      setError('Ha ocurrido un error al procesar su solicitud. Inténtelo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionText = (questionId: string) => {
    const question = SECURITY_QUESTIONS.find(q => q.id === questionId);
    return question ? question.question : questionId;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Recuperar Acceso</h1>
          <p className="mt-2 text-gray-600">
            Recupere el acceso a su denuncia si ha perdido los códigos de seguimiento
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Opciones de Recuperación</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="email">Por Email</TabsTrigger>
                <TabsTrigger value="security">Preguntas de Seguridad</TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-700">
                      Si su denuncia fue realizada proporcionando un correo electrónico,
                      puede recuperar el acceso ingresando el email que utilizó.
                    </p>
                  </div>

                  <form onSubmit={handleEmailRecovery} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? 'Enviando...' : 'Enviar Código por Email'}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="security">
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <p className="text-sm text-amber-700">
                      Para denuncias anónimas, responda las preguntas de seguridad
                      que configuró al crear la denuncia.
                    </p>
                  </div>

                  <form onSubmit={handleSecurityQuestionsRecovery} className="space-y-4">
                    <div>
                      <Label htmlFor="reportCode">Código de denuncia</Label>
                      <Input
                        id="reportCode"
                        type="text"
                        value={reportCode}
                        onChange={(e) => setReportCode(e.target.value.toUpperCase())}
                        placeholder="ABCD1234"
                        maxLength={8}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="question1">Primera pregunta de seguridad</Label>
                      <select
                        id="question1"
                        value={question1}
                        onChange={(e) => setQuestion1(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        required
                      >
                        <option value="">Seleccione la pregunta...</option>
                        {SECURITY_QUESTIONS.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.question}
                          </option>
                        ))}
                      </select>
                    </div>

                    {question1 && (
                      <div>
                        <Label htmlFor="answer1">Respuesta</Label>
                        <Input
                          id="answer1"
                          type="text"
                          value={answer1}
                          onChange={(e) => setAnswer1(e.target.value)}
                          placeholder="Su respuesta..."
                          required
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="question2">Segunda pregunta de seguridad</Label>
                      <select
                        id="question2"
                        value={question2}
                        onChange={(e) => setQuestion2(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        required
                      >
                        <option value="">Seleccione la pregunta...</option>
                        {SECURITY_QUESTIONS.map((q) => (
                          <option 
                            key={q.id} 
                            value={q.id}
                            disabled={q.id === question1}
                          >
                            {q.question}
                          </option>
                        ))}
                      </select>
                    </div>

                    {question2 && (
                      <div>
                        <Label htmlFor="answer2">Respuesta</Label>
                        <Input
                          id="answer2"
                          type="text"
                          value={answer2}
                          onChange={(e) => setAnswer2(e.target.value)}
                          placeholder="Su respuesta..."
                          required
                        />
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? 'Verificando...' : 'Recuperar Acceso'}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Recuerda sus códigos?{' '}
            <a href="/track" className="text-primary hover:underline">
              Ir al seguimiento normal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}