// src/lib/services/__tests__/investigationService.test.js

// Mock imports
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(() => ({ exists: () => true, data: () => ({}) })),
  getDocs: jest.fn(() => ({ docs: [], forEach: jest.fn() })),
  addDoc: jest.fn(() => ({ id: 'test-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  Timestamp: {
    fromDate: jest.fn(() => 'timestamp')
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {},
  auth: { currentUser: { displayName: 'Test User' } }
}));

// Import the service to test
import {
  saveInvestigationPlan,
  saveFinalReport,
  savePreliminaryReport,
  addTask,
  updateTaskStatus
} from '../investigationService';

// Mock firestore methods
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';

describe('Investigation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock return values
    getDoc.mockReturnValue({ 
      exists: () => true, 
      data: () => ({
        tasks: [{ id: 'task-1', status: 'pendiente' }]
      }) 
    });
  });

  test('saveInvestigationPlan should create a new plan if none exists', async () => {
    const result = await saveInvestigationPlan('company-1', 'report-1', 'user-1', { 
      description: 'test', approach: 'test', timeline: 'test' 
    });
    
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'companies/company-1/reports/report-1');
    expect(updateDoc).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test('saveFinalReport should create a new report if none exists', async () => {
    getDoc.mockReturnValue({ 
      exists: () => true, 
      data: () => ({})
    });
    
    const result = await saveFinalReport('company-1', 'report-1', 'user-1', { 
      summary: 'test', methodology: 'test', findings: 'test', conclusions: 'test', recommendations: 'test' 
    });
    
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'companies/company-1/reports/report-1');
    expect(updateDoc).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test('savePreliminaryReport should create a new report if none exists', async () => {
    getDoc.mockReturnValue({ 
      exists: () => true, 
      data: () => ({})
    });
    
    const result = await savePreliminaryReport('company-1', 'report-1', 'user-1', { 
      summary: 'test', safetyMeasures: 'test', initialAssessment: 'test', nextSteps: 'test' 
    });
    
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'companies/company-1/reports/report-1');
    expect(updateDoc).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test('addTask should add a new task to the report', async () => {
    const result = await addTask('company-1', 'report-1', 'user-1', { 
      title: 'test task', 
      description: 'test description', 
      assignedTo: 'user-2', 
      dueDate: '2023-12-31',
      priority: 'alta'
    });
    
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'companies/company-1/reports/report-1');
    expect(updateDoc).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.taskId).toBe('test-uuid');
  });

  test('updateTaskStatus should update an existing task status', async () => {
    const result = await updateTaskStatus(
      'company-1',
      'report-1',
      'task-1',
      'user-1',
      'completada',
      'Task completed'
    );
    
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'companies/company-1/reports/report-1');
    expect(updateDoc).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  test('updateTaskStatus should handle task not found', async () => {
    const result = await updateTaskStatus(
      'company-1',
      'report-1',
      'non-existent-task',
      'user-1',
      'completada',
      'Task completed'
    );
    
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'companies/company-1/reports/report-1');
    expect(updateDoc).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Tarea no encontrada');
  });
});