// scripts/enable-intelligent-risk.js
// Script para habilitar el sistema de Análisis Inteligente híbrido

const admin = require('firebase-admin');

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  const serviceAccount = require('./service-account-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function enableIntelligentRisk() {
  try {
    console.log('🚀 Habilitando Sistema de Análisis Inteligente...\n');

    // Listar empresas disponibles
    const companiesSnapshot = await db.collection('companies').get();
    
    if (companiesSnapshot.empty) {
      console.log('❌ No se encontraron empresas registradas.');
      return;
    }

    console.log('📋 Empresas disponibles:');
    const companies = [];
    companiesSnapshot.forEach(doc => {
      const data = doc.data();
      companies.push({ id: doc.id, name: data.name });
      console.log(`   - ${doc.id}: ${data.name}`);
    });

    // Para este ejemplo, habilitamos para todas las empresas
    // En producción, puedes especificar empresas específicas
    const companyId = process.argv[2] || 'default';
    
    console.log(`\n🎯 Habilitando para empresa: ${companyId}`);

    // Referencia al documento de feature flags
    const flagsRef = db.doc(`companies/${companyId}/settings/features`);
    
    // Verificar si ya existe configuración
    const flagsDoc = await flagsRef.get();
    
    if (flagsDoc.exists()) {
      console.log('📝 Actualizando configuración existente...');
      await flagsRef.update({
        intelligentRiskAnalysisEnabled: true,
        aiEnabled: true, // También habilitamos IA básica como prerequisito
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system-script'
      });
    } else {
      console.log('✨ Creando nueva configuración...');
      await flagsRef.set({
        // Core features
        modulesEnabled: false,
        aiEnabled: true,
        intelligentRiskAnalysisEnabled: true, // 🚀 Sistema Premium IA + Compliance
        
        // Módulos específicos
        karinModuleEnabled: true,
        mpdModuleEnabled: false,
        cyberModuleEnabled: false,
        dataModuleEnabled: false,
        publicAdminModuleEnabled: false,
        
        // Interfaz y UX
        newUiEnabled: false,
        dashboardV2Enabled: false,
        
        // Características específicas
        emailNotificationsEnabled: true,
        riskAnalysisEnabled: false, // deprecated
        conversationalAssistantEnabled: false,
        aiInsightsEnabled: false,
        smartAlertsEnabled: false,
        
        // Metadatos
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system-script'
      });
    }

    console.log('✅ Sistema de Análisis Inteligente habilitado exitosamente!');
    console.log('\n🎉 Los usuarios de la empresa ahora pueden acceder a:');
    console.log('   - 🤖 Análisis de IA semántico');
    console.log('   - ⚖️ Evaluación legal de compliance');
    console.log('   - 🚀 Scoring híbrido unificado');
    console.log('   - 📋 Recomendaciones inteligentes');
    
  } catch (error) {
    console.error('❌ Error habilitando Análisis Inteligente:', error);
  }
}

// Mostrar instrucciones de uso
if (process.argv[2] === '--help') {
  console.log(`
🚀 Script para habilitar Sistema de Análisis Inteligente

Uso:
  node scripts/enable-intelligent-risk.js [companyId]

Ejemplos:
  node scripts/enable-intelligent-risk.js default
  node scripts/enable-intelligent-risk.js empresa-123
  
Si no se especifica companyId, se usará 'default'
  `);
  process.exit(0);
}

// Ejecutar
enableIntelligentRisk()
  .then(() => {
    console.log('\n🏁 Script completado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });