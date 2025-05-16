'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getReportByCode, getReportByCodeAndAccessCode } from '@/lib/services/reportService';
import { useCompany } from '@/lib/hooks';

export default function TrackPage() {
  const router = useRouter();
  const { companyId: contextCompanyId } = useCompany();
  const [reportCode, setReportCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('identified');

  const handleIdentifiedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportCode || !contactEmail) {
      setError('Por favor, ingrese el código de denuncia y el email de contacto');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // TODO: Implementar la verificación de email de contacto
      // Por ahora, solo verificamos que el reporte existe
      const result = await getReportByCode(contextCompanyId, reportCode);
      
      if (result.success && result.reportId) {
        // Redireccionar a la página de detalles del reporte
        router.push(`/track/${reportCode}?email=${encodeURIComponent(contactEmail)}`);
      } else {
        setError(result.error || 'No se encontró ninguna denuncia con ese código');
      }
    } catch (error) {
      console.error('Error al buscar la denuncia:', error);
      setError('Ha ocurrido un error al buscar la denuncia');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportCode || !accessCode) {
      setError('Por favor, ingrese el código de denuncia y el código de acceso');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await getReportByCodeAndAccessCode(contextCompanyId, reportCode, accessCode);
      
      if (result.success && result.reportId) {
        // Redireccionar a la página de detalles del reporte
        router.push(`/track/${reportCode}?accessCode=${encodeURIComponent(accessCode)}`);
      } else {
        setError(result.error || 'Códigos incorrectos o denuncia no encontrada');
      }
    } catch (error) {
      console.error('Error al buscar la denuncia:', error);
      setError('Ha ocurrido un error al buscar la denuncia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="identified">Denuncia Identificada</TabsTrigger>
            <TabsTrigger value="anonymous">Denuncia Anónima</TabsTrigger>
          </TabsList>

          <TabsContent value="identified">
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700">
                  Si realizó una denuncia proporcionando sus datos de contacto, ingrese
                  el código de denuncia y el correo electrónico que utilizó.
                </p>
              </div>

              <form onSubmit={handleIdentifiedSearch} className="space-y-4">
                <div>
                  <Label htmlFor="reportCode" required>
                    Código de Denuncia
                  </Label>
                  <Input
                    id="reportCode"
                    value={reportCode}
                    onChange={(e) => setReportCode(e.target.value)}
                    placeholder="Ej: ABC12345"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail" required>
                    Correo Electrónico de Contacto
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Ingrese el email que proporcionó en la denuncia"
                    className="mt-1"
                  />
                </div>

                {error && (
                  <Alert variant="error" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Buscando...' : 'Buscar Denuncia'}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="anonymous">
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700">
                  Si realizó una denuncia anónima, ingrese el código de denuncia y el
                  código de acceso que recibió al finalizar el proceso.
                </p>
              </div>

              <form onSubmit={handleAnonymousSearch} className="space-y-4">
                <div>
                  <Label htmlFor="anonymousReportCode" required>
                    Código de Denuncia
                  </Label>
                  <Input
                    id="anonymousReportCode"
                    value={reportCode}
                    onChange={(e) => setReportCode(e.target.value)}
                    placeholder="Ej: ABC12345"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="accessCode" required>
                    Código de Acceso
                  </Label>
                  <Input
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Ingrese el código de acceso que recibió"
                    className="mt-1"
                  />
                </div>

                {error && (
                  <Alert variant="error" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Buscando...' : 'Buscar Denuncia'}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}