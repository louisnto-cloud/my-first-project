import type { ArtKind, L } from './types';

// ─── The Rosary Trainer ──────────────────────────────────────────────────────
// The rosary she owns becomes something she can actually pray: bead by bead,
// with the Joyful Mysteries — stories she has already walked in this app.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export interface Mystery {
  n: number;
  title: L;
  art: ArtKind;
  meditation: L;
}

export const JOYFUL_MYSTERIES: Mystery[] = [
  {
    n: 1,
    title: u('The Annunciation', 'Thiên thần truyền tin'),
    art: 'annunciation',
    meditation: u(
      'The angel greets Mary, and she says yes. While the beads pass, stay in that small room.',
      'Thiên thần chào Đức Mẹ Maria, và Mẹ thưa xin vâng. Khi lần chuỗi, hãy ở lại trong căn phòng nhỏ ấy.',
    ),
  },
  {
    n: 2,
    title: u('The Visitation', 'Đức Mẹ thăm viếng bà Êlisabét'),
    art: 'visitation',
    meditation: u(
      'Mary hurries through the hills to help her older cousin Elizabeth. Joy travels; love goes first.',
      'Mẹ Maria vội vã băng đồi đến giúp người chị họ lớn tuổi Êlisabét. Niềm vui biết lên đường; tình yêu luôn đi trước.',
    ),
  },
  {
    n: 3,
    title: u('The Nativity', 'Chúa Giêsu giáng sinh'),
    art: 'nativity',
    meditation: u(
      'The child is born in Bethlehem. Hold one face you love before the manger as you pray.',
      'Hài nhi sinh ra ở Bêlem. Khi đọc kinh, hãy đặt một gương mặt bạn thương trước máng cỏ.',
    ),
  },
  {
    n: 4,
    title: u('The Presentation', 'Dâng Chúa trong Đền Thánh'),
    art: 'presentation-temple',
    meditation: u(
      'Mary and Joseph bring the baby to the temple, and old Simeon holds the light of the world in his arms.',
      'Mẹ Maria và thánh Giuse đem hài nhi lên Đền Thánh, và cụ già Simêon được ẵm trên tay ánh sáng của trần gian.',
    ),
  },
  {
    n: 5,
    title: u('The Finding in the Temple', 'Tìm thấy Chúa trong Đền Thánh'),
    art: 'finding-temple',
    meditation: u(
      'Twelve years old, lost for three days, found among the teachers. Whatever feels lost can be found in his Father’s house.',
      'Mười hai tuổi, lạc mất ba ngày, được tìm thấy giữa các bậc thầy. Điều gì tưởng đã mất đều có thể tìm lại trong nhà Cha Ngài.',
    ),
  },
];

// ─── Bead-by-bead sequence ───────────────────────────────────────────────────

export type BeadKind = 'cross' | 'large' | 'small' | 'chain' | 'medal';

export interface RosaryStep {
  bead: BeadKind;
  prayerId: string;
  /** For Hail Marys inside a decade: position within the ten. */
  count?: { i: number; n: number };
  /** Mystery being contemplated (1–5), when inside a decade. */
  mystery?: number;
  /** True when this step announces a new mystery. */
  announce?: boolean;
}

export function buildRosary(): RosaryStep[] {
  const steps: RosaryStep[] = [
    { bead: 'cross', prayerId: 'sign-of-the-cross' },
    { bead: 'cross', prayerId: 'apostles-creed' },
    { bead: 'large', prayerId: 'our-father' },
  ];
  for (let i = 1; i <= 3; i++) {
    steps.push({ bead: 'small', prayerId: 'hail-mary', count: { i, n: 3 } });
  }
  steps.push({ bead: 'chain', prayerId: 'glory-be' });

  for (const m of JOYFUL_MYSTERIES) {
    steps.push({ bead: 'medal', prayerId: 'announce', mystery: m.n, announce: true });
    steps.push({ bead: 'large', prayerId: 'our-father', mystery: m.n });
    for (let i = 1; i <= 10; i++) {
      steps.push({ bead: 'small', prayerId: 'hail-mary', count: { i, n: 10 }, mystery: m.n });
    }
    steps.push({ bead: 'chain', prayerId: 'glory-be', mystery: m.n });
  }

  steps.push({ bead: 'medal', prayerId: 'hail-holy-queen' });
  steps.push({ bead: 'cross', prayerId: 'sign-of-the-cross' });
  return steps;
}
