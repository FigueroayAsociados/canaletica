// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { CompanyProvider } from '@/lib/contexts/CompanyContext';
import { ReactQueryProvider } from '@/lib/contexts/ReactQueryProvider';

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
          <CompanyProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </CompanyProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
