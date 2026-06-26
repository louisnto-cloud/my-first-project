import type { L } from './types';

// ─── OCIA milestones ─────────────────────────────────────────────────────────
// Her real path, with dates entered as Father Matthew gives them. The app
// counts down with encouragement, never pressure.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export interface OCIAMilestone {
  id: string;
  name: L;
  about: L;
}

export const OCIA_MILESTONES: OCIAMilestone[] = [
  {
    id: 'acceptance',
    name: u('Rite of Acceptance', 'Nghi thức Tiếp nhận'),
    about: u(
      'You are signed with the cross at the church door and welcomed as a catechumen.',
      'Bạn được ghi dấu thánh giá nơi cửa nhà thờ và được đón nhận làm dự tòng.',
    ),
  },
  {
    id: 'election',
    name: u('Rite of Election', 'Nghi thức Tuyển chọn'),
    about: u(
      'Near the start of Lent, the bishop writes your name in the Book of the Elect.',
      'Đầu Mùa Chay, giám mục ghi tên bạn vào Sách Tuyển Chọn.',
    ),
  },
  {
    id: 'scrutiny-1',
    name: u('First Scrutiny', 'Khảo hạch thứ nhất'),
    about: u('A Sunday of strengthening prayer (3rd Sunday of Lent).', 'Một Chúa nhật của lời nguyện thêm sức (Chúa nhật III Mùa Chay).'),
  },
  {
    id: 'scrutiny-2',
    name: u('Second Scrutiny', 'Khảo hạch thứ hai'),
    about: u('The second Sunday of prayer (4th Sunday of Lent).', 'Chúa nhật cầu nguyện thứ hai (Chúa nhật IV Mùa Chay).'),
  },
  {
    id: 'scrutiny-3',
    name: u('Third Scrutiny', 'Khảo hạch thứ ba'),
    about: u('The last of the three (5th Sunday of Lent).', 'Lần cuối trong ba lần (Chúa nhật V Mùa Chay).'),
  },
  {
    id: 'baptism',
    name: u('Baptism · the Easter Vigil', 'Rửa tội · Đêm Vọng Phục Sinh'),
    about: u(
      'The night of fire and water. The font, the white garment, the candle — and the reserved page of your passport.',
      'Đêm của lửa và nước. Giếng nước, tấm áo trắng, cây nến — và trang hộ chiếu được dành riêng cho bạn.',
    ),
  },
  {
    id: 'wedding',
    name: u('Your wedding', 'Lễ cưới của bạn'),
    about: u('October 2026. Two rings, one free yes.', 'Tháng Mười 2026. Hai chiếc nhẫn, một tiếng xin vâng tự do.'),
  },
];
