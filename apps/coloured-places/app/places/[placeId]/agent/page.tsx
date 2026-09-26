import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import { AgentChat } from '@/components/agent/AgentChat';

interface Props {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function AgentPage({ params, searchParams }: Props) {
  const { placeId } = await params;
  const { q } = await searchParams;
  const place = await queryClient.getPlace(placeId);
  if (!place) notFound();
  // q comes from ActionRail non-href actions: ?q=<action label>
  return <AgentChat key={`${place.id}:${q ?? ''}`} place={place} initialQuery={q} />;
}

export async function generateStaticParams() {
  const places = await queryClient.listPlaces();
  return places.map((p) => ({ placeId: p.id }));
}
