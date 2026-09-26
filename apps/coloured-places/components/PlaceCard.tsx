'use client';

import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { PlaceSummary } from '@/lib/types';
import { PlaceCardFront } from './PlaceCardFront';

interface Props {
  summary: PlaceSummary;
}

export function PlaceCard({ summary }: Props) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const tiltX = useTransform(mouseY, [-0.5, 0.5], [2.5, -2.5]);
  const tiltY = useTransform(mouseX, [-0.5, 0.5], [-2.5, 2.5]);

  return (
    <Link
      href={`/places/${summary.id}`}
      className="block outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-[20px]"
      aria-label={`Open ${summary.title}`}
    >
      <motion.div
        className="relative aspect-square rounded-[20px] overflow-hidden"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mouseX.set((e.clientX - r.left) / r.width - 0.5);
          mouseY.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
        whileHover={{ scale: 1.018, transition: { duration: 0.18 } }}
        whileTap={{ scale: 0.972, transition: { duration: 0.09 } }}
      >
        <motion.div
          className="w-full h-full"
          style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' }}
        >
          <PlaceCardFront summary={summary} />
        </motion.div>
      </motion.div>
    </Link>
  );
}
