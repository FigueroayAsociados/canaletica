// script/verify-security.js
// Este script demuestra cómo verificar que los servicios de seguridad están funcionando

const { logSecurityEvent, handleLoginAttempt } = require('../src/lib/services/securityService');

async function verifySecurityFeatures() {
  console.log('Iniciando verificación de características de seguridad...\n');
  
  // 1. Probar el registro de eventos de seguridad
  console.log('1. Verificando registro de eventos de seguridad:');
  try {
    const eventResult = await logSecurityEvent({
      type: 'security_test',
      userId: 'test-user',
      resource: 'verification-script',
      severity: 1,
      details: { test: true, timestamp: new Date().toISOString() }
    });
    
    console.log('✅ Registro de eventos funcionando:', eventResult);
  } catch (error) {
    console.error('❌ Error en registro de eventos:', error);
  }
  
  // 2. Probar el bloqueo de cuentas por intentos fallidos
  console.log('\n2. Verificando bloqueo de cuentas por intentos fallidos:');
  try {
    // Simular varios intentos fallidos
    for (let i = 1; i <= 6; i++) {
      const result = await handleLoginAttempt('test-user@example.com', false);
      console.log(`Intento fallido ${i}: ${JSON.stringify(result)}`);
      
      // El 6to intento debería mostrar que la cuenta está bloqueada
      if (i >= 5 && result.blocked) {
        console.log('✅ Sistema de bloqueo de cuentas funcionando correctamente');
      }
    }
    
    // Intento exitoso después (debería resetear el contador)
    const resetResult = await handleLoginAttempt('test-user@example.com', true);
    console.log('Reseteo tras inicio exitoso:', resetResult);
  } catch (error) {
    console.error('❌ Error en sistema de bloqueo de cuentas:', error);
  }
  
  console.log('\nVerificación de características de seguridad completada.');
}

verifySecurityFeatures().catch(console.error);