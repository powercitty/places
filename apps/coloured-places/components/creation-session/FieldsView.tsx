'use client';

import type { SessionField } from '@/lib/types';

interface Props {
  fields: SessionField[];
  readOnly?: boolean;
}

export function FieldsView({ fields, readOnly = false }: Props) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <label className="text-xs font-semibold text-white/70">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {field.description && (
              <span className="text-[10px] text-white/30">{field.description}</span>
            )}
          </div>

          {readOnly ? (
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/70">
              {field.value == null || field.value === '' ? (
                <span className="text-white/25 italic">not provided</span>
              ) : field.type === 'boolean' ? (
                String(field.value)
              ) : (
                String(field.value)
              )}
            </div>
          ) : field.type === 'select' ? (
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/70">
              {field.value ? String(field.value) : <span className="text-white/25 italic">select…</span>}
            </div>
          ) : field.type === 'boolean' ? (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              field.value ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : 'bg-white/[0.04] border-white/[0.07] text-white/40'
            }`}>
              <div className={`w-2 h-2 rounded-full ${field.value ? 'bg-emerald-400' : 'bg-white/20'}`} />
              {field.value ? 'Enabled' : 'Disabled'}
            </div>
          ) : field.type === 'textarea' ? (
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/70 font-mono whitespace-pre-wrap min-h-[60px]">
              {field.value ? String(field.value) : <span className="text-white/20 not-italic font-sans italic">{field.placeholder ?? 'empty'}</span>}
            </div>
          ) : (
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/70">
              {field.value ? String(field.value) : <span className="text-white/25 italic">{field.placeholder ?? 'empty'}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
