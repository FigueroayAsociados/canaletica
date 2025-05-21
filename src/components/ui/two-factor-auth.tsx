// src/components/ui/two-factor-auth.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { verifyLoginTwoFactor, generateLoginOTP } from '@/lib/services/twoFactorService';

interface TwoFactorAuthProps {
  userId: string;
  userEmail: string;
  method: '2fa_app' | 'email';
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorAuth({ userId, userEmail, method, onSuccess, onCancel }: TwoFactorAuthProps) {
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('code');

  // Iniciar verificación y enviar código OTP si es necesario
  useEffect(() => {
    if (method === 'email') {
      sendOTPCode();
    }
  }, [method, userId, userEmail]);

  // Manejar cuenta atrás para reenvío de código
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);

  // Enviar código OTP por email
  const sendOTPCode = async () => {
    try {
      setResending(true);
      setError(null);
      
      const result = await generateLoginOTP(userId, userEmail);
      
      if (!result.success) {
        setError(result.error || 'Error al enviar el código de verificación');
        return;
      }
      
      // Iniciar cuenta atrás para reenvío (30 segundos)
      setCountdown(30);
    } catch (err) {
      setError('Error al enviar el código de verificación');
      console.error('Error sending OTP:', err);
    } finally {
      setResending(false);
    }
  };

  // Verificar código de autenticación
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError('Por favor, ingrese el código de verificación');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await verifyLoginTwoFactor(userId, code, false);
      
      if (!result.success) {
        setError(result.error || 'Código de verificación incorrecto');
        return;
      }
      
      // Verificación exitosa
      onSuccess();
    } catch (err) {
      setError('Error al verificar el código');
      console.error('Error verifying code:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verificar código de respaldo
  const verifyBackupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!backupCode) {
      setError('Por favor, ingrese un código de respaldo');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await verifyLoginTwoFactor(userId, backupCode, true);
      
      if (!result.success) {
        setError(result.error || 'Código de respaldo incorrecto');
        return;
      }
      
      // Verificación exitosa
      onSuccess();
    } catch (err) {
      setError('Error al verificar el código de respaldo');
      console.error('Error verifying backup code:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Verificación de dos factores</CardTitle>
        <CardDescription>
          {method === '2fa_app' 
            ? 'Ingrese el código de su aplicación de autenticación'
            : `Hemos enviado un código de verificación a ${userEmail}`}
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="code" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code">Código de verificación</TabsTrigger>
          <TabsTrigger value="backup">Código de respaldo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="code">
          <CardContent>
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">
                  {method === '2fa_app' 
                    ? 'Código de su aplicación de autenticación'
                    : 'Código enviado a su email'}
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Ingrese el código de 6 dígitos"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg tracking-widest"
                  required
                  autoFocus
                  maxLength={6}
                />
              </div>
              
              {method === 'email' && (
                <div className="text-center text-sm">
                  {countdown > 0 ? (
                    <p>Puede solicitar un nuevo código en {countdown} segundos</p>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={sendOTPCode} 
                      disabled={resending}
                    >
                      {resending ? 'Enviando...' : 'Reenviar código'}
                    </Button>
                  )}
                </div>
              )}
              
              {error && (
                <Alert variant="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </Button>
            </form>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="backup">
          <CardContent>
            <form onSubmit={verifyBackupCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backup-code">Código de respaldo</Label>
                <p className="text-sm text-gray-500">
                  Si no puede acceder a su método principal de autenticación, ingrese uno de sus códigos de respaldo.
                </p>
                <Input
                  id="backup-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={backupCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, '');
                    setBackupCode(value);
                  }}
                  className="text-center text-lg tracking-wider"
                  required
                />
                <p className="text-xs text-gray-500">
                  Nota: Este código sólo se puede usar una vez.
                </p>
              </div>
              
              {error && (
                <Alert variant="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading || backupCode.length < 10}
              >
                {loading ? 'Verificando...' : 'Usar código de respaldo'}
              </Button>
            </form>
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <p className="text-xs text-gray-500">
          Protegido con autenticación de dos factores
        </p>
      </CardFooter>
    </Card>
  );
}