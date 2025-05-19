'use client';

// src/app/(auth)/forgot-password/page.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CompanyLogo } from '@/components/ui/company-logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Por favor, ingrese su dirección de correo electrónico');
      return;
    }
    
    try {
      setError(null);
      setSuccessMessage(null);
      setLoading(true);
      
      await sendPasswordResetEmail(auth, email);
      
      setSuccessMessage(
        'Se ha enviado un correo electrónico con instrucciones para restablecer su contraseña. Por favor, revise su bandeja de entrada.'
      );
      setEmail('');
    } catch (error: any) {
      console.error('Error al enviar email de recuperación:', error);
      
      if (error.code === 'auth/user-not-found') {
        // No revelamos si el email existe o no por seguridad
        setSuccessMessage(
          'Si existe una cuenta con ese correo electrónico, recibirá un enlace para restablecer su contraseña.'
        );
      } else if (error.code === 'auth/invalid-email') {
        setError('La dirección de correo electrónico no es válida.');
      } else {
        setError('Ha ocurrido un error al enviar el correo de recuperación. Por favor, inténtelo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <CompanyLogo size="large" showName={false} />
        </Link>
        <h2 className="mt-3 text-center text-3xl font-extrabold text-gray-900">
          CanalEtica
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Recuperación de Contraseña
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Restablecer Contraseña</CardTitle>
            <CardDescription>
              Ingrese su correo electrónico y le enviaremos instrucciones para restablecer su contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage ? (
              <Alert variant="success" className="mb-4">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <Label htmlFor="email" required>
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="su@email.com"
                    className="mt-1"
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <Alert variant="error">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Enviando...' : 'Enviar Instrucciones'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-600 text-center w-full">
              ¿Recordó su contraseña?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Volver al Inicio de Sesión
              </Link>
            </div>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Volver al Inicio
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}