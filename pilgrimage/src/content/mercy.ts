import type { L } from './types';
import type { BeadKind } from './rosary';

// ─── The Divine Mercy Chaplet ────────────────────────────────────────────────
// Prayed on ordinary rosary beads, traditionally at three o'clock — the hour
// of mercy. Same bead-walk as the rosary trainer, different prayers.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const MERCY_NAME: L = u('The Divine Mercy Chaplet', 'Chuỗi Lòng Chúa Thương Xót');

export const MERCY_INTRO: L = u(
  'Prayed on ordinary rosary beads, especially at three in the afternoon — the hour Jesus died, the hour of mercy. It takes about seven minutes.',
  'Được đọc trên tràng hạt Mân Côi thường, đặc biệt lúc ba giờ chiều — giờ Chúa Giêsu chịu chết, giờ của lòng thương xót. Mất khoảng bảy phút.',
);

export interface MercyStep {
  bead: BeadKind;
  prayerId: string;
  count?: { i: number; n: number };
  decade?: number;
}

export function buildMercyChaplet(): MercyStep[] {
  const steps: MercyStep[] = [
    { bead: 'cross', prayerId: 'sign-of-the-cross' },
    { bead: 'large', prayerId: 'our-father' },
    { bead: 'small', prayerId: 'hail-mary' },
    { bead: 'cross', prayerId: 'apostles-creed' },
  ];

  for (let d = 1; d <= 5; d++) {
    steps.push({ bead: 'large', prayerId: 'eternal-father', decade: d });
    for (let i = 1; i <= 10; i++) {
      steps.push({ bead: 'small', prayerId: 'sorrowful-passion', count: { i, n: 10 }, decade: d });
    }
  }

  for (let i = 1; i <= 3; i++) {
    steps.push({ bead: 'medal', prayerId: 'holy-god', count: { i, n: 3 } });
  }
  steps.push({ bead: 'cross', prayerId: 'sign-of-the-cross' });
  return steps;
}
