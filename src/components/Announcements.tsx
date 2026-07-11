import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { fmtDate, useI18n } from '../i18n';
import { todayISO, uid } from '../lib';
import type { Announcement, DB, User } from '../types';
import { Empty, Pill } from './ui';

// Which announcements a user should see: center-wide (classId null) plus any
// announcement targeted at a class the user (or their child) belongs to.
export function relevantAnnouncements(db: DB, user: User): Announcement[] {
  const classIds =
    user.role === 'parent'
      ? db.users.filter((u) => user.childIds.includes(u.id)).flatMap((u) => u.classIds)
      : user.classIds;
  return db.announcements
    .filter((a) => a.classId === null || classIds.includes(a.classId))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date));
}

// Read state is per-device UI state, so it lives in localStorage (not the DB).
const seenKey = (userId: string) => `etop-ann-seen-${userId}`;
function loadSeen(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function saveSeen(userId: string, ids: string[]): void {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function unreadCount(db: DB, user: User): number {
  const seen = loadSeen(user.id);
  return relevantAnnouncements(db, user).filter((a) => !seen.has(a.id)).length;
}

function audienceLabel(db: DB, a: Announcement, center: string): string {
  if (a.classId === null) return center;
  return db.classes.find((c) => c.id === a.classId)?.name ?? center;
}

export function AnnouncementsFeed({ user, limit = 4 }: { user: User; limit?: number }) {
  const { db } = useApp();
  const { t, lang } = useI18n();
  const list = relevantAnnouncements(db, user);
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen(user.id));
  const shown = list.slice(0, limit);
  const unread = list.filter((a) => !seen.has(a.id)).length;

  const markRead = () => {
    const ids = list.map((a) => a.id);
    saveSeen(user.id, ids);
    setSeen(new Set(ids));
  };

  if (list.length === 0) return null;

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-extrabold text-violet-700">
          📣 {t('ann.title')}
          {unread > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">{unread}</span>}
        </h3>
        {unread > 0 && (
          <button onClick={markRead} className="text-xs font-bold text-violet-500 hover:text-violet-700">
            {t('ann.markRead')}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {shown.map((a) => {
          const isNew = !seen.has(a.id);
          const author = db.users.find((u) => u.id === a.authorId);
          return (
            <li key={a.id} className={`rounded-2xl border p-3 ${isNew ? 'border-violet-200 bg-violet-50' : 'border-violet-50 bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-extrabold text-slate-700">{a.title}</div>
                <div className="flex shrink-0 gap-1">
                  {a.pinned && <Pill className="bg-amber-100 text-amber-700">📌</Pill>}
                  {isNew && <Pill className="bg-rose-100 text-rose-600">{t('ann.new')}</Pill>}
                </div>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{a.body}</p>
              <div className="mt-1.5 text-[11px] font-bold text-slate-400">
                {author?.avatar} {author?.name} · {audienceLabel(db, a, t('ann.center'))} · {fmtDate(a.date, lang)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Teacher / admin composer. Admins can post center-wide or to any class;
// teachers can post to the classes they teach.
export function AnnouncementComposer({ user }: { user: User }) {
  const { db, mutate } = useApp();
  const { t, lang } = useI18n();
  const isAdmin = user.role === 'admin';
  const myClasses = isAdmin ? db.classes : db.classes.filter((c) => user.classIds.includes(c.id));

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>(isAdmin ? 'center' : (myClasses[0]?.id ?? 'center'));
  const [posted, setPosted] = useState(false);

  const mine = useMemo(
    () => db.announcements.filter((a) => a.authorId === user.id).sort((a, b) => b.date.localeCompare(a.date)),
    [db.announcements, user.id],
  );

  const post = () => {
    if (!title.trim() || !body.trim()) return;
    mutate((d) =>
      d.announcements.push({
        id: uid('ann'),
        authorId: user.id,
        classId: audience === 'center' ? null : audience,
        title: title.trim(),
        body: body.trim(),
        date: todayISO(),
      }),
    );
    setTitle('');
    setBody('');
    setPosted(true);
    setTimeout(() => setPosted(false), 1500);
  };

  const remove = (id: string) => mutate((d) => (d.announcements = d.announcements.filter((a) => a.id !== id)));

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <h3 className="font-extrabold text-violet-700">📣 {t('ann.compose')}</h3>
        <input className="input" placeholder={t('ann.compose')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={3} placeholder={t('ann.bodyPh')} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex gap-2">
          <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
            {isAdmin && <option value="center">🏫 {t('ann.center')}</option>}
            {myClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <button onClick={post} className="btn-primary shrink-0 text-sm">
            {posted ? t('ann.posted') : t('ann.post')}
          </button>
        </div>
      </div>

      {mine.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-extrabold text-violet-700">{t('ann.mine')}</h3>
          <ul className="divide-y divide-violet-50">
            {mine.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{a.title}</div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {audienceLabel(db, a, t('ann.center'))} · {fmtDate(a.date, lang)}
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="shrink-0 text-xs font-bold text-rose-400 hover:text-rose-600">
                  {t('ann.delete')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {mine.length === 0 && <Empty emoji="📣" text={t('ann.empty')} />}
    </div>
  );
}
