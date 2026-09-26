'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

/**
 * Minimal accordion used on the mobile place profile to collapse
 * secondary observability sections behind a tap.
 */
export function CollapsibleSection({ title, children, defaultOpen = false, accentColor }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.025] transition-colors"
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: open && accentColor ? `${accentColor}cc` : 'rgba(255,255,255,0.38)' }}
        >
          {title}
        </span>
        <ChevronDown
          size={13}
          className={`text-white/28 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-white/[0.05] space-y-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
