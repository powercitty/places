'use client';

interface Item {
  label: string;
  value?: string;
  status?: 'ok' | 'warn' | 'error' | 'idle';
  note?: string;
}

interface Props {
  title: string;
  items: Item[];
}

const dotColor = { ok: 'bg-emerald-400', warn: 'bg-amber-400', error: 'bg-red-400', idle: 'bg-white/20' };
const textColor = { ok: 'text-emerald-400', warn: 'text-amber-400', error: 'text-red-400', idle: 'text-white/28' };

export function ObjectPanel({ title, items }: Props) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-2">{title}</p>
      <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-white/[0.02]">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`flex items-center justify-between px-3.5 py-2.5 ${i < items.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {item.status && (
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[item.status]}`} />
              )}
              <span className="text-xs text-white/65 truncate">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              {item.note && <span className="text-[10px] text-white/28">{item.note}</span>}
              {item.value && (
                <span className={`text-xs font-semibold ${item.status ? textColor[item.status] : 'text-white/65'}`}>
                  {item.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
