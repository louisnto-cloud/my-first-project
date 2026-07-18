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
  centerArea: { vi: 'Khu vực trung tâm — chủ TT & lễ tân', en: 'Center area — owner & front desk' },
  centerTitle: { vi: 'Khu vực trung tâm', en: 'Center area' },
  centerSub: { vi: 'Chỉ dành cho chủ trung tâm, quản lý và lễ tân', en: 'Owner, managers and front desk only' },
  centerHint: {
    vi: 'Đăng nhập bằng email & mật khẩu riêng của bạn. Lần đầu dùng mật khẩu tạm do chủ trung tâm cấp — vào app rồi tự đổi email và mật khẩu.',
    en: 'Sign in with your own email & password. First time: use the temporary password from the owner, then set your own inside the app.',
  },
  notStaff: {
    vi: 'Tài khoản này không thuộc khu vực trung tâm. Phụ huynh vui lòng dùng mục Phụ huynh.',
    en: 'This account does not belong to the center area. Parents: please use the Parent tab.',
  },
  notParent: {
    vi: 'Tài khoản này thuộc khu vực trung tâm — đăng nhập ở mục 🔐 bên dưới.',
    en: 'This is a center-staff account — sign in via the 🔐 area below.',
  },
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
      {/* Drifting cartoon clouds up top */}
      <svg className="absolute left-[6%] top-24 w-24 animate-float opacity-80" viewBox="0 0 100 40" style={{ animationDelay: '0.4s' }}>
        <ellipse cx="30" cy="26" rx="26" ry="13" fill="#fff" /><ellipse cx="58" cy="20" rx="22" ry="14" fill="#fff" /><ellipse cx="78" cy="28" rx="18" ry="10" fill="#fff" />
      </svg>
      <svg className="absolute right-[8%] top-40 w-16 animate-float opacity-70" viewBox="0 0 100 40" style={{ animationDelay: '1.9s' }}>
        <ellipse cx="34" cy="24" rx="28" ry="13" fill="#fff" /><ellipse cx="64" cy="20" rx="20" ry="12" fill="#fff" />
      </svg>
      {/* A kite sailing past the brand, and a few birds */}
      <svg className="absolute right-[5%] top-16 w-14 animate-float" viewBox="0 0 60 90" style={{ animationDelay: '0.9s' }}>
        <path d="M30 4 L52 26 L30 52 L8 26 Z" fill="#e35bc0" />
        <path d="M30 4 L30 52 M8 26 L52 26" stroke="#fff" strokeWidth="2" opacity=".7" />
        <path d="M30 52 q-6 10 3 16 q-8 5 -1 14" stroke="#e35bc0" strokeWidth="2" fill="none" />
        <circle cx="33" cy="68" r="2.8" fill="#ffce4d" /><circle cx="31" cy="82" r="2.8" fill="#7cd4b4" />
      </svg>
      <svg className="absolute left-[12%] top-52 w-14 opacity-70" viewBox="0 0 80 24">
        <path d="M6 14 q5 -7 10 0 q5 -7 10 0" stroke="#8f86c9" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M48 8 q4 -6 8 0 q4 -6 8 0" stroke="#8f86c9" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Cartoon footer scene: kids racing and leaping toward the schoolhouse.
 *  Pure inline SVG in the brand palette — no image files to load. */
function KidsScene() {
  const skin1 = '#ffd9b3';
  const skin2 = '#eebc8c';
  const limb = { strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <div className="pointer-events-none relative -mt-4 w-full" aria-hidden>
      <svg viewBox="0 0 900 265" className="block h-auto w-full" preserveAspectRatio="xMidYMax meet">
        {/* sun */}
        <g className="animate-float" style={{ animationDelay: '1.2s' }}>
          <circle cx="76" cy="52" r="26" fill="#ffce4d" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <line key={i} x1={76 + Math.cos(a) * 33} y1={52 + Math.sin(a) * 33} x2={76 + Math.cos(a) * 42} y2={52 + Math.sin(a) * 42} stroke="#ffce4d" strokeWidth="5" strokeLinecap="round" />;
          })}
          <path d="M67 50 q3 -4 6 0 M103 50 q-3 -4 -6 0" stroke="#8a5b1a" strokeWidth="2.4" fill="none" transform="translate(-9 0)" />
          <path d="M68 60 q8 7 16 0" stroke="#8a5b1a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx="63" cy="58" r="3.4" fill="#ff9d76" opacity=".55" /><circle cx="89" cy="58" r="3.4" fill="#ff9d76" opacity=".55" />
        </g>
        {/* birds */}
        <path d="M300 55 q6 -7 12 0 q6 -7 12 0" stroke="#8f86c9" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M356 38 q5 -6 10 0 q5 -6 10 0" stroke="#8f86c9" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* kite, flown by the first runner */}
        <g className="animate-float" style={{ animationDelay: '0.6s' }}>
          <path d="M210 34 L238 58 L210 86 L182 58 Z" fill="#e35bc0" />
          <path d="M210 34 L210 86 M182 58 L238 58" stroke="#fff" strokeWidth="2.4" opacity=".7" />
          <path d="M210 86 q-6 14 4 22 q-10 6 -2 18" stroke="#e35bc0" strokeWidth="2.4" fill="none" />
          <circle cx="214" cy="108" r="3.4" fill="#ffce4d" /><circle cx="212" cy="126" r="3.4" fill="#7cd4b4" />
        </g>
        <path d="M212 126 Q190 175 155 196" stroke="#b9b0e8" strokeWidth="1.8" fill="none" />
        {/* hills */}
        <path d="M0 232 Q140 176 320 216 T650 212 T900 224 L900 265 L0 265 Z" fill="#cdeeda" />
        <path d="M0 250 Q180 208 420 238 T900 240 L900 265 L0 265 Z" fill="#a9e2c3" />
        {/* schoolhouse */}
        <g>
          <rect x="700" y="118" width="150" height="104" rx="10" fill="#7c5ce8" />
          <path d="M688 122 L775 74 L862 122 Z" fill="#ffce4d" />
          <rect x="768" y="52" width="5" height="28" fill="#6a51df" />
          <path d="M773 52 L800 60 L773 68 Z" fill="#e35bc0" />
          <rect x="712" y="136" width="26" height="24" rx="5" fill="#efeafe" />
          <rect x="812" y="136" width="26" height="24" rx="5" fill="#efeafe" />
          <path d="M712 148 h26 M725 136 v24 M812 148 h26 M825 136 v24" stroke="#b9a8f5" strokeWidth="2" />
          <rect x="757" y="160" width="36" height="62" rx="6" fill="#fff7e8" />
          <circle cx="787" cy="192" r="2.6" fill="#c9a24e" />
          <rect x="742" y="128" width="66" height="18" rx="9" fill="#fff" opacity=".95" />
          <text x="775" y="141.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#6a51df" fontFamily="inherit">E’TOP</text>
          <ellipse cx="775" cy="228" rx="70" ry="7" fill="#8fd7b0" opacity=".7" />
        </g>
        {/* flowers */}
        {[
          [60, 246], [130, 252], [420, 250], [560, 244], [660, 252],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill={i % 2 ? '#e35bc0' : '#ffce4d'} />
            <circle cx={x} cy={y} r="1.6" fill="#fff" />
          </g>
        ))}
        {/* Kid 1 — boy sprinting with the kite string */}
        <g>
          <ellipse cx="150" cy="242" rx="26" ry="5" fill="#69b98c" opacity=".45" />
          <path d="M138 232 L126 244 M150 230 L162 240" stroke="#3f4a8a" strokeWidth="7" {...limb} />
          <rect x="130" y="196" width="32" height="38" rx="12" fill="#ff7a9c" />
          <rect x="124" y="200" width="12" height="26" rx="6" fill="#f5a623" />
          <path d="M158 206 L155 196 M136 208 L120 218" stroke={skin1} strokeWidth="6.4" {...limb} />
          <circle cx="148" cy="180" r="14.5" fill={skin1} />
          <path d="M134 176 q4 -12 18 -10 q9 1 10 9 q-6 -4 -13 -3 q-9 1 -15 4" fill="#5b4231" />
          <circle cx="144" cy="181" r="1.8" fill="#333" /><circle cx="154" cy="181" r="1.8" fill="#333" />
          <path d="M145 188 q4 3.4 8 0" stroke="#a4653c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="140" cy="186" r="2.6" fill="#ff9d76" opacity=".5" />
        </g>
        {/* Kid 2 — girl with pigtails, mid-run */}
        <g>
          <ellipse cx="300" cy="252" rx="25" ry="5" fill="#69b98c" opacity=".45" />
          <path d="M291 242 L281 254 M305 240 L315 250" stroke={skin2} strokeWidth="6.6" {...limb} />
          <path d="M287 208 h30 l6 30 h-42 Z" fill="#ffce4d" />
          <rect x="309" y="210" width="11" height="22" rx="5.5" fill="#63b3ed" />
          <path d="M289 214 L275 224 M313 214 L326 220" stroke={skin2} strokeWidth="6" {...limb} />
          <circle cx="302" cy="192" r="14" fill={skin2} />
          <path d="M288 189 q3 -12 16 -11 q11 1 12 11 q-7 -5 -14 -4 q-9 1 -14 4" fill="#2e2420" />
          <circle cx="286" cy="192" r="5.5" fill="#2e2420" /><circle cx="318" cy="192" r="5.5" fill="#2e2420" />
          <circle cx="286" cy="188" r="2.2" fill="#e35bc0" /><circle cx="318" cy="188" r="2.2" fill="#e35bc0" />
          <circle cx="298" cy="193" r="1.8" fill="#333" /><circle cx="308" cy="193" r="1.8" fill="#333" />
          <path d="M299 200 q4 3.4 8 0" stroke="#8c4f2f" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
        {/* Kid 3 — boy leaping, arms up */}
        <g className="animate-float" style={{ animationDelay: '1.6s' }}>
          <path d="M448 216 L440 230 M462 216 L472 228" stroke="#3f6ab5" strokeWidth="7" {...limb} />
          <rect x="440" y="182" width="30" height="36" rx="12" fill="#63b3ed" />
          <path d="M442 190 L430 176 M468 190 L480 176" stroke={skin1} strokeWidth="6.2" {...limb} />
          <circle cx="455" cy="166" r="14.5" fill={skin1} />
          <path d="M441 162 q5 -13 19 -10 q9 2 9 9 q-7 -4 -14 -3 q-9 1 -14 4" fill="#3a2c22" />
          <circle cx="451" cy="167" r="1.8" fill="#333" /><circle cx="461" cy="167" r="1.8" fill="#333" />
          <path d="M450 173 q5 4.6 10 0" stroke="#a4653c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="447" cy="172" r="2.6" fill="#ff9d76" opacity=".5" />
        </g>
        <ellipse cx="456" cy="250" rx="24" ry="5" fill="#69b98c" opacity=".45" />
        {/* Kid 4 — little one skipping with a balloon */}
        <g>
          <ellipse cx="590" cy="248" rx="22" ry="4.6" fill="#69b98c" opacity=".45" />
          <path d="M583 240 L576 250 M596 238 L604 247" stroke={skin2} strokeWidth="6" {...limb} />
          <rect x="577" y="208" width="26" height="32" rx="11" fill="#9d7bf0" />
          <path d="M580 214 L570 222 M600 214 L607 204" stroke={skin2} strokeWidth="5.6" {...limb} />
          <circle cx="590" cy="194" r="12.5" fill={skin2} />
          <path d="M578 191 q3 -11 15 -10 q9 1 10 10 q-6 -4 -12 -3 q-8 1 -13 3" fill="#4a3526" />
          <circle cx="586" cy="195" r="1.7" fill="#333" /><circle cx="595" cy="195" r="1.7" fill="#333" />
          <path d="M587 201 q3.5 3 7 0" stroke="#8c4f2f" strokeWidth="1.9" fill="none" strokeLinecap="round" />
          <g className="animate-float" style={{ animationDelay: '2.3s' }}>
            <ellipse cx="622" cy="160" rx="13" ry="16" fill="#ffce4d" />
            <path d="M622 176 l-3 5 h6 Z" fill="#e0a52e" />
          </g>
          <path d="M622 181 Q615 195 608 203" stroke="#c9b25e" strokeWidth="1.6" fill="none" />
        </g>
      </svg>
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

// Roles allowed through the "Khu vực trung tâm" door. The server enforces
// every permission anyway — this gate keeps the areas tidy and stops a
// parent account from wandering into the staff sign-in by mistake.
const CENTER_ROLES = ['owner', 'academic_director', 'site_director', 'front_desk'];

export function Landing({ onDone }: { onDone: () => void }) {
  const [lang, setLangState] = useState<Lang>((localStorage.getItem('etop-lang') as Lang) || 'vi');
  const [tab, setTab] = useState<'student' | 'teacher' | 'staff' | 'center'>('student');
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

  const loginWith = async (payload: { code: string } | { email: string; password: string }, gate?: 'center' | 'parent') => {
    setErr('');
    setBusy(true);
    try {
      const path = 'code' in payload ? '/auth/login-code' : '/auth/login';
      const res = await api<{ token: string; user: { role: string } }>('POST', path, payload);
      // Each door admits its own people: the center area is staff-only,
      // the parent tab is parents-only.
      if (gate === 'center' && !CENTER_ROLES.includes(res.user.role)) { setErr(t('notStaff')); return; }
      if (gate === 'parent' && res.user.role !== 'parent' && !CENTER_ROLES.includes(res.user.role)) { setErr(t('wrongCode')); return; }
      if (gate === 'parent' && CENTER_ROLES.includes(res.user.role)) { setErr(t('notParent')); return; }
      setToken(res.token);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError && [400, 401, 403].includes(e.status) ? t('wrongCode') : t('noServer'));
    } finally {
      setBusy(false);
    }
  };
  const go = () => loginWith(tab === 'staff' || tab === 'center' ? { email, password } : { code }, tab === 'center' ? 'center' : tab === 'staff' ? 'parent' : undefined);

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
            <h2 className="text-lg font-extrabold text-ink">{tab === 'center' ? `🔐 ${t('centerTitle')}` : t('welcome')}</h2>
            <p className="text-xs font-semibold text-muted">{tab === 'center' ? t('centerSub') : t('sub')}</p>
          </div>

          <div className="seg my-4">
            {tabs.map((x) => (
              <button key={x.k} data-active={tab === x.k} onClick={() => { setTab(x.k as typeof tab); setErr(''); setRegistering(false); }}>
                <span className="flex items-center justify-center gap-1.5"><Icon name={x.icon} size={16} /> {x.label}</span>
              </button>
            ))}
          </div>

          {tab === 'center' ? (
            <div className="animate-rise space-y-3">
              <input className="input" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && !!password && !busy && go()} />
              <button onClick={go} disabled={busy || !email.includes('@') || !password} className="btn-primary w-full py-3">
                <Icon name="shield" size={17} /> {t('signin')}
              </button>
              <p className="text-center text-xs font-medium leading-relaxed text-muted">{t('centerHint')}</p>
              <button onClick={() => { setTab('student'); setErr(''); }} className="w-full text-center text-xs font-extrabold text-slate-400">
                {t('backToLogin')}
              </button>
            </div>
          ) : tab !== 'staff' ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  className="input pl-11 text-center text-xl font-extrabold uppercase tracking-[0.25em]"
                  placeholder={tab === 'student' ? 'UP1482' : 'GV0001'}
                  value={code}
                  maxLength={10}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && !busy && go()}
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
              <input className="input" type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && !!password && !busy && go()} />
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
              <input className="input" type="password" placeholder={t('newPassword')} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && invite.trim().length >= 6 && regName.trim().length >= 2 && email.includes('@') && password.length >= 6 && register()} />
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
                  { icon: 'heart' as IconName, label: t('tabStaff'), payload: { email: 'phuhuynh@etop.vn', password: 'x' }, gate: 'parent' as const },
                  { icon: 'chart' as IconName, label: lang === 'vi' ? 'Chủ TT' : 'Director', payload: { email: 'zhao@etop.vn', password: 'x' }, gate: 'center' as const },
                  { icon: 'shield' as IconName, label: lang === 'vi' ? 'Lễ tân' : 'Front desk', payload: { email: 'letan@etop.vn', password: 'x' }, gate: 'center' as const },
                ].map((x, i, arr) => (
                  <button
                    key={x.label}
                    onClick={() => loginWith(x.payload, 'gate' in x ? x.gate : undefined)}
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

        {/* The staff door — deliberately quiet, below the family-facing card */}
        {tab !== 'center' && (
          <button
            onClick={() => { setTab('center'); setErr(''); setRegistering(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="-mt-1 flex items-center gap-1.5 text-xs font-extrabold text-violet-400 transition hover:text-violet-600"
          >
            🔐 {t('centerArea')}
          </button>
        )}

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

      {/* Cartoon footer: kids racing to school */}
      <div className="relative">
        <KidsScene />
      </div>
    </div>
  );
}
