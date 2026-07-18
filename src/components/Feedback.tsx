import { useState } from 'react';
import { useApp } from '../store';
import { fmtDate, useI18n } from '../i18n';
import { Empty } from './ui';
import { todayISO, uid } from '../lib';

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div
      className="flex gap-1"
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={onChange ? `Rating, ${value} of 5 stars` : `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role={onChange ? 'radio' : undefined}
          aria-checked={onChange ? n === value : undefined}
          aria-label={onChange ? `${n} ${n === 1 ? 'star' : 'stars'}` : undefined}
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`text-2xl transition ${onChange ? 'active:scale-110' : 'cursor-default'} ${n <= value ? '' : 'opacity-25 grayscale'} ${onChange ? 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 focus-visible:rounded' : ''}`}
        >
          <span aria-hidden="true">⭐</span>
        </button>
      ))}
    </div>
  );
}

const FEEDBACK_MAX = 500;

export function FeedbackSection({ userId }: { userId: string }) {
  const { db, mutate } = useApp();
  const { t, lang } = useI18n();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const mine = db.feedback.filter((f) => f.userId === userId).sort((a, b) => b.date.localeCompare(a.date));

  const send = () => {
    if (!message.trim()) return;
    mutate((d) => d.feedback.push({ id: uid('fb'), userId, date: todayISO(), rating, message: message.trim() }));
    setMessage('');
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div>
          <h3 className="font-extrabold text-violet-700 dark:text-violet-300">💬 {t('feedback.title')}</h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{t('feedback.subtitle')}</p>
        </div>
        <div>
          <div className="mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t('feedback.rating')}</div>
          <Stars value={rating} onChange={setRating} />
        </div>
        <div>
          <textarea
            className="input"
            rows={3}
            maxLength={FEEDBACK_MAX}
            placeholder={t('feedback.placeholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, FEEDBACK_MAX))}
            aria-label={t('feedback.placeholder')}
          />
          <div className="mt-1 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500">
            {message.length}/{FEEDBACK_MAX}
          </div>
        </div>
        {sent ? (
          <div
            role="status"
            aria-live="polite"
            className="animate-pop rounded-2xl bg-emerald-100 p-3 text-center text-sm font-extrabold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
          >
            {t('feedback.thanks')}
          </div>
        ) : (
          <button onClick={send} disabled={!message.trim()} className="btn-primary w-full">
            {t('feedback.send')} 📨
          </button>
        )}
      </div>

      {mine.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-extrabold text-violet-700 dark:text-violet-300">🗂️ {t('feedback.mine')}</h3>
          <ul className="divide-y divide-violet-50">
            {mine.map((f) => (
              <li key={f.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <Stars value={f.rating} />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{fmtDate(f.date, lang)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 dark:text-slate-600">{f.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FeedbackInbox() {
  const { db } = useApp();
  const { t, lang } = useI18n();
  const items = [...db.feedback].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="card">
      <h3 className="mb-2 font-extrabold text-violet-700 dark:text-violet-300">📨 {t('feedback.inbox')}</h3>
      {items.length === 0 ? (
        <Empty emoji="💬" text={t('feedback.empty')} />
      ) : (
        <ul className="divide-y divide-violet-50">
          {items.map((f) => {
            const sender = db.users.find((u) => u.id === f.userId);
            const role = sender ? t(`login.demo.${sender.role === 'admin' ? 'owner' : sender.role}`) : '?';
            return (
              <li key={f.id} className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{sender?.avatar ?? '👤'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{sender?.name ?? '—'}</div>
                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {role} · {fmtDate(f.date, lang)}
                    </div>
                  </div>
                  <Stars value={f.rating} />
                </div>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 dark:text-slate-600">{f.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
