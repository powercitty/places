import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RealtimeProvider } from '@/components/shell/RealtimeProvider';

// viewport-fit: cover — required for env(safe-area-inset-*) to return real values.
// Without this, safe-area-inset-* is always 0 and Dynamic Island / home indicator
// overlap with content.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e0e0e',
  colorScheme: 'dark',
  // resizes-visual: only the visual viewport shrinks when virtual keyboard opens,
  // so fixed/sticky elements stay put and the layout box is unchanged.
  // This is the correct mode for apps that manage their own scroll containers.
  interactiveWidget: 'resizes-visual',
};

export const metadata: Metadata = {
  title: {
    default: 'minilab.work',
    template: '%s — minilab.work',
  },
  description: 'Operational cockpit for the LAB ecosystem',
  applicationName: 'minilab.work',
  appleWebApp: {
    capable: true,
    title: 'minilab.work',
    // black-translucent: status bar blends into the app, maximising screen real estate.
    // Requires viewport-fit=cover to avoid content sitting under the status bar.
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-black text-white">
        <RealtimeProvider>
          {/* There is no desktop layout. The app is mobile-only; on a wider
              screen it is simply centered as a phone-sized mini-app that
              shrinks fluidly with the window. */}
          <div className="md:flex md:items-center md:justify-center md:min-h-screen md:p-4">
            <div className="relative w-full mx-auto min-h-[100svh] bg-[#0e0e0e] overflow-x-hidden md:min-h-0 md:w-auto md:aspect-[9/19.5] md:h-[calc(100svh-2rem)] md:max-h-[880px] md:max-w-[420px] md:overflow-y-auto md:rounded-[42px] md:border md:border-white/10 md:shadow-2xl scrollbar-none">
              {children}
            </div>
          </div>
        </RealtimeProvider>
      </body>
    </html>
  );
}
