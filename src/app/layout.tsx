
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ShopProvider } from '@/contexts/shop-context';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { PwaRegistration } from '@/components/pwa-registration';

export const metadata: Metadata = {
  title: 'Annadu ERP',
  description: 'Gestão de Estoque e Fluxo de Caixa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Annadu ERP',
  },
};

export const viewport: Viewport = {
  themeColor: '#3f51b5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        <link rel="icon" href="https://upload.wikimedia.org/wikipedia/commons/4/4f/Fini_Logo.png" />
        <link rel="apple-touch-icon" href="https://upload.wikimedia.org/wikipedia/commons/4/4f/Fini_Logo.png" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-primary/20 selection:text-primary min-h-screen">
        <PwaRegistration />
        <FirebaseClientProvider>
          <AuthProvider>
            <ShopProvider>
              {children}
              <Toaster />
            </ShopProvider>
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
