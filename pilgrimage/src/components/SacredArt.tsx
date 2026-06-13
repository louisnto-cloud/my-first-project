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

// A single tongue of flame: base at (cx,cy), rising to height h, width w,
// leaning by `lean` degrees. Used to build the burning bush from many layered
// tongues so it reads as living fire rather than a flat blob.
function Tongue({
  cx,
  cy,
  h,
  w,
  lean = 0,
  fill,
  opacity = 1,
  flicker = false,
}: {
  cx: number;
  cy: number;
  h: number;
  w: number;
  lean?: number;
  fill: string;
  opacity?: number;
  flicker?: boolean;
}) {
  // A teardrop with a curved, slightly hooked tip — the silhouette of flame.
  const d = `M0 0
    C ${-w * 0.55} ${-h * 0.28}, ${-w * 0.5} ${-h * 0.62}, ${-w * 0.12} ${-h * 0.86}
    C ${-w * 0.05} ${-h * 0.93}, ${w * 0.06} ${-h * 0.98}, 0 ${-h}
    C ${w * 0.04} ${-h * 0.97}, ${w * 0.5} ${-h * 0.66}, ${w * 0.55} ${-h * 0.3}
    C ${w * 0.5} ${-h * 0.1}, ${w * 0.3} 0, 0 0 Z`;
  return (
    <path
      d={d}
      fill={fill}
      opacity={opacity}
      transform={`translate(${cx} ${cy}) rotate(${lean})`}
      className={flicker ? 'flame' : undefined}
    />
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

    case 'basilica-bruges':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={13} n={16} />
          {/* brick gothic facade with gilded statues */}
          <g fill={GARNET} opacity="0.9">
            <rect x="120" y="110" width="160" height="160" />
            <rect x="96" y="130" width="28" height="140" />
            <rect x="276" y="130" width="28" height="140" />
          </g>
          <path d="M120 110l80-46 80 46z" fill={GARNET} />
          <g fill={GOLD} opacity="0.92">
            <path d="M150 160a7 11 0 0 1 14 0v26h-14z" />
            <path d="M193 150a7 12 0 0 1 14 0v36h-14z" />
            <path d="M236 160a7 11 0 0 1 14 0v26h-14z" />
            <path d="M188 220a12 16 0 0 1 24 0v50h-24z" />
          </g>
          <g stroke={GOLD} strokeWidth="1.5" opacity="0.7">
            <path d="M134 110v-18M266 110v-18" />
            <circle cx="134" cy="86" r="4" fill={GOLD} />
            <circle cx="266" cy="86" r="4" fill={GOLD} />
          </g>
          <path d="M200 50v18M193 56h14" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
          <rect x="0" y="270" width="400" height="30" fill="#10162b" />
          {/* canal reflection */}
          <path d="M120 282h160" stroke={GOLD} strokeWidth="2" opacity="0.18" />
        </>
      );

    case 'eden-tree':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="120" r="86" fill={GOLD} opacity="0.08" />
          {/* the tree */}
          <path d="M196 290V160c0-26-10-38-22-50" stroke="#141b33" strokeWidth="14" fill="none" strokeLinecap="round" />
          <circle cx="200" cy="110" r="58" fill="#22305c" />
          <circle cx="156" cy="132" r="34" fill="#22305c" />
          <circle cx="248" cy="130" r="36" fill="#22305c" />
          {/* fruit */}
          {[
            [176, 102], [222, 92], [246, 128], [160, 130], [204, 132],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="7" fill={GARNET} />
          ))}
          {/* the serpent coiled on the trunk */}
          <path d="M188 262c20 0 22-18 4-22s-18-22 2-24" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <circle cx="196" cy="212" r="3.5" fill={GOLD} />
          <rect x="0" y="282" width="400" height="18" fill="#10162b" />
        </>
      );

    case 'prophet-night':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <Stars seed={17} n={26} />
          <circle cx="290" cy="70" r="10" fill={IVORY} />
          <path d="M290 48v44M268 70h44M276 56l28 28M304 56l-28 28" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <ellipse cx="200" cy="320" rx="260" ry="90" fill="#141b33" />
          {/* the prophet, pointing at the star */}
          <g fill="#1a2240">
            <circle cx="120" cy="190" r="15" />
            <path d="M96 290v-60c0-18 10-30 24-30s24 12 24 30v60z" />
            <path d="M136 210l64-58 6 8-62 56z" />
          </g>
          <path d="M104 214v76" stroke={INCENSE} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </>
      );

    case 'annunciation':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          {/* arched loggia, after Fra Angelico */}
          <path d="M30 290V120a70 80 0 0 1 140 0v170z" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.5" />
          <path d="M230 290V120a70 80 0 0 1 140 0v170z" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.5" />
          {/* the angel, wings of gold */}
          <g>
            <path d="M60 200c-14-36 4-66 30-78-4 26 4 50 18 64z" fill={GOLD} opacity="0.75" />
            <circle cx="116" cy="158" r="14" fill={IVORY} />
            <Halo cx={116} cy={158} r={20} />
            <path d="M92 290v-72c0-22 10-36 24-36s24 14 24 36v72z" fill={IVORY} opacity="0.85" />
            <path d="M134 200l36-18 4 8-34 18z" fill={IVORY} opacity="0.85" />
          </g>
          {/* Mary, bowed in lapis and garnet */}
          <g>
            <circle cx="300" cy="166" r="14" fill={IVORY} />
            <Halo cx={300} cy={166} r={20} />
            <path d="M276 290v-68c0-22 10-36 24-36s24 14 24 36v68z" fill={GARNET} />
            <path d="M282 188c10 12 26 12 36 0" stroke={IVORY} strokeWidth="2" fill="none" opacity="0.5" />
          </g>
          {/* the dove descending on a ray */}
          <path d="M200 60l-44 70" stroke={GOLD} strokeWidth="2" opacity="0.7" strokeDasharray="2 6" />
          <path d="M196 64l10-6 2 10 8 4-12 6-8-4z" fill={IVORY} />
          {/* lily */}
          <path d="M206 290v-50M206 248c-8-8-16-8-20 2M206 248c8-8 16-8 20 2" stroke={IVORY} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
        </>
      );

    case 'nativity':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <Stars seed={21} n={20} />
          {/* the great star */}
          <circle cx="200" cy="52" r="8" fill={IVORY} />
          <path d="M200 28v48M176 52h48M186 38l28 28M214 38l-28 28" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M200 76l-4 60h8z" fill={GOLD} opacity="0.35" />
          {/* stable */}
          <path d="M90 290V180l110-56 110 56v110" fill="none" stroke={INCENSE} strokeWidth="4" />
          {/* the holy family */}
          <Halo cx={200} cy={224} r={16} />
          <ellipse cx="200" cy="244" rx="26" ry="14" fill={IVORY} opacity="0.95" />
          <circle cx="200" cy="226" r="9" fill={IVORY} />
          <g fill={GARNET}>
            <circle cx="148" cy="216" r="11" />
            <path d="M130 280v-40c0-14 8-24 18-24s18 10 18 24v40z" />
          </g>
          <g fill="#22305c">
            <circle cx="252" cy="216" r="11" />
            <path d="M234 280v-40c0-14 8-24 18-24s18 10 18 24v40z" />
          </g>
          <rect x="0" y="280" width="400" height="20" fill="#0c1122" />
        </>
      );

    case 'cana-jars':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="80" r="70" fill={GOLD} opacity="0.08" />
          {/* six stone jars */}
          {[70, 124, 178, 232, 286, 340].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x - 22} 270c-6-40 2-66 10-78h24c8 12 16 38 10 78z`}
                fill={i === 5 ? GARNET : '#22305c'}
                stroke={INCENSE}
                strokeWidth="2"
              />
              <rect x={x - 14} y="182" width="28" height="10" rx="4" fill={INCENSE} />
            </g>
          ))}
          {/* wine pouring into the last jar */}
          <path d="M340 150v34" stroke={GARNET} strokeWidth="6" strokeLinecap="round" />
          <path d="M316 128c8-10 24-14 36-6l-12 28z" fill={GOLD} opacity="0.9" />
          <text x="200" y="60" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="20" fill={IVORY} opacity="0.7">
            ✦
          </text>
        </>
      );

    case 'prodigal-embrace':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="140" r="110" fill={GOLD} opacity="0.1" />
          {/* the father, arms around the son */}
          <g fill={GARNET}>
            <circle cx="180" cy="110" r="17" />
            <path d="M140 290v-110c0-28 16-46 40-46s40 18 40 46v110z" />
          </g>
          {/* the son, kneeling into the embrace */}
          <g fill="#22305c">
            <circle cx="232" cy="160" r="14" />
            <path d="M206 290v-66c0-26 10-44 26-44s26 18 26 44v66z" />
          </g>
          {/* the father's hands on the son's shoulders */}
          <ellipse cx="216" cy="178" rx="10" ry="7" fill={IVORY} opacity="0.9" />
          <ellipse cx="248" cy="178" rx="10" ry="7" fill={IVORY} opacity="0.9" />
          <Halo cx={180} cy={110} r={24} />
          <rect x="0" y="282" width="400" height="18" fill="#10162b" />
        </>
      );

    case 'samaritan-road':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          {/* steep desert road */}
          <path d="M0 300L400 180v120z" fill="#141b33" />
          <path d="M30 290C140 250 280 220 380 196" stroke={GOLD} strokeWidth="2" strokeDasharray="2 10" fill="none" opacity="0.5" />
          {/* the wounded man */}
          <g fill={INCENSE} opacity="0.9">
            <circle cx="150" cy="244" r="11" />
            <path d="M160 250l54-10 2 12-54 10z" />
          </g>
          {/* the Samaritan kneeling, garnet cloak */}
          <g fill={GARNET}>
            <circle cx="232" cy="200" r="12" />
            <path d="M212 258c0-26 8-44 20-44s20 18 20 44z" />
          </g>
          <path d="M224 222l-46 16" stroke={IVORY} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          {/* the donkey waiting */}
          <g fill="#1a2240">
            <ellipse cx="330" cy="216" rx="28" ry="14" />
            <rect x="312" y="222" width="6" height="22" />
            <rect x="342" y="222" width="6" height="22" />
            <path d="M352 208c10-2 16-10 16-18-8 0-14 4-18 10z" />
          </g>
          <circle cx="80" cy="70" r="26" fill={GOLD} opacity="0.8" />
        </>
      );

    case 'loaves-fishes':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="150" r="100" fill="#22305c" stroke={GOLD} strokeWidth="2" />
          {/* five loaves in a cross arrangement, after the Tabgha mosaic */}
          {[
            [200, 110], [164, 150], [236, 150], [200, 150], [200, 190],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="16" fill={GOLD} opacity="0.9" />
              <path d={`M${x - 7} ${y}h14M${x} ${y - 7}v14`} stroke={GARNET} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
            </g>
          ))}
          {/* two fish */}
          <path d="M120 226c14-10 34-10 46 0-12 10-32 10-46 0zM112 226l-12-8v16z" fill={IVORY} opacity="0.9" />
          <path d="M234 226c14-10 34-10 46 0-12 10-32 10-46 0zM288 226l12-8v16z" fill={IVORY} opacity="0.9" />
        </>
      );

    case 'storm-sea':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <Stars seed={23} n={12} />
          <circle cx="320" cy="60" r="16" fill={IVORY} opacity="0.8" />
          {/* heavy sea */}
          <g fill="#1a2547">
            <path d="M0 220c40-22 80 22 120 0s80-22 120 0 80 22 120 0 40-10 40-10v90H0z" />
          </g>
          <g stroke="#3a456f" strokeWidth="3" fill="none" opacity="0.8">
            <path d="M20 240c20-12 40 12 60 0M180 250c20-12 40 12 60 0M300 238c20-12 40 12 60 0" />
          </g>
          {/* the boat */}
          <path d="M60 196l84 0-12 22H76z" fill="#141b33" stroke={INCENSE} strokeWidth="2" />
          <path d="M102 196v-44l30 38z" fill={INCENSE} opacity="0.7" />
          {/* Christ on the water */}
          <Halo cx={280} cy={148} r={18} />
          <circle cx="280" cy="148" r="11" fill={IVORY} />
          <path d="M262 216v-36c0-14 8-24 18-24s18 10 18 24v36z" fill={IVORY} opacity="0.92" />
          <path d="M256 200l-40 6M304 200l24 4" stroke={IVORY} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <ellipse cx="280" cy="220" rx="34" ry="5" fill={GOLD} opacity="0.25" />
        </>
      );

    case 'palm-gate':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="90" r="80" fill={GOLD} opacity="0.1" />
          {/* the city gate */}
          <g fill="#141b33">
            <rect x="260" y="80" width="140" height="220" />
            <path d="M290 300v-120a40 46 0 0 1 80 0v120z" fill={LAPIS} />
          </g>
          <path d="M290 300v-120a40 46 0 0 1 80 0v120z" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.6" />
          {/* Christ on the colt */}
          <Halo cx={150} cy={160} r={20} />
          <circle cx="150" cy="160" r="12" fill={IVORY} />
          <path d="M130 232v-40c0-16 9-26 20-26s20 10 20 26v40z" fill={GARNET} />
          <g fill="#1a2240">
            <ellipse cx="150" cy="244" rx="40" ry="16" />
            <rect x="124" y="252" width="7" height="32" />
            <rect x="168" y="252" width="7" height="32" />
            <path d="M186 238c12-4 18-12 18-22-10 0-16 6-20 12z" />
          </g>
          {/* palms waved and laid down */}
          <g stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85">
            <path d="M60 120q14 24 0 48M60 120q-14 24 0 48M60 120v60" />
            <path d="M96 96q12 20 0 40M96 96q-12 20 0 40M96 96v52" />
            <path d="M40 280q30-12 60-6M220 286q30-10 56-4" />
          </g>
        </>
      );

    case 'last-supper':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* upper room window */}
          <path d="M160 96V70a40 30 0 0 1 80 0v26z" fill={LAPIS} stroke={INCENSE} strokeWidth="2" opacity="0.8" />
          {/* the table */}
          <rect x="40" y="200" width="320" height="16" rx="4" fill={GARNET} />
          <rect x="56" y="216" width="288" height="60" fill="#141b33" />
          {/* the cup, lifted at the center */}
          <Halo cx={200} cy={150} r={26} />
          <path d="M178 132h44l-6 22c-3 10-10 14-16 14s-13-4-16-14z" fill={GOLD} />
          <rect x="196" y="168" width="8" height="18" fill={GOLD} />
          <path d="M184 188h32l-4 8h-24z" fill={GOLD} />
          {/* the bread, broken */}
          <circle cx="120" cy="192" r="13" fill={GOLD} opacity="0.9" />
          <path d="M270 184l22 10-22 6z" fill={GOLD} opacity="0.9" />
          {/* gathered friends, heads bowed */}
          {[80, 140, 260, 320].map((x, i) => (
            <g key={x} fill={i % 2 ? '#22305c' : '#1a2240'}>
              <circle cx={x} cy={168} r="10" />
              <path d={`M${x - 14} 200v-14c0-10 6-16 14-16s14 6 14 16v14z`} />
            </g>
          ))}
        </>
      );

    case 'gethsemane':
      return (
        <>
          <rect width="400" height="300" fill="#0c1122" />
          <Stars seed={29} n={18} />
          <circle cx="330" cy="60" r="20" fill={IVORY} opacity="0.85" />
          <circle cx="322" cy="54" r="17" fill="#0c1122" />
          {/* ancient olive tree */}
          <path d="M90 290V200c-2-22-14-32-24-44" stroke="#141b33" strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="80" cy="130" r="44" fill="#141b33" />
          <circle cx="130" cy="150" r="34" fill="#141b33" />
          {/* Christ kneeling at the rock */}
          <path d="M250 290c0-36 18-60 44-60v60z" fill="#1a2240" />
          <Halo cx={222} cy={194} r={18} />
          <circle cx="222" cy="194" r="11" fill={IVORY} opacity="0.95" />
          <path d="M204 268c0-30 8-50 18-50s18 20 18 50z" fill={GARNET} />
          <path d="M236 224l22 8" stroke={IVORY} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          {/* the cup, faint in the sky */}
          <g opacity="0.45">
            <path d="M186 86h28l-4 14c-2 6-6 9-10 9s-8-3-10-9z" fill="none" stroke={GOLD} strokeWidth="2" />
            <path d="M200 110v10M192 122h16" stroke={GOLD} strokeWidth="2" />
          </g>
          <rect x="0" y="282" width="400" height="18" fill="#080d1a" />
        </>
      );

    case 'cross-passion':
      return (
        <>
          <rect width="400" height="300" fill={GARNET} />
          <rect width="400" height="300" fill="#10162b" opacity="0.55" />
          <ellipse cx="200" cy="310" rx="240" ry="70" fill="#141b33" />
          {/* three crosses on the hill */}
          <g fill="#0c1122">
            <rect x="192" y="60" width="16" height="180" rx="3" />
            <rect x="146" y="96" width="108" height="16" rx="3" />
            <rect x="84" y="120" width="10" height="120" rx="2" />
            <rect x="58" y="146" width="62" height="10" rx="2" />
            <rect x="306" y="120" width="10" height="120" rx="2" />
            <rect x="280" y="146" width="62" height="10" rx="2" />
          </g>
          {/* the darkness at noon, a thin gold rim of hope */}
          <circle cx="200" cy="50" r="22" fill="#0c1122" stroke={GOLD} strokeWidth="1.5" opacity="0.9" />
          {/* the two at the foot of the cross */}
          <g fill="#0e1428">
            <circle cx="168" cy="226" r="9" />
            <path d="M156 268v-26c0-9 5-15 12-15s12 6 12 15v26z" />
            <circle cx="232" cy="226" r="9" />
            <path d="M220 268v-26c0-9 5-15 12-15s12 6 12 15v26z" />
          </g>
        </>
      );

    case 'tomb-morning':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          {/* dawn */}
          <circle cx="200" cy="230" r="150" fill={GOLD} opacity="0.16" />
          <circle cx="200" cy="240" r="80" fill={GOLD} opacity="0.3" />
          <ellipse cx="200" cy="310" rx="260" ry="80" fill="#141b33" />
          {/* the open tomb, stone rolled away */}
          <path d="M70 290v-80a60 66 0 0 1 120 0v80z" fill="#0e1428" />
          <path d="M86 290v-66a44 50 0 0 1 88 0v66z" fill="#060a14" />
          <circle cx="226" cy="252" r="38" fill="#1a2240" stroke={INCENSE} strokeWidth="2" />
          {/* light streaming out of the emptiness */}
          <g stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
            <path d="M130 218l36-50M142 238l52-34M146 262l58-14" />
          </g>
          {/* the folded cloth */}
          <rect x="116" y="272" width="30" height="8" rx="3" fill={IVORY} opacity="0.9" />
          {/* two birds in the morning sky */}
          <path d="M300 96q8-8 16 0M324 110q8-8 16 0" stroke={IVORY} strokeWidth="2" fill="none" opacity="0.6" />
        </>
      );

    case 'relic-blood':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <circle cx="200" cy="150" r="110" fill={GARNET} opacity="0.2" />
          {/* the rock-crystal vial in its golden mount */}
          <Halo cx={200} cy={150} r={78} />
          <rect x="186" y="74" width="28" height="18" rx="4" fill={GOLD} />
          <circle cx="200" cy="68" r="7" fill="none" stroke={GOLD} strokeWidth="2.5" />
          <path d="M188 92h24v90a12 12 0 0 1-24 0z" fill={LAPIS} stroke={GOLD} strokeWidth="3" />
          <path d="M191 130h18v52a9 9 0 0 1-18 0z" fill={GARNET} />
          <rect x="182" y="186" width="36" height="16" rx="5" fill={GOLD} />
          {/* two small angels in adoration */}
          {[120, 280].map((x, i) => (
            <g key={x} opacity="0.8">
              <circle cx={x} cy={170} r="9" fill={IVORY} />
              <path d={`M${x - 12} 210v-22c0-8 5-14 12-14s12 6 12 14v22z`} fill={IVORY} opacity="0.85" />
              <path d={i === 0 ? `M${x - 26} 176c-6-16 2-30 14-36-2 12 2 24 8 30z` : `M${x + 26} 176c6-16-2-30-14-36 2 12-2 24-8 30z`} fill={GOLD} opacity="0.7" />
            </g>
          ))}
          <text x="200" y="262" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="13" letterSpacing="4" fill={GOLD} opacity="0.8">
            BRUGGE
          </text>
        </>
      );

    case 'emmaus-road':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          {/* evening sun low on the road */}
          <circle cx="320" cy="180" r="44" fill={GOLD} opacity="0.7" />
          <circle cx="320" cy="180" r="70" fill={GOLD} opacity="0.15" />
          <path d="M0 300L400 232v68z" fill="#141b33" />
          <path d="M20 292C140 268 280 252 392 240" stroke={GOLD} strokeWidth="2" strokeDasharray="2 10" fill="none" opacity="0.5" />
          {/* two walkers, and the third they do not yet recognize */}
          <g fill="#22305c">
            <circle cx="110" cy="190" r="12" />
            <path d="M92 262v-44c0-16 8-26 18-26s18 10 18 26v44z" />
          </g>
          <g fill={GARNET}>
            <circle cx="156" cy="186" r="12" />
            <path d="M138 258v-44c0-16 8-26 18-26s18 10 18 26v44z" />
          </g>
          <g fill={IVORY} opacity="0.92">
            <circle cx="206" cy="180" r="12" />
            <path d="M188 252v-44c0-16 8-26 18-26s18 10 18 26v44z" />
          </g>
          <Halo cx={206} cy={180} r={17} />
        </>
      );

    case 'ascension':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={31} n={10} />
          {/* the cloud receiving him */}
          <ellipse cx="200" cy="86" rx="90" ry="26" fill={IVORY} opacity="0.85" />
          <ellipse cx="150" cy="100" rx="50" ry="16" fill={IVORY} opacity="0.6" />
          <ellipse cx="258" cy="100" rx="46" ry="14" fill={IVORY} opacity="0.6" />
          {/* Christ rising, half within the cloud */}
          <Halo cx={200} cy={118} r={20} />
          <circle cx="200" cy="118" r="12" fill={IVORY} />
          <path d="M182 180v-30c0-14 8-24 18-24s18 10 18 24v30z" fill={IVORY} opacity="0.95" />
          <path d="M176 140l-18 12M224 140l18 12" stroke={IVORY} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {/* the friends below, looking up */}
          <ellipse cx="200" cy="312" rx="240" ry="64" fill="#141b33" />
          {[110, 160, 240, 290].map((x, i) => (
            <g key={x} fill={i % 2 ? '#22305c' : GARNET}>
              <circle cx={x} cy={236} r="10" />
              <path d={`M${x - 13} 280v-26c0-10 6-17 13-17s13 7 13 17v26z`} />
            </g>
          ))}
          <path d="M200 192v28" stroke={GOLD} strokeWidth="2" strokeDasharray="2 6" opacity="0.7" />
        </>
      );

    case 'notre-dame':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={37} n={14} />
          {/* the west façade: two towers, three portals, the rose */}
          <g fill="#141b33">
            <rect x="108" y="60" width="56" height="210" />
            <rect x="236" y="60" width="56" height="210" />
            <rect x="164" y="92" width="72" height="178" />
            <rect x="100" y="52" width="72" height="10" />
            <rect x="228" y="52" width="72" height="10" />
          </g>
          {/* the rose window */}
          <circle cx="200" cy="136" r="26" fill={LAPIS} stroke={GOLD} strokeWidth="2.5" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return <line key={i} x1="200" y1="136" x2={200 + Math.cos(a) * 26} y2={136 + Math.sin(a) * 26} stroke={GOLD} strokeWidth="1.2" opacity="0.9" />;
          })}
          <circle cx="200" cy="136" r="8" fill={GOLD} opacity="0.85" />
          {/* gallery of arches */}
          <g fill={GOLD} opacity="0.7">
            {[118, 136, 154, 246, 264, 282].map((x) => (
              <path key={x} d={`M${x} 92a5 8 0 0 1 10 0v14h-10z`} />
            ))}
          </g>
          {/* three portals */}
          <g fill={GOLD} opacity="0.9">
            <path d="M120 270v-36a14 18 0 0 1 28 0v36z" />
            <path d="M182 270v-44a18 22 0 0 1 36 0v44z" />
            <path d="M252 270v-36a14 18 0 0 1 28 0v36z" />
          </g>
          <rect x="0" y="268" width="400" height="32" fill="#10162b" />
          {/* the Seine reflection */}
          <path d="M110 284h180" stroke={GOLD} strokeWidth="2" opacity="0.15" />
        </>
      );

    case 'pentecost-fire':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* the upper room, dove descending in wind */}
          <path d="M200 36l14-8 3 13 11 6-16 8-12-6z" fill={IVORY} />
          <g stroke={GOLD} strokeWidth="1.5" opacity="0.5">
            <path d="M150 50q50 18 100 0" fill="none" />
            <path d="M140 70q60 22 120 0" fill="none" />
          </g>
          {/* gathered in a half circle, a small flame above each */}
          {[70, 124, 178, 232, 286, 340].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x} ${150 - (i % 2) * 10}c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z`}
                fill={GOLD}
                className="flame"
              />
              <circle cx={x} cy={186 - (i % 2) * 10} r="12" fill={i === 2 ? GARNET : i % 2 ? '#22305c' : '#1a2240'} />
              <path d={`M${x - 16} 250v-${36 - (i % 2) * 10}c0-12 7-20 16-20s16 8 16 20v${36 - (i % 2) * 10}z`} fill={i === 2 ? GARNET : i % 2 ? '#22305c' : '#1a2240'} />
            </g>
          ))}
          {/* Mary at the center, garnet */}
          <Halo cx={178} cy={176} r={16} />
          <rect x="0" y="250" width="400" height="50" fill="#0c1122" />
        </>
      );

    case 'keys-shepherd':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="150" r="100" fill="#22305c" opacity="0.6" />
          {/* the crossed keys of Peter */}
          <g stroke={GOLD} strokeWidth="7" strokeLinecap="round" fill="none">
            <path d="M150 100L250 210" />
            <path d="M250 100L150 210" />
          </g>
          <g fill="none" stroke={GOLD} strokeWidth="5">
            <circle cx="142" cy="92" r="14" />
            <circle cx="258" cy="92" r="14" />
          </g>
          <g stroke={GOLD} strokeWidth="6" strokeLinecap="round">
            <path d="M250 210l12-2M244 196l10-4" />
            <path d="M150 210l-12-2M156 196l-10-4" />
          </g>
          {/* the shepherd's crook rising behind */}
          <path d="M200 268V90a26 26 0 0 1 52 0c0 12-9 22-22 24" fill="none" stroke={IVORY} strokeWidth="6" strokeLinecap="round" opacity="0.55" />
        </>
      );

    case 'bible-open':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <circle cx="200" cy="120" r="90" fill={GOLD} opacity="0.08" />
          {/* the open book on a stand */}
          <path d="M200 110c-30-16-70-16-100-6v110c30-10 70-10 100 6z" fill={IVORY} opacity="0.95" />
          <path d="M200 110c30-16 70-16 100-6v110c-30-10-70-10-100 6z" fill={IVORY} opacity="0.85" />
          <path d="M200 110v114" stroke={INCENSE} strokeWidth="2" />
          {/* text lines */}
          <g stroke={INCENSE} strokeWidth="2.5" opacity="0.6" strokeLinecap="round">
            {[126, 140, 154, 168, 182].map((y) => (
              <path key={y} d={`M116 ${y + 4}c24-6 50-7 74-3M210 ${y + 1}c24-4 50-3 74 3`} fill="none" />
            ))}
          </g>
          {/* illuminated initial */}
          <rect x="116" y="120" width="16" height="16" rx="2" fill={GARNET} />
          <path d="M120 124h8M120 132h8M120 124v8" stroke={GOLD} strokeWidth="1.5" />
          {/* light rising from the page */}
          <path d="M200 104V64M186 92l-12-22M214 92l12-22" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <rect x="170" y="240" width="60" height="34" fill="#141b33" />
        </>
      );

    case 'mass-altar':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* sanctuary arch */}
          <path d="M40 300V120a160 130 0 0 1 320 0v180" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.4" />
          {/* the altar, vested */}
          <rect x="110" y="190" width="180" height="14" rx="3" fill={IVORY} opacity="0.9" />
          <rect x="118" y="204" width="164" height="66" fill={GARNET} />
          <path d="M200 216v34M188 226h24" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
          {/* candles either side */}
          {[92, 308].map((x) => (
            <g key={x}>
              <rect x={x - 5} y="150" width="10" height="40" rx="2" fill={IVORY} opacity="0.9" />
              <path d={`M${x} 132c5 7 8 11 8 16a8 8 0 0 1-16 0c0-5 3-9 8-16z`} fill={GOLD} className="flame" />
            </g>
          ))}
          {/* the chalice and host above the altar */}
          <circle cx="200" cy="150" r="17" fill={IVORY} opacity="0.95" />
          <circle cx="200" cy="150" r="17" fill="none" stroke={GOLD} strokeWidth="2" />
          <path d="M200 142v16M193 149h14" stroke={INCENSE} strokeWidth="1.5" opacity="0.6" />
          <circle cx="200" cy="150" r="30" fill={GOLD} opacity="0.12" />
        </>
      );

    case 'monstrance':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <circle cx="200" cy="130" r="110" fill={GOLD} opacity="0.07" />
          {/* the sunburst monstrance */}
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * Math.PI) / 8;
            const len = i % 2 ? 52 : 70;
            return (
              <line
                key={i}
                x1={200 + Math.cos(a) * 34}
                y1={130 + Math.sin(a) * 34}
                x2={200 + Math.cos(a) * len}
                y2={130 + Math.sin(a) * len}
                stroke={GOLD}
                strokeWidth={i % 2 ? 3 : 5}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx="200" cy="130" r="30" fill="none" stroke={GOLD} strokeWidth="4" />
          <circle cx="200" cy="130" r="22" fill={IVORY} opacity="0.97" />
          <path d="M200 122v16M193 129h14" stroke={INCENSE} strokeWidth="1.5" opacity="0.55" />
          {/* the stem and base */}
          <path d="M196 200h8v40h-8z" fill={GOLD} />
          <path d="M170 252h60l-8-12h-44z" fill={GOLD} />
          <path d="M200 200v-2" stroke={GOLD} strokeWidth="10" strokeLinecap="round" />
          <circle cx="200" cy="208" r="7" fill={GOLD} />
        </>
      );

    case 'organ-pipes':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* the great organ case */}
          {[
            [60, 120], [105, 80], [150, 50], [195, 36], [240, 50], [285, 80], [330, 120],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect x={x - 16} y={y} width="32" height={270 - y} rx="4" fill="#22305c" stroke={GOLD} strokeWidth="1.5" />
              <rect x={x - 6} y={y + 14} width="12" height="26" rx="6" fill={GOLD} opacity="0.8" />
            </g>
          ))}
          {/* sound, drawn as rings of gold */}
          <g fill="none" stroke={GOLD} opacity="0.35">
            <circle cx="200" cy="150" r="120" strokeWidth="1" />
            <circle cx="200" cy="150" r="150" strokeWidth="0.8" />
            <circle cx="200" cy="150" r="180" strokeWidth="0.6" />
          </g>
          <rect x="0" y="270" width="400" height="30" fill="#0c1122" />
        </>
      );

    case 'visitation':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="130" r="100" fill={GOLD} opacity="0.09" />
          {/* a doorway in the hill country */}
          <path d="M300 290V160a44 50 0 0 1 88 0v130" fill="#141b33" />
          {/* the two mothers, embracing */}
          <g fill={GARNET}>
            <circle cx="172" cy="128" r="15" />
            <path d="M140 290v-110c0-26 14-44 32-44s32 18 32 44v110z" />
          </g>
          <g fill="#22305c">
            <circle cx="234" cy="134" r="15" />
            <path d="M202 290v-104c0-26 14-44 32-44s32 18 32 44v104z" />
          </g>
          {/* arms reaching to each other */}
          <path d="M188 168q14 14 30 2" stroke={IVORY} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9" />
          <Halo cx={172} cy={128} r={21} />
          <Halo cx={234} cy={134} r={21} />
          <rect x="0" y="282" width="400" height="18" fill="#10162b" />
        </>
      );

    case 'presentation-temple':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* temple columns */}
          {[60, 340].map((x) => (
            <g key={x} fill="#1a2240">
              <rect x={x - 12} y="60" width="24" height="220" />
              <rect x={x - 18} y="50" width="36" height="12" />
            </g>
          ))}
          <path d="M40 50h320l-20-22H60z" fill="#1a2240" />
          {/* old Simeon receiving the child */}
          <g fill={INCENSE}>
            <circle cx="250" cy="140" r="15" />
            <path d="M220 280v-96c0-26 13-44 30-44s30 18 30 44v96z" />
          </g>
          {/* the child, light in his arms */}
          <ellipse cx="216" cy="186" rx="22" ry="12" fill={IVORY} />
          <circle cx="204" cy="180" r="8" fill={IVORY} />
          <circle cx="212" cy="184" r="24" fill={GOLD} opacity="0.25" />
          <Halo cx={204} cy={180} r={12} />
          {/* Mary and Joseph */}
          <g fill={GARNET}>
            <circle cx="130" cy="152" r="13" />
            <path d="M104 280v-86c0-24 12-40 26-40s26 16 26 40v86z" />
          </g>
          {/* two doves of the offering */}
          <path d="M150 240q7-7 14 0M158 252q7-7 14 0" stroke={IVORY} strokeWidth="2" fill="none" opacity="0.7" />
          <rect x="0" y="278" width="400" height="22" fill="#0c1122" />
        </>
      );

    case 'finding-temple':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* temple interior arches */}
          <g fill="none" stroke={INCENSE} strokeWidth="2" opacity="0.5">
            <path d="M40 290V140a60 70 0 0 1 120 0v150" />
            <path d="M240 290V140a60 70 0 0 1 120 0v150" />
          </g>
          {/* the boy, small, teaching from the step */}
          <rect x="160" y="210" width="80" height="14" rx="3" fill="#1a2240" />
          <Halo cx={200} cy={148} r={16} />
          <circle cx="200" cy="148" r="10" fill={IVORY} />
          <path d="M186 210v-30c0-12 6-20 14-20s14 8 14 20v30z" fill={IVORY} opacity="0.92" />
          <path d="M182 184l-14 8M218 184l14 8" stroke={IVORY} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          {/* the astonished teachers, larger, seated lower */}
          {[90, 310].map((x, i) => (
            <g key={x} fill={i ? '#22305c' : '#1a2240'}>
              <circle cx={x} cy={210} r="14" />
              <path d={`M${x - 20} 280v-34c0-14 9-24 20-24s20 10 20 24v34z`} />
            </g>
          ))}
          <rect x="0" y="280" width="400" height="20" fill="#080d1a" />
        </>
      );

    case 'brussels-cathedral':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={41} n={14} />
          {/* the twin flat-topped gothic towers of St. Michael and St. Gudula */}
          <g fill="#141b33">
            <rect x="118" y="70" width="60" height="200" />
            <rect x="222" y="70" width="60" height="200" />
            <rect x="170" y="150" width="60" height="120" />
            <rect x="112" y="62" width="72" height="10" />
            <rect x="216" y="62" width="72" height="10" />
          </g>
          <g fill={GOLD} opacity="0.85">
            {[130, 154, 234, 258].map((x) => (
              <path key={x} d={`M${x} 96a6 10 0 0 1 12 0v22h-12z`} />
            ))}
            {[130, 154, 234, 258].map((x) => (
              <path key={`b${x}`} d={`M${x} 160a6 10 0 0 1 12 0v22h-12z`} />
            ))}
            <path d="M186 196a14 18 0 0 1 28 0v40h-28z" />
          </g>
          {/* the great central window */}
          <path d="M182 110a18 26 0 0 1 36 0v30h-36z" fill={LAPIS} stroke={GOLD} strokeWidth="2" opacity="0.9" />
          {/* the long stair up to the doors */}
          <g stroke={INCENSE} strokeWidth="2" opacity="0.5">
            {[272, 278, 284].map((y) => (
              <line key={y} x1={150 - (y - 272) * 6} y1={y} x2={250 + (y - 272) * 6} y2={y} />
            ))}
          </g>
          <rect x="0" y="288" width="400" height="12" fill="#10162b" />
        </>
      );

    case 'font-water':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <circle cx="200" cy="120" r="96" fill={GOLD} opacity="0.08" />
          {/* the octagonal font — eight sides, the shape of the eighth day */}
          <path d="M140 150l18-26h84l18 26v14h-120z" fill="#22305c" stroke={GOLD} strokeWidth="2" />
          <path d="M156 124h88" stroke={GOLD} strokeWidth="1.5" opacity="0.5" />
          <ellipse cx="200" cy="124" rx="44" ry="9" fill={LAPIS} stroke={IVORY} strokeWidth="2" opacity="0.95" />
          {/* the pedestal */}
          <path d="M186 164h28v52h-28z" fill="#22305c" stroke={GOLD} strokeWidth="1.5" />
          <path d="M166 216h68l-8 14h-52z" fill="#22305c" stroke={GOLD} strokeWidth="1.5" />
          {/* water poured from a shell */}
          <path d="M236 64c14 4 22 14 22 26l-26-6c-2-8 0-15 4-20z" fill={GOLD} opacity="0.9" />
          <path d="M232 86q-14 20-26 32" stroke={IVORY} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85" />
          <path d="M226 92q-12 16-22 26" stroke={IVORY} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
          {/* rings in the water */}
          <ellipse cx="196" cy="123" rx="16" ry="3.5" fill="none" stroke={IVORY} strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="196" cy="123" rx="28" ry="6" fill="none" stroke={IVORY} strokeWidth="1" opacity="0.35" />
          {/* the dove above */}
          <path d="M196 40l12-7 2 11 9 5-13 7-10-5z" fill={IVORY} opacity="0.9" />
        </>
      );

    case 'white-garment':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="160" cy="140" r="90" fill={GOLD} opacity="0.07" />
          {/* the small white garment, hanging in light */}
          <path d="M120 100l40-18 40 18-12 18-12-8v110h-32V110l-12 8z" fill={IVORY} opacity="0.95" />
          <path d="M134 150h52M134 176h52" stroke={INCENSE} strokeWidth="1" opacity="0.3" />
          {/* the baptismal candle, lit from the Easter candle */}
          <rect x="268" y="120" width="18" height="120" rx="4" fill={IVORY} opacity="0.92" />
          <path d="M277 88c9 12 14 20 14 28a14 14 0 0 1-28 0c0-8 5-16 14-28z" fill={GOLD} className="flame" />
          <circle cx="277" cy="106" r="30" fill={GOLD} opacity="0.13" />
          <path d="M270 160h14M270 180h14" stroke={GARNET} strokeWidth="2.5" opacity="0.7" />
          <rect x="0" y="262" width="400" height="38" fill="#141b33" />
        </>
      );

    case 'confession-light':
      return (
        <>
          <rect width="400" height="300" fill="#0c1122" />
          {/* a warm doorway, light spilling out — mercy, not shame */}
          <path d="M150 290V130a50 60 0 0 1 100 0v160z" fill={GOLD} opacity="0.92" />
          <path d="M160 290V134a40 50 0 0 1 80 0v156z" fill={IVORY} opacity="0.85" />
          {/* the lamp above: green for 'enter' in many confessionals; here, gold */}
          <circle cx="200" cy="56" r="9" fill={GOLD} className="soft-glow" />
          <path d="M200 38v8" stroke={INCENSE} strokeWidth="2" />
          {/* a figure walking in, lighter than when it arrived */}
          <g fill="#1a2240">
            <circle cx="120" cy="208" r="12" />
            <path d="M102 282v-46c0-16 8-26 18-26s18 10 18 26v46z" />
          </g>
          <path d="M140 240q30-4 40-2" stroke={GOLD} strokeWidth="2" strokeDasharray="2 6" opacity="0.6" fill="none" />
          <rect x="0" y="282" width="400" height="18" fill="#080d1a" />
        </>
      );

    case 'oil-hands':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <circle cx="200" cy="130" r="100" fill={GOLD} opacity="0.08" />
          {/* two hands extended in blessing over a brow */}
          <g fill={IVORY} opacity="0.9">
            <path d="M130 92c20-10 38-8 50 2l-12 26c-14-6-28-6-44 0z" />
            <path d="M270 92c-20-10-38-8-50 2l12 26c14-6 28-6 44 0z" />
          </g>
          {/* the face below, at peace */}
          <circle cx="200" cy="172" r="26" fill={INCENSE} opacity="0.85" />
          <path d="M188 176q12 10 24 0" stroke={LAPIS} strokeWidth="2" fill="none" />
          {/* the vessel of oil */}
          <path d="M188 232h24l-4 26c-2 8-14 8-16 0z" fill={GOLD} />
          <ellipse cx="200" cy="232" rx="12" ry="4" fill={GOLD} opacity="0.7" />
          <path d="M200 218v10" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
          {/* a drop of oil, falling as light */}
          <path d="M200 122c4 5 6 9 6 12a6 6 0 0 1-12 0c0-3 2-7 6-12z" fill={GOLD} opacity="0.95" />
        </>
      );

    case 'wedding-rings':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={43} n={10} />
          <circle cx="200" cy="140" r="104" fill={GOLD} opacity="0.08" />
          {/* two rings, interlocked beneath a cross */}
          <circle cx="172" cy="170" r="44" fill="none" stroke={GOLD} strokeWidth="9" />
          <circle cx="228" cy="170" r="44" fill="none" stroke={IVORY} strokeWidth="9" opacity="0.9" />
          <path d="M214 136a44 44 0 0 1 14 10" stroke={GOLD} strokeWidth="9" fill="none" strokeLinecap="round" />
          {/* the cross above, the third strand of the cord */}
          <path d="M200 52v34M188 64h24" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
          <path d="M200 92v22" stroke={GOLD} strokeWidth="2" strokeDasharray="2 6" opacity="0.7" />
        </>
      );

    case 'parish-home':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={47} n={18} />
          {/* a small parish church, windows warm, door open */}
          <g fill="#141b33">
            <rect x="130" y="150" width="140" height="120" />
            <path d="M130 150l70-50 70 50z" />
            <rect x="252" y="92" width="34" height="178" />
            <path d="M252 92l17-22 17 22z" />
          </g>
          <path d="M269 56v14M263 61h12" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
          <g fill={GOLD} opacity="0.92">
            <path d="M148 190a7 10 0 0 1 14 0v20h-14z" />
            <path d="M186 250v-44a14 16 0 0 1 28 0v44z" />
            <path d="M238 190a7 10 0 0 1 14 0v20h-14z" />
            <path d="M262 120a7 10 0 0 1 14 0v18h-14z" />
          </g>
          {/* a path of lamplight leading home */}
          <path d="M200 270q-10 14-30 26M200 270q12 16 34 28" stroke={GOLD} strokeWidth="2" strokeDasharray="1 8" opacity="0.5" fill="none" />
          <rect x="0" y="268" width="400" height="32" fill="#10162b" />
          <ellipse cx="200" cy="272" rx="120" ry="6" fill={GOLD} opacity="0.1" />
        </>
      );

    case 'commandments-tablets':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          <circle cx="200" cy="110" r="100" fill={GOLD} opacity="0.08" />
          {/* the two tablets, rounded like an open door */}
          <path d="M110 250V120a45 50 0 0 1 90 0v130z" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          <path d="M200 250V120a45 50 0 0 1 90 0v130z" fill="#22305c" stroke={GOLD} strokeWidth="2.5" />
          {/* three lines and seven lines: love of God, love of neighbor */}
          <g stroke={IVORY} strokeWidth="3" strokeLinecap="round" opacity="0.75">
            {[140, 162, 184].map((y) => (
              <line key={y} x1="128" y1={y} x2="182" y2={y} />
            ))}
            {[136, 152, 168, 184, 200, 216, 232].map((y) => (
              <line key={`r${y}`} x1="218" y1={y} x2="272" y2={y} />
            ))}
          </g>
          {/* a heart drawn over both — the great commandment */}
          <path d="M200 96c8-14 26-14 30 0 4 12-12 24-30 36-18-12-34-24-30-36 4-14 22-14 30 0z" fill={GARNET} opacity="0.9" />
          <rect x="0" y="250" width="400" height="50" fill="#0c1122" />
        </>
      );

    case 'liturgical-wheel':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          {/* the year as a wheel of seasons */}
          <circle cx="200" cy="150" r="104" fill="#141b33" stroke={INCENSE} strokeWidth="2" />
          {/* Advent + Lent: garnet · Christmas + Easter: ivory/gold · Ordinary: deep green? No — incense */}
          {[
            { a0: -90, a1: -50, c: GARNET },
            { a0: -50, a1: -20, c: IVORY },
            { a0: -20, a1: 60, c: INCENSE },
            { a0: 60, a1: 110, c: GARNET },
            { a0: 110, a1: 170, c: GOLD },
            { a0: 170, a1: 270, c: INCENSE },
          ].map(({ a0, a1, c }, i) => {
            const r0 = 58;
            const r1 = 98;
            const rad = (d: number) => (d * Math.PI) / 180;
            const p = (r: number, d: number) => `${200 + Math.cos(rad(d)) * r},${150 + Math.sin(rad(d)) * r}`;
            const large = a1 - a0 > 180 ? 1 : 0;
            return (
              <path
                key={i}
                d={`M${p(r0, a0)} L${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`}
                fill={c}
                opacity={c === INCENSE ? 0.45 : 0.85}
                stroke={LAPIS}
                strokeWidth="2"
              />
            );
          })}
          {/* the center: the paschal flame the year turns around */}
          <circle cx="200" cy="150" r="40" fill={LAPIS} stroke={GOLD} strokeWidth="2" />
          <path d="M200 128c9 11 13 19 13 26a13 13 0 0 1-26 0c0-7 4-15 13-26z" fill={GOLD} className="flame" />
        </>
      );

    case 'heaven-light':
      return (
        <>
          <rect width="400" height="300" fill="#10162b" />
          {/* a great dawn beyond a doorway of clouds */}
          <circle cx="200" cy="120" r="130" fill={GOLD} opacity="0.1" />
          <circle cx="200" cy="120" r="84" fill={GOLD} opacity="0.2" />
          <circle cx="200" cy="120" r="44" fill={IVORY} opacity="0.9" />
          <ellipse cx="120" cy="190" rx="80" ry="22" fill={IVORY} opacity="0.5" />
          <ellipse cx="290" cy="200" rx="90" ry="24" fill={IVORY} opacity="0.55" />
          <ellipse cx="200" cy="226" rx="130" ry="26" fill={IVORY} opacity="0.7" />
          {/* small figures walking up into the light, together */}
          <g fill="#1a2240">
            {[150, 185, 222, 256].map((x, i) => (
              <g key={x}>
                <circle cx={x} cy={252 - i * 4} r="7" />
                <path d={`M${x - 9} 282v-${18 + i * 2}c0-7 4-12 9-12s9 5 9 12v${18 + i * 2}z`} />
              </g>
            ))}
          </g>
          <rect x="0" y="284" width="400" height="16" fill="#080d1a" />
        </>
      );

    case 'asia-lanterns':
      return (
        <>
          <rect width="400" height="300" fill="#0c1122" />
          <Stars seed={53} n={20} />
          {/* lanterns rising like prayers over the water — Hội An at night */}
          {[
            [80, 110, GOLD], [150, 70, GARNET], [220, 100, GOLD], [290, 60, IVORY], [340, 130, GARNET], [120, 170, IVORY],
          ].map(([x, y, c], i) => (
            <g key={i}>
              <rect x={Number(x) - 14} y={Number(y)} width="28" height="36" rx="10" fill={String(c)} opacity={c === IVORY ? 0.8 : 0.9} />
              <rect x={Number(x) - 6} y={Number(y) - 7} width="12" height="7" rx="2" fill={String(c)} opacity="0.6" />
              <circle cx={Number(x)} cy={Number(y) + 18} r="22" fill={String(c)} opacity="0.12" />
            </g>
          ))}
          {/* the water, carrying their light */}
          <rect x="0" y="220" width="400" height="80" fill="#10182f" />
          {[80, 150, 220, 290, 340].map((x) => (
            <path key={x} d={`M${x} 228v40`} stroke={GOLD} strokeWidth="3" opacity="0.18" strokeLinecap="round" />
          ))}
          {/* a small cross of light among the lanterns */}
          <path d="M200 168v22M191 177h18" stroke={GOLD} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        </>
      );

    case 'st-peters':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={59} n={14} />
          {/* the great dome */}
          <path d="M140 140a60 60 0 0 1 120 0z" fill="#141b33" stroke={GOLD} strokeWidth="2" />
          <path d="M150 140a50 52 0 0 1 100 0" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.5" />
          {[170, 200, 230].map((x) => (
            <line key={x} x1={x} y1="86" x2={x} y2="138" stroke={GOLD} strokeWidth="1" opacity="0.4" />
          ))}
          <rect x="188" y="58" width="24" height="14" fill="#141b33" stroke={GOLD} strokeWidth="1.5" />
          <path d="M200 38v16M193 44h14" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
          {/* the façade */}
          <rect x="110" y="140" width="180" height="70" fill="#141b33" stroke={GOLD} strokeWidth="1.5" />
          {[130, 162, 194, 226, 258].map((x) => (
            <rect key={x} x={x} y="154" width="14" height="56" fill={LAPIS} stroke={GOLD} strokeWidth="1" opacity="0.9" />
          ))}
          {/* Bernini's embracing colonnade */}
          <path d="M30 282c40-36 110-54 170-54s130 18 170 54" fill="none" stroke={INCENSE} strokeWidth="3" opacity="0.7" />
          <path d="M50 286c38-30 100-46 150-46s112 16 150 46" fill="none" stroke={INCENSE} strokeWidth="2" opacity="0.4" />
          {/* the obelisk and lamps of the square */}
          <path d="M198 232l2-22 2 22z" fill={IVORY} opacity="0.7" />
          {[120, 280].map((x) => (
            <circle key={x} cx={x} cy="252" r="3.5" fill={GOLD} className="soft-glow" />
          ))}
          <rect x="0" y="288" width="400" height="12" fill="#10162b" />
        </>
      );

    case 'pieta':
      return (
        <>
          <rect width="400" height="300" fill="#0c1122" />
          <circle cx="200" cy="140" r="110" fill={IVORY} opacity="0.06" />
          {/* the mother, a mountain of drapery */}
          <path d="M110 280c0-80 36-130 90-130s90 50 90 130z" fill="#22305c" />
          <g stroke={LAPIS} strokeWidth="3" opacity="0.6" fill="none">
            <path d="M150 280c-4-50 10-90 30-110M250 280c4-50-10-90-30-110" />
            <path d="M170 280c-2-36 6-66 18-84M230 280c2-36-6-66-18-84" />
          </g>
          <circle cx="200" cy="134" r="17" fill={IVORY} opacity="0.92" />
          <path d="M186 122a17 17 0 0 1 28 0l-4 24h-20z" fill="#22305c" />
          <Halo cx={200} cy={134} r={24} />
          {/* the son, laid across her lap */}
          <path d="M120 222q80-26 160 0" stroke={IVORY} strokeWidth="16" strokeLinecap="round" fill="none" opacity="0.92" />
          <circle cx="128" cy="216" r="11" fill={IVORY} opacity="0.95" />
          <path d="M276 224l16 12" stroke={IVORY} strokeWidth="7" strokeLinecap="round" opacity="0.85" />
          {/* her open hand: the question offered to heaven */}
          <path d="M256 196q14-8 22-4" stroke={IVORY} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
          <rect x="0" y="280" width="400" height="20" fill="#080d1a" />
        </>
      );

    case 'sinai-bush':
      return (
        <>
          <defs>
            <radialGradient id="bushSky" cx="50%" cy="62%" r="75%">
              <stop offset="0%" stopColor="#2a2440" />
              <stop offset="45%" stopColor="#161a33" />
              <stop offset="100%" stopColor="#0a0e1e" />
            </radialGradient>
            <radialGradient id="bushGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={GOLD} stopOpacity="0.55" />
              <stop offset="35%" stopColor={GOLD} stopOpacity="0.22" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bushOuter" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={GARNET} />
              <stop offset="55%" stopColor="#b5572e" />
              <stop offset="100%" stopColor={GOLD} />
            </linearGradient>
            <linearGradient id="bushInner" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#c9772f" />
              <stop offset="60%" stopColor={GOLD} />
              <stop offset="100%" stopColor={IVORY} />
            </linearGradient>
            <linearGradient id="bushGround" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a2336" />
              <stop offset="100%" stopColor="#0c1020" />
            </linearGradient>
          </defs>

          {/* night sky and stars */}
          <rect width="400" height="300" fill="url(#bushSky)" />
          <Stars seed={61} n={26} />
          <circle cx="64" cy="50" r="13" fill={IVORY} opacity="0.55" />
          <circle cx="60" cy="47" r="11" fill="url(#bushSky)" />

          {/* Mount Sinai, low on the horizon, lit faintly by the fire */}
          <path d="M0 232L96 150l46 42 40-30 70 60 60-26 88 56v62H0z" fill="#10142a" />
          <path d="M96 150l46 42 12-9-40-50z" fill="#161b34" opacity="0.8" />

          {/* warm ground, and the great glow of holy fire */}
          <rect x="0" y="226" width="400" height="74" fill="url(#bushGround)" />
          <ellipse cx="200" cy="232" rx="150" ry="26" fill={GOLD} opacity="0.16" />
          <rect x="40" y="20" width="320" height="280" fill="url(#bushGlow)" />

          {/* the branches — visible through the flames, and not consumed */}
          <g stroke="#241d14" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9">
            <path d="M200 236V150" />
            <path d="M200 210c-22-6-34-22-40-44M200 198c20-6 33-20 40-40M200 178c-14-6-22-16-26-30M200 170c14-6 22-16 26-28" />
          </g>
          {/* small leaves that stay green-grey: the bush survives the fire */}
          {[
            [166, 168],
            [236, 162],
            [176, 196],
            [228, 192],
            [200, 150],
          ].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y} q -9 -7 0 -16 q 9 9 0 16 Z`}
              fill={INCENSE}
              opacity={0.7}
            />
          ))}

          {/* the fire itself, layered: deep tongues, gold body, ivory heart */}
          <g>
            {/* outer garnet→gold tongues form the bush silhouette */}
            <Tongue cx={150} cy={244} h={120} w={66} lean={-22} fill="url(#bushOuter)" opacity={0.95} />
            <Tongue cx={250} cy={244} h={122} w={66} lean={22} fill="url(#bushOuter)" opacity={0.95} />
            <Tongue cx={176} cy={250} h={150} w={70} lean={-9} fill="url(#bushOuter)" />
            <Tongue cx={226} cy={250} h={152} w={70} lean={9} fill="url(#bushOuter)" />
            <Tongue cx={200} cy={252} h={172} w={74} lean={0} fill="url(#bushOuter)" />
            {/* mid gold body */}
            <Tongue cx={184} cy={246} h={120} w={48} lean={-10} fill={GOLD} opacity={0.95} flicker />
            <Tongue cx={216} cy={246} h={122} w={48} lean={10} fill={GOLD} opacity={0.95} flicker />
            <Tongue cx={200} cy={248} h={146} w={50} lean={0} fill={GOLD} flicker />
            {/* a few side tongues licking outward */}
            <Tongue cx={128} cy={238} h={70} w={34} lean={-46} fill="url(#bushOuter)" opacity={0.85} flicker />
            <Tongue cx={272} cy={238} h={72} w={34} lean={46} fill="url(#bushOuter)" opacity={0.85} flicker />
            {/* ivory heart of the fire, blooming with light */}
            <g filter="url(#sa-bloom)">
              <Tongue cx={200} cy={240} h={104} w={26} lean={0} fill="url(#bushInner)" flicker />
              <Tongue cx={191} cy={236} h={74} w={16} lean={-8} fill={IVORY} opacity={0.85} flicker />
              <Tongue cx={209} cy={236} h={76} w={16} lean={8} fill={IVORY} opacity={0.85} flicker />
            </g>
          </g>

          {/* embers rising into the dark */}
          {[
            [168, 96],
            [238, 80],
            [200, 60],
            [150, 130],
            [256, 120],
            [214, 104],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.6 + (i % 3) * 0.7} fill={GOLD} opacity={0.5 + (i % 3) * 0.15} className="soft-glow" />
          ))}
        </>
      );

    case 'sinai-mountain':
      return (
        <>
          <rect width="400" height="300" fill="#0c1122" />
          <Stars seed={67} n={26} />
          {/* the mountain of God */}
          <path d="M-20 300L150 80l60 70 40-40 170 190z" fill="#141b33" />
          <path d="M150 80l60 70 40-40" fill="none" stroke={INCENSE} strokeWidth="1.5" opacity="0.4" />
          {/* glory resting on the summit */}
          <circle cx="150" cy="74" r="26" fill={GOLD} opacity="0.18" />
          <circle cx="150" cy="74" r="10" fill={GOLD} opacity="0.6" />
          {/* the monastery at its foot, one lit window */}
          <g fill="#1a2240">
            <rect x="284" y="226" width="64" height="54" />
            <path d="M284 226l32-20 32 20z" />
          </g>
          <path d="M316 196v10M312 200h8" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M306 248a5 7 0 0 1 10 0v14h-10z" fill={GOLD} opacity="0.9" />
          {/* the pilgrim path up */}
          <path d="M60 290C100 240 120 180 148 96" stroke={GOLD} strokeWidth="2" strokeDasharray="1 9" fill="none" opacity="0.5" />
        </>
      );

    case 'jerusalem-city':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={71} n={16} />
          <circle cx="320" cy="56" r="18" fill={IVORY} opacity="0.85" />
          <circle cx="313" cy="51" r="15" fill={LAPIS} />
          {/* the old city on its hill: walls, domes, towers */}
          <ellipse cx="200" cy="320" rx="270" ry="110" fill="#141b33" />
          <g fill="#1a2240">
            <rect x="40" y="190" width="320" height="44" />
            <rect x="40" y="180" width="14" height="54" />
            <rect x="346" y="180" width="14" height="54" />
            <rect x="190" y="170" width="20" height="64" />
          </g>
          {/* crenellations */}
          {[60, 84, 108, 132, 156, 224, 248, 272, 296, 320].map((x) => (
            <rect key={x} x={x} y="184" width="10" height="6" fill="#1a2240" />
          ))}
          {/* domes within */}
          <path d="M96 190a26 26 0 0 1 52 0z" fill="#22305c" stroke={GOLD} strokeWidth="1.5" />
          <path d="M122 158v8" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <path d="M252 190a32 30 0 0 1 64 0z" fill="#22305c" stroke={GOLD} strokeWidth="1.5" />
          <path d="M284 150v12M279 155h10" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          {/* the gate, open */}
          <path d="M188 234v-30a12 16 0 0 1 24 0v30z" fill={GOLD} opacity="0.85" />
          {/* olive trees outside the walls */}
          {[70, 330].map((x) => (
            <g key={x}>
              <path d={`M${x} 262v-16`} stroke="#1a2240" strokeWidth="4" strokeLinecap="round" />
              <circle cx={x} cy={238} r="12" fill="#1a2240" />
            </g>
          ))}
        </>
      );

    case 'lourdes-grotto':
      return (
        <>
          <rect width="400" height="300" fill="#0c1122" />
          {/* the rock face and the grotto */}
          <path d="M0 0h400v300H320c10-90-20-150-90-150S130 210 140 300H0z" fill="#141b33" />
          <path d="M140 300c-10-90 20-150 90-150s100 60 90 150z" fill="#080d1a" />
          {/* Our Lady in the niche above */}
          <ellipse cx="318" cy="92" rx="30" ry="38" fill="#1a2240" />
          <g>
            <circle cx="318" cy="74" r="9" fill={IVORY} />
            <path d="M304 124v-32c0-12 6-20 14-20s14 8 14 20v32z" fill={IVORY} opacity="0.92" />
            <Halo cx={318} cy={74} r={13} />
          </g>
          {/* candles at the grotto mouth */}
          {[170, 196, 222, 248, 274].map((x, i) => (
            <g key={x}>
              <rect x={x - 3} y={262 - (i % 2) * 8} width="6" height={28 + (i % 2) * 8} rx="2" fill={IVORY} opacity="0.9" />
              <path
                d={`M${x} ${248 - (i % 2) * 8}c4 5 6 9 6 12a6 6 0 0 1-12 0c0-3 2-7 6-12z`}
                fill={GOLD}
                className="flame"
              />
            </g>
          ))}
          <circle cx="222" cy="252" r="60" fill={GOLD} opacity="0.1" />
          {/* the spring, running out of the rock */}
          <path d="M150 300q40-14 70-8t60 8" stroke="#22305c" strokeWidth="8" fill="none" opacity="0.9" />
          <path d="M160 296q34-10 60-6" stroke={IVORY} strokeWidth="1.5" fill="none" opacity="0.4" />
        </>
      );

    case 'camino-way':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          {/* dawn over rolling country */}
          <circle cx="200" cy="160" r="56" fill={GOLD} opacity="0.65" />
          <circle cx="200" cy="160" r="90" fill={GOLD} opacity="0.12" />
          <path d="M0 210q100-44 200-30t200 18v102H0z" fill="#141b33" />
          <path d="M0 250q120-26 400-10v60H0z" fill="#10162b" />
          {/* the path, walking into the light */}
          <path d="M190 300q6-60 10-110" stroke={IVORY} strokeWidth="14" strokeLinecap="round" opacity="0.25" />
          <path d="M196 300q4-56 8-106" stroke={GOLD} strokeWidth="2" strokeDasharray="2 10" fill="none" opacity="0.7" />
          {/* the waymark: a scallop shell */}
          <g transform="translate(90, 232)">
            <rect x="-8" y="0" width="16" height="48" fill="#1a2240" />
            <circle cx="0" cy="-12" r="20" fill="#1a2240" />
            <g stroke={GOLD} strokeWidth="2.5" strokeLinecap="round">
              {Array.from({ length: 5 }, (_, i) => {
                const a = -Math.PI / 2 + (i - 2) * 0.4;
                return <line key={i} x1="0" y1="-4" x2={Math.cos(a) * 14} y2={-12 + Math.sin(a) * 10} />;
              })}
            </g>
          </g>
          {/* a pilgrim, mid-stride */}
          <g fill="#1a2240">
            <circle cx="206" cy="206" r="9" />
            <path d="M196 258v-30c0-10 5-16 10-16s10 6 10 16v30z" />
            <path d="M214 226l12 30M198 228l-8 28" stroke="#1a2240" strokeWidth="5" strokeLinecap="round" />
          </g>
          <path d="M218 200v54" stroke={INCENSE} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </>
      );

    case 'santiago':
      return (
        <>
          <rect width="400" height="300" fill={LAPIS} />
          <Stars seed={73} n={14} />
          {/* the baroque west front: two ornate towers */}
          <g fill="#141b33">
            <rect x="116" y="90" width="52" height="180" />
            <rect x="232" y="90" width="52" height="180" />
            <rect x="168" y="140" width="64" height="130" />
            <path d="M116 90l26-34 26 34zM232 90l26-34 26 34z" />
          </g>
          <path d="M142 44v14M136 49h12M258 44v14M252 49h12" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <g fill={GOLD} opacity="0.9">
            <path d="M132 124a8 11 0 0 1 16 0v22h-16z" />
            <path d="M248 124a8 11 0 0 1 16 0v22h-16z" />
            <path d="M132 180a8 11 0 0 1 16 0v22h-16z" />
            <path d="M248 180a8 11 0 0 1 16 0v22h-16z" />
            <path d="M186 210a14 18 0 0 1 28 0v50h-28z" />
          </g>
          {/* the scallop above the door */}
          <g transform="translate(200, 184)" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
            {Array.from({ length: 5 }, (_, i) => {
              const a = -Math.PI / 2 + (i - 2) * 0.45;
              return <line key={i} x1="0" y1="8" x2={Math.cos(a) * 16} y2={Math.sin(a) * 12} />;
            })}
          </g>
          {/* the square, with small pilgrims arriving */}
          <rect x="0" y="268" width="400" height="32" fill="#10162b" />
          {[80, 320].map((x) => (
            <g key={x} fill="#1a2240">
              <circle cx={x} cy={252} r="7" />
              <path d={`M${x - 9} 280v-18c0-7 4-12 9-12s9 5 9 12v18z`} />
            </g>
          ))}
          <ellipse cx="200" cy="272" rx="140" ry="7" fill={GOLD} opacity="0.1" />
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

// A shared treatment that lifts every scene out of "flat vector" territory:
// painterly edge displacement, a warm bloom, film grain, and a gallery
// vignette — light and texture, the difference between clip-art and craft.
function Treatment() {
  return (
    <defs>
      {/* gentle organic warp so edges aren't mechanically perfect */}
      <filter id="sa-paint" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {/* fine film grain, rendered as its own tile and blended soft */}
      <filter id="sa-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="t" />
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
      </filter>
      {/* warm light bloom for flames, halos, gilding */}
      <filter id="sa-bloom" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* a soft inner darkening at the edges, like a lit painting */}
      <radialGradient id="sa-vignette" cx="50%" cy="44%" r="78%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0" />
        <stop offset="72%" stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#05070f" stopOpacity="0.5" />
      </radialGradient>
      {/* a hair of warm light pooled at the top, where grace enters */}
      <radialGradient id="sa-light" cx="50%" cy="8%" r="60%">
        <stop offset="0%" stopColor={IVORY} stopOpacity="0.08" />
        <stop offset="100%" stopColor={IVORY} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export function SacredArt({
  kind,
  className = '',
  rounded = true,
  drift = false,
}: {
  kind: ArtKind;
  className?: string;
  rounded?: boolean;
  /** Slow Ken-Burns drift — for large hero/story art, not small icons. */
  drift?: boolean;
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
      <Treatment />
      <g className={drift ? 'art-drift' : undefined} style={{ transformOrigin: 'center' }}>
        <g filter="url(#sa-paint)">
          <Scene kind={kind} />
        </g>
        {/* warm pooled light, then a gallery vignette */}
        <rect width="400" height="300" fill="url(#sa-light)" pointerEvents="none" />
        <rect width="400" height="300" fill="url(#sa-vignette)" pointerEvents="none" />
        {/* film grain, blended soft so it reads as canvas, not noise */}
        <rect
          width="400"
          height="300"
          filter="url(#sa-grain)"
          opacity="0.14"
          style={{ mixBlendMode: 'soft-light' }}
          pointerEvents="none"
        />
      </g>
    </svg>
  );
}
