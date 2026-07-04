import { useEffect, useState } from 'react';
import { api } from './api';
import { Icon } from './Icon';
import { sfx } from './sound';

// Teacher question authoring — where assignment content comes from.
// Payloads match the real API question schema (mc / fill_blank / reorder /
// listen_mc), so the same composer works against the live server and the
// in-browser demo. Answers stay server-side; students never receive them.

type QType = 'mc' | 'fill_blank' | 'reorder' | 'listen_mc';
type Skill = 'grammar' | 'reading' | 'listening' | 'writing';

const TYPES: { k: QType; vi: string; en: string }[] = [
  { k: 'mc', vi: 'Trắc nghiệm', en: 'Multiple choice' },
  { k: 'fill_blank', vi: 'Điền từ', en: 'Fill the blank' },
  { k: 'reorder', vi: 'Sắp xếp câu', en: 'Reorder words' },
  { k: 'listen_mc', vi: 'Nghe & chọn', en: 'Listen & pick' },
];

const SKILLS: { k: Skill; label: string; emoji: string }[] = [
  { k: 'grammar', label: 'Ngữ pháp', emoji: '🔤' },
  { k: 'reading', label: 'Đọc', emoji: '📖' },
  { k: 'listening', label: 'Nghe', emoji: '🎧' },
  { k: 'writing', label: 'Viết', emoji: '✍️' },
];

interface BankRow {
  id: string;
  skill: string;
  prompt: string;
  unit: string | null;
}

const SKILL_EMOJI: Record<string, string> = { grammar: '🔤', reading: '📖', listening: '🎧', writing: '✍️' };

export function QuestionBank({ lang }: { lang: 'vi' | 'en' }) {
  const vi = lang === 'vi';
  const [bank, setBank] = useState<BankRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [composing, setComposing] = useState(false);
  const [msg, setMsg] = useState('');

  const [type, setType] = useState<QType>('mc');
  const [skill, setSkill] = useState<Skill>('grammar');
  const [unit, setUnit] = useState('');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [sentence, setSentence] = useState('');
  const [choices, setChoices] = useState('');
  const [answer, setAnswer] = useState('');
  const [audioText, setAudioText] = useState('');

  const load = async () => {
    setBank(await api<BankRow[]>('GET', '/questions'));
  };
  useEffect(() => { void load(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  const pickType = (t: QType) => {
    sfx.click();
    setType(t);
    // Listening questions are listening-skill by default; teachers can override.
    if (t === 'listen_mc') setSkill('listening');
  };

  const reset = () => {
    setPrompt(''); setOptions(['', '', '', '']); setCorrect(0);
    setSentence(''); setChoices(''); setAnswer(''); setAudioText('');
  };

  // Build the API-shaped payload for the chosen type.
  const build = (): { prompt: string; payload: Record<string, unknown> } | null => {
    if (type === 'mc' || type === 'listen_mc') {
      const opts = options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2 || !options[correct]?.trim()) return null;
      if (type === 'listen_mc') {
        if (!audioText.trim()) return null;
        return { prompt: prompt.trim() || (vi ? 'Nghe và chọn câu đúng.' : 'Listen and pick.'), payload: { audioText: audioText.trim(), options: opts, answer: options[correct].trim() } };
      }
      if (!prompt.trim()) return null;
      return { prompt: prompt.trim(), payload: { options: opts, answer: options[correct].trim() } };
    }
    if (type === 'fill_blank') {
      const ch = choices.split(',').map((c) => c.trim()).filter(Boolean);
      if (!sentence.includes('___') || ch.length < 2 || !answer.trim()) return null;
      return { prompt: sentence.trim(), payload: { sentence: sentence.trim(), choices: ch, answer: answer.trim() } };
    }
    // reorder: teacher types the correct sentence; students get shuffled words.
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) return null;
    return { prompt: vi ? 'Sắp xếp thành câu đúng.' : 'Put the words in order.', payload: { words, answer: sentence.trim() } };
  };

  const built = build();

  const saveQuestion = async () => {
    if (!built) return;
    await api('POST', '/questions', {
      type,
      skill,
      ...(unit.trim() ? { unit: unit.trim() } : {}),
      prompt: built.prompt,
      payload: built.payload,
      copyrightAck: true,
    });
    sfx.correct();
    reset();
    setComposing(false);
    flash(vi ? '✅ Đã lưu vào ngân hàng — chọn được ngay khi giao bài.' : '✅ Saved — available when assigning work.');
    void load();
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"><Icon name="pencil" size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-ink">{vi ? 'Ngân hàng câu hỏi' : 'Question bank'} <span className="font-bold text-slate-400">({bank.length})</span></div>
          <div className="text-[11px] font-bold text-muted">{vi ? 'Tự soạn câu hỏi — không dùng tài liệu có bản quyền' : 'Author your own — no publisher content'}</div>
        </div>
      </div>

      {msg && <div className="animate-rise rounded-2xl bg-emerald-50 p-2.5 text-center text-sm font-bold text-emerald-700">{msg}</div>}

      {!composing && bank.length > 0 && (
        <div className="space-y-1">
          {(showAll ? bank : bank.slice(0, 4)).map((q) => (
            <div key={q.id} className="flex items-center gap-2 rounded-xl bg-violet-50/60 px-2.5 py-1.5 text-[12px] font-bold text-slate-600">
              <span className="shrink-0">{SKILL_EMOJI[q.skill] ?? '•'}</span>
              <span className="min-w-0 flex-1 truncate">{q.prompt || '—'}</span>
              {q.unit && <span className="chip shrink-0 bg-white text-[10px] text-violet-500">{q.unit}</span>}
            </div>
          ))}
          {bank.length > 4 && (
            <button onClick={() => setShowAll(!showAll)} className="w-full text-center text-[11px] font-extrabold text-violet-500">
              {showAll ? (vi ? 'Thu gọn ▴' : 'Show less ▴') : (vi ? `Xem tất cả ${bank.length} câu ▾` : `See all ${bank.length} ▾`)}
            </button>
          )}
        </div>
      )}

      {!composing ? (
        <button onClick={() => setComposing(true)} className="btn-soft w-full text-sm"><Icon name="plus" size={16} /> {vi ? 'Soạn câu hỏi mới' : 'New question'}</button>
      ) : (
        <div className="animate-rise space-y-3 rounded-2xl border-2 border-dashed border-violet-200 p-3">
          {/* Type */}
          <div className="grid grid-cols-2 gap-1.5">
            {TYPES.map((x) => (
              <button key={x.k} onClick={() => pickType(x.k)} className={`rounded-xl border-2 px-2 py-2 text-xs font-extrabold transition ${type === x.k ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-violet-100 bg-white text-slate-500'}`}>
                {vi ? x.vi : x.en}
              </button>
            ))}
          </div>

          {/* Skill + unit */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SKILLS.map((s) => (
              <button key={s.k} onClick={() => setSkill(s.k)} className={`chip transition ${skill === s.k ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600'}`}>
                {s.emoji} {s.label}
              </button>
            ))}
            <input className="input !w-24 flex-none !px-2 !py-1.5 text-xs" placeholder="Unit 1" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>

          {/* Per-type fields */}
          {type === 'mc' && (
            <>
              <input className="input text-sm" placeholder={vi ? 'Câu hỏi (vd: I ___ a student.)' : 'Question'} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <div className="space-y-1.5">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => setCorrect(i)} aria-label="correct" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition ${correct === i ? 'border-emerald-400 bg-emerald-100 text-emerald-600' : 'border-slate-200 text-slate-300'}`}>
                      <Icon name="check" size={15} />
                    </button>
                    <input className="input !py-2 text-sm" placeholder={`${vi ? 'Đáp án' : 'Option'} ${String.fromCharCode(65 + i)}${i > 1 ? (vi ? ' (không bắt buộc)' : ' (optional)') : ''}`} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-bold text-slate-400">{vi ? 'Chạm ✓ để đánh dấu đáp án đúng — học viên không bao giờ thấy đáp án.' : 'Tap ✓ to mark the correct answer — students never see it.'}</p>
            </>
          )}

          {type === 'fill_blank' && (
            <>
              <input className="input text-sm" placeholder={vi ? 'Câu có chỗ trống ___ (vd: She ___ my friend.)' : 'Sentence with ___'} value={sentence} onChange={(e) => setSentence(e.target.value)} />
              <input className="input text-sm" placeholder={vi ? 'Các lựa chọn, cách nhau dấu phẩy (vd: is, am, are)' : 'Choices, comma-separated'} value={choices} onChange={(e) => setChoices(e.target.value)} />
              <div className="flex flex-wrap gap-1.5">
                {choices.split(',').map((c) => c.trim()).filter(Boolean).map((c) => (
                  <button key={c} onClick={() => setAnswer(c)} className={`chip transition ${answer === c ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {answer === c ? '✓ ' : ''}{c}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-bold text-slate-400">{vi ? 'Chạm vào từ đúng để chọn đáp án.' : 'Tap the correct word.'}</p>
            </>
          )}

          {type === 'reorder' && (
            <>
              <input className="input text-sm" placeholder={vi ? 'Gõ câu đúng (vd: I go to school every day)' : 'Type the correct sentence'} value={sentence} onChange={(e) => setSentence(e.target.value)} />
              <p className="text-[11px] font-bold text-slate-400">{vi ? 'Học viên sẽ nhận các từ bị xáo trộn và sắp xếp lại.' : 'Students get the words shuffled and reorder them.'}</p>
            </>
          )}

          {type === 'listen_mc' && (
            <>
              <input className="input text-sm" placeholder={vi ? 'Câu máy sẽ đọc (vd: The cat is under the table.)' : 'Sentence the app will speak'} value={audioText} onChange={(e) => setAudioText(e.target.value)} />
              <div className="space-y-1.5">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => setCorrect(i)} aria-label="correct" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition ${correct === i ? 'border-emerald-400 bg-emerald-100 text-emerald-600' : 'border-slate-200 text-slate-300'}`}>
                      <Icon name="check" size={15} />
                    </button>
                    <input className="input !py-2 text-sm" placeholder={`${vi ? 'Lựa chọn' : 'Option'} ${String.fromCharCode(65 + i)}`} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-bold text-slate-400">{vi ? 'App tự đọc câu bằng giọng máy — không cần thu âm, không cần file audio.' : 'The app speaks the sentence — no recording needed.'}</p>
            </>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setComposing(false); reset(); }} className="btn-soft text-sm">{vi ? 'Hủy' : 'Cancel'}</button>
            <button onClick={saveQuestion} disabled={!built} className="btn-primary flex-1 text-sm">
              <Icon name="check" size={16} /> {vi ? 'Lưu vào ngân hàng' : 'Save to bank'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
