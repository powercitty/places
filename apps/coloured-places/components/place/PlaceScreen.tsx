import Link from 'next/link';
import type { PlaceDetail, ActionItem } from '@/lib/types';
import type { PlaceRecon, ReconItem } from '@/lib/reconciliation';
import { RECON_STATES, countRecon } from '@/lib/reconciliation';
import { getPlaceAspects, summarizeAspects, sortAspects, type Aspect } from '@/lib/aspects';
import { StateGlyph } from '@/components/recon/glyph';
import { ActionRail } from './ActionRail';
import {
  MessageSquare,
  RefreshCw,
  Eye,
  Trash2,
  KeyRound,
  ScrollText,
  Wrench,
  PlusCircle,
  Terminal,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface Props {
  place: PlaceDetail;
  recon: PlaceRecon;
}

/**
 * The ONE canonical place template. Every place renders through this, driven
 * entirely by `place` + `recon` data — no per-place layout code.
 *
 * Fixed to the viewport (no page scroll). Four stacked zones:
 *   Big card (~⅓)  →  Area 1 (actions, scroll x)  →  agent  →  Area 2 (list, scroll y)
 */
export function PlaceScreen({ place, recon }: Props) {
  const color = place.accentColor;

  // The "What's here" list is either a bespoke aspect adapter (Supabase, LAB 8GB…)
  // or the generic exists-vs-should recon list (the LAB 256 default pattern).
  const aspects = getPlaceAspects(place.id);
  const counts = countRecon(recon.items);
  const aspectSummary = aspects ? summarizeAspects(aspects) : null;

  const total = aspects ? aspects.length : counts.total;
  const needLook = aspectSummary ? aspectSummary.needLook : counts.anomalies;
  const worst = aspectSummary?.worst ?? null;

  // Five-state grammar (see docs/place-contracts.md). Only offline drains colour.
  const mode: 'offline' | 'unknown' | 'stale' | 'problem' | 'healthy' =
    place.status === 'offline' ? 'offline'
    : place.status === 'unknown' ? 'unknown'
    : place.status === 'stale' ? 'stale'
    : needLook > 0 ? 'problem'
    : 'healthy';
  const offline = mode === 'offline';

  // One-line verdict shown on the big card — the single worst thing.
  const verdict =
    mode === 'offline' ? 'It’s down — no vitals coming in'
    : mode === 'unknown' ? 'Can’t see it right now'
    : mode === 'stale' ? 'Not checked recently'
    : needLook === 0 ? 'Everything’s in place'
    : worst ? `${worst.label} — ${worst.value.toLowerCase()}`
    : needLook === 1 ? '1 thing needs a look'
    : `${needLook} things need a look`;

  // Generic recon observations, worst-first (used when there's no aspect adapter).
  const observations = [...recon.items].sort(
    (a, b) => RECON_STATES[b.state].severityRank - RECON_STATES[a.state].severityRank
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 px-3.5 pt-2.5 pb-safe">
      {/* ── Big card — the identity + verdict, ~⅓ of the frame ────────────── */}
      <section
        className="flex-none h-[32%] min-h-[185px] rounded-[22px] overflow-hidden relative flex flex-col justify-end p-4"
        style={{
          background: [
            `radial-gradient(ellipse 120% 80% at 50% 0%, ${color}${offline ? '55' : 'ee'} 0%, transparent 60%)`,
            `linear-gradient(165deg, ${color}${offline ? '44' : 'aa'} 0%, ${color}${offline ? '22' : '55'} 40%, #141414 80%)`,
          ].join(', '),
          border: `1px solid ${color}${offline ? '33' : '55'}`,
          filter: offline ? 'grayscale(0.85) brightness(0.7)' : mode === 'stale' ? 'brightness(0.85)' : 'none',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <h1 className="text-[2.05rem] font-black text-white leading-[0.98] tracking-tight drop-shadow">
          {place.shortLabel}
        </h1>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 mt-1.5">
          {place.descriptor}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span
            className="w-1.5 h-1.5 rounded-full flex-none"
            style={{ background: verdictColor(mode, counts.anomalies) }}
          />
          <span className="text-[12px] font-semibold text-white/80">{verdict}</span>
        </div>
      </section>

      {/* ── Area 1 — action squares, elastic horizontal rail ─────────────── */}
      <section className="flex-none">
        <ZoneLabel>Actions</ZoneLabel>
        <ActionRail>
          {place.actions.map((action) => (
            <ActionSquare key={action.id} action={action} placeId={place.id} color={color} />
          ))}
        </ActionRail>
      </section>

      {/* ── Talk to the agent — card font, the beautiful one ─────────────── */}
      <Link
        href={`/places/${place.id}/agent?q=${encodeURIComponent(
          'Give me the rundown — what’s out of place here, and what should I sort out first?'
        )}`}
        className="flex-none group relative flex items-center justify-between rounded-2xl overflow-hidden px-4 py-3 active:scale-[0.99] transition-transform"
        style={{
          background: `linear-gradient(135deg, ${color}bb 0%, ${color}66 55%, ${color}33 100%)`,
          border: `1px solid ${color}66`,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, ${color}ff, transparent)` }} />
        <span className="text-[1.05rem] font-black text-white tracking-tight leading-none">
          Talk to {place.shortLabel} agent
        </span>
        <span className="flex-none w-9 h-9 flex items-center justify-center rounded-full bg-white/15 border border-white/20 group-hover:bg-white/25 transition-colors">
          <MessageSquare size={16} className="text-white" />
        </span>
      </Link>

      {/* ── Area 2 — observations, scroll vertically INSIDE this fixed box ── */}
      <section className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-baseline justify-between">
          <ZoneLabel>What’s here</ZoneLabel>
          <span className="text-[10px] text-white/30 pr-0.5">
            {total} {aspects ? 'checks' : 'tracked'} · {needLook} need a look
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none rounded-xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
          {aspects ? (
            sortAspects(aspects).map((a) => (
              <AspectRow key={a.id} aspect={a} placeId={place.id} placeLabel={place.shortLabel} />
            ))
          ) : (
            <>
              {observations.length === 0 && (
                <p className="px-3 py-4 text-[11px] text-white/35">Nothing to show here yet.</p>
              )}
              {observations.map((item) => (
                <ObservationRow key={item.id} item={item} placeId={place.id} />
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30 mb-1.5">{children}</p>
  );
}

function verdictColor(mode: 'offline' | 'unknown' | 'stale' | 'problem' | 'healthy', anomalies: number): string {
  switch (mode) {
    case 'offline': return '#ff9a3d';
    case 'unknown': return '#9ca3af';
    case 'stale':   return '#9ca3af';
    case 'problem': return '#f97316';
    default:        return anomalies === 0 ? '#34d399' : '#f97316';
  }
}

/** Small square action button. Icon derived from the action's intent — no manual per-place wiring. */
function ActionSquare({ action, placeId, color }: { action: ActionItem; placeId: string; color: string }) {
  const Icon = actionIcon(action);
  const disabled = action.disabled;
  const href = action.href ?? `/places/${placeId}/agent?q=${encodeURIComponent(action.label)}`;
  const inner = (
    <>
      <span
        className="w-8 h-8 flex items-center justify-center rounded-lg mb-1.5"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        <Icon size={15} style={{ color: disabled ? 'rgba(255,255,255,0.3)' : `${color}ee` }} />
      </span>
      <span className="text-[10px] font-semibold text-white/70 leading-tight text-center line-clamp-2">
        {action.label}
      </span>
    </>
  );

  const cls =
    'flex-none w-[84px] h-[84px] flex flex-col items-center justify-center px-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]';

  if (disabled) {
    return <div className={`${cls} opacity-40`}>{inner}</div>;
  }
  return (
    <Link href={href} className={`${cls} hover:bg-white/[0.07] transition-colors active:scale-95`}>
      {inner}
    </Link>
  );
}

/** One aspect: label + one-line detail + a human value on the right + freshness. */
function AspectRow({ aspect, placeId, placeLabel }: { aspect: Aspect; placeId: string; placeLabel: string }) {
  const meta = RECON_STATES[aspect.state];
  return (
    <Link
      href={`/places/${placeId}/agent?q=${encodeURIComponent(
        `On ${placeLabel}, tell me about "${aspect.label}" (${aspect.value}). ${aspect.detail} What’s going on and what should I do?`
      )}`}
      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
    >
      <StateGlyph state={aspect.state} size={13} />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-bold text-white/85 truncate block">{aspect.label}</span>
        <p className="text-[10px] text-white/40 truncate mt-px">{aspect.detail}</p>
      </div>
      <div className="flex-none text-right">
        <div className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: meta.color }}>
          {aspect.value}
        </div>
        <div className={`text-[9px] mt-px ${aspect.fresh ? 'text-white/25' : 'text-amber-300/60'}`}>
          {aspect.checkedAgo}
        </div>
      </div>
    </Link>
  );
}

/** One observation: state tag + name + one-line reason. Tap → ask the agent about it. */
function ObservationRow({ item, placeId }: { item: ReconItem; placeId: string }) {
  const meta = RECON_STATES[item.state];
  return (
    <Link
      href={`/places/${placeId}/agent?q=${encodeURIComponent(
        `Tell me about "${item.name}" — ${meta.question.toLowerCase()}. ${item.reason ?? item.detail} What’s going on and what should I do?`
      )}`}
      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
    >
      <StateGlyph state={item.state} size={13} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-bold text-white/85 truncate">{item.name}</span>
          <span className="text-[9px] uppercase tracking-[0.1em] text-white/25 flex-none">{item.kind}</span>
        </div>
        <p className="text-[10px] text-white/40 truncate mt-px">{item.reason ?? item.detail}</p>
      </div>
      <span
        className="flex-none text-[9px] font-bold uppercase tracking-[0.08em] text-right"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
    </Link>
  );
}

// ── Icon heuristic ────────────────────────────────────────────────────────────

function actionIcon(action: ActionItem): LucideIcon {
  const s = `${action.id} ${action.label}`.toLowerCase();
  if (/reconcile|sync|refresh|re-run|rerun/.test(s)) return RefreshCw;
  if (/view|inspect|intent|reality|show|see/.test(s)) return Eye;
  if (/clean|delete|remove|garbage|purge/.test(s)) return Trash2;
  if (/key|secret|rotate|cred/.test(s)) return KeyRound;
  if (/log|event|history/.test(s)) return ScrollText;
  if (/drift|fix|resolve|repair/.test(s)) return Wrench;
  if (/register|add|create|new/.test(s)) return PlusCircle;
  if (/agent|shell|terminal|console/.test(s)) return Terminal;
  return Zap;
}
