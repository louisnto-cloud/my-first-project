import { useState } from 'react';
import { useApp } from '../../store';
import { useI18n } from '../../i18n';
import { Header, Pill } from '../../components/ui';
import { BadgesView, GradesView, HomeworkView, ScheduleView } from '../../components/views';
import { FeedbackSection } from '../../components/Feedback';
import { pointsOf, streakOf } from '../../lib';

export default function ParentPage() {
  const { db, user } = useApp();
  const { t } = useI18n();
  const children = db.users.filter((u) => user?.childIds.includes(u.id));
  const [childId, setChildId] = useState<string | null>(children[0]?.id ?? null);
  const child = children.find((c) => c.id === childId) ?? children[0];

  if (!user || !child) return null;

  return (
    <div className="min-h-screen pb-10">
      <Header subtitle={`${t('parent.title')} · ${user.name}`} />
      <main id="main" className="mx-auto max-w-3xl space-y-4 p-4" tabIndex={-1}>
        {children.length > 1 && (
          <div className="flex gap-2">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setChildId(c.id)}
                className={`btn text-sm ${c.id === child.id ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                {c.avatar} {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="card flex items-center gap-3 border-violet-200 dark:border-slate-700 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/20 text-3xl">{child.avatar}</div>
          <div>
            <div className="text-lg font-black">
              {child.name}
              {t('parent.childProgress')}
            </div>
            <div className="flex gap-2">
              <Pill className="bg-white/20 text-white">⭐ {pointsOf(db, child.id)} {t('common.points')}</Pill>
              <Pill className="bg-white/20 text-white">🔥 {streakOf(db, child.id)} {t('common.dayStreak')}</Pill>
            </div>
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">🔒 {t('parent.readonly')}</p>

        <GradesView studentId={child.id} />
        <ScheduleView classIds={child.classIds} />

        <div>
          <h3 className="mb-2 text-lg font-black">📚 {t('parent.homework')}</h3>
          <HomeworkView studentId={child.id} canToggle={false} />
        </div>

        <BadgesView studentId={child.id} />

        <FeedbackSection userId={user.id} />
      </main>
    </div>
  );
}
