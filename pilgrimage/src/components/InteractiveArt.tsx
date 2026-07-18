'use client';

// Gives a piece of sacred art quiet life: it leans a few pixels toward your
// touch (and to the phone's tilt), so the scene feels like a window with depth
// rather than a flat picture. Falls back to a plain still on reduced motion.

import { useEffect, useRef } from 'react';
import type { ArtKind } from '@/content/types';
import { SacredArt } from '@/components/SacredArt';

export function InteractiveArt({
  kind,
  className = '',
  drift = true,
}: {
  kind: ArtKind;
  className?: string;
  drift?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  const set = (px: number, py: number) => {
    const el = layer.current;
    if (!el) return;
    el.style.setProperty('--px', px.toFixed(3));
    el.style.setProperty('--py', py.toFixed(3));
  };

  const onPointer = (e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const reset = () => set(0, 0);

  // Subtle response to physical tilt, when the device offers it.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const onTilt = (e: DeviceOrientationEvent) => {
      const g = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30));
      const b = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 30));
      set(g, b);
    };
    window.addEventListener('deviceorientation', onTilt);
    return () => window.removeEventListener('deviceorientation', onTilt);
  }, []);

  return (
    <div
      ref={wrap}
      onPointerMove={onPointer}
      onPointerLeave={reset}
      className={`relative h-full w-full overflow-hidden ${className}`}
    >
      <div ref={layer} className="art-parallax h-full w-full">
        <SacredArt kind={kind} rounded={false} drift={drift} />
      </div>
    </div>
  );
}
