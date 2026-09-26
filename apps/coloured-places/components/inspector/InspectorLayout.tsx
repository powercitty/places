'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';
import { StatusChip } from '@/components/StatusChip';
import type { AnyInspector } from '@/lib/types';

interface Props {
  inspector: AnyInspector;
  children: ReactNode;
  timelineHref?: string;
  logsHref?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function InspectorLayout({ inspector, children, timelineHref, logsHref }: Props) {
  return (
    <div className="space-y-6">
      {/* Identity card */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-black text-white tracking-tight">{inspector.canonicalName}</h2>
              <StatusChip status={inspector.status} />
            </div>
            {inspector.descriptor && (
              <p className="text-xs text-white/45">{inspector.descriptor}</p>
            )}
            <div className="flex items-center gap-4 text-[10px] text-white/30 font-medium">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Created {formatDate(inspector.createdAt)}
              </span>
              <span>Updated {formatDate(inspector.updatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {timelineHref && (
              <Link
                href={timelineHref}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/9 border border-white/8 text-[11px] text-white/60 hover:text-white transition-all"
              >
                Timeline
                <ExternalLink size={10} />
              </Link>
            )}
            {logsHref && (
              <Link
                href={logsHref}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/9 border border-white/8 text-[11px] text-white/60 hover:text-white transition-all"
              >
                Logs
                <ExternalLink size={10} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
