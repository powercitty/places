'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface Props {
  children: ReactNode;
}

/**
 * Horizontal action rail with an elastic, rubber-band drag — it springs back
 * even when the squares don't overflow, so the rail always feels alive (like
 * over-pulling a list on a phone). On desktop a slim, grabbable scrollbar
 * appears whenever there's more to scroll.
 */
export function ActionRail({ children }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  const [maxDrag, setMaxDrag] = useState(0);
  const [trackW, setTrackW] = useState(0);
  const [thumbW, setThumbW] = useState(0);

  useEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      const ct = contentRef.current;
      if (!vp || !ct) return;
      const vw = vp.clientWidth;
      const cw = ct.scrollWidth;
      const md = Math.max(0, cw - vw);
      setMaxDrag(md);
      setTrackW(vw);
      // Proportional thumb, never wider than the track (content-fits case).
      setThumbW(cw > 0 ? Math.min(vw, Math.max(32, (vw / cw) * vw)) : vw);
      if (x.get() < -md) x.set(-md);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [x]);

  const scrollable = maxDrag > 0;

  // Thumb follows content position.
  const thumbX = useTransform(x, (v) =>
    maxDrag > 0 ? (-v / maxDrag) * (trackW - thumbW) : 0
  );

  // Grab the scrollbar with the mouse: map a pointer position on the track to content offset.
  const seekFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track || maxDrag <= 0) return;
    const rect = track.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - rect.left - thumbW / 2) / (trackW - thumbW)));
    x.set(-p * maxDrag);
  };

  const draggingRef = useRef(false);
  const onTrackDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };
  const onTrackMove = (e: React.PointerEvent) => {
    if (draggingRef.current) seekFromPointer(e.clientX);
  };
  const onTrackUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div>
      <div ref={viewportRef} className="overflow-hidden">
        <motion.div
          ref={contentRef}
          className="flex gap-2 w-max cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: -maxDrag, right: 0 }}
          dragElastic={0.22}
          style={{ x }}
        >
          {children}
        </motion.div>
      </div>

      {/* Slim slide bar. Always shown so the rail always reads as a rail;
          grabbable with the mouse only when there is actually more to scroll. */}
      <div
        ref={trackRef}
        onPointerDown={scrollable ? onTrackDown : undefined}
        onPointerMove={scrollable ? onTrackMove : undefined}
        onPointerUp={scrollable ? onTrackUp : undefined}
        className={`relative h-2 mt-2 flex items-center touch-none ${scrollable ? 'cursor-pointer' : ''}`}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/[0.06]" />
        <motion.div
          className={`absolute top-[calc(50%-1.5px)] h-[3px] rounded-full transition-colors ${
            scrollable ? 'bg-white/25 hover:bg-white/45' : 'bg-white/12'
          }`}
          style={{ width: thumbW, x: thumbX }}
        />
      </div>
    </div>
  );
}
