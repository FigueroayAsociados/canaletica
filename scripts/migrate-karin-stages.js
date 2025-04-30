#!/usr/bin/env node
/**
 * Script para migrar las etapas antiguas de Ley Karin a las nuevas
 * 
 * Este script busca todas las denuncias Ley Karin en la base de datos y
 * actualiza las etapas antiguas (orientation, preliminaryReport) a las 
 * nuevas etapas estandarizadas (complaint_filed, report_creation).
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Obtener credenciales
const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
let serviceAccount;

try {
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  } else {
    console.error('Archivo de credenciales no encontrado en:', serviceAccountPath);
    console.error('Por favor, coloque el archivo serviceAccountKey.json en el directorio "scripts"');
    process.exit(1);
  }
} catch (error) {
  console.error('Error al leer el archivo de credenciales:', error);
  process.exit(1);
}

// Inicializar Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);
const companyId = process.argv[2] || 'default';

console.log(`Iniciando migración de etapas Ley Karin para compañía: ${companyId}`);

async function migrateKarinStages() {
  try {
    // Mapeo de etapas antiguas a nuevas
    const stageMapping = {
      'orientation': 'complaint_filed',
      'preliminaryReport': 'report_creation'
    };

    // Obtener todas las denuncias de la empresa
    const reportsRef = db.collection(`companies/${companyId}/reports`);
    const karinQuery = reportsRef.where('isKarinLaw', '==', true);
    
    const querySnapshot = await karinQuery.get();
    
    console.log(`Encontradas ${querySnapshot.size} denuncias Ley Karin`);
    
    // Contador de denuncias actualizadas
    let updatedCount = 0;
    
    // Procesar cada denuncia
    const batch = db.batch();
    const batchPromises = [];
    let currentBatch = db.batch();
    let operationsCount = 0;
    
    for (const doc of querySnapshot.docs) {
      const reportData = doc.data();
      const reportId = doc.id;
      
      // Verificar si tiene proceso Karin y si la etapa necesita ser migrada
      if (
        reportData.karinProcess && 
        reportData.karinProcess.stage && 
        stageMapping[reportData.karinProcess.stage]
      ) {
        const oldStage = reportData.karinProcess.stage;
        const newStage = stageMapping[oldStage];
        
        console.log(`Actualizando reporte ${reportId}: ${oldStage} -> ${newStage}`);
        
        // Actualizar la etapa en el proceso Karin
        currentBatch.update(doc.ref, {
          'karinProcess.stage': newStage,
          // También actualizar el estado general
          'status': reportData.status.replace('Orientación', 'Denuncia Interpuesta')
            .replace('orientación', 'denuncia interpuesta')
        });
        
        updatedCount++;
        operationsCount++;
        
        // Firestore tiene un límite de 500 operaciones por lote
        if (operationsCount >= 450) {
          batchPromises.push(currentBatch.commit());
          currentBatch = db.batch();
          operationsCount = 0;
          console.log('Committing batch and creating new one');
        }
      }
    }
    
    // Commit final batch if there are pending operations
    if (operationsCount > 0) {
      batchPromises.push(currentBatch.commit());
    }
    
    // Esperar a que todos los lotes se completen
    if (batchPromises.length > 0) {
      await Promise.all(batchPromises);
      console.log(`Migración completada: ${updatedCount} denuncias actualizadas`);
    } else {
      console.log('No se encontraron denuncias que requieran migración');
    }
    
    return { success: true, updated: updatedCount };
  } catch (error) {
    console.error('Error durante la migración:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar la migración
migrateKarinStages()
  .then(result => {
    if (result.success) {
      console.log(`Migración completada correctamente. ${result.updated} denuncias actualizadas.`);
      process.exit(0);
    } else {
      console.error('Error en la migración:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error inesperado:', error);
    process.exit(1);
  });