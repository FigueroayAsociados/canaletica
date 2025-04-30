// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { CompanyProvider } from '@/lib/contexts/CompanyContext';
import { ReactQueryProvider } from '@/lib/contexts/ReactQueryProvider';
import dynamic from 'next/dynamic';

// Importamos el indicador de entorno de forma dinámica para evitar errores de hidratación
const EnvironmentIndicator = dynamic(
  () => import('@/components/ui/environment-indicator').then(mod => mod.EnvironmentIndicator),
  { ssr: false }
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CanalEtica - Canal de Denuncias ISO 37002:2021",
  description: "Canal de denuncias seguro y confidencial para empresas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        <ReactQueryProvider>
          <AuthProvider>
            <CompanyProvider>
              {children}
              {/* El indicador de entorno se mostrará sólo si no es producción o si es super admin */}
              <div id="environment-indicator-container" suppressHydrationWarning>
                {typeof window !== 'undefined' && (
                  <div>
                    {/* El componente real se renderiza desde el cliente */}
                    {/* @ts-ignore */}
                    <EnvironmentIndicator />
                  </div>
                )}
              </div>
            </CompanyProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
