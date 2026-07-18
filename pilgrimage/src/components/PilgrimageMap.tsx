'use client';

// ─── The Illuminated Atlas ───────────────────────────────────────────────────
// An antique hand-inked travel map: a dotted candlelight-gold route over lapis
// night, each holy place a tiny illuminated miniature. The pilgrim figure
// walks the line from the desert toward Compostela.

import type { WorldId } from '@/content/types';
import { MAIN_WORLDS } from '@/content/worlds';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { isWorldUnlocked, worldProgress } from '@/lib/progress';

const GOLD = '#D9A441';
const IVORY = '#F3ECDD';
const INCENSE = '#8A8578';
const GARNET = '#7A1F2B';

// Route stops, bottom (the desert) to top (Compostela).
const STOPS: { id: WorldId; x: number; y: number }[] = [
  { id: 'sinai', x: 200, y: 560 },
  { id: 'holyland', x: 92, y: 440 },
  { id: 'rome', x: 286, y: 330 },
  { id: 'lourdes', x: 110, y: 216 },
  { id: 'camino', x: 220, y: 96 },
];

function Church({ id, lit }: { id: WorldId; lit: boolean }) {
  const wall = lit ? '#2a3763' : '#222c4f';
  const line = lit ? GOLD : INCENSE;
  const win = lit ? GOLD : '#3a456f';
  switch (id) {
    case 'sinai':
      // the mountain, with the bush alight at its foot
      return (
        <g>
          <path d="M-30 10L-4 -32l10 10 8-12 18 34z" fill={wall} stroke={line} strokeWidth="1.5" />
          <circle cx="-4" cy="-34" r="3" fill={win} />
          <path d="M-18 6c2.5 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1.5-4 4-7z" fill={lit ? GOLD : INCENSE} />
        </g>
      );
    case 'holyland':
      // the aedicule of the Holy Sepulchre: small dome, open door
      return (
        <g>
          <rect x="-20" y="-14" width="40" height="24" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M-14 -14a14 14 0 0 1 28 0z" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M0 -34v8M-3 -31h6" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-4 10v-10a4 5 0 0 1 8 0v10z" fill={win} />
        </g>
      );
    case 'rome':
      // the great dome and colonnade
      return (
        <g>
          <path d="M-16 -10a16 16 0 0 1 32 0z" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="-20" y="-10" width="40" height="20" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M0 -32v8M-3 -29h6" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-32 14q32 -12 64 0" fill="none" stroke={line} strokeWidth="1.5" opacity="0.8" />
          <path d="M-4 2a4 5 0 0 1 8 0v8h-8z" fill={win} />
        </g>
      );
    case 'lourdes':
      // the grotto arch with the spire of the basilica above
      return (
        <g>
          <path d="M0 -38v10M-3 -34h6" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-5 -28L0 -38l5 10z" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="-6" y="-28" width="12" height="20" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="-22" y="-8" width="44" height="18" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M-12 10v-8a12 10 0 0 1 24 0v8z" fill="#10162b" stroke={line} strokeWidth="1.5" />
          <circle cx="0" cy="2" r="2.2" fill={win} className={lit ? 'soft-glow' : ''} />
        </g>
      );
    case 'camino':
      // the baroque towers of Santiago, with the scallop between them
      return (
        <g>
          <rect x="-22" y="-26" width="13" height="36" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="9" y="-26" width="13" height="36" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M-22 -26l6.5 -10 6.5 10zM9 -26l6.5 -10 6.5 10z" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="-9" y="-14" width="18" height="24" fill={wall} stroke={line} strokeWidth="1.5" />
          <g stroke={win} strokeWidth="1.4" strokeLinecap="round">
            <path d="M0 -4v-6M-4 -4l-3 -5M4 -4l3 -5M-2 -4l-1.5 -6M2 -4l1.5 -6" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

export function PilgrimageMap({ onSelect }: { onSelect: (id: WorldId) => void }) {
  const { t, save } = useI18n();

  // Pilgrim position: between the last stamped stop and the current one.
  const currentIdx = Math.max(
    0,
    MAIN_WORLDS.findIndex((w) => !w.lessons.every((l) => save.completed[l.id]) || w.lessons.length === 0),
  );
  const cur = STOPS[Math.min(currentIdx, STOPS.length - 1)];
  const prev = STOPS[Math.max(0, Math.min(currentIdx, STOPS.length - 1) - 1)];
  const world = MAIN_WORLDS[Math.min(currentIdx, MAIN_WORLDS.length - 1)];
  const prog = worldProgress(world, save);
  const f = prog.total > 0 ? prog.done / prog.total : 0;
  const pilgrim =
    currentIdx === 0
      ? { x: cur.x - 36 + f * 30, y: cur.y + 34 }
      : { x: prev.x + (cur.x - prev.x) * (0.25 + f * 0.6), y: prev.y + (cur.y - prev.y) * (0.25 + f * 0.6) };

  return (
    <svg viewBox="0 0 400 640" className="w-full" role="img" aria-label="Pilgrimage map">
      {/* parchment-on-night frame */}
      <rect width="400" height="640" rx="18" fill="#1C2647" />
      <rect x="8" y="8" width="384" height="624" rx="12" fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.4" />
      <rect x="14" y="14" width="372" height="612" rx="9" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.25" />
      {/* faint compass rose */}
      <g opacity="0.18" transform="translate(330, 580)">
        <circle r="26" fill="none" stroke={IVORY} strokeWidth="1" />
        <path d="M0 -24L5 0L0 24L-5 0Z" fill={IVORY} />
        <path d="M-24 0L0 -5L24 0L0 5Z" fill={IVORY} />
      </g>
      {/* a few hand-inked stars */}
      {[
        [60, 60], [340, 90], [50, 300], [350, 250], [40, 500], [360, 420],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 4}v8M${x - 4} ${y}h8`} stroke={IVORY} strokeWidth="1" opacity="0.25" />
      ))}

      {/* the dotted gold road */}
      <path
        d={`M${STOPS[0].x} ${STOPS[0].y + 20}
            C 60 ${STOPS[0].y - 30}, ${STOPS[1].x - 60} ${STOPS[1].y + 60}, ${STOPS[1].x} ${STOPS[1].y + 14}
            C ${STOPS[1].x + 90} ${STOPS[1].y - 60}, ${STOPS[2].x - 40} ${STOPS[2].y + 70}, ${STOPS[2].x} ${STOPS[2].y + 16}
            C ${STOPS[2].x + 40} ${STOPS[2].y - 60}, ${STOPS[3].x + 60} ${STOPS[3].y + 60}, ${STOPS[3].x} ${STOPS[3].y + 16}
            C ${STOPS[3].x - 50} ${STOPS[3].y - 50}, ${STOPS[4].x - 80} ${STOPS[4].y + 50}, ${STOPS[4].x} ${STOPS[4].y + 18}`}
        fill="none"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 12"
        className="road-path"
        opacity="0.85"
      />

      {STOPS.map((stop, i) => {
        const w = MAIN_WORLDS[i];
        const unlocked = isWorldUnlocked(w, save);
        const stamped = !!save.stamps[w.id];
        const p = worldProgress(w, save);
        return (
          <g
            key={stop.id}
            transform={`translate(${stop.x}, ${stop.y})`}
            onClick={() => onSelect(stop.id)}
            className="cursor-pointer"
            role="button"
            aria-label={t(w.church)}
          >
            {unlocked && <circle r="46" fill={GOLD} opacity="0.1" className="soft-glow" />}
            <Church id={stop.id} lit={unlocked} />
            <text
              y="28"
              textAnchor="middle"
              fill={unlocked ? IVORY : INCENSE}
              fontSize="13"
              fontFamily="Cinzel, serif"
              letterSpacing="1.5"
            >
              {t(w.place).toUpperCase()}
            </text>
            <text y="44" textAnchor="middle" fill={INCENSE} fontSize="10.5" fontFamily="Nunito Sans, sans-serif">
              {stamped
                ? `✦ ${t(UI.worldComplete)}`
                : unlocked && p.total > 0
                  ? `${p.done}/${p.total}`
                  : ''}
            </text>
          </g>
        );
      })}

      {/* the tiny pilgrim */}
      <g transform={`translate(${pilgrim.x}, ${pilgrim.y})`}>
        <circle r="10" fill={GOLD} opacity="0.2" className="soft-glow" />
        <circle cy="-5" r="2.6" fill={IVORY} />
        <path d="M0 -2c-2.6 0-4 2.2-4 6h8c0-3.8-1.4-6-4-6z" fill={IVORY} />
        <path d="M4.5 -8v12" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
