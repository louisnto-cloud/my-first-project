import { useState } from 'react';
import { api, ApiError, setToken } from './api';

// The public face of E'TOP: logo, cartoon scene, code login, center info,
// expandable sections — fully bilingual with a VI/EN toggle.

// TODO(owner): placeholder emails — swap for the center's real addresses.
const CENTER_EMAIL = 'lienhe.etop@gmail.com';
const JOBS_EMAIL = 'tuyendung.etop@gmail.com';
const FACEBOOK_URL = 'https://www.facebook.com/ETOP.EnglishCenter.BinhThuan/';

type Lang = 'vi' | 'en';

const STR: Record<string, { vi: string; en: string }> = {
  center: { vi: 'Trung tâm Anh Ngữ E’TOP', en: 'E’TOP English Center' },
  tabStudent: { vi: '🧒 Học viên', en: '🧒 Student' },
  tabTeacher: { vi: '👩‍🏫 Giáo viên', en: '👩‍🏫 Teacher' },
  tabStaff: { vi: '👪 Phụ huynh & QL', en: '👪 Parents & Admin' },
  codeStudent: { vi: 'Mã số học viên', en: 'Student code' },
  codeTeacher: { vi: 'Mã số giáo viên', en: 'Teacher code' },
  enter: { vi: 'Vào lớp 🚀', en: 'Enter class 🚀' },
  signin: { vi: 'Đăng nhập', en: 'Sign in' },
  email: { vi: 'Email', en: 'Email' },
  password: { vi: 'Mật khẩu', en: 'Password' },
  hintStudent: { vi: 'Chỉ cần mã số — không cần email hay mật khẩu. Quên mã? Hỏi cô giáo nhé!', en: 'Just your code — no email or password. Forgot it? Ask your teacher!' },
  hintTeacher: { vi: 'Nhận mã từ quản lý trung tâm.', en: 'Get your code from the center manager.' },
  wrongCode: { vi: 'Mã số / thông tin không đúng. Vui lòng kiểm tra lại.', en: 'Incorrect code or details. Please check and try again.' },
  noServer: { vi: 'Chưa kết nối máy chủ — đây là bản xem trước giao diện. Đăng nhập sẽ hoạt động khi hệ thống được đưa lên hosting.', en: 'Server not connected — this is a visual preview. Login will work once the system is hosted.' },
  address1: { vi: '📍 166 Nguyễn Hội, P. Phú Trinh, TP. Phan Thiết', en: '📍 166 Nguyen Hoi St., Phu Trinh Ward, Phan Thiet City' },
  address2: { vi: '📍 Cơ sở 2: Tôn Thất Thiệp, TP. Phan Thiết', en: '📍 Campus 2: Ton That Thiep St., Phan Thiet City' },
  fb: { vi: 'Facebook: Trung Tâm Anh Ngữ E’TOP', en: 'Facebook: E’TOP English Center' },
  aboutTitle: { vi: 'Tìm hiểu thêm về trung tâm', en: 'About the center' },
  aboutBody: {
    vi: 'Với gần 25 năm kinh nghiệm giảng dạy tiếng Anh tại Phan Thiết, E’TOP đồng hành cùng học viên từ 5–15 tuổi (và cả người lớn) qua các cấp độ Starters, Movers, Flyers đến B1 — chú trọng đủ 4 kỹ năng Nghe, Nói, Đọc, Viết. Phương châm của chúng tôi: Learn – Achieve – Lead.',
    en: 'With nearly 25 years of English teaching experience in Phan Thiet, E’TOP guides learners aged 5–15 (and adults) through Starters, Movers, Flyers and B1 — building all four skills: Listening, Speaking, Reading, Writing. Our motto: Learn – Achieve – Lead.',
  },
  jobsTitle: { vi: 'Việc làm tại E’TOP', en: 'Careers at E’TOP' },
  jobsBody: {
    vi: 'E’TOP luôn chào đón giáo viên và trợ giảng yêu trẻ, đam mê tiếng Anh. Gửi hồ sơ (CV) về email:',
    en: 'E’TOP welcomes teachers and assistants who love children and English. Send your CV to:',
  },
  jobsCall: { vi: 'hoặc gọi hotline', en: 'or call our hotline' },
  fbTitle: { vi: 'Đóng góp ý kiến', en: 'Feedback' },
  fbBody: {
    vi: 'Trung tâm rất mong nhận góp ý của phụ huynh và học viên! Mọi ý kiến đều được ghi nhận và phản hồi.',
    en: 'We warmly welcome feedback from parents and students! Every message is recorded and answered.',
  },
  fbEmail: { vi: 'Gửi email góp ý:', en: 'Email your feedback:' },
  fbMsg: { vi: 'Hoặc nhắn tin qua Facebook:', en: 'Or message us on Facebook:' },
  fbParent: { vi: 'Phụ huynh cũng có thể đăng nhập để nhắn tin trực tiếp với giáo viên.', en: 'Parents can also sign in to message the teacher directly.' },
};

function CartoonScene() {
  return (
    <svg viewBox="0 0 800 360" className="pointer-events-none absolute inset-x-0 bottom-0 w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <circle cx="700" cy="60" r="38" fill="#FDE047" />
      <circle cx="700" cy="60" r="50" fill="#FDE047" opacity="0.3" />
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="140" cy="70" rx="46" ry="18" />
        <ellipse cx="180" cy="60" rx="36" ry="16" />
        <ellipse cx="520" cy="50" rx="40" ry="15" />
      </g>
      <ellipse cx="180" cy="400" rx="380" ry="120" fill="#86EFAC" />
      <ellipse cx="650" cy="420" rx="420" ry="140" fill="#4ADE80" />
      <g>
        <rect x="60" y="210" width="120" height="80" rx="8" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="4" />
        <polygon points="50,215 120,165 190,215" fill="#F87171" />
        <rect x="105" y="250" width="30" height="40" rx="4" fill="#A78BFA" />
        <text x="120" y="240" textAnchor="middle" fontSize="16" fontWeight="900" fill="#7C3AED">ABC</text>
      </g>
      <g>
        <path d="M560 130 L590 160 L560 190 L530 160 Z" fill="#F472B6" stroke="#fff" strokeWidth="3" />
        <path d="M560 190 Q540 230 510 260" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
        <circle cx="505" cy="272" r="14" fill="#FCD34D" />
        <rect x="495" y="284" width="20" height="26" rx="8" fill="#60A5FA" />
        <line x1="498" y1="312" x2="492" y2="330" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        <line x1="512" y1="312" x2="518" y2="330" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="300" cy="270" r="14" fill="#FCA5A5" />
        <rect x="290" y="282" width="20" height="26" rx="8" fill="#34D399" />
        <line x1="293" y1="310" x2="287" y2="330" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        <line x1="307" y1="310" x2="313" y2="330" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        <circle cx="365" cy="268" r="14" fill="#FDE68A" />
        <rect x="355" y="280" width="20" height="26" rx="8" fill="#F472B6" />
        <line x1="358" y1="308" x2="352" y2="328" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        <line x1="372" y1="308" x2="378" y2="328" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        <circle cx="333" cy="300" r="12" fill="#fff" stroke="#7C3AED" strokeWidth="4" />
      </g>
      <g stroke="#16A34A" strokeWidth="3" strokeLinecap="round">
        <path d="M120 330 q3 -12 0 -16 M128 330 q-2 -10 2 -16" />
        <path d="M620 320 q3 -12 0 -16 M628 320 q-2 -10 2 -16" />
        <path d="M430 335 q3 -12 0 -16 M438 335 q-2 -10 2 -16" />
      </g>
    </svg>
  );
}

function Expandable({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/80 backdrop-blur">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left font-extrabold text-violet-800">
        <span>{icon} {title}</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open && <div className="px-4 pb-4 text-sm font-semibold text-slate-600">{children}</div>}
    </div>
  );
}

export function Landing({ onDone }: { onDone: () => void }) {
  const [lang, setLangState] = useState<Lang>((localStorage.getItem('etop-lang') as Lang) || 'vi');
  const [tab, setTab] = useState<'student' | 'teacher' | 'staff'>('student');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const t = (k: string) => STR[k]?.[lang] ?? k;
  const setLang = (l: Lang) => {
    localStorage.setItem('etop-lang', l);
    setLangState(l);
  };

  const go = async () => {
    setErr('');
    setBusy(true);
    try {
      const res =
        tab === 'staff'
          ? await api<{ token: string }>('POST', '/auth/login', { email, password })
          : await api<{ token: string }>('POST', '/auth/login-code', { code });
      setToken(res.token);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 401 ? t('wrongCode') : t('noServer'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100">
      <CartoonScene />

      {/* Language toggle — visible before login, top right */}
      <div className="absolute right-4 top-4 z-10 flex rounded-full bg-white/90 p-1 shadow">
        {(['vi', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-full px-3 py-1 text-xs font-black uppercase transition ${lang === l ? 'bg-violet-600 text-white' : 'text-violet-500'}`}
          >
            {l === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
          </button>
        ))}
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center gap-5 px-4 py-8">
        <div className="flex flex-col items-center text-center">
          <img src="./logo.png" alt="Anh Ngữ E’TOP" className="h-24 w-24 rounded-full shadow-xl" />
          <h1 className="mt-3 text-3xl font-black text-violet-800 drop-shadow-sm">{t('center')}</h1>
          <p className="font-bold text-violet-600">Learn – Achieve – Lead ⭐</p>
        </div>

        <div className="w-full rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="mb-4 flex gap-1 rounded-2xl bg-violet-100 p-1">
            {([['student', t('tabStudent')], ['teacher', t('tabTeacher')], ['staff', t('tabStaff')]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setTab(k as typeof tab); setErr(''); }}
                className={`flex-1 rounded-xl px-2 py-2 text-sm font-extrabold transition ${tab === k ? 'bg-white text-violet-700 shadow' : 'text-violet-400'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab !== 'staff' ? (
            <div className="space-y-3">
              <label className="block text-sm font-extrabold text-slate-600">
                {tab === 'student' ? t('codeStudent') : t('codeTeacher')}
              </label>
              <input
                className="input text-center text-2xl font-black uppercase tracking-widest"
                placeholder={tab === 'student' ? 'UP1482' : 'GV0001'}
                value={code}
                maxLength={10}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && go()}
              />
              <button onClick={go} disabled={busy || code.length < 4} className="btn-primary w-full text-lg">
                {t('enter')}
              </button>
              <p className="text-center text-xs font-semibold text-slate-400">
                {tab === 'student' ? t('hintStudent') : t('hintTeacher')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <input className="input" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
              <button onClick={go} disabled={busy} className="btn-primary w-full">{t('signin')}</button>
            </div>
          )}
          {err && <p className="mt-3 text-center text-sm font-bold text-rose-500">{err}</p>}
        </div>

        <div className="w-full rounded-3xl bg-white/80 p-4 text-center backdrop-blur">
          <div className="font-extrabold text-violet-800">📞 089 949 0222 · ✉️ <a className="underline" href={`mailto:${CENTER_EMAIL}`}>{CENTER_EMAIL}</a></div>
          <div className="text-sm font-semibold text-slate-600">{t('address1')}</div>
          <div className="text-sm font-semibold text-slate-600">{t('address2')}</div>
          <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-extrabold text-blue-600 underline">
            👍 {t('fb')}
          </a>
        </div>

        <div className="w-full space-y-2 pb-8">
          <Expandable icon="🏫" title={t('aboutTitle')}>
            {t('aboutBody')}{' '}
            <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="font-extrabold text-blue-600 underline">Facebook ↗</a>
          </Expandable>
          <Expandable icon="💼" title={t('jobsTitle')}>
            {t('jobsBody')} <a className="font-extrabold text-violet-700 underline" href={`mailto:${JOBS_EMAIL}?subject=${encodeURIComponent('Ứng tuyển E’TOP')}`}>{JOBS_EMAIL}</a>{' '}
            {t('jobsCall')} <b>089 949 0222</b>.
          </Expandable>
          <Expandable icon="💬" title={t('fbTitle')}>
            <p>{t('fbBody')}</p>
            <p className="mt-1">✉️ {t('fbEmail')} <a className="font-extrabold text-violet-700 underline" href={`mailto:${CENTER_EMAIL}?subject=${encodeURIComponent('Góp ý cho E’TOP')}`}>{CENTER_EMAIL}</a></p>
            <p className="mt-1">👍 {t('fbMsg')} <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="font-extrabold text-blue-600 underline">Trung Tâm Anh Ngữ E’TOP ↗</a></p>
            <p className="mt-1 text-xs text-slate-400">{t('fbParent')}</p>
          </Expandable>
        </div>
      </div>
    </div>
  );
}
