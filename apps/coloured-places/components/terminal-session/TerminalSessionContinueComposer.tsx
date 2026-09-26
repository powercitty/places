'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { commandClient } from '@/lib/command-client';

export function TerminalSessionContinueComposer({
  terminalSessionId,
  onQueued,
}: {
  terminalSessionId: string;
  onQueued?: (status: string, command: string) => void;
}) {
  const router = useRouter();
  const [command, setCommand] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSend = command.trim().length > 0 && !isPending;

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
          Continue terminal
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
          Send one bounded shell command to this terminal session and append the excerpt to the
          inspector.
        </p>
      </div>

      <textarea
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="pwd && ls -la"
        className="min-h-[96px] w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-[13px] text-white/82 outline-none placeholder:text-white/25 focus:border-white/18"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-white/35">
          Keep commands short, inspectable, and safe for a bounded terminal excerpt.
        </p>
        <button
          type="button"
          disabled={!canSend}
          onClick={() => {
            const trimmed = command.trim();
            if (!trimmed) return;
            setFeedback(null);
            startTransition(async () => {
              try {
                const out = await commandClient.continueTerminalSession(terminalSessionId, trimmed);
                setCommand('');
                setFeedback(`Intervention queued: ${out.status.replace(/_/g, ' ')}`);
                onQueued?.(out.status, trimmed);
                router.refresh();
              } catch (error) {
                setFeedback(
                  error instanceof Error ? error.message : 'Terminal continuation failed.'
                );
              }
            });
          }}
          className="rounded-xl border border-white/[0.14] bg-white/8 px-3 py-2 text-[12px] font-semibold text-white/78 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {isPending ? 'Queueing...' : 'Queue intervention'}
        </button>
      </div>

      {feedback && <p className="text-[11px] text-white/55">{feedback}</p>}
    </div>
  );
}
