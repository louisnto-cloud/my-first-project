import type { L, World } from '../types';
import { HANOI } from './hanoi';
import { BRUGES_LESSONS_1 } from './bruges-part1';
import { BRUGES_LESSONS_2 } from './bruges-part2';

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

// Future worlds appear on the map as places further down the road.
// Their lessons arrive in Phases 3–4.

const BRUGES: World = {
  id: 'bruges',
  name: u('Jesus', 'Chúa Giêsu'),
  church: u('Basilica of the Holy Blood', 'Vương cung thánh đường Máu Thánh'),
  place: u('Bruges, Belgium', 'Bruges, Bỉ'),
  theme: u('Who is Jesus?', 'Chúa Giêsu là ai?'),
  lessons: [...BRUGES_LESSONS_1, ...BRUGES_LESSONS_2],
};

const PARIS: World = {
  id: 'paris',
  name: u('The Church', 'Giáo hội'),
  church: u('Notre-Dame de Paris', 'Nhà thờ Đức Bà Paris'),
  place: u('Paris, France', 'Paris, Pháp'),
  theme: u('The Church and the Mass', 'Giáo hội và Thánh lễ'),
  lessons: [],
};

const BRUSSELS: World = {
  id: 'brussels',
  name: u('The Sacraments', 'Các Bí tích'),
  church: u('Brussels Cathedral', 'Nhà thờ chính tòa Brussels'),
  place: u('Brussels, Belgium', 'Brussels, Bỉ'),
  theme: u('Visible signs of invisible grace', 'Dấu chỉ hữu hình của Ơn Chúa vô hình'),
  lessons: [],
};

const PARISH: World = {
  id: 'parish',
  name: u('Living It', 'Sống đức tin'),
  church: u('Your parish', 'Giáo xứ của bạn'),
  place: u('Home', 'Nhà'),
  theme: u('Living as a Catholic', 'Sống như một người Công giáo'),
  lessons: [],
};

export const WORLDS: World[] = [HANOI, BRUGES, PARIS, BRUSSELS, PARISH];

export const worldById = (id: string) => WORLDS.find((w) => w.id === id);
export const lessonById = (id: string) => {
  for (const w of WORLDS) {
    const lesson = w.lessons.find((l) => l.id === id);
    if (lesson) return { world: w, lesson };
  }
  return null;
};
