// src/pages/api/ai/smart-calendar.js
import Anthropic from '@anthropic-ai/sdk';
import { addDays, format, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      reportData, 
      currentStage, 
      deadlines = [],
      requestType = 'schedule_optimization' 
    } = req.body;

    if (!reportData || !currentStage) {
      return res.status(400).json({ 
        error: 'reportData y currentStage son requeridos' 
      });
    }

    let system = '';
    let prompt = '';

    switch (requestType) {
      case 'schedule_optimization':
        system = `Eres un especialista en planificación de investigaciones Ley Karin. Creas cronogramas óptimos considerando plazos legales, disponibilidad y eficiencia procesal.`;
        
        prompt = `Crea un cronograma inteligente para esta investigación Ley Karin:

**CASO:**
- Etapa actual: ${currentStage}
- Categoría: ${reportData.category}
- Descripción: ${reportData.detailedDescription}
- Complejidad estimada: ${reportData.accusedPersons?.length > 1 ? 'Alta' : reportData.witnesses?.length > 3 ? 'Media' : 'Baja'}

**PLAZOS LEGALES:**
${deadlines.map(d => `- ${d.name}: Vence ${d.endDate} (${d.daysRemaining} días restantes)`).join('\n')}

**PERSONAS A ENTREVISTAR:**
${reportData.accusedPersons?.map(p => `- Denunciado: ${p.name} (${p.position})`).join('\n') || ''}
${reportData.witnesses?.map(w => `- Testigo: ${w.name} (${w.relationship})`).join('\n') || ''}

Genera un cronograma con:
1. **Actividades prioritarias** (próximos 7 días)
2. **Entrevistas programadas** (orden estratégico)
3. **Hitos críticos** con fechas específicas
4. **Recordatorios automáticos** necesarios
5. **Tiempo buffer** para imprevistos
6. **Validación de cumplimiento** de plazos legales

Formato: Lista cronológica con fechas, actividades y justificación estratégica.`;
        break;

      case 'reminder_analysis':
        system = `Eres un asistente inteligente que analiza procesos Ley Karin y genera recordatorios contextuales y proactivos.`;
        
        prompt = `Analiza este caso y genera recordatorios inteligentes:

**CONTEXTO:**
- Etapa: ${currentStage}
- Descripción: ${reportData.detailedDescription}
- Plazos activos: ${deadlines.filter(d => d.status === 'active').length}

Genera:
1. **Recordatorios inmediatos** (24-48 horas)
2. **Alertas semanales** programadas
3. **Recordatorios de seguimiento** post-actividades
4. **Alertas de riesgo** por incumplimiento
5. **Recordatorios de documentación** requerida

Para cada recordatorio incluye: fecha/hora, mensaje, nivel de prioridad, y acción esperada.`;
        break;

      case 'meeting_scheduling':
        system = `Eres un coordinador experto en entrevistas para investigaciones laborales. Optimizas horarios considerando la estrategia procesal y bienestar de las personas.`;
        
        prompt = `Programa entrevistas estratégicamente para esta investigación:

**PERSONAS A ENTREVISTAR:**
${reportData.accusedPersons?.map(p => `- ${p.name} (${p.position}) - ROL: Denunciado`).join('\n') || ''}
${reportData.witnesses?.map(w => `- ${w.name} (${w.relationship}) - ROL: Testigo`).join('\n') || ''}

**CONSIDERACIONES:**
- Orden estratégico de entrevistas
- Evitar contaminación entre testimonios  
- Considerar aspectos emocionales
- Cumplir plazos de citación (10 días)
- Disponibilidad laboral estándar

Propón:
1. **Orden de entrevistas** con justificación
2. **Fechas y horarios** específicos
3. **Duración estimada** por entrevista
4. **Preparación previa** requerida
5. **Medidas de confidencialidad**
6. **Plan B** para reprogramaciones`;
        break;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2500,
      system,
      messages: [{ role: 'user', content: prompt }]
    });

    const analysis = response.content[0]?.text || 'No se pudo generar el análisis';

    // Generar eventos de calendario estructurados
    const calendarEvents = generateCalendarEvents(analysis, reportData, currentStage);
    const smartReminders = generateSmartReminders(deadlines, currentStage);

    res.status(200).json({
      success: true,
      calendar: {
        analysis,
        events: calendarEvents,
        reminders: smartReminders,
        generatedAt: new Date().toISOString(),
        requestType
      }
    });

  } catch (error) {
    console.error('Error en análisis de calendario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}

/**
 * Genera eventos de calendario estructurados a partir del análisis
 */
function generateCalendarEvents(analysis, reportData, currentStage) {
  const events = [];
  const today = new Date();

  // Eventos básicos según etapa
  switch (currentStage) {
    case 'investigation':
      // Entrevistas
      reportData.accusedPersons?.forEach((person, index) => {
        const date = addDays(today, 3 + index * 2); // Espaciar entrevistas
        if (!isWeekend(date)) {
          events.push({
            id: `interview-accused-${index}`,
            title: `Entrevista - ${person.name}`,
            date: format(date, 'yyyy-MM-dd'),
            time: '10:00',
            duration: 120,
            type: 'interview',
            priority: 'high',
            description: `Entrevista formal al denunciado ${person.name} (${person.position})`
          });
        }
      });

      reportData.witnesses?.forEach((witness, index) => {
        const date = addDays(today, 7 + index); // Después de denunciados
        if (!isWeekend(date)) {
          events.push({
            id: `interview-witness-${index}`,
            title: `Entrevista Testigo - ${witness.name}`,
            date: format(date, 'yyyy-MM-dd'),
            time: '14:00',
            duration: 90,
            type: 'interview',
            priority: 'medium',
            description: `Entrevista a testigo ${witness.name} (${witness.relationship})`
          });
        }
      });
      break;

    case 'dt_submission':
      events.push({
        id: 'prepare-dt-submission',
        title: 'Preparar expediente para DT',
        date: format(addDays(today, 1), 'yyyy-MM-dd'),
        time: '09:00',
        duration: 240,
        type: 'administrative',
        priority: 'high',
        description: 'Revisar y completar toda la documentación para envío a Dirección del Trabajo'
      });
      break;
  }

  return events;
}

/**
 * Genera recordatorios inteligentes basados en deadlines
 */
function generateSmartReminders(deadlines, currentStage) {
  const reminders = [];
  
  deadlines.forEach(deadline => {
    if (deadline.status === 'active' && deadline.daysRemaining <= 3) {
      reminders.push({
        id: `reminder-${deadline.id}`,
        title: `Recordatorio: ${deadline.name}`,
        message: `Quedan ${deadline.daysRemaining} días para: ${deadline.description}`,
        scheduleDate: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
        scheduleTime: '09:00',
        priority: deadline.priority,
        type: 'deadline_warning'
      });
    }
  });

  return reminders;
}