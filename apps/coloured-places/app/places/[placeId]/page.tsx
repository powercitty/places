import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import { getPlaceRecon } from '@/lib/reconciliation';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { PlaceScreen } from '@/components/place/PlaceScreen';

interface Props {
  params: Promise<{ placeId: string }>;
}

export default async function PlacePage({ params }: Props) {
  const { placeId } = await params;
  const place = await queryClient.getPlace(placeId);
  if (!place) notFound();

  const recon = getPlaceRecon(placeId);

  return (
    // Fills the global mini-app frame exactly; only Area 2 scrolls inside it.
    <div className="relative h-[100svh] md:h-full overflow-hidden flex flex-col bg-[#0e0e0e]">
      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      <SiteHeader />
      <PlaceScreen place={place} recon={recon} />
    </div>
  );
}

export async function generateStaticParams() {
  const places = await queryClient.listPlaces();
  return places.map((p) => ({ placeId: p.id }));
}
