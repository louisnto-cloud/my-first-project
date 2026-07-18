import type { L, World } from '../types';
import { SINAI } from './sinai';
import { HOLYLAND_LESSONS_1 } from './holyland-part1';
import { HOLYLAND_LESSONS_2 } from './holyland-part2';
import { ROME_LESSONS } from './rome';
import { LOURDES_LESSONS } from './lourdes';
import { CAMINO_LESSONS } from './camino';
import { ASIA_LESSONS } from './asia';

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

const HOLYLAND: World = {
  id: 'holyland',
  name: u('Jesus', 'Chúa Giêsu'),
  church: u('The Holy Sepulchre', 'Nhà thờ Mộ Thánh'),
  place: u('Jerusalem', 'Giêrusalem'),
  theme: u('Who is Jesus?', 'Chúa Giêsu là ai?'),
  lessons: [...HOLYLAND_LESSONS_1, ...HOLYLAND_LESSONS_2],
};

const ROME: World = {
  id: 'rome',
  name: u('The Church', 'Giáo hội'),
  church: u('St. Peter’s Basilica', 'Vương cung thánh đường Thánh Phêrô'),
  place: u('Rome', 'Rôma'),
  theme: u('The Church and the Mass', 'Giáo hội và Thánh lễ'),
  lessons: ROME_LESSONS,
};

const LOURDES: World = {
  id: 'lourdes',
  name: u('The Sacraments', 'Các Bí tích'),
  church: u('The Sanctuary of Lourdes', 'Đền thánh Đức Mẹ Lộ Đức'),
  place: u('Lourdes, France', 'Lộ Đức, Pháp'),
  theme: u('Visible signs of invisible grace', 'Dấu chỉ hữu hình của Ơn Chúa vô hình'),
  lessons: LOURDES_LESSONS,
};

const CAMINO: World = {
  id: 'camino',
  name: u('The Way', 'Con Đường'),
  church: u('Santiago de Compostela', 'Santiago de Compostela'),
  place: u('The Camino, Spain', 'Đường Camino, Tây Ban Nha'),
  theme: u('Living as a pilgrim, every day', 'Sống như người hành hương, mỗi ngày'),
  lessons: CAMINO_LESSONS,
};

// ─── Bonus worlds: off the main road ────────────────────────────────────────

const ASIA: World = {
  id: 'asia',
  name: u('Saints of Asia', 'Các Thánh Á châu'),
  church: u('The shrines of the East', 'Các đền thánh phương Đông'),
  place: u('Asia', 'Á châu'),
  theme: u('The faith’s story in the East', 'Câu chuyện đức tin nơi phương Đông'),
  lessons: ASIA_LESSONS,
};

/** The five stops of the main road, in pilgrimage order. */
export const MAIN_WORLDS: World[] = [SINAI, HOLYLAND, ROME, LOURDES, CAMINO];

/** Bonus roads, unlocked off the main pilgrimage. */
export const BONUS_WORLDS: World[] = [ASIA];

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
