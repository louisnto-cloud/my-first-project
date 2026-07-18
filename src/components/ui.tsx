import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from '../store';
import { useI18n } from '../i18n';
import { Logo } from './Logo';
import type { Skill } from '../types';
import { SKILLS } from '../types';

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex rounded-full bg-violet-100 p-0.5 text-xs font-extrabold" role="group" aria-label="Language">
      {(['vi', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={l === 'vi' ? 'Tiếng Việt' : 'English'}
          className={`rounded-full px-2.5 py-1 uppercase transition ${lang === l ? 'bg-violet-600 text-white shadow' : 'text-violet-500'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Header({ subtitle }: { subtitle?: string }) {
  const { user, logout } = useApp();
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 border-b border-violet-100 bg-white/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {t('a11y.skipToContent')}
      </a>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <div>
            <div className="text-lg font-black leading-tight text-violet-700">{t('app.name')}</div>
            {subtitle && <div className="text-xs font-semibold text-violet-400">{subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          {user && (
            <button
              onClick={logout}
              title={t('common.logout')}
              aria-label={t('common.logout')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-lg hover:bg-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
            >
              <span aria-hidden="true">{user.avatar}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export interface TabItem {
  to: string;
  emoji: string;
  label: string;
  end?: boolean;
}

export function TabBar({ items }: { items: TabItem[] }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('a11y.primaryNav')}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-violet-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-3xl">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            aria-label={it.label}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-violet-500 ${isActive ? 'text-violet-700' : 'text-slate-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <span aria-hidden="true" className={`text-xl ${isActive ? 'animate-pop' : ''}`}>
                  {it.emoji}
                </span>
                {it.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

export function WeekRing({ days, labels }: { days: boolean[]; labels: string[] }) {
  const done = days.filter(Boolean).length;
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" role="list">
          {days.map((d, i) => (
            <div
              key={i}
              role="listitem"
              aria-label={`${labels[i]} ${d ? 'practiced' : 'not yet'}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black transition ${
                d ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {d ? '✓' : labels[i]}
            </div>
          ))}
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-violet-700">
            {done}<span className="text-sm text-slate-300">/7</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">this week</div>
        </div>
      </div>
    </div>
  );
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-8 text-center text-sm font-semibold text-slate-400" role="status">
      <span aria-hidden="true" className="text-4xl">{emoji}</span>
      {text}
    </div>
  );
}

export function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 65) return 'text-amber-600';
  return 'text-rose-600';
}

export function ProgressChart({ points }: { points: { label: string; pct: number }[] }) {
  if (points.length === 0) return null;
  const W = 320;
  const H = 130;
  const padX = 18;
  const padY = 18;
  const step = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const y = (pct: number) => H - padY - (pct / 100) * (H - padY * 2);
  const coords = points.map((p, i) => ({ x: padX + i * step, y: y(p.pct), p }));
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const summary = `Progress chart, ${points.length} points: ${points
    .map((p) => `${p.label} ${(p.pct / 10).toFixed(1)} out of 10`)
    .join('; ')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={summary}>
      <title>{summary}</title>
      {[25, 50, 75, 100].map((g) => (
        <line key={g} x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="#ede9fe" strokeWidth="1" />
      ))}
      <polyline points={line} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="4.5" fill="#7c3aed" stroke="white" strokeWidth="2" />
          <text x={c.x} y={c.y - 9} textAnchor="middle" fontSize="10" fontWeight="800" fill="#6d28d9">
            {(c.p.pct / 10).toFixed(1)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function SkillBars({ skills }: { skills: Partial<Record<Skill, number>> }) {
  const { t } = useI18n();
  const colors: Record<Skill, string> = {
    listening: 'bg-sky-400',
    speaking: 'bg-rose-400',
    reading: 'bg-emerald-400',
    writing: 'bg-amber-400',
  };
  return (
    <div className="space-y-2">
      {SKILLS.map((sk) => {
        const v = skills[sk];
        if (v == null) return null;
        return (
          <div key={sk} className="flex items-center gap-2">
            <div className="w-16 text-xs font-bold text-slate-500">{t(`skills.${sk}`)}</div>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-violet-100">
              <div className={`h-full rounded-full ${colors[sk]}`} style={{ width: `${(v / 10) * 100}%` }} />
            </div>
            <div className="w-8 text-right text-xs font-extrabold text-slate-600">{v}</div>
          </div>
        );
      })}
    </div>
  );
}
