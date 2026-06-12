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
