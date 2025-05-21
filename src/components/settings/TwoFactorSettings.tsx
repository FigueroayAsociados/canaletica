// src/components/settings/TwoFactorSettings.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { 
  getUserTwoFactorStatus, 
  initializeTwoFactor, 
  verifyAndEnableTwoFactor,
  disableTwoFactor,
  generateNewBackupCodes
} from '@/lib/services/twoFactorService';

export function TwoFactorSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    loading: boolean;
    enabled: boolean;
    method: '2fa_app' | 'email' | null;
    verified: boolean;
  }>({
    loading: true,
    enabled: false,
    method: null,
    verified: false
  });
  
  const [setupState, setSetupState] = useState<{
    inProgress: boolean;
    step: 'start' | 'verify' | 'success';
    method: '2fa_app' | 'email';
    secret?: string;
    qrCode?: string;
    backupCodes?: string[];
    error?: string;
  }>({
    inProgress: false,
    step: 'start',
    method: 'email'
  });
  
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar estado actual de 2FA al montar el componente
  useEffect(() => {
    if (user?.uid) {
      loadTwoFactorStatus();
    }
  }, [user]);
  
  // Cargar estado de 2FA del usuario
  const loadTwoFactorStatus = async () => {
    if (!user?.uid) return;
    
    try {
      setStatus({ ...status, loading: true });
      
      const result = await getUserTwoFactorStatus(user.uid);
      
      if (result.success) {
        setStatus({
          loading: false,
          enabled: result.enabled,
          method: result.method,
          verified: result.verified
        });
      } else {
        setError('Error al cargar el estado de autenticación de dos factores');
        setStatus({
          loading: false,
          enabled: false,
          method: null,
          verified: false
        });
      }
    } catch (err) {
      console.error('Error loading 2FA status:', err);
      setError('Error al cargar el estado de autenticación de dos factores');
      setStatus({
        loading: false,
        enabled: false,
        method: null,
        verified: false
      });
    }
  };
  
  // Iniciar configuración de 2FA
  const startSetup = async (method: '2fa_app' | 'email') => {
    if (!user?.uid || !user?.email) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await initializeTwoFactor(user.uid, method, user.email);
      
      if (!result.success) {
        setError(result.error || 'Error al iniciar la configuración de autenticación de dos factores');
        return;
      }
      
      // Configuración iniciada correctamente
      setSetupState({
        inProgress: true,
        step: 'verify',
        method,
        secret: result.secret,
        qrCode: result.qrCode
      });
    } catch (err) {
      console.error('Error starting 2FA setup:', err);
      setError('Error al iniciar la configuración de autenticación de dos factores');
    } finally {
      setLoading(false);
    }
  };
  
  // Verificar código y activar 2FA
  const verifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid || !verificationCode) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await verifyAndEnableTwoFactor(user.uid, verificationCode);
      
      if (!result.success) {
        setError(result.error || 'Error al verificar el código');
        return;
      }
      
      // 2FA activado correctamente
      setSetupState({
        ...setupState,
        step: 'success',
        backupCodes: result.backupCodes
      });
      
      // Actualizar estado general
      setStatus({
        loading: false,
        enabled: true,
        method: setupState.method,
        verified: true
      });
    } catch (err) {
      console.error('Error verifying 2FA code:', err);
      setError('Error al verificar el código de autenticación');
    } finally {
      setLoading(false);
    }
  };
  
  // Desactivar 2FA
  const handleDisable2FA = async () => {
    if (!user?.uid) return;
    
    if (!confirm('¿Está seguro que desea desactivar la autenticación de dos factores? Esto reducirá la seguridad de su cuenta.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await disableTwoFactor(user.uid);
      
      if (!result.success) {
        setError(result.error || 'Error al desactivar la autenticación de dos factores');
        return;
      }
      
      // 2FA desactivado correctamente
      setStatus({
        loading: false,
        enabled: false,
        method: null,
        verified: false
      });
      
      // Reiniciar estado de configuración
      setSetupState({
        inProgress: false,
        step: 'start',
        method: 'email'
      });
      
      setVerificationCode('');
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      setError('Error al desactivar la autenticación de dos factores');
    } finally {
      setLoading(false);
    }
  };
  
  // Generar nuevos códigos de respaldo
  const handleGenerateNewBackupCodes = async () => {
    if (!user?.uid) return;
    
    if (!confirm('¿Está seguro que desea generar nuevos códigos de respaldo? Los códigos anteriores ya no funcionarán.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await generateNewBackupCodes(user.uid);
      
      if (!result.success) {
        setError(result.error || 'Error al generar nuevos códigos de respaldo');
        return;
      }
      
      // Mostrar los nuevos códigos
      setSetupState({
        ...setupState,
        step: 'success',
        backupCodes: result.backupCodes
      });
    } catch (err) {
      console.error('Error generating new backup codes:', err);
      setError('Error al generar nuevos códigos de respaldo');
    } finally {
      setLoading(false);
    }
  };
  
  // Cancelar configuración
  const cancelSetup = () => {
    setSetupState({
      inProgress: false,
      step: 'start',
      method: 'email'
    });
    setVerificationCode('');
    setError(null);
  };
  
  // Finalizar configuración
  const finishSetup = () => {
    setSetupState({
      inProgress: false,
      step: 'start',
      method: 'email'
    });
    setVerificationCode('');
    loadTwoFactorStatus();
  };
  
  if (status.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autenticación de dos factores</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Si 2FA está habilitado, mostrar información y opciones de gestión
  if (status.enabled && status.verified) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Autenticación de dos factores</CardTitle>
            <Badge variant="success">Activado</Badge>
          </div>
          <CardDescription>
            Su cuenta está protegida con autenticación de dos factores mediante {status.method === '2fa_app' ? 'aplicación de autenticación' : 'email'}.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {setupState.step === 'success' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Códigos de respaldo</h3>
              <p className="text-sm text-yellow-700 mb-3">
                Guarde estos códigos en un lugar seguro. Cada código se puede usar una sola vez para acceder a su cuenta si pierde acceso a su método principal de autenticación.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {setupState.backupCodes?.map((code, i) => (
                  <div key={i} className="p-2 bg-white border border-yellow-300 rounded font-mono text-center">
                    {code}
                  </div>
                ))}
              </div>
              <Button onClick={finishSetup}>Entendido, los he guardado</Button>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium mb-2">Opciones de seguridad</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  onClick={handleGenerateNewBackupCodes}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  Generar nuevos códigos de respaldo
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={handleDisable2FA}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  Desactivar autenticación de dos factores
                </Button>
              </div>
            </div>
          </div>
          
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Si 2FA no está habilitado o configuración en progreso
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Autenticación de dos factores</CardTitle>
          {status.enabled ? <Badge variant="warning">Pendiente</Badge> : <Badge variant="error">Desactivado</Badge>}
        </div>
        <CardDescription>
          Proteja su cuenta con una capa adicional de seguridad.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!setupState.inProgress ? (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-lg font-medium text-yellow-800">Recomendación de seguridad</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Se recomienda encarecidamente utilizar la autenticación de dos factores para aumentar la seguridad de su cuenta, especialmente para usuarios con roles administrativos.
              </p>
            </div>
            
            <Tabs defaultValue="app" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="app">Aplicación de autenticación</TabsTrigger>
                <TabsTrigger value="email">Correo electrónico</TabsTrigger>
              </TabsList>
              
              <TabsContent value="app" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-md font-medium">Usar aplicación de autenticación</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Utilice aplicaciones como Google Authenticator, Microsoft Authenticator o Authy para generar códigos de verificación.
                  </p>
                </div>
                
                <Button 
                  onClick={() => startSetup('2fa_app')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Configurando...' : 'Configurar autenticación con app'}
                </Button>
              </TabsContent>
              
              <TabsContent value="email" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-md font-medium">Usar verificación por email</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Reciba códigos de verificación en su correo electrónico cuando inicie sesión.
                  </p>
                </div>
                
                <Button 
                  onClick={() => startSetup('email')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Configurando...' : 'Configurar verificación por email'}
                </Button>
              </TabsContent>
            </Tabs>
            
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          // Configuración en progreso
          <div className="space-y-6">
            {setupState.step === 'verify' && (
              <>
                {setupState.method === '2fa_app' && setupState.qrCode && (
                  <div className="flex flex-col items-center space-y-4">
                    <h3 className="text-lg font-medium">Escanee el código QR</h3>
                    <p className="text-sm text-gray-500 text-center max-w-md">
                      Abra su aplicación de autenticación y escanee el código QR o ingrese manualmente el siguiente código:
                    </p>
                    
                    <div className="p-2 bg-white border rounded-md">
                      <img 
                        src={setupState.qrCode} 
                        alt="Código QR para autenticación" 
                        width={200} 
                        height={200} 
                      />
                    </div>
                    
                    {setupState.secret && (
                      <div className="font-mono text-sm bg-gray-100 p-2 rounded-md">
                        {setupState.secret}
                      </div>
                    )}
                  </div>
                )}
                
                {setupState.method === 'email' && (
                  <div className="flex flex-col items-center space-y-4">
                    <h3 className="text-lg font-medium">Verifique su correo electrónico</h3>
                    <p className="text-sm text-gray-500 text-center max-w-md">
                      Hemos enviado un código de verificación a su correo electrónico. Por favor, ingrese el código a continuación.
                    </p>
                  </div>
                )}
                
                <form onSubmit={verifyAndEnable} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Código de verificación</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ingrese el código de 6 dígitos"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-lg tracking-widest"
                      required
                      autoFocus
                      maxLength={6}
                    />
                  </div>
                  
                  {error && (
                    <Alert variant="error">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelSetup}
                      disabled={loading}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || verificationCode.length !== 6}
                      className="flex-1"
                    >
                      {loading ? 'Verificando...' : 'Verificar'}
                    </Button>
                  </div>
                </form>
              </>
            )}
            
            {setupState.step === 'success' && (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h3 className="text-lg font-medium text-green-800">Autenticación de dos factores activada</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Su cuenta ahora está protegida con autenticación de dos factores. A partir de ahora, necesitará un código de verificación cada vez que inicie sesión.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">Códigos de respaldo</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Guarde estos códigos en un lugar seguro. Cada código se puede usar una sola vez para acceder a su cuenta si pierde acceso a su método principal de autenticación.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {setupState.backupCodes?.map((code, i) => (
                      <div key={i} className="p-2 bg-white border border-yellow-300 rounded font-mono text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button onClick={finishSetup}>Entendido, los he guardado</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}