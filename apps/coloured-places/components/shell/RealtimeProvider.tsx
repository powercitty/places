'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { realtimeClient, type PlaceStatusUpdate, type NodeHeartbeat } from '@/lib/realtime-client';

// ─── Context ──────────────────────────────────────────────────────────────

interface RealtimeState {
  placeUpdates: Map<string, PlaceStatusUpdate>;
  nodeHeartbeats: Map<string, NodeHeartbeat>;
}

const RealtimeContext = createContext<RealtimeState>({
  placeUpdates: new Map(),
  nodeHeartbeats: new Map(),
});

export function useRealtimePlace(placeId: string) {
  const ctx = useContext(RealtimeContext);
  return ctx.placeUpdates.get(placeId) ?? null;
}

export function useNodeHeartbeat(nodeId: string) {
  const ctx = useContext(RealtimeContext);
  return ctx.nodeHeartbeats.get(nodeId) ?? null;
}

// ─── Provider ─────────────────────────────────────────────────────────────

const WATCHED_PLACES = ['lab-512', 'lab-8gb', 'lab-256', 'supabase', 'lab-id', 'workflows'];
const WATCHED_NODES  = ['node-8gb', 'node-256', 'node-512'];

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [placeUpdates, setPlaceUpdates] = useState<Map<string, PlaceStatusUpdate>>(new Map());
  const [nodeHeartbeats, setNodeHeartbeats] = useState<Map<string, NodeHeartbeat>>(new Map());

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    for (const placeId of WATCHED_PLACES) {
      unsubs.push(
        realtimeClient.subscribePlaceStatus(placeId, (update) => {
          setPlaceUpdates((prev) => new Map(prev).set(placeId, update));
        })
      );
    }

    for (const nodeId of WATCHED_NODES) {
      unsubs.push(
        realtimeClient.subscribeNodeHeartbeat(nodeId, (update) => {
          setNodeHeartbeats((prev) => new Map(prev).set(nodeId, update));
        })
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ placeUpdates, nodeHeartbeats }}>
      {children}
    </RealtimeContext.Provider>
  );
}
