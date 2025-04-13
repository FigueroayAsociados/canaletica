'use client';

// src/app/(auth)/login/page.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfileByEmail } from '@/lib/services/userService';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, ingrese su email y contraseña');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Paso 1: Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        // Paso 2: Obtener el token de ID para la sesión del servidor
        const idToken = await userCredential.user.getIdToken();
        
        // Paso 3: Llamar a nuestra API para validar el token y establecer cookies de sesión
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          // Si el servidor rechaza el inicio de sesión, mostrar el error
          throw new Error(data.error || 'Error al validar la sesión');
        }
        
        console.log('Sesión iniciada correctamente:', data.user);
        
        // Navegar al dashboard después de iniciar sesión exitosamente
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error de inicio de sesión:', error);
      
      // Manejar errores específicos de Firebase Auth
      if (error.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas. Por favor, verifique que su email y contraseña sean correctos.');
      } else if (error.code === 'auth/user-not-found') {
        setError('Usuario no encontrado. Por favor, verifique su email.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta. Por favor, intente nuevamente.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Por favor, inténtelo más tarde o restablezca su contraseña.');
      } else {
        // Manejar errores de la API o mensajes personalizados
        setError(error.message || `Error al iniciar sesión: ${error.code || 'desconocido'}. Por favor, inténtelo de nuevo.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <div className="h-16 w-16 relative">
            <Image
              src="/logo.png"
              alt="CanalEtica Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </Link>
        <h2 className="mt-3 text-center text-3xl font-extrabold text-gray-900">
          CanalEtica
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Panel de Administración
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingrese sus credenciales para acceder al panel de administración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
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
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" required>
                    Contraseña
                  </Label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    ¿Olvidó su contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  autoComplete="current-password"
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
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-600 text-center w-full">
              ¿No tiene cuenta? Contacte al administrador del sistema.
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