#!/usr/bin/env node

// scripts/enable-ai-assistant.js
// Script para habilitar el asistente virtual de IA en una empresa específica

const admin = require('firebase-admin');
const { normalizeCompanyId } = require('../src/lib/utils/helpers');
const serviceAccount = require('./serviceAccountKey.json');
const prompt = require('prompt-sync')();

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Actualiza los feature flags para habilitar el asistente virtual
 */
async function enableAIAssistant(companyId) {
  try {
    if (!companyId) {
      throw new Error('ID de empresa no proporcionado');
    }

    const normalizedCompanyId = normalizeCompanyId(companyId);
    console.log(`Actualizando configuración para empresa ${normalizedCompanyId}...`);

    // Referencia al documento de feature flags
    const flagsRef = db.doc(`companies/${normalizedCompanyId}/settings/features`);
    
    // Verificar si el documento existe
    const docSnapshot = await flagsRef.get();
    
    if (!docSnapshot.exists) {
      console.log(`Documento de features no encontrado. Creando con valores predeterminados...`);
      
      // Crear documento con valores predeterminados
      await flagsRef.set({
        modulesEnabled: true,
        aiEnabled: true,
        conversationalAssistantEnabled: true,
        karinModuleEnabled: true,
        mpdModuleEnabled: false,
        cyberModuleEnabled: false,
        dataModuleEnabled: false,
        publicAdminModuleEnabled: false,
        newUiEnabled: false,
        dashboardV2Enabled: false,
        emailNotificationsEnabled: true,
        riskAnalysisEnabled: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system'
      });
      
      console.log('Documento creado y asistente virtual habilitado.');
    } else {
      // Actualizar documento existente
      await flagsRef.update({
        aiEnabled: true,
        conversationalAssistantEnabled: true,
        riskAnalysisEnabled: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system'
      });
      
      console.log('Asistente virtual habilitado correctamente.');
    }
    
    return true;
  } catch (error) {
    console.error('Error al habilitar asistente virtual:', error);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('==== Habilitación de Asistente Virtual IA ====');
  
  // Solicitar ID de empresa o usar 'default'
  let companyId = prompt('Ingrese ID de empresa (o presione Enter para usar "default"): ');
  companyId = companyId.trim() || 'default';
  
  // Confirmación
  const confirmation = prompt(`¿Está seguro de habilitar el asistente virtual para ${companyId}? (s/n): `);
  
  if (confirmation.toLowerCase() !== 's') {
    console.log('Operación cancelada.');
    process.exit(0);
  }
  
  // Habilitar asistente
  const success = await enableAIAssistant(companyId);
  
  if (success) {
    console.log(`
===== Configuración Completada =====
El asistente virtual IA ha sido habilitado para: ${companyId}

Funcionalidades activadas:
- IA general (aiEnabled)
- Asistente conversacional (conversationalAssistantEnabled)
- Análisis de riesgo (riskAnalysisEnabled)
`);
  } else {
    console.log('La operación no pudo completarse. Revise los logs para más detalles.');
  }
  
  process.exit(0);
}

// Ejecutar función principal
main();