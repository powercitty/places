import type { SessionWarning } from '@/lib/types';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface Props {
  warnings: SessionWarning[];
}

const config = {
  info:     { icon: Info,          bg: 'bg-sky-500/8',    border: 'border-sky-500/18',    title: 'text-sky-300',    body: 'text-sky-200/60' },
  caution:  { icon: AlertTriangle, bg: 'bg-amber-500/8',  border: 'border-amber-500/20',  title: 'text-amber-300',  body: 'text-amber-200/65' },
  critical: { icon: XCircle,       bg: 'bg-red-500/8',    border: 'border-red-500/20',    title: 'text-red-300',    body: 'text-red-200/65' },
};

export function WarningsView({ warnings }: Props) {
  if (warnings.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-white/30">No warnings — you may proceed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {warnings.map((w) => {
        const c = config[w.severity];
        const Icon = c.icon;
        return (
          <div key={w.id} className={`flex gap-3 p-4 rounded-xl border ${c.bg} ${c.border}`}>
            <Icon size={16} className={`flex-shrink-0 mt-0.5 ${c.title}`} />
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${c.title}`}>{w.title}</p>
              <p className={`text-xs leading-relaxed ${c.body}`}>{w.body}</p>
              <p className="text-[9px] text-white/25 mt-1.5 uppercase tracking-wider">
                {w.canProceed ? 'Can proceed with caution' : 'Blocks confirmation'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
