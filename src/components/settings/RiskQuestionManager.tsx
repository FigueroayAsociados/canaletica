// src/components/settings/RiskQuestionManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { KARIN_RISK_QUESTIONS, KarinRiskQuestion, KarinRiskFactorType } from '@/types/report';
import { 
  getKarinRiskQuestions, 
  saveKarinRiskQuestion, 
  deleteKarinRiskQuestion,
  saveKarinRiskQuestionsOrder
} from '@/lib/services/configService';

// Estado inicial para una nueva pregunta
const initialQuestionState: Omit<KarinRiskQuestion, 'id'> = {
  question: '',
  description: '',
  riskLevel: 'medium'
};

export default function RiskQuestionManager({ companyId = 'default' }: { companyId?: string }) {
  // Estado para las preguntas cargadas
  const [questions, setQuestions] = useState<KarinRiskQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para los modos de edición
  const [editMode, setEditMode] = useState<'none' | 'add' | 'edit'>('none');
  const [currentQuestion, setCurrentQuestion] = useState<KarinRiskQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState(initialQuestionState);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [movingQuestion, setMovingQuestion] = useState(false);
  
  // Función para cargar las preguntas
  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Normalmente aquí cargaríamos las preguntas desde la base de datos
      // Por ahora usamos las preguntas predefinidas
      const result = await getKarinRiskQuestions(companyId);
      
      if (result.success) {
        setQuestions(result.questions);
      } else {
        // Si ocurre un error o no hay preguntas personalizadas, usamos las predefinidas
        console.log("Cargando preguntas predefinidas", KARIN_RISK_QUESTIONS);
        setQuestions(KARIN_RISK_QUESTIONS);
      }
    } catch (err) {
      console.error('Error al cargar preguntas:', err);
      setError('Error al cargar las preguntas de evaluación de riesgo');
      // Como fallback, usar las preguntas predefinidas
      setQuestions(KARIN_RISK_QUESTIONS);
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar preguntas al montar el componente
  useEffect(() => {
    loadQuestions();
  }, [companyId]);
  
  // Función para mostrar mensaje de éxito temporal
  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };
  
  // Manejar los cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuestionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Función para guardar una pregunta (nueva o editada)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavingQuestion(true);
    
    try {
      // Validación completa del formulario
      if (!questionForm.question.trim()) {
        setError('La pregunta no puede estar vacía');
        setSavingQuestion(false);
        return;
      }
      
      // Validar nivel de riesgo
      if (!questionForm.riskLevel || !['high', 'medium', 'low'].includes(questionForm.riskLevel)) {
        setError('Debe seleccionar un nivel de riesgo válido');
        setSavingQuestion(false);
        return;
      }
      
      // Generar un ID para nuevas preguntas si es necesario
      let questionId = currentQuestion?.id;
      if (!questionId) {
        // Para nuevas preguntas, crear un ID que tenga el formato correcto
        questionId = `custom_${Math.random().toString(36).substr(2, 9)}` as KarinRiskFactorType;
      }
      
      const questionToSave: KarinRiskQuestion = {
        ...(currentQuestion || {}),
        ...questionForm,
        id: questionId
      };
      
      const result = await saveKarinRiskQuestion(companyId, questionToSave);
      
      if (result.success) {
        showSuccess(editMode === 'add' ? 'Pregunta añadida correctamente' : 'Pregunta actualizada correctamente');
        await loadQuestions();
        resetForm();
      } else {
        setError(result.error || 'Error al guardar la pregunta');
      }
    } catch (err) {
      console.error('Error al guardar pregunta:', err);
      setError('Ha ocurrido un error al guardar la pregunta');
    } finally {
      setSavingQuestion(false);
    }
  };
  
  // Función para eliminar una pregunta
  const handleDeleteQuestion = async (questionId: KarinRiskFactorType) => {
    if (!window.confirm('¿Está seguro de eliminar esta pregunta? Las denuncias que ya han usado esta pregunta seguirán teniendo la respuesta asociada.')) {
      return;
    }
    
    try {
      setError(null);
      // Deshabilitar la interfaz durante la eliminación
      setLoading(true);
      
      const result = await deleteKarinRiskQuestion(companyId, questionId);
      
      if (result.success) {
        showSuccess('Pregunta eliminada correctamente');
        await loadQuestions();
      } else {
        setError(result.error || 'Error al eliminar la pregunta');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error al eliminar pregunta:', err);
      setError('Ha ocurrido un error al eliminar la pregunta');
      setLoading(false);
    }
  };
  
  // Función para editar una pregunta
  const handleEditQuestion = (question: KarinRiskQuestion) => {
    setCurrentQuestion(question);
    setQuestionForm({
      question: question.question,
      description: question.description || '',
      riskLevel: question.riskLevel
    });
    setEditMode('edit');
  };
  
  // Función para mover una pregunta arriba o abajo
  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    // No mover si es el primero hacia arriba o el último hacia abajo
    if ((index === 0 && direction === 'up') || 
        (index === questions.length - 1 && direction === 'down')) {
      return;
    }
    
    // Mostrar estado de carga
    setMovingQuestion(true);
    setError(null);
    
    // Calcular el nuevo índice
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Crear un nuevo array con las preguntas reordenadas
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    
    // Actualizar el estado local
    setQuestions(newQuestions);
    
    try {
      // Guardar el nuevo orden en la base de datos
      const result = await saveKarinRiskQuestionsOrder(companyId, newQuestions);
      
      if (!result.success) {
        setError(result.error || 'Error al guardar el nuevo orden');
        // Revertir el cambio en caso de error
        await loadQuestions();
      } else {
        // Mostrar mensaje de éxito
        showSuccess('Orden actualizado correctamente');
      }
    } catch (err) {
      console.error('Error al reordenar preguntas:', err);
      setError('Ha ocurrido un error al reordenar las preguntas');
      // Revertir el cambio en caso de error
      await loadQuestions();
    } finally {
      setMovingQuestion(false);
    }
  };
  
  // Función para resetear el formulario
  const resetForm = () => {
    setCurrentQuestion(null);
    setQuestionForm(initialQuestionState);
    setEditMode('none');
  };
  
  // Mostrar spinner de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin text-primary mb-4">
            <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Cargando preguntas de evaluación de riesgo...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Mensajes de estado */}
      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Contenedor principal */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Lista de preguntas - Columna izquierda */}
        <div className="md:col-span-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Preguntas de Evaluación de Riesgo Ley Karin</CardTitle>
                <CardDescription>
                  Estas preguntas ayudan a determinar el nivel de riesgo en denuncias relacionadas con Ley Karin.
                </CardDescription>
              </div>
              <Button 
                onClick={() => {
                  resetForm();
                  setEditMode('add');
                }}
                className="whitespace-nowrap"
              >
                Añadir Pregunta
              </Button>
            </CardHeader>
            
            <CardContent>
              {questions.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No hay preguntas configuradas. Haga clic en "Añadir Pregunta" para crear la primera.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div 
                      key={question.id} 
                      className={`p-4 border rounded-md ${
                        question.riskLevel === 'high' 
                          ? 'border-l-4 border-l-red-500' 
                          : question.riskLevel === 'medium'
                            ? 'border-l-4 border-l-orange-500'
                            : 'border-l-4 border-l-blue-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{question.question}</h3>
                          {question.description && (
                            <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                          )}
                          <div className="mt-2 flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              question.riskLevel === 'high' 
                                ? 'bg-red-100 text-red-800' 
                                : question.riskLevel === 'medium'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              Riesgo {question.riskLevel === 'high' ? 'Alto' : question.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">ID: {question.id}</span>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMoveQuestion(index, 'up')}
                            disabled={index === 0 || movingQuestion || loading}
                          >
                            {movingQuestion ? '...' : '▲'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMoveQuestion(index, 'down')}
                            disabled={index === questions.length - 1 || movingQuestion || loading}
                          >
                            {movingQuestion ? '...' : '▼'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditQuestion(question)}
                            disabled={loading || movingQuestion}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                            disabled={loading || movingQuestion}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Formulario de edición - Columna derecha */}
        {(editMode === 'add' || editMode === 'edit') && (
          <div className="md:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>{editMode === 'add' ? 'Añadir Nueva Pregunta' : 'Editar Pregunta'}</CardTitle>
                <CardDescription>
                  {editMode === 'add' 
                    ? 'Complete el formulario para crear una nueva pregunta' 
                    : 'Modifique los campos para actualizar esta pregunta'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSaveQuestion} className="space-y-4">
                  <div>
                    <Label htmlFor="question">Pregunta</Label>
                    <Textarea
                      id="question"
                      name="question"
                      value={questionForm.question}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1"
                      placeholder="¿Texto de la pregunta?"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={questionForm.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="mt-1"
                      placeholder="Texto adicional para explicar la pregunta..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Información adicional que aparecerá bajo la pregunta para ayudar al denunciante.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="riskLevel">Nivel de Riesgo</Label>
                    <Select
                      id="riskLevel"
                      name="riskLevel"
                      value={questionForm.riskLevel}
                      onChange={handleInputChange}
                      className="mt-1"
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Determina la importancia de esta pregunta en la evaluación general del riesgo.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      disabled={savingQuestion}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={savingQuestion}
                    >
                      {savingQuestion 
                        ? 'Guardando...' 
                        : editMode === 'add' ? 'Añadir Pregunta' : 'Guardar Cambios'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}