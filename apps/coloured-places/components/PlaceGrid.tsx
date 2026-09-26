'use client';

import { PlaceCard } from './PlaceCard';
import type { PlaceSummary } from '@/lib/types';

interface Props {
  summaries: PlaceSummary[];
}

export function PlaceGrid({ summaries }: Props) {
  return (
    <div
      className="grid grid-cols-2 gap-3 w-full"
      role="list"
      aria-label="minilab.work places"
    >
      {summaries.map((summary) => (
        <div key={summary.id} role="listitem">
          <PlaceCard summary={summary} />
        </div>
      ))}
    </div>
  );
}
