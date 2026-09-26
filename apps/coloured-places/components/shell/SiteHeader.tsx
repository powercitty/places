import Link from 'next/link';

/**
 * The one persistent header for the whole site. Just the wordmark, linking home.
 * No subtitle, no counters — it is a header, nothing else.
 */
export function SiteHeader() {
  return (
    <header className="flex-shrink-0 pt-safe px-4 pb-2.5 border-b border-white/[0.06]">
      <Link
        href="/"
        className="inline-block mt-[3px] text-base font-black tracking-tight text-white leading-none hover:text-white/80 transition-colors"
      >
        minilab.work
      </Link>
    </header>
  );
}
