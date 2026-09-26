'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  descriptor?: string;
  breadcrumbs?: Crumb[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function OperatorShell({ title, descriptor, breadcrumbs, badge, actions, children }: Props) {
  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
      {/* Dot-grid texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#0e0e0e]/90 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <Link href="/" className="flex items-center gap-1 text-[10px] font-semibold text-white/35 hover:text-white/65 uppercase tracking-wider transition-colors">
                <ChevronLeft size={11} />
                minilab.work
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-white/20 text-[10px]">/</span>
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-[10px] font-semibold text-white/35 hover:text-white/65 uppercase tracking-wider transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-black text-white tracking-tight leading-none">{title}</h1>
                {badge}
              </div>
              {descriptor && (
                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-[0.14em]">{descriptor}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-5 md:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
