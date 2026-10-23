import type { L } from './types';
import type { SaveDoc } from '@/lib/storage';
import { PRAYERS } from './prayers';

// ─── Achievements: panes of one rose window ─────────────────────────────────
// Badges are earned as individual panes of stained glass that assemble into
// one large rose window over time. Quiet, beautiful, never loud.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export interface Achievement {
  id: string;
  title: L;
  how: L;
  earned: (save: SaveDoc) => boolean;
}

const candleCount = (save: SaveDoc) => save.candles.length;
const lessonsDone = (save: SaveDoc) => Object.keys(save.completed).length;
const prayersKept = (save: SaveDoc) =>
  PRAYERS.filter((p) => (save.seen[p.id] ?? 0) > 0).length;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    title: u('First Step', 'Bước chân đầu tiên'),
    how: u('Complete your first lesson.', 'Hoàn thành bài học đầu tiên.'),
    earned: (s) => lessonsDone(s) >= 1,
  },
  {
    id: 'first-candle',
    title: u('One Small Flame', 'Một ngọn lửa nhỏ'),
    how: u('Light your first candle.', 'Thắp ngọn nến đầu tiên.'),
    earned: (s) => candleCount(s) >= 1,
  },
  {
    id: 'first-prayer',
    title: u('A Prayer to Keep', 'Một lời kinh để giữ'),
    how: u('Receive your first prayer.', 'Nhận lời kinh đầu tiên.'),
    earned: (s) => prayersKept(s) >= 1,
  },
  {
    id: 'first-reflection',
    title: u('Words of Your Own', 'Những lời của riêng bạn'),
    how: u('Write your first private reflection.', 'Viết dòng suy tư riêng đầu tiên.'),
    earned: (s) => s.journal.length >= 1,
  },
  {
    id: 'seven-candles',
    title: u('A Week of Light', 'Một tuần ánh sáng'),
    how: u('Light seven candles.', 'Thắp bảy ngọn nến.'),
    earned: (s) => candleCount(s) >= 7,
  },
  {
    id: 'hanoi-stamp',
    title: u('Hà Nội', 'Hà Nội'),
    how: u('Earn the first passport stamp.', 'Nhận con dấu hộ chiếu đầu tiên.'),
    earned: (s) => !!s.stamps.hanoi,
  },
  {
    id: 'ten-steps',
    title: u('A True Pilgrim', 'Người hành hương thực thụ'),
    how: u('Walk ten steps of the road.', 'Đi mười bước trên con đường.'),
    earned: (s) => lessonsDone(s) >= 10,
  },
  {
    id: 'three-prayers',
    title: u('A Small Treasury', 'Một kho tàng nhỏ'),
    how: u('Keep three prayers in your chapel.', 'Giữ ba lời kinh trong nhà nguyện.'),
    earned: (s) => prayersKept(s) >= 3,
  },
  {
    id: 'bruges-stamp',
    title: u('Bruges', 'Bruges'),
    how: u('Earn the second passport stamp.', 'Nhận con dấu hộ chiếu thứ hai.'),
    earned: (s) => !!s.stamps.bruges,
  },
  {
    id: 'thirty-candles',
    title: u('A Month of Mornings', 'Một tháng những buổi sớm'),
    how: u('Light thirty candles.', 'Thắp ba mươi ngọn nến.'),
    earned: (s) => candleCount(s) >= 30,
  },
  {
    id: 'seven-reflections',
    title: u('A Pressed Flower', 'Một đóa hoa ép'),
    how: u('Write seven reflections.', 'Viết bảy dòng suy tư.'),
    earned: (s) => s.journal.length >= 7,
  },
  {
    id: 'paris-stamp',
    title: u('Paris', 'Paris'),
    how: u('Earn the third passport stamp.', 'Nhận con dấu hộ chiếu thứ ba.'),
    earned: (s) => !!s.stamps.paris,
  },
  {
    id: 'brussels-stamp',
    title: u('Brussels', 'Brussels'),
    how: u('Earn the fourth passport stamp.', 'Nhận con dấu hộ chiếu thứ tư.'),
    earned: (s) => !!s.stamps.brussels,
  },
  {
    id: 'open-missal',
    title: u('The Open Missal', 'Cuốn sách lễ mở ra'),
    how: u('Walk through the whole Mass.', 'Đi trọn một Thánh lễ.'),
    earned: (s) => (s.seen['mass-walkthrough'] ?? 0) >= 1,
  },
  {
    id: 'ring-of-roses',
    title: u('A Ring of Roses', 'Một vòng hoa hồng'),
    how: u('Pray a whole rosary, bead by bead.', 'Nguyện trọn một chuỗi Mân Côi, từng hạt một.'),
    earned: (s) => (s.seen['rosary'] ?? 0) >= 1,
  },
  {
    id: 'parish-stamp',
    title: u('Home', 'Nhà'),
    how: u('Earn the fifth stamp — the whole main road, walked.', 'Nhận con dấu thứ năm — trọn con đường chính đã đi qua.'),
    earned: (s) => !!s.stamps.parish,
  },
];
