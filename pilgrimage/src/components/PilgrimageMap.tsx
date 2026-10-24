'use client';

// ─── The Illuminated Atlas ───────────────────────────────────────────────────
// An antique hand-inked travel map: a dotted candlelight-gold route over lapis
// night, each church a tiny illuminated miniature. Her pilgrim figure walks
// the line from Hanoi toward the baptismal font.

import type { WorldId } from '@/content/types';
import { MAIN_WORLDS } from '@/content/worlds';
import { useI18n } from '@/lib/i18n';
import { UI } from '@/content/ui';
import { isWorldUnlocked, worldProgress } from '@/lib/progress';

const GOLD = '#D9A441';
const IVORY = '#F3ECDD';
const INCENSE = '#8A8578';
const GARNET = '#7A1F2B';

// Route stops, bottom (home) to top (her parish).
const STOPS: { id: WorldId; x: number; y: number }[] = [
  { id: 'hanoi', x: 200, y: 560 },
  { id: 'bruges', x: 92, y: 440 },
  { id: 'paris', x: 286, y: 330 },
  { id: 'brussels', x: 110, y: 216 },
  { id: 'parish', x: 220, y: 96 },
];

function Church({ id, lit }: { id: WorldId; lit: boolean }) {
  const wall = lit ? '#2a3763' : '#222c4f';
  const line = lit ? GOLD : INCENSE;
  const win = lit ? GOLD : '#3a456f';
  switch (id) {
    case 'hanoi':
      // twin square towers
      return (
        <g>
          <rect x="-26" y="-30" width="14" height="40" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="12" y="-30" width="14" height="40" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="-12" y="-16" width="24" height="26" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M0 -26v8M-3 -23h6" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-21 -18a3 4 0 0 1 6 0v6h-6zM15 -18a3 4 0 0 1 6 0v6h-6z" fill={win} />
        </g>
      );
    case 'bruges':
      // small basilica with a garnet relic mark
      return (
        <g>
          <rect x="-20" y="-18" width="40" height="28" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M-20 -18L0 -34l20 16z" fill={wall} stroke={line} strokeWidth="1.5" />
          <circle cx="0" cy="-6" r="5" fill="none" stroke={lit ? GARNET : INCENSE} strokeWidth="2" />
          <circle cx="0" cy="-6" r="1.6" fill={lit ? GARNET : INCENSE} />
        </g>
      );
    case 'paris':
      // façade with rose window
      return (
        <g>
          <rect x="-22" y="-32" width="12" height="42" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="10" y="-32" width="12" height="42" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="-10" y="-24" width="20" height="34" fill={wall} stroke={line} strokeWidth="1.5" />
          <circle cx="0" cy="-12" r="6" fill="none" stroke={win} strokeWidth="1.6" />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i * Math.PI) / 3;
            return <line key={i} x1="0" y1="-12" x2={Math.cos(a) * 6} y2={-12 + Math.sin(a) * 6} stroke={win} strokeWidth="1" />;
          })}
        </g>
      );
    case 'brussels':
      return (
        <g>
          <rect x="-24" y="-26" width="13" height="36" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="11" y="-26" width="13" height="36" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M-24 -26l6.5 -8 6.5 8zM11 -26l6.5 -8 6.5 8z" fill={wall} stroke={line} strokeWidth="1.5" />
          <rect x="-11" y="-14" width="22" height="24" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M-3 -6a3 5 0 0 1 6 0v8h-6z" fill={win} />
        </g>
      );
    case 'parish':
      // a small chapel, waiting to be revealed
      return (
        <g>
          <rect x="-16" y="-14" width="32" height="24" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M-16 -14L0 -28l16 14z" fill={wall} stroke={line} strokeWidth="1.5" />
          <path d="M0 -36v8M-3 -33h6" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-3 0a3 4 0 0 1 6 0v10h-6z" fill={win} />
        </g>
      );
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
