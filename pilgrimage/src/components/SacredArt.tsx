// ─── SacredArt: original illuminated scenes in the five-token palette ────────
// Network policy blocks remote images in this environment, so every artwork is
// an original SVG scene — light passing through five colors. When real public-
// domain images are added under /public/art, artworks.ts `src` takes over.

import type { ArtKind } from '@/content/types';
import { artworkById } from '@/content/artworks';

const LAPIS = '#1C2647';
const GOLD = '#D9A441';
const GARNET = '#7A1F2B';
const IVORY = '#F3ECDD';
const INCENSE = '#8A8578';

function Stars({ seed = 1, n = 24 }: { seed?: number; n?: number }) {
  const stars = Array.from({ length: n }, (_, i) => {
    const x = ((i * 137 + seed * 61) % 400);
    const y = ((i * 89 + seed * 31) % 150);
    const r = 0.6 + ((i * 7 + seed) % 10) / 12;
    return <circle key={i} cx={x} cy={y} r={r} fill={IVORY} opacity={0.25 + ((i + seed) % 5) / 10} />;
  });
  return <>{stars}</>;
}

function Halo({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={GOLD} strokeWidth={2.5} opacity={0.9} />
      <circle cx={cx} cy={cy} r={r * 1.5} fill={GOLD} opacity={0.12} />
    </>
  );
}

function Scene({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case 'cathedral-hanoi':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={3} />
          <circle cx="330" cy="52" r="20" fill={IVORY} opacity="0.85" />
          <circle cx="323" cy="48" r="18" fill={LAPIS} />
          {/* twin towers */}
          <g fill="#141b33">
            <rect x="120" y="90" width="48" height="180" />
            <rect x="232" y="90" width="48" height="180" />
            <rect x="160" y="140" width="80" height="130" />
            <rect x="116" y="82" width="56" height="10" />
            <rect x="228" y="82" width="56" height="10" />
          </g>
          {/* glowing arched windows */}
          <g fill={GOLD} opacity="0.92">
            <path d="M138 120a6 9 0 0 1 12 0v22h-12z" />
            <path d="M250 120a6 9 0 0 1 12 0v22h-12z" />
            <path d="M138 175a6 9 0 0 1 12 0v22h-12z" />
            <path d="M250 175a6 9 0 0 1 12 0v22h-12z" />
            <path d="M186 195a14 18 0 0 1 28 0v40h-28z" />
          </g>
          <circle cx="200" cy="165" r="13" fill="none" stroke={GOLD} strokeWidth="2.5" opacity="0.9" />
          <path d="M200 60v22M192 70h16" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
          <rect x="0" y="268" width="400" height="32" fill="#10162b" />
          <ellipse cx="200" cy="270" rx="150" ry="7" fill={GOLD} opacity="0.1" />
        </>
      );

    case 'cathedral-door':
      return (
        <>
          <rect width="400" height="300" fill="#141b33" />
          <path d="M120 300V120a80 90 0 0 1 160 0v180z" fill={LAPIS} stroke={INCENSE} strokeWidth="3" />
          <path d="M140 300V128a60 72 0 0 1 120 0v172z" fill={GOLD} opacity="0.9" />
          <path d="M150 300V132a50 62 0 0 1 100 0v168z" fill={IVORY} opacity="0.75" />
          <path d="M200 300V70" stroke={INCENSE} strokeWidth="2" opacity="0.4" />
          <circle cx="200" cy="58" r="16" fill="none" stroke={GOLD} strokeWidth="2.5" />
          <path d="M200 46v24M192 52h16" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
          <g stroke={GOLD} strokeWidth="1.5" opacity="0.5">
            <path d="M60 300V160l30-24" fill="none" />
            <path d="M340 300V160l-30-24" fill="none" />
          </g>
        </>
      );

    case 'creation-light':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <circle cx="200" cy="150" r="120" fill={LAPIS} />
          <circle cx="200" cy="150" r="78" fill={GOLD} opacity="0.18" />
          <circle cx="200" cy="150" r="50" fill={GOLD} opacity="0.4" />
          <circle cx="200" cy="150" r="26" fill={IVORY} opacity="0.95" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return (
              <line
                key={i}
                x1={200 + Math.cos(a) * 60}
                y1={150 + Math.sin(a) * 60}
                x2={200 + Math.cos(a) * (i % 2 ? 96 : 112)}
                y2={150 + Math.sin(a) * (i % 2 ? 96 : 112)}
                stroke={GOLD}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
              />
            );
          })}
        </>
      );

    case 'creation-world':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={5} />
          <circle cx="90" cy="56" r="22" fill={GOLD} opacity="0.95" />
          <circle cx="318" cy="60" r="14" fill={IVORY} opacity="0.8" />
          <circle cx="313" cy="56" r="12" fill={LAPIS} />
          <circle cx="200" cy="190" r="92" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          <path d="M120 210c20-12 40 8 60 0s36-16 56-6 36 12 52 4" fill="none" stroke={IVORY} strokeWidth="3" opacity="0.5" />
          <path d="M132 236c22-10 44 8 68 0s44-12 66-2" fill="none" stroke={IVORY} strokeWidth="3" opacity="0.35" />
          <path d="M160 150c14-18 38-24 58-14-8 14-22 22-38 22-8 0-14-3-20-8z" fill={GOLD} opacity="0.65" />
          <path d="M236 166c10-6 24-4 30 4-8 8-22 8-30-4z" fill={GOLD} opacity="0.5" />
        </>
      );

    case 'creation-people':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="96" r="56" fill={GOLD} opacity="0.16" />
          <circle cx="200" cy="96" r="30" fill={GOLD} opacity="0.5" />
          <circle cx="200" cy="96" r="14" fill={IVORY} opacity="0.9" />
          {/* two figures, hands lifted toward the light */}
          <g fill="#141b33">
            <circle cx="140" cy="180" r="16" />
            <path d="M118 300v-70c0-18 10-30 22-30s22 12 22 30v70z" />
            <path d="M152 212l28-44 8 6-26 44z" />
            <circle cx="260" cy="180" r="16" />
            <path d="M238 300v-70c0-18 10-30 22-30s22 12 22 30v70z" />
            <path d="M248 212l-28-44-8 6 26 44z" />
          </g>
          <g stroke={GOLD} strokeWidth="1.5" opacity="0.55">
            <line x1="200" y1="130" x2="166" y2="158" />
            <line x1="200" y1="130" x2="234" y2="158" />
          </g>
          <rect x="0" y="282" width="400" height="18" fill="#10162b" />
        </>
      );

    case 'prayer-night':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* window onto stars */}
          <path d="M236 250V120a52 60 0 0 1 104 0v130z" fill={LAPIS} stroke={INCENSE} strokeWidth="3" />
          <g clipPath="url(#win)">
            <Stars seed={9} n={16} />
          </g>
          <defs>
            <clipPath id="win">
              <path d="M236 250V120a52 60 0 0 1 104 0v130z" />
            </clipPath>
          </defs>
          <circle cx="312" cy="116" r="13" fill={IVORY} opacity="0.85" />
          <circle cx="307" cy="112" r="11" fill={LAPIS} />
          {/* kneeling figure */}
          <g fill="#1a2240">
            <circle cx="120" cy="160" r="17" />
            <path d="M92 262c0-44 12-68 28-68s28 24 28 68z" />
          </g>
          <path d="M120 196v30" stroke={GOLD} strokeWidth="1.5" opacity="0.4" />
          {/* candle */}
          <rect x="186" y="216" width="10" height="34" rx="2" fill={IVORY} opacity="0.9" />
          <path d="M191 196c6 7 9 12 9 17a9 9 0 0 1-18 0c0-5 3-10 9-17z" fill={GOLD} className="flame" />
          <circle cx="191" cy="208" r="26" fill={GOLD} opacity="0.12" />
          <rect x="0" y="250" width="400" height="50" fill="#0c1122" />
        </>
      );

    case 'sky-flight':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={2} n={14} />
          <circle cx="200" cy="120" r="46" fill={GOLD} opacity="0.85" />
          <circle cx="200" cy="120" r="64" fill={GOLD} opacity="0.15" />
          <g fill={IVORY}>
            <ellipse cx="80" cy="218" rx="90" ry="26" opacity="0.9" />
            <ellipse cx="210" cy="238" rx="120" ry="30" opacity="0.95" />
            <ellipse cx="340" cy="222" rx="90" ry="24" opacity="0.85" />
            <ellipse cx="150" cy="200" rx="60" ry="18" opacity="0.7" />
          </g>
          <path d="M60 96l24 8-20 6 4 10-14-12z" fill={IVORY} opacity="0.7" />
        </>
      );

    case 'teacher-hill':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={7} n={12} />
          <ellipse cx="200" cy="320" rx="260" ry="120" fill="#22305c" />
          {/* the Teacher */}
          <Halo cx={200} cy={128} r={24} />
          <g fill={IVORY} opacity="0.92">
            <circle cx="200" cy="128" r="13" />
            <path d="M178 230v-56c0-16 9-26 22-26s22 10 22 26v56z" />
            <path d="M186 168l-26 26 5 7 24-20zM214 168l26 26-5 7-24-20z" />
          </g>
          {/* listeners */}
          <g fill="#141b33">
            {[70, 110, 150, 250, 290, 330].map((x, i) => (
              <g key={x}>
                <circle cx={x} cy={232 - (i % 2) * 8} r="10" />
                <path d={`M${x - 14} 290v-30c0-12 6-20 14-20s14 8 14 20v30z`} />
              </g>
            ))}
          </g>
        </>
      );

    case 'incense-altar':
      return (
        <>
          <rect width="400" height="300" fill="#141b33" />
          {/* altar table */}
          <rect x="60" y="210" width="280" height="14" rx="3" fill={GARNET} />
          <rect x="76" y="224" width="248" height="60" fill="#10162b" />
          {/* ancestor frames */}
          <rect x="100" y="142" width="50" height="62" rx="3" fill={LAPIS} stroke={GOLD} strokeWidth="2" />
          <circle cx="125" cy="166" r="12" fill={INCENSE} />
          <path d="M108 204c3-14 9-20 17-20s14 6 17 20z" fill={INCENSE} />
          <rect x="250" y="142" width="50" height="62" rx="3" fill={LAPIS} stroke={GOLD} strokeWidth="2" />
          <circle cx="275" cy="166" r="12" fill={INCENSE} />
          <path d="M258 204c3-14 9-20 17-20s14 6 17 20z" fill={INCENSE} />
          {/* fruit */}
          <circle cx="180" cy="200" r="9" fill={GOLD} opacity="0.85" />
          <circle cx="198" cy="202" r="8" fill={GARNET} />
          <circle cx="214" cy="200" r="9" fill={GOLD} opacity="0.7" />
          {/* incense bowl and smoke */}
          <path d="M186 178h28l-4 12h-20z" fill={GOLD} />
          <g stroke={IVORY} strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round">
            <path d="M200 172c-8-14 8-20 0-34 -7-12 6-18 0-30" />
            <path d="M190 174c-5-10 4-16-1-26" opacity="0.4" />
            <path d="M210 174c5-10-4-16 1-26" opacity="0.4" />
          </g>
        </>
      );

    case 'martyrs-palm':
      return (
        <>
          <rect width="400" height="300" fill={GARNET} />
          <circle cx="200" cy="150" r="104" fill={LAPIS} opacity="0.35" />
          <Halo cx={200} cy={150} r={86} />
          {/* palm branch */}
          <g stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M200 236V92" />
            {[-1, 1].map((s) =>
              [110, 134, 158, 182].map((y, i) => (
                <path key={`${s}-${y}`} d={`M200 ${y}q${s * (34 - i * 4)} -10 ${s * (52 - i * 6)} 6`} />
              )),
            )}
          </g>
          {/* crown of victory */}
          <path d="M168 76l10 16 22-22 22 22 10-16v22h-64z" fill={GOLD} />
          <text x="200" y="278" textAnchor="middle" fill={IVORY} opacity="0.8" fontSize="15" fontFamily="Cinzel, serif" letterSpacing="4">
            1839 · HÀ NỘI
          </text>
        </>
      );

    case 'candle-single':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <circle cx="200" cy="140" r="90" fill={GOLD} opacity="0.08" />
          <circle cx="200" cy="140" r="52" fill={GOLD} opacity="0.12" />
          <rect x="184" y="152" width="32" height="100" rx="5" fill={IVORY} opacity="0.92" />
          <path d="M200 96c12 15 18 25 18 35a18 18 0 0 1-36 0c0-10 6-20 18-35z" fill={GOLD} className="flame" />
          <ellipse cx="200" cy="256" rx="70" ry="8" fill={GOLD} opacity="0.12" />
        </>
      );

    case 'lake-evening':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={11} n={18} />
          <rect x="0" y="190" width="400" height="110" fill="#16203e" />
          {/* Turtle Tower silhouette */}
          <g fill="#0e1428">
            <rect x="178" y="130" width="44" height="60" rx="3" />
            <rect x="186" y="110" width="28" height="24" rx="2" />
            <path d="M182 110h36l-6-10h-24z" />
            <path d="M174 134h52l-6-8h-40z" />
          </g>
          <path d="M196 90v14M190 96h12" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          {/* lamps and reflections */}
          {[60, 120, 280, 340].map((x) => (
            <g key={x}>
              <circle cx={x} cy="180" r="5" fill={GOLD} className="soft-glow" />
              <path d={`M${x} 196v36`} stroke={GOLD} strokeWidth="3" opacity="0.25" strokeLinecap="round" />
            </g>
          ))}
          <path d="M200 196v52" stroke={GOLD} strokeWidth="4" opacity="0.2" strokeLinecap="round" />
          <path d="M30 226c40 6 80-6 120 0s80 6 120 0 70-6 100 0" stroke={IVORY} strokeWidth="1.5" fill="none" opacity="0.15" />
        </>
      );

    case 'cross-dawn':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="210" r="120" fill={GOLD} opacity="0.14" />
          <circle cx="200" cy="218" r="64" fill={GOLD} opacity="0.3" />
          <ellipse cx="200" cy="300" rx="240" ry="80" fill="#141b33" />
          <g fill="#0e1428">
            <rect x="192" y="84" width="16" height="146" rx="3" />
            <rect x="148" y="118" width="104" height="16" rx="3" />
          </g>
          <circle cx="200" cy="126" r="34" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.7" />
        </>
      );

    case 'symbol-water':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="150" r="92" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          <g stroke={IVORY} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9">
            <path d="M136 130c20-14 44 14 64 0s44-14 64 0" />
            <path d="M136 158c20-14 44 14 64 0s44-14 64 0" />
            <path d="M136 186c20-14 44 14 64 0s44-14 64 0" />
          </g>
        </>
      );

    case 'symbol-light':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="150" r="92" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          <path d="M200 92c16 20 24 33 24 46a24 24 0 0 1-48 0c0-13 8-26 24-46z" fill={GOLD} className="flame" />
          <rect x="188" y="160" width="24" height="44" rx="4" fill={IVORY} opacity="0.9" />
        </>
      );

    case 'symbol-bread':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="150" r="92" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          <ellipse cx="200" cy="158" rx="58" ry="36" fill={GOLD} opacity="0.9" />
          <g stroke={GARNET} strokeWidth="4" strokeLinecap="round" opacity="0.8">
            <path d="M170 142l18 14M200 136l0 18M230 142l-18 14" />
          </g>
          <ellipse cx="200" cy="148" rx="58" ry="30" fill="none" stroke={IVORY} strokeWidth="2" opacity="0.4" />
        </>
      );

    case 'symbol-cross':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="150" r="92" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          <g fill={GOLD}>
            <rect x="190" y="86" width="20" height="128" rx="4" />
            <rect x="150" y="118" width="100" height="20" rx="4" />
          </g>
          <circle cx="200" cy="128" r="30" fill="none" stroke={IVORY} strokeWidth="2" opacity="0.5" />
        </>
      );

    case 'symbol-incense':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="150" r="92" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          <path d="M176 196h48l-6 16h-36z" fill={GOLD} />
          <g stroke={IVORY} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85">
            <path d="M200 188c-10-16 10-24 0-40-8-13 7-20 0-34" />
            <path d="M186 190c-6-12 5-18-1-30" opacity="0.5" />
            <path d="M214 190c6-12-5-18 1-30" opacity="0.5" />
          </g>
        </>
      );
  }
}

export function SacredArt({
  kind,
  className = '',
  rounded = true,
}: {
  kind: ArtKind;
  className?: string;
  rounded?: boolean;
}) {
  const art = artworkById(kind);
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={art?.title.en}
      className={`block h-full w-full ${rounded ? 'rounded-2xl' : ''} ${className}`}
    >
      <Scene kind={kind} />
    </svg>
  );
}
