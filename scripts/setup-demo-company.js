/**
 * Script para configurar una empresa de demostración
 * 
 * Este script crea una empresa de demostración con datos de ejemplo
 * para verificar el correcto funcionamiento del sistema multi-tenant.
 * 
 * Uso: node scripts/setup-demo-company.js
 */

const { v4: uuidv4 } = require('uuid');
const { initializeFirebaseAdmin } = require('./utils/service-account-check');
const firebase = initializeFirebaseAdmin();

if (!firebase) {
  process.exit(1);
}

const { db, FieldValue } = firebase;

// Función para crear la empresa de demostración
async function setupDemoCompany() {
  console.log('Iniciando configuración de empresa de demostración...');

  const companies = [
    {
      id: 'demo',
      name: 'Empresa Demostración',
      description: 'Empresa para demostrar funcionalidades del sistema',
      contactEmail: 'contacto@demo.com',
      contactPhone: '+56 9 1234 5678',
      address: 'Av. Ejemplo 123, Santiago, Chile',
      industry: 'Tecnología',
      maxUsers: 20,
      environment: 'production'
    },
    {
      id: 'acme',
      name: 'ACME Corporation',
      description: 'Empresa multinacional de productos variados',
      contactEmail: 'contacto@acme.com',
      contactPhone: '+56 9 8765 4321',
      address: 'Av. Industrial 456, Santiago, Chile',
      industry: 'Manufactura',
      maxUsers: 50,
      environment: 'production'
    }
  ];

  for (const company of companies) {
    console.log(`\nConfigurando empresa: ${company.name} (${company.id})`);

    // 1. Crear documento principal de la empresa
    await db.doc(`companies/${company.id}`).set({
      name: company.name,
      description: company.description,
      isActive: true,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      address: company.address,
      industry: company.industry,
      maxUsers: company.maxUsers,
      environment: company.environment,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'system'
    });
    console.log(`  ✓ Documento principal creado`);

    // 2. Configuración general
    await db.doc(`companies/${company.id}/settings/general`).set({
      companyName: company.name,
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      emailNotifications: true,
      defaultLanguage: 'es',
      retentionPolicy: 365,
      slaForRegular: 30,
      slaForKarin: 30,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'system'
    });
    console.log(`  ✓ Configuración general creada`);

    // 3. Feature flags
    await db.doc(`companies/${company.id}/settings/features`).set({
      modulesEnabled: true,
      karinModuleEnabled: true,
      mpdModuleEnabled: true,
      cyberModuleEnabled: true,
      aiAssistantEnabled: true,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'system'
    });
    console.log(`  ✓ Feature flags configurados`);

    // 4. Configuración de entorno
    await db.doc(`companies/${company.id}/settings/environment`).set({
      type: company.environment,
      version: '1.0.0',
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'system'
    });
    console.log(`  ✓ Configuración de entorno creada`);

    // 5. Categorías de ejemplo
    const demoCategories = [
      { name: 'Acoso Laboral', description: 'Situaciones de acoso en el entorno laboral', isActive: true, isKarin: true },
      { name: 'Acoso Sexual', description: 'Comportamientos sexuales no deseados', isActive: true, isKarin: true },
      { name: 'Fraude', description: 'Situaciones de fraude o malversación', isActive: true, isKarin: false },
      { name: 'Conflicto de Interés', description: 'Situaciones donde intereses personales y profesionales entran en conflicto', isActive: true, isKarin: false },
      { name: 'Discriminación', description: 'Trato desigual o prejuicios hacia personas o grupos', isActive: true, isKarin: false }
    ];

    for (const category of demoCategories) {
      const categoryId = uuidv4();
      await db.doc(`companies/${company.id}/categories/${categoryId}`).set({
        ...category,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: 'system'
      });
    }
    console.log(`  ✓ Categorías de ejemplo creadas (${demoCategories.length})`);

    // 6. Añadir algunos usuarios de ejemplo (solo metadatos, no credenciales)
    const demoUsers = [
      { email: 'admin@demo.com', displayName: 'Administrador Demo', role: 'admin', isActive: true },
      { email: 'investigador@demo.com', displayName: 'Investigador Demo', role: 'investigator', isActive: true },
      { email: 'usuario@demo.com', displayName: 'Usuario Regular', role: 'user', isActive: true }
    ];

    for (const user of demoUsers) {
      const userId = `demo-${user.role}-${uuidv4().substring(0, 8)}`;
      await db.doc(`companies/${company.id}/users/${userId}`).set({
        ...user,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLogin: null
      });
    }
    console.log(`  ✓ Usuarios de ejemplo creados (${demoUsers.length})`);
  }

  console.log('\nConfiguración completada con éxito.');
  console.log('Se han creado las siguientes empresas de demostración:');
  companies.forEach(company => {
    console.log(`- ${company.name} (ID: ${company.id})`);
  });
  console.log('\nAhora puedes acceder a estas empresas a través de:');
  console.log('1. URL con parámetro: https://tu-dominio.com/?company=demo');
  console.log('2. Ruta específica: https://tu-dominio.com/empresa/demo/dashboard');
  console.log('3. O desde el panel de super administrador');
}

// Ejecutar la configuración
setupDemoCompany().catch(error => {
  console.error('Error durante la configuración:', error);
  process.exit(1);
});