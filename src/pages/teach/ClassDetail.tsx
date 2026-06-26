import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../../store';
import { fmtDate, useI18n } from '../../i18n';
import { Pill, scoreColor } from '../../components/ui';
import { avgPct, clamp, pointsOf, studentsInClass, todayISO, uid } from '../../lib';
import type { Assessment } from '../../types';

type Tab = 'students' | 'grades' | 'homework' | 'vocab';

export default function ClassDetail() {
  const { id } = useParams();
  const { db } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('grades');
  const cls = db.classes.find((c) => c.id === id);
  if (!cls) return <Link to="/teach">← {t('common.back')}</Link>;

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'students', label: t('teach.students'), emoji: '🧑‍🎓' },
    { id: 'grades', label: t('teach.gradebook'), emoji: '📊' },
    { id: 'homework', label: t('teach.homework'), emoji: '📚' },
    { id: 'vocab', label: t('teach.vocab'), emoji: '🃏' },
  ];

  return (
    <div className="space-y-4">
      <Link to="/teach" className="text-sm font-bold text-violet-500">
        ← {t('common.back')}
      </Link>
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${cls.color}`}>{cls.emoji}</div>
        <div>
          <h1 className="text-xl font-black">{cls.name}</h1>
          <div className="text-xs font-semibold text-slate-400">{cls.level}</div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-violet-100 p-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition ${tab === tb.id ? 'bg-white text-violet-700 shadow' : 'text-violet-400'}`}
          >
            {tb.emoji} {tb.label}
          </button>
        ))}
      </div>

      {tab === 'students' && <StudentsTab classId={cls.id} />}
      {tab === 'grades' && <GradesTab classId={cls.id} />}
      {tab === 'homework' && <HomeworkTab classId={cls.id} />}
      {tab === 'vocab' && <VocabTab classId={cls.id} />}
    </div>
  );
}

function StudentsTab({ classId }: { classId: string }) {
  const { db } = useApp();
  const { t } = useI18n();
  const roster = studentsInClass(db, classId);
  return (
    <div className="card">
      <ul className="divide-y divide-violet-50">
        {roster.map((s) => {
          const avg = avgPct(db, s.id);
          return (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <span className="text-xl">{s.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{s.name}</div>
                <div className="text-xs font-semibold text-slate-400">{s.email}</div>
              </div>
              <Pill className="bg-amber-100 text-amber-700">⭐ {pointsOf(db, s.id)}</Pill>
              {avg != null && <span className={`w-10 text-right font-black ${scoreColor(avg)}`}>{(avg / 10).toFixed(1)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GradesTab({ classId }: { classId: string }) {
  const { db, mutate } = useApp();
  const { t, lang } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'test' | 'quiz'>('quiz');
  const [date, setDate] = useState(todayISO());

  const assessments = db.assessments.filter((a) => a.classId === classId).sort((a, b) => b.date.localeCompare(a.date));

  const create = () => {
    if (!title.trim()) return;
    const a: Assessment = { id: uid('a'), classId, title: title.trim(), kind, date, maxScore: 10 };
    mutate((d) => d.assessments.push(a));
    setTitle('');
    setShowNew(false);
    setOpenId(a.id);
  };

  return (
    <div className="space-y-3">
      {showNew ? (
        <div className="card space-y-2">
          <h3 className="font-extrabold text-violet-700">{t('teach.newAssessment')}</h3>
          <input className="input" placeholder={t('teach.assessmentTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as 'test' | 'quiz')}>
              <option value="quiz">{t('teach.kind.quiz')}</option>
              <option value="test">{t('teach.kind.test')}</option>
            </select>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="btn-primary flex-1 text-sm">{t('common.save')}</button>
            <button onClick={() => setShowNew(false)} className="btn-soft text-sm">{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)} className="btn-primary w-full">
          ＋ {t('teach.newAssessment')}
        </button>
      )}

      {assessments.map((a) => (
        <div key={a.id} className="card">
          <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="flex w-full items-center justify-between text-left">
            <div>
              <div className="font-extrabold">{a.title}</div>
              <div className="text-xs font-semibold text-slate-400">
                {t(`teach.kind.${a.kind}`)} · {fmtDate(a.date, lang)}
              </div>
            </div>
            <span className="text-violet-400">{openId === a.id ? '▲' : '▼'}</span>
          </button>
          {openId === a.id && <ScoreEditor assessment={a} />}
        </div>
      ))}
    </div>
  );
}

function ScoreEditor({ assessment }: { assessment: Assessment }) {
  const { db, mutate } = useApp();
  const { t } = useI18n();
  const roster = studentsInClass(db, assessment.classId);
  const [saved, setSaved] = useState(false);

  const existing = (studentId: string) => db.scores.find((s) => s.assessmentId === assessment.id && s.studentId === studentId);

  const [draft, setDraft] = useState<Record<string, { score: string; comment: string }>>(() => {
    const init: Record<string, { score: string; comment: string }> = {};
    roster.forEach((s) => {
      const sc = existing(s.id);
      init[s.id] = { score: sc ? String(sc.score) : '', comment: sc?.comment ?? '' };
    });
    return init;
  });

  const save = () => {
    mutate((d) => {
      roster.forEach((st) => {
        const row = draft[st.id];
        const val = parseFloat(row.score);
        if (Number.isNaN(val)) return;
        const score = clamp(val, 0, assessment.maxScore);
        const found = d.scores.find((s) => s.assessmentId === assessment.id && s.studentId === st.id);
        if (found) {
          found.score = score;
          found.comment = row.comment.trim() || undefined;
        } else {
          d.scores.push({
            id: uid('sc'), assessmentId: assessment.id, studentId: st.id,
            score, comment: row.comment.trim() || undefined,
          });
        }
      });
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mt-3 space-y-2 border-t border-violet-50 pt-3">
      {roster.map((st) => (
        <div key={st.id} className="flex items-center gap-2">
          <span className="text-lg">{st.avatar}</span>
          <span className="w-32 truncate text-xs font-bold sm:w-44">{st.name}</span>
          <input
            className="input !w-16 !px-2 text-center"
            inputMode="decimal"
            placeholder="–"
            value={draft[st.id].score}
            onChange={(e) => setDraft({ ...draft, [st.id]: { ...draft[st.id], score: e.target.value } })}
          />
          <input
            className="input flex-1 !px-3 text-xs"
            placeholder={t('teach.comment')}
            value={draft[st.id].comment}
            onChange={(e) => setDraft({ ...draft, [st.id]: { ...draft[st.id], comment: e.target.value } })}
          />
        </div>
      ))}
      <button onClick={save} className="btn-primary w-full text-sm">
        {saved ? t('teach.saved') : `${t('common.save')} (${t('teach.score')} /10)`}
      </button>
    </div>
  );
}

function HomeworkTab({ classId }: { classId: string }) {
  const { db, mutate } = useApp();
  const { t, lang } = useI18n();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState(todayISO());

  const items = db.homework.filter((h) => h.classId === classId).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const roster = studentsInClass(db, classId);

  const add = () => {
    if (!title.trim()) return;
    mutate((d) =>
      d.homework.push({
        id: uid('hw'), classId, title: title.trim(), description: desc.trim(),
        assignedDate: todayISO(), dueDate: due,
      }),
    );
    setTitle('');
    setDesc('');
  };

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <h3 className="font-extrabold text-violet-700">＋ {t('teach.newHomework')}</h3>
        <input className="input" placeholder={t('teach.hwTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={2} placeholder={t('teach.hwDesc')} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div className="flex gap-2">
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <button onClick={add} className="btn-primary text-sm">{t('common.add')}</button>
        </div>
      </div>

      {items.map((hw) => {
        const done = db.homeworkStatus.filter((s) => s.homeworkId === hw.id && s.done).length;
        return (
          <div key={hw.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <div className="font-extrabold">{hw.title}</div>
              <Pill className={done === roster.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                {done}/{roster.length} {t('teach.doneBy')}
              </Pill>
            </div>
            <p className="mt-1 text-sm text-slate-600">{hw.description}</p>
            <div className="mt-2 text-xs font-bold text-slate-400">
              {t('hw.due')}: {fmtDate(hw.dueDate, lang)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VocabTab({ classId }: { classId: string }) {
  const { db, mutate } = useApp();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [raw, setRaw] = useState('');

  const lists = db.vocabLists.filter((v) => v.classId === classId);

  const add = () => {
    const words = raw
      .split('\n')
      .map((line) => line.split('=').map((p) => p.trim()))
      .filter((parts) => parts.length >= 2 && parts[0])
      .map((parts, i) => ({ id: uid(`w${i}`), term: parts[0], meaningVi: parts[1], example: parts[2] ?? '' }));
    if (!title.trim() || words.length === 0) return;
    mutate((d) => d.vocabLists.push({ id: uid('v'), classId, title: title.trim(), words }));
    setTitle('');
    setRaw('');
  };

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <h3 className="font-extrabold text-violet-700">＋ {t('teach.newVocabList')}</h3>
        <input className="input" placeholder={t('teach.listTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="input font-mono text-xs"
          rows={4}
          placeholder={t('teach.vocabHint')}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <button onClick={add} className="btn-primary w-full text-sm">{t('common.add')}</button>
      </div>

      {lists.map((list) => (
        <div key={list.id} className="card">
          <div className="font-extrabold">{list.title}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {list.words.map((w) => (
              <Pill key={w.id} className="bg-violet-50 text-violet-700" >
                {w.term} <span className="font-semibold text-slate-400">· {w.meaningVi}</span>
              </Pill>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
