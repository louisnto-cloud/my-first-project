import { useState } from 'react';
import { api, ApiError, setToken } from './api';

// The public face of E'TOP: logo, a cheerful cartoon scene of kids playing
// (inline SVG, no downloads), code-based login for students and teachers,
// center contact info, and expandable about/jobs/feedback sections.

function CartoonScene() {
  return (
    <svg viewBox="0 0 800 360" className="pointer-events-none absolute inset-x-0 bottom-0 w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
      {/* sun + clouds */}
      <circle cx="700" cy="60" r="38" fill="#FDE047" />
      <circle cx="700" cy="60" r="50" fill="#FDE047" opacity="0.3" />
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="140" cy="70" rx="46" ry="18" />
        <ellipse cx="180" cy="60" rx="36" ry="16" />
        <ellipse cx="520" cy="50" rx="40" ry="15" />
      </g>
      {/* hills */}
      <ellipse cx="180" cy="400" rx="380" ry="120" fill="#86EFAC" />
      <ellipse cx="650" cy="420" rx="420" ry="140" fill="#4ADE80" />
      {/* school house */}
      <g>
        <rect x="60" y="210" width="120" height="80" rx="8" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="4" />
        <polygon points="50,215 120,165 190,215" fill="#F87171" />
        <rect x="105" y="250" width="30" height="40" rx="4" fill="#A78BFA" />
        <text x="120" y="240" textAnchor="middle" fontSize="16" fontWeight="900" fill="#7C3AED">ABC</text>
      </g>
      {/* kid with kite */}
      <g>
        <path d="M560 130 L590 160 L560 190 L530 160 Z" fill="#F472B6" stroke="#fff" strokeWidth="3" />
        <path d="M560 190 Q540 230 510 260" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
        <circle cx="505" cy="272" r="14" fill="#FCD34D" />
        <rect x="495" y="284" width="20" height="26" rx="8" fill="#60A5FA" />
        <line x1="498" y1="312" x2="492" y2="330" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        <line x1="512" y1="312" x2="518" y2="330" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* two kids with a ball */}
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
      {/* grass tufts */}
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
  const [tab, setTab] = useState<'student' | 'teacher' | 'staff'>('student');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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
      setErr(e instanceof ApiError && e.status === 401 ? 'Mã số / thông tin không đúng. Vui lòng kiểm tra lại.' : 'Không kết nối được. Thử lại nhé.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100">
      <CartoonScene />

      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center gap-5 px-4 py-8">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <img src="./logo.png" alt="Anh Ngữ E’TOP" className="h-24 w-24 rounded-full shadow-xl" />
          <h1 className="mt-3 text-3xl font-black text-violet-800 drop-shadow-sm">Trung tâm Anh Ngữ E’TOP</h1>
          <p className="font-bold text-violet-600">Learn – Achieve – Lead ⭐</p>
        </div>

        {/* Login card */}
        <div className="w-full rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="mb-4 flex gap-1 rounded-2xl bg-violet-100 p-1">
            {([['student', '🧒 Học viên'], ['teacher', '👩‍🏫 Giáo viên'], ['staff', '👪 Phụ huynh & QL']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setTab(k); setErr(''); }}
                className={`flex-1 rounded-xl px-2 py-2 text-sm font-extrabold transition ${tab === k ? 'bg-white text-violet-700 shadow' : 'text-violet-400'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab !== 'staff' ? (
            <div className="space-y-3">
              <label className="block text-sm font-extrabold text-slate-600">
                {tab === 'student' ? 'Mã số học viên' : 'Mã số giáo viên'}
              </label>
              <input
                className="input text-center text-2xl font-black uppercase tracking-widest"
                placeholder={tab === 'student' ? 'HV0001' : 'GV0001'}
                value={code}
                maxLength={10}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && go()}
              />
              <button onClick={go} disabled={busy || code.length < 4} className="btn-primary w-full text-lg">
                Vào lớp 🚀
              </button>
              <p className="text-center text-xs font-semibold text-slate-400">
                {tab === 'student' ? 'Chỉ cần mã số — không cần email hay mật khẩu. Quên mã? Hỏi cô giáo nhé!' : 'Nhận mã từ quản lý trung tâm.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
              <button onClick={go} disabled={busy} className="btn-primary w-full">Đăng nhập</button>
            </div>
          )}
          {err && <p className="mt-3 text-center text-sm font-bold text-rose-500">{err}</p>}
        </div>

        {/* Center info */}
        <div className="w-full rounded-3xl bg-white/80 p-4 text-center backdrop-blur">
          <div className="font-extrabold text-violet-800">📞 089 949 0222</div>
          <div className="text-sm font-semibold text-slate-600">📍 166 Nguyễn Hội, P. Phú Trinh, TP. Phan Thiết</div>
          <div className="text-sm font-semibold text-slate-600">📍 Cơ sở 2: Tôn Thất Thiệp, TP. Phan Thiết</div>
        </div>

        {/* Expandable sections */}
        <div className="w-full space-y-2 pb-8">
          <Expandable icon="🏫" title="Tìm hiểu thêm về trung tâm">
            Với gần 25 năm kinh nghiệm giảng dạy tiếng Anh tại Phan Thiết, E’TOP đồng hành cùng học viên
            từ 5–15 tuổi (và cả người lớn) qua các cấp độ Starters, Movers, Flyers đến B1 — chú trọng đủ
            4 kỹ năng Nghe, Nói, Đọc, Viết. Phương châm của chúng tôi: <b>Learn – Achieve – Lead</b>.
            Ghé thăm Facebook: <b>Trung Tâm Anh Ngữ E’TOP</b>.
          </Expandable>
          <Expandable icon="💼" title="Việc làm tại E’TOP">
            E’TOP luôn chào đón giáo viên và trợ giảng yêu trẻ, đam mê tiếng Anh. Gửi CV hoặc liên hệ trực
            tiếp qua hotline <b>089 949 0222</b> để biết các vị trí đang tuyển.
          </Expandable>
          <Expandable icon="💬" title="Đóng góp ý kiến">
            Trung tâm rất mong nhận góp ý của phụ huynh và học viên! Phụ huynh đăng nhập để nhắn tin trực
            tiếp với giáo viên, hoặc gọi hotline <b>089 949 0222</b>. Mọi ý kiến đều được ghi nhận và phản hồi.
          </Expandable>
        </div>
      </div>
    </div>
  );
}
