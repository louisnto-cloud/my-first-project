import { useMemo, useState, type ReactNode } from 'react';
import { loadTextSize, saveTextSize, type TextSize } from './engine';
import { applyToneToLastVowel, SPECIAL_LETTERS, TONES } from './vi';
import type { TTS } from './useTTS';

/** A / A+ toggle — larger reading text for beginner readers, persisted per device. */
export function useTextSize(): [TextSize, () => void] {
  const [size, setSize] = useState<TextSize>(loadTextSize);
  const toggle = () => {
    const next: TextSize = size === 'large' ? 'normal' : 'large';
    saveTextSize(next);
    setSize(next);
  };
  return [size, toggle];
}

export function TextSizeToggle({ size, onToggle }: { size: TextSize; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title="Text size"
      className={`flex h-7 items-center gap-0.5 rounded-full px-2 text-xs font-black ${size === 'large' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      A<span className="text-[15px] leading-none">A</span>
    </button>
  );
}

export function StepCard({ children }: { children: ReactNode }) {
  return <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">{children}</div>;
}

export function NavButton({ label, onClick, color, disabled }: { label: string; onClick: () => void; color: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mt-2 w-full rounded-xl py-3 font-black text-white transition-all hover:opacity-90 disabled:opacity-40 ${color}`}
    >
      {label}
    </button>
  );
}

export function XpChip({ amount }: { amount: number }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700 animate-pop">+{amount} XP ⭐</span>;
}

// ─── Audio controls ───────────────────────────────────────────────────────────
/** Shown when the browser can't speak — or can't speak Vietnamese — so silent audio buttons don't look broken. */
export function AudioNotice({ tts }: { tts: TTS }) {
  if (tts.supported && !tts.failed && !tts.noViVoice) return null;
  const noVi = tts.supported && !tts.failed && tts.noViVoice;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
      <span className="text-base">🔇</span>
      <span>
        {noVi
          ? 'No Vietnamese voice is installed in this browser, so words are read with a default voice and the tones will sound wrong. For real Vietnamese audio, try Chrome or Edge, or add a Vietnamese voice in your system speech settings.'
          : `Audio isn't available in this browser${tts.failed ? ' (no speech voices installed)' : ''}. Everything still works for reading — for the spoken lessons, try Chrome, Edge, or Safari on a phone or computer.`}
      </span>
    </div>
  );
}

export function PlayButton({ tts, text, color, highlight, label }: { tts: TTS; text: string; color: string; highlight?: boolean; label?: string }) {
  return (
    <button
      onClick={() => (tts.speaking ? tts.stop() : tts.speak(text, { highlight }))}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${tts.speaking ? 'bg-red-100 text-red-600' : `${color} text-white`}`}
    >
      {tts.speaking ? '⏹ Stop' : `▶ ${label ?? 'Play'}`}
    </button>
  );
}

const SOUTHERN_NAME = /south|mi[eề]n nam|nam b[oộ]|s[aà]i g[oò]n|saigon|hcm|ho chi minh/i;
const NATURAL_NAME = /natural|neural|premium|enhanced|online/i;

export function AudioSettings({ tts }: { tts: TTS }) {
  const [open, setOpen] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const chosenURI = tts.settings.voiceURI ?? tts.voices[0]?.voiceURI ?? null;
  const hasSouthern = tts.voices.some((v) => SOUTHERN_NAME.test(v.name));

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm hover:bg-gray-200" title="Audio settings">
        ⚙️
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg space-y-2">
          <div className="text-xs font-black text-gray-700">🔊 Audio speed</div>
          <div className="flex gap-1">
            {[{ v: 0.7, l: '🐢 Slow' }, { v: 0.9, l: 'Normal' }, { v: 1.1, l: '🐇 Fast' }].map((o) => (
              <button
                key={o.v}
                onClick={() => tts.setSettings({ ...tts.settings, rate: o.v })}
                className={`flex-1 rounded-lg px-1 py-1.5 text-[11px] font-bold ${tts.settings.rate === o.v ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {o.l}
              </button>
            ))}
          </div>

          {tts.voices.length > 0 && (
            <>
              <div className="text-xs font-black text-gray-700">🗣️ Vietnamese voice — tap ▶ to hear a sample</div>
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {tts.voices.map((v, i) => {
                  const selected = v.voiceURI === chosenURI;
                  const southern = SOUTHERN_NAME.test(v.name);
                  const natural = NATURAL_NAME.test(v.name);
                  return (
                    <div key={v.voiceURI} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${selected ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
                      <button onClick={() => tts.setSettings({ ...tts.settings, voiceURI: v.voiceURI })} className="flex-1 truncate text-left text-[11px] font-bold text-gray-700">
                        {selected ? '● ' : '○ '}{v.name.replace(/Microsoft |Google /,'')}
                        {southern && <span className="ml-1 rounded bg-emerald-100 px-1 text-[9px] font-black text-emerald-700">SOUTH</span>}
                        {!southern && natural && <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-black text-amber-700">NATURAL</span>}
                        {i === 0 && <span className="ml-1 text-[9px] font-black text-gray-400">★ best</span>}
                      </button>
                      <button onClick={() => (tts.speaking ? tts.stop() : tts.preview(v.voiceURI))} className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 hover:bg-gray-200">
                        {tts.speaking ? '⏹' : '▶'}
                      </button>
                    </div>
                  );
                })}
              </div>
              {!hasSouthern && (
                <p className="text-[10px] leading-snug text-gray-400">
                  All built-in Vietnamese voices use standard (Northern) pronunciation — no browser ships a Southern voice yet. If you install one on your device, it appears here with a <span className="font-black text-emerald-600">SOUTH</span> tag and is preferred automatically.
                </p>
              )}
            </>
          )}

          <button onClick={() => setShowVoiceHelp((s) => !s)} className="w-full rounded-lg bg-gray-50 px-2 py-1 text-left text-[10px] font-bold text-gray-500 hover:bg-gray-100">
            {showVoiceHelp ? '▾' : '▸'} Get a more natural voice
          </button>
          {showVoiceHelp && (
            <div className="space-y-1 text-[10px] leading-snug text-gray-500">
              <p><strong>Windows (Edge):</strong> Edge includes online "Natural" Vietnamese voices (HoaiMy, NamMinh) — they'll appear above automatically.</p>
              <p><strong>iPhone / Mac:</strong> Settings → Accessibility → Spoken Content → Voices → Vietnamese → download <strong>Linh (Enhanced)</strong>.</p>
              <p><strong>Android:</strong> Settings → System → Text-to-speech → install/update Google Speech Services with Vietnamese.</p>
              <p>Then reopen this app — the best voice is picked automatically.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tone-mark helper row ─────────────────────────────────────────────────────
/**
 * Tappable characters for learners without a Vietnamese keyboard:
 * the seven letters English lacks, plus the five tone marks (applied to the
 * last vowel of the current input). ⌫ clears the tone from the last vowel.
 */
export function ToneHelperRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-2">
      <div className="flex flex-wrap gap-1">
        {SPECIAL_LETTERS.map((ch) => (
          <button
            key={ch}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(value + ch)}
            className="min-w-[2rem] rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm font-black text-gray-800 hover:bg-amber-100"
          >
            {ch}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {TONES.slice(1).map((t, i) => (
          <button
            key={t.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(applyToneToLastVowel(value, i + 1))}
            title={t.label}
            className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
          >
            {t.example}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(applyToneToLastVowel(value, 0))}
          title="Remove the tone from the last vowel"
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-500 hover:bg-gray-50"
        >
          no tone
        </button>
      </div>
      <div className="text-[10px] font-semibold text-amber-700">Tap a letter to insert it · tap a tone to mark the last vowel</div>
    </div>
  );
}

// ─── Tap-to-hear word rendering ──────────────────────────────────────────────
/** Render text as tappable words; `activeIndex` highlights the word being spoken. */
export function TappableText({ text, onWord, activeIndex, baseIndex = 0, className = '' }: {
  text: string;
  onWord?: (w: string) => void;
  activeIndex?: number;
  baseIndex?: number;
  className?: string;
}) {
  const parts = text.split(/(\s+)/);
  let wordIdx = baseIndex - 1;
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || part === '') return <span key={i}>{part}</span>;
        wordIdx += 1;
        const idx = wordIdx;
        const active = activeIndex === idx;
        return (
          <span
            key={i}
            onClick={onWord ? () => onWord(part.replace(/[^\p{L}'-]/gu, '')) : undefined}
            className={`${onWord ? 'cursor-pointer hover:bg-red-100 rounded' : ''} ${active ? 'bg-amber-200 rounded' : ''} transition-colors`}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}

// ─── Markdown rendering (headings, lists, quotes, REAL tables, inline styles) ─
function renderInline(text: string, onWord?: (w: string) => void): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter((t) => t !== '');
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**')) return <strong key={i}><TappableText text={tok.slice(2, -2)} onWord={onWord} /></strong>;
    if (tok.startsWith('*') && tok.endsWith('*')) return <em key={i}><TappableText text={tok.slice(1, -1)} onWord={onWord} /></em>;
    if (tok.startsWith('`') && tok.endsWith('`')) return <code key={i} className="rounded bg-gray-100 px-1 font-mono text-xs">{tok.slice(1, -1)}</code>;
    return <TappableText key={i} text={tok} onWord={onWord} />;
  });
}

export function MarkdownContent({ content, onWord }: { content: string; onWord?: (w: string) => void }) {
  const blocks = useMemo(() => {
    const lines = content.split('\n');
    const out: ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Table block
      if (line.trimStart().startsWith('|')) {
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trimStart().startsWith('|')) {
          const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
          if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells); // skip separator row
          i += 1;
        }
        const [head, ...body] = rows;
        out.push(
          <div key={`t${i}`} className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              {head && (
                <thead>
                  <tr className="bg-gray-50">
                    {head.map((c, j) => <th key={j} className="px-3 py-2 text-left text-xs font-black text-gray-600">{renderInline(c, onWord)}</th>)}
                  </tr>
                </thead>
              )}
              <tbody>
                {body.map((r, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    {r.map((c, j) => <td key={j} className="px-3 py-1.5 text-gray-700">{renderInline(c, onWord)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }

      if (line.startsWith('# ')) out.push(<h2 key={i} className="mt-2 text-lg font-black text-gray-800">{renderInline(line.slice(2), onWord)}</h2>);
      else if (line.startsWith('## ')) out.push(<h3 key={i} className="mt-2 text-base font-black text-gray-700">{renderInline(line.slice(3), onWord)}</h3>);
      else if (line.startsWith('### ')) out.push(<h4 key={i} className="mt-1 text-sm font-bold text-gray-600">{renderInline(line.slice(4), onWord)}</h4>);
      else if (/^(- |✓ |✅ |❌ |🎵 |👂 |🗣️ |✍️ |🧠 |❤️ |🎓 )/.test(line)) {
        const idx = line.indexOf(' ');
        out.push(
          <div key={i} className="flex gap-2 text-sm">
            <span className="shrink-0">{line.slice(0, idx)}</span>
            <span className="text-gray-700">{renderInline(line.slice(idx + 1), onWord)}</span>
          </div>,
        );
      } else if (line.startsWith('> ')) out.push(<blockquote key={i} className="border-l-4 border-red-200 pl-3 text-sm italic text-gray-600">{renderInline(line.slice(2), onWord)}</blockquote>);
      else if (line.startsWith('---')) out.push(<hr key={i} className="border-gray-200" />);
      else if (!line.trim()) out.push(<div key={i} className="h-1" />);
      else out.push(<p key={i} className="text-sm leading-relaxed text-gray-700">{renderInline(line, onWord)}</p>);
      i += 1;
    }
    return out;
  }, [content, onWord]);

  return <div className="max-w-none space-y-2">{blocks}</div>;
}

// ─── Confetti ────────────────────────────────────────────────────────────────
const CONFETTI_EMOJI = ['🎉', '⭐', '✨', '🎊', '💫', '🪷'];

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.6 + Math.random() * 1.4,
        size: 14 + Math.random() * 14,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute animate-confetti"
          style={{ left: `${p.left}%`, top: '-5%', fontSize: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
