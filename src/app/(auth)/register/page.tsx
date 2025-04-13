'use client';

// src/app/(auth)/register/page.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createUserProfile } from '@/lib/services/userService';

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('investigator');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!displayName || !email || !password || !confirmPassword || !role) {
      setError('Todos los campos son obligatorios');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      
      // Crear el usuario en Firebase Authentication
      const userCredential = await signup(email, password);
      const user = userCredential.user;
      
      // Crear el perfil del usuario en Firestore
      // Utilizamos un ID de compañía predeterminado por ahora, esto se debe actualizar
      // en una implementación real con multi-tenant
      const companyId = 'default';
      
      await createUserProfile(companyId, user.uid, {
        displayName,
        email,
        role,
        createdAt: new Date(),
      });
      
      // Redireccionar al dashboard o a una página de confirmación
      router.push('/login?registered=true');
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado');
      } else if (error.code === 'auth/invalid-email') {
        setError('El correo electrónico no es válido');
      } else {
        setError('Error al registrar usuario. Por favor, inténtelo de nuevo.');
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
          Registro de Administradores
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Crear Cuenta</CardTitle>
            <CardDescription>
              Complete el formulario para registrar un nuevo administrador en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <Label htmlFor="displayName" required>
                  Nombre Completo
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nombre y Apellido"
                  className="mt-1"
                />
              </div>

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
                <Label htmlFor="password" required>
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" required>
                  Confirmar Contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label htmlFor="role" required>
                  Rol en el Sistema
                </Label>
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1"
                >
                  <option value="admin">Administrador</option>
                  <option value="investigator">Investigador</option>
                </Select>
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
                {loading ? 'Registrando...' : 'Registrar Usuario'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-600 text-center w-full">
              ¿Ya tiene una cuenta?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Iniciar Sesión
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