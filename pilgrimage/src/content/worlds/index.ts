import type { L, World } from '../types';
import { HANOI } from './hanoi';
import { BRUGES_LESSONS_1 } from './bruges-part1';
import { BRUGES_LESSONS_2 } from './bruges-part2';
import { PARIS_LESSONS } from './paris';
import { BRUSSELS_LESSONS } from './brussels';
import { PARISH_LESSONS } from './parish';
import { ASIA_LESSONS } from './asia';

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

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
  lessons: PARIS_LESSONS,
};

const BRUSSELS: World = {
  id: 'brussels',
  name: u('The Sacraments', 'Các Bí tích'),
  church: u('Brussels Cathedral', 'Nhà thờ chính tòa Brussels'),
  place: u('Brussels, Belgium', 'Brussels, Bỉ'),
  theme: u('Visible signs of invisible grace', 'Dấu chỉ hữu hình của Ơn Chúa vô hình'),
  lessons: BRUSSELS_LESSONS,
};

const PARISH: World = {
  id: 'parish',
  name: u('Living It', 'Sống đức tin'),
  church: u('Your parish', 'Giáo xứ của bạn'),
  place: u('Home', 'Nhà'),
  theme: u('Living as a Catholic', 'Sống như một người Công giáo'),
  lessons: PARISH_LESSONS,
};

// ─── Bonus worlds: off the main road ────────────────────────────────────────

const ASIA: World = {
  id: 'asia',
  name: u('Saints of Asia', 'Các Thánh Á châu'),
  church: u('The shrines of Việt Nam', 'Các đền thánh Việt Nam'),
  place: u('Việt Nam', 'Việt Nam'),
  theme: u('Saints who speak your language', 'Các vị thánh nói tiếng của bạn'),
  lessons: ASIA_LESSONS,
};

const VATICAN: World = {
  id: 'vatican',
  name: u('The Vatican', 'Vatican'),
  church: u('St. Peter’s Basilica', 'Vương cung thánh đường Thánh Phêrô'),
  place: u('Rome', 'Rôma'),
  theme: u('The heart of the family', 'Trái tim của gia đình'),
  lessons: [],
};

const HOLYLAND: World = {
  id: 'holyland',
  name: u('The Holy Land', 'Đất Thánh'),
  church: u('The Holy Sepulchre', 'Mộ Thánh Chúa'),
  place: u('Jerusalem', 'Giêrusalem'),
  theme: u('Where the story happened', 'Nơi câu chuyện đã diễn ra'),
  lessons: [],
};

/** The five stops of the main road, in pilgrimage order. */
export const MAIN_WORLDS: World[] = [HANOI, BRUGES, PARIS, BRUSSELS, PARISH];

/** Bonus roads, unlocked off the main pilgrimage. */
export const BONUS_WORLDS: World[] = [ASIA, VATICAN, HOLYLAND];

/** Everything, main road first — the order Today's step walks through. */
export const WORLDS: World[] = [...MAIN_WORLDS, ...BONUS_WORLDS];

export const worldById = (id: string) => WORLDS.find((w) => w.id === id);
export const lessonById = (id: string) => {
  for (const w of WORLDS) {
    const lesson = w.lessons.find((l) => l.id === id);
    if (lesson) return { world: w, lesson };
  }
  return null;
};
