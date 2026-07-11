import { useState } from 'react';
import { api, ApiError, isDemo, setToken } from './api';
import { Icon, type IconName } from './Icon';

// TODO(owner): placeholder emails — swap for the center's real addresses.
const CENTER_EMAIL = 'lienhe.etop@gmail.com';
const JOBS_EMAIL = 'tuyendung.etop@gmail.com';
const FACEBOOK_URL = 'https://www.facebook.com/ETOP.EnglishCenter.BinhThuan/';

type Lang = 'vi' | 'en';

const STR: Record<string, { vi: string; en: string }> = {
  tagline: { vi: 'Học vui · Tiến bộ · Dẫn đầu', en: 'Learn · Achieve · Lead' },
  welcome: { vi: 'Chào mừng trở lại', en: 'Welcome back' },
  sub: { vi: 'Đăng nhập để vào lớp của bạn', en: 'Sign in to enter your class' },
  tabStudent: { vi: 'Học viên', en: 'Student' },
  tabTeacher: { vi: 'Giáo viên', en: 'Teacher' },
  tabStaff: { vi: 'Phụ huynh', en: 'Parent' },
  codeStudent: { vi: 'Mã số học viên', en: 'Student code' },
  codeTeacher: { vi: 'Mã số giáo viên', en: 'Teacher code' },
  enter: { vi: 'Vào lớp', en: 'Enter class' },
  signin: { vi: 'Đăng nhập', en: 'Sign in' },
  email: { vi: 'Email', en: 'Email' },
  password: { vi: 'Mật khẩu', en: 'Password' },
  hintStudent: { vi: 'Chỉ cần mã số — không cần email hay mật khẩu.', en: 'Just your code — no email or password.' },
  hintTeacher: { vi: 'Nhận mã từ quản lý trung tâm.', en: 'Get your code from the center.' },
  wrongCode: { vi: 'Mã số / thông tin không đúng.', en: 'Incorrect code or details.' },
  noServer: { vi: 'Đây là bản xem trước. Đăng nhập sẽ hoạt động khi đưa lên hosting.', en: 'Preview only. Login works once hosted.' },
  tryNow: { vi: 'Trải nghiệm thử ngay', en: 'Try it instantly' },
  about: { vi: 'Về trung tâm', en: 'About' },
  jobs: { vi: 'Tuyển dụng', en: 'Careers' },
  feedback: { vi: 'Góp ý', en: 'Feedback' },
  aboutBody: {
    vi: 'Gần 25 năm giảng dạy tiếng Anh tại Phan Thiết, đồng hành cùng học viên 5–15 tuổi qua các cấp Starters, Movers, Flyers đến B1 — vững cả 4 kỹ năng Nghe, Nói, Đọc, Viết.',
    en: 'Nearly 25 years of English teaching in Phan Thiet, guiding learners 5–15 through Starters, Movers, Flyers to B1 — all four skills.',
  },
  jobsBody: { vi: 'E’TOP chào đón giáo viên & trợ giảng yêu trẻ. Gửi hồ sơ về:', en: 'We welcome teachers who love children. Send your CV to:' },
  feedbackBody: { vi: 'Mọi góp ý của phụ huynh & học viên đều được lắng nghe. Liên hệ:', en: 'We value your feedback. Reach us at:' },
  newParent: { vi: 'Phụ huynh mới? Đăng ký bằng mã mời', en: 'New parent? Register with an invite code' },
  backToLogin: { vi: '← Quay lại đăng nhập', en: '← Back to sign in' },
  inviteCode: { vi: 'Mã mời (giáo viên đưa cho bạn)', en: 'Invite code (from the teacher)' },
  yourName: { vi: 'Họ tên của bạn', en: 'Your name' },
  newPassword: { vi: 'Mật khẩu mới (từ 6 ký tự)', en: 'New password (6+ characters)' },
  register: { vi: 'Tạo tài khoản phụ huynh', en: 'Create parent account' },
  registerHint: {
    vi: 'Mã mời gắn với con của bạn — tài khoản tạo xong sẽ thấy ngay tình hình học của bé.',
    en: 'The invite is tied to your child — your new account sees their progress right away.',
  },
  badInvite: { vi: 'Mã mời không đúng hoặc đã được dùng.', en: 'Invite code is wrong or already used.' },
  emailTaken: { vi: 'Email này đã có tài khoản — hãy đăng nhập.', en: 'This email already has an account — sign in instead.' },
  manual: { vi: 'Hướng dẫn sử dụng', en: 'User guide' },
  manualBody: { vi: 'Từng bước cho học viên, phụ huynh, giáo viên, quản lý và lễ tân.', en: 'Step-by-step for students, parents, teachers, owners and front desk.' },
  how: { vi: 'App hoạt động thế nào?', en: 'How it works' },
  how1t: { vi: 'Nhận mã từ trung tâm', en: 'Get your code' },
  how1b: { vi: 'Học viên nhận mã số từ cô giáo — không cần email hay mật khẩu.', en: 'Students get a code from their teacher — no email or password.' },
  how2t: { vi: 'Học & làm bài trong app', en: 'Learn & practice' },
  how2b: { vi: 'Bài tập cô giao, 38 bài tự luyện, điểm thưởng và huy hiệu mỗi ngày.', en: 'Assigned work, 38 self-study lessons, points and badges every day.' },
  how3t: { vi: 'Phụ huynh yên tâm theo dõi', en: 'Parents stay close' },
  how3b: { vi: 'Biết con đã đến lớp, điểm số, nhận xét của cô — ngay trên điện thoại.', en: 'Check-ins, scores and teacher notes — right on your phone.' },
};

const QUOTES: { vi: string; en: string; who: string }[] = [
  { vi: 'Cô giáo rất tận tâm, con tiến bộ rõ sau một khoá.', en: 'Dedicated teachers — clear progress after one term.', who: 'Phụ huynh lớp Starters' },
  { vi: 'Biết ngay con đã đến lớp chưa, đi làm mà yên tâm hẳn.', en: 'I see the check-in instantly. Total peace of mind.', who: 'Phụ huynh lớp Up 1' },
];

function MeshHero() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-400/40 blur-3xl animate-float" />
      <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-fuchsia-400/30 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl animate-float" style={{ animationDelay: '0.8s' }} />
    </div>
  );
}

function Expandable({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface overflow-hidden bg-white/70 backdrop-blur">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Icon name={icon} size={17} /></span>
        <span className="flex-1">{title}</span>
        <Icon name="chevron" size={18} className={`text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="animate-rise px-4 pb-4 text-sm leading-relaxed text-muted">{children}</div>}
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

  // Parent self-registration (invite-only — the teacher hands out a PH- code).
  const [registering, setRegistering] = useState(false);
  const [invite, setInvite] = useState('');
  const [regName, setRegName] = useState('');

  const t = (k: string) => STR[k]?.[lang] ?? k;
  const setLang = (l: Lang) => { localStorage.setItem('etop-lang', l); setLangState(l); };

  const loginWith = async (payload: { code: string } | { email: string; password: string }) => {
    setErr('');
    setBusy(true);
    try {
      const path = 'code' in payload ? '/auth/login-code' : '/auth/login';
      const res = await api<{ token: string }>('POST', path, payload);
      setToken(res.token);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 401 ? t('wrongCode') : t('noServer'));
    } finally {
      setBusy(false);
    }
  };
  const go = () => loginWith(tab === 'staff' ? { email, password } : { code });

  const register = async () => {
    setErr('');
    setBusy(true);
    try {
      const res = await api<{ token: string }>('POST', '/auth/register-parent', {
        inviteCode: invite.trim(),
        name: regName.trim(),
        email: email.trim(),
        password,
      });
      setToken(res.token);
      onDone();
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
        setErr(e.message === 'email_taken' ? t('emailTaken') : t('badInvite'));
      } else {
        setErr(t('noServer'));
      }
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { k: 'student', icon: 'cap' as IconName, label: t('tabStudent') },
    { k: 'teacher', icon: 'users' as IconName, label: t('tabTeacher') },
    { k: 'staff', icon: 'heart' as IconName, label: t('tabStaff') },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#efeafe] via-[#f6f3fc] to-[#fdf6ee]" />
      <MeshHero />

      <button
        onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
        className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-violet-600 shadow-soft backdrop-blur"
      >
        <Icon name="globe" size={15} /> {lang.toUpperCase()}
      </button>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center gap-5 px-5 py-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-[28px] bg-violet-500/30 blur-2xl" />
            <img src="./logo@2x.png" alt="E’TOP" className="relative h-24 w-24 rounded-[26px] shadow-glow ring-1 ring-black/5" />
          </div>
          <h1 className="mt-5 font-display text-[34px] font-semibold leading-tight text-ink">Anh Ngữ E’TOP</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-violet-500">{t('tagline')}</p>
        </div>

        {/* Login card */}
        <div className="card w-full animate-rise !rounded-3.5xl !p-5">
          <div className="mb-1 text-center">
            <h2 className="text-lg font-extrabold text-ink">{t('welcome')}</h2>
            <p className="text-xs font-semibold text-muted">{t('sub')}</p>
          </div>

          <div className="seg my-4">
            {tabs.map((x) => (
              <button key={x.k} data-active={tab === x.k} onClick={() => { setTab(x.k as typeof tab); setErr(''); setRegistering(false); }}>
                <span className="flex items-center justify-center gap-1.5"><Icon name={x.icon} size={16} /> {x.label}</span>
              </button>
            ))}
          </div>

          {tab !== 'staff' ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  className="input pl-11 text-center text-xl font-extrabold uppercase tracking-[0.25em]"
                  placeholder={tab === 'student' ? 'UP1482' : 'GV0001'}
                  value={code}
                  maxLength={10}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && go()}
                />
                <Icon name="cap" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400" />
              </div>
              <button onClick={go} disabled={busy || code.length < 4} className="btn-primary w-full py-3 text-base">
                {t('enter')} <Icon name="arrowRight" size={18} />
              </button>
              <p className="text-center text-xs font-medium text-muted">{tab === 'student' ? t('hintStudent') : t('hintTeacher')}</p>
            </div>
          ) : !registering ? (
            <div className="space-y-3">
              <input className="input" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
              <button onClick={go} disabled={busy} className="btn-primary w-full py-3">{t('signin')}</button>
              <button onClick={() => { setRegistering(true); setErr(''); }} className="w-full text-center text-xs font-extrabold text-violet-600 underline underline-offset-2">
                {t('newParent')}
              </button>
            </div>
          ) : (
            <div className="animate-rise space-y-3">
              <input
                className="input text-center font-extrabold uppercase tracking-[0.15em]"
                placeholder="PH-ABC123"
                maxLength={12}
                value={invite}
                onChange={(e) => setInvite(e.target.value.toUpperCase())}
              />
              <input className="input" placeholder={t('yourName')} value={regName} onChange={(e) => setRegName(e.target.value)} />
              <input className="input" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" type="password" placeholder={t('newPassword')} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && register()} />
              <button onClick={register} disabled={busy || invite.trim().length < 6 || regName.trim().length < 2 || !email.includes('@') || password.length < 6} className="btn-primary w-full py-3">
                {t('register')}
              </button>
              <p className="text-center text-xs font-medium text-muted">{t('registerHint')}</p>
              <button onClick={() => { setRegistering(false); setErr(''); }} className="w-full text-center text-xs font-extrabold text-slate-400">
                {t('backToLogin')}
              </button>
            </div>
          )}
          {err && <p className="mt-3 text-center text-sm font-bold text-rose-500">{err}</p>}

          {isDemo() && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <p className="mb-2.5 flex items-center justify-center gap-1.5 text-center text-xs font-extrabold text-amber-600">
                <Icon name="sparkles" size={14} /> {t('tryNow')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: 'cap' as IconName, label: t('tabStudent'), payload: { code: 'UP1482' } },
                  { icon: 'users' as IconName, label: t('tabTeacher'), payload: { code: 'GV0001' } },
                  { icon: 'heart' as IconName, label: t('tabStaff'), payload: { email: 'phuhuynh@etop.vn', password: 'x' } },
                  { icon: 'chart' as IconName, label: lang === 'vi' ? 'Chủ TT' : 'Director', payload: { email: 'zhao@etop.vn', password: 'x' } },
                  { icon: 'shield' as IconName, label: lang === 'vi' ? 'Lễ tân' : 'Front desk', payload: { email: 'letan@etop.vn', password: 'x' } },
                ].map((x, i, arr) => (
                  <button
                    key={x.label}
                    onClick={() => loginWith(x.payload)}
                    disabled={busy}
                    className={`surface flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 ${i === arr.length - 1 && arr.length % 2 === 1 ? 'col-span-2 justify-center' : ''}`}
                  >
                    <span className="text-violet-500"><Icon name={x.icon} size={17} /></span> {x.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="surface w-full bg-white/70 px-4 py-3.5 text-center text-sm backdrop-blur">
          <div className="flex items-center justify-center gap-4 font-bold text-ink">
            <a href="tel:0899490222" className="flex items-center gap-1.5 text-violet-600"><Icon name="phone" size={16} /> 089 949 0222</a>
            <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-violet-600"><Icon name="message" size={16} /> Facebook</a>
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted">
            <Icon name="pin" size={14} /> 166 Nguyễn Hội, P. Phú Trinh, TP. Phan Thiết
          </div>
        </div>

        {/* How it works */}
        <div className="w-full space-y-2">
          <h3 className="px-1 text-center text-sm font-extrabold uppercase tracking-[0.14em] text-violet-400">{t('how')}</h3>
          {([['1', 'cap', 'how1t', 'how1b'], ['2', 'pencil', 'how2t', 'how2b'], ['3', 'heart', 'how3t', 'how3b']] as const).map(([n, icon, tt, bb]) => (
            <div key={n} className="surface flex items-start gap-3 bg-white/70 px-4 py-3 backdrop-blur">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white"><Icon name={icon as IconName} size={16} /></span>
              <span>
                <span className="block text-sm font-extrabold text-ink">{n}. {t(tt)}</span>
                <span className="block text-xs font-semibold text-muted">{t(bb)}</span>
              </span>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUOTES.map((qx) => (
              <blockquote key={qx.who} className="surface bg-white/70 px-4 py-3 backdrop-blur">
                <span className="block text-sm font-semibold italic text-slate-600">“{lang === 'vi' ? qx.vi : qx.en}”</span>
                <span className="mt-1 block text-[10px] font-extrabold text-violet-500">— {qx.who}</span>
              </blockquote>
            ))}
          </div>
        </div>

        {/* Expandables */}
        <div className="w-full space-y-2 pb-6 stagger">
          <a href="./manual.html" className="surface flex w-full items-center gap-3 bg-white/70 px-4 py-3.5 text-left font-bold text-ink backdrop-blur transition hover:border-violet-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Icon name="book" size={17} /></span>
            <span className="flex-1">
              {t('manual')}
              <span className="block text-[11px] font-semibold text-muted">{t('manualBody')}</span>
            </span>
            <Icon name="arrowRight" size={17} className="text-slate-300" />
          </a>
          <Expandable icon="cap" title={t('about')}>
            {t('aboutBody')} <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="font-bold text-violet-600">Facebook ↗</a>
          </Expandable>
          <Expandable icon="users" title={t('jobs')}>
            {t('jobsBody')} <a className="font-bold text-violet-600" href={`mailto:${JOBS_EMAIL}?subject=${encodeURIComponent('Ứng tuyển E’TOP')}`}>{JOBS_EMAIL}</a> · <b>089 949 0222</b>
          </Expandable>
          <Expandable icon="message" title={t('feedback')}>
            {t('feedbackBody')} <a className="font-bold text-violet-600" href={`mailto:${CENTER_EMAIL}?subject=${encodeURIComponent('Góp ý cho E’TOP')}`}>{CENTER_EMAIL}</a>
          </Expandable>
        </div>
      </div>
    </div>
  );
}
