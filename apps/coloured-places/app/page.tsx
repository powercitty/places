import { PlaceGrid } from '@/components/PlaceGrid';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { queryClient } from '@/lib/query-client';

export default async function Home() {
  const summaries = await queryClient.listPlaces();

  return (
    <main className="relative min-h-[100svh] bg-[#0e0e0e]">
      {/* Subtle dot-grid background texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 min-h-[100svh] flex flex-col">
        <SiteHeader />

        {/* Grid — bottom padding clears the home-indicator safe area (PWA). */}
        <div className="flex-1 px-3 pt-4 pb-[max(1.5rem,var(--sab-max))] w-full">
          <PlaceGrid summaries={summaries} />
        </div>
      </div>
    </main>
  );
}
