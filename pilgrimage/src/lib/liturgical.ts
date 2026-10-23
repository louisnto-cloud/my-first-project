// ─── Liturgical season awareness ─────────────────────────────────────────────
// A simple computed approach: the current season from today's date. Exact
// precision on every feast is not required — only the great seasons.

import type { L } from '@/content/types';

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export type SeasonId = 'advent' | 'christmas' | 'lent' | 'easter' | 'ordinary';

export interface Season {
  id: SeasonId;
  name: L;
  line: L;
  /** Which of the five tokens accents the banner. */
  tone: 'garnet' | 'gold' | 'incense';
}

const SEASONS: Record<SeasonId, Season> = {
  advent: {
    id: 'advent',
    name: u('Advent', 'Mùa Vọng'),
    line: u('The season of waiting. The light is coming.', 'Mùa của đợi chờ. Ánh sáng đang đến.'),
    tone: 'garnet',
  },
  christmas: {
    id: 'christmas',
    name: u('Christmas', 'Mùa Giáng Sinh'),
    line: u('The light has come. The season of the stable and the star.', 'Ánh sáng đã đến. Mùa của máng cỏ và ngôi sao.'),
    tone: 'gold',
  },
  lent: {
    id: 'lent',
    name: u('Lent', 'Mùa Chay'),
    line: u('Forty days, walking toward Jerusalem.', 'Bốn mươi ngày, tiến về Giêrusalem.'),
    tone: 'garnet',
  },
  easter: {
    id: 'easter',
    name: u('Easter', 'Mùa Phục Sinh'),
    line: u('Fifty days of morning. He is risen.', 'Năm mươi ngày của buổi sáng. Ngài đã sống lại.'),
    tone: 'gold',
  },
  ordinary: {
    id: 'ordinary',
    name: u('Ordinary Time', 'Mùa Thường Niên'),
    line: u('The green season, where most of life is lived.', 'Mùa xanh, nơi phần lớn cuộc sống diễn ra.'),
    tone: 'incense',
  },
};

/** Anonymous Gregorian computus. */
export function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** First Sunday of Advent: the Sunday on or after November 27. */
function adventStart(year: number): Date {
  const d = new Date(year, 10, 27);
  const offset = (7 - d.getDay()) % 7;
  return addDays(d, offset);
}

export function currentSeason(today = new Date()): Season {
  const y = today.getFullYear();
  const t = new Date(y, today.getMonth(), today.getDate()).getTime();

  // Christmas season runs into the new year (through the Baptism of the Lord,
  // approximated as January 12).
  if (t <= new Date(y, 0, 12).getTime()) return SEASONS.christmas;

  const easter = easterDate(y);
  const ashWednesday = addDays(easter, -46);
  const pentecost = addDays(easter, 49);

  if (t >= ashWednesday.getTime() && t < easter.getTime()) return SEASONS.lent;
  if (t >= easter.getTime() && t <= pentecost.getTime()) return SEASONS.easter;
  if (t >= adventStart(y).getTime() && t < new Date(y, 11, 25).getTime()) return SEASONS.advent;
  if (t >= new Date(y, 11, 25).getTime()) return SEASONS.christmas;
  return SEASONS.ordinary;
}
