'use client';

/**
 * Realtime Client — subscription abstraction for live state updates.
 *
 * Currently simulated with setInterval. When the backend is ready,
 * replace with SSE (EventSource) or WebSocket subscriptions.
 *
 * Structure mirrors: subscribe(channel, handler) → unsubscribe()
 */

import type { StatusLevel } from './types';

export interface PlaceStatusUpdate {
  placeId: string;
  status: StatusLevel;
  signals?: Array<{ label: string; value: string }>;
  updatedAt: string;
}

export interface JobProgressUpdate {
  jobId: string;
  status: StatusLevel;
  progress?: number;
  message?: string;
  updatedAt: string;
}

export interface NodeHeartbeat {
  nodeId: string;
  status: 'alive' | 'degraded' | 'missing';
  updatedAt: string;
}

type UpdateHandler<T> = (update: T) => void;

class RealtimeClient {
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  // ─── Place Status ─────────────────────────────────────────────────────────

  subscribePlaceStatus(placeId: string, handler: UpdateHandler<PlaceStatusUpdate>): () => void {
    const key = `place:${placeId}`;
    this.clear(key);

    // Simulate occasional updates
    const timer = setInterval(() => {
      if (Math.random() > 0.7) {
        handler({
          placeId,
          status: 'healthy',
          signals: [],
          updatedAt: new Date().toISOString(),
        });
      }
    }, 8000);

    this.timers.set(key, timer);
    return () => this.clear(key);
  }

  // ─── Job Progress ─────────────────────────────────────────────────────────

  subscribeJobProgress(jobId: string, handler: UpdateHandler<JobProgressUpdate>): () => void {
    const key = `job:${jobId}`;
    this.clear(key);

    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 12 + 3), 100);
      handler({
        jobId,
        status: progress < 100 ? 'syncing' : 'healthy',
        progress,
        message: progress < 100 ? `Processing… ${progress}%` : 'Completed',
        updatedAt: new Date().toISOString(),
      });
      if (progress >= 100) this.clear(key);
    }, 2000);

    this.timers.set(key, timer);
    return () => this.clear(key);
  }

  // ─── Node Heartbeat ───────────────────────────────────────────────────────

  subscribeNodeHeartbeat(nodeId: string, handler: UpdateHandler<NodeHeartbeat>): () => void {
    const key = `node:${nodeId}`;
    this.clear(key);

    const timer = setInterval(() => {
      handler({
        nodeId,
        status: Math.random() > 0.05 ? 'alive' : 'degraded',
        updatedAt: new Date().toISOString(),
      });
    }, 5000);

    this.timers.set(key, timer);
    return () => this.clear(key);
  }

  private clear(key: string) {
    const existing = this.timers.get(key);
    if (existing) {
      clearInterval(existing);
      this.timers.delete(key);
    }
  }

  destroy() {
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
  }
}

export const realtimeClient = new RealtimeClient();
