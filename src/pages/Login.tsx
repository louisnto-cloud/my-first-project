import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { useI18n } from '../i18n';
import { LangToggle } from '../components/ui';
import { Logo } from '../components/Logo';

const DEMOS = [
  { key: 'login.demo.student', email: 'minh@etop.vn', emoji: '🦊' },
  { key: 'login.demo.parent', email: 'phuhuynh@etop.vn', emoji: '👨‍👦' },
  { key: 'login.demo.teacher', email: 'lan@etop.vn', emoji: '👩‍🏫' },
  { key: 'login.demo.owner', email: 'zhao@etop.vn', emoji: '👩‍💼' },
];

export default function Login() {
  const { login } = useApp();
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const doLogin = (em: string, pw: string) => {
    if (login(em, pw)) nav('/school');
    else setError(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-violet-600 via-violet-500 to-fuchsia-500 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <Logo size={88} className="shadow-lg shadow-violet-900/30" />
          <h1 className="mt-3 text-3xl font-black">{t('app.name')}</h1>
          <p className="font-semibold text-violet-100">{t('app.tagline')}</p>
        </div>
        <div className="card space-y-3 !rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-violet-700">{t('login.welcome')}</h2>
            <LangToggle />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              className="input"
              type="email"
              placeholder={t('login.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <input
              className="input"
              type="password"
              placeholder={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error && <p className="text-sm font-bold text-rose-500">{t('login.error')}</p>}
            <button type="submit" className="btn-primary w-full">
              {t('login.signin')} 🚀
            </button>
          </form>
          <div className="border-t border-violet-100 pt-3">
            <p className="mb-2 text-xs font-bold text-slate-400">{t('login.demo')}</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d.email}
                  onClick={() => doLogin(d.email, 'etop123')}
                  className="flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-left text-xs font-bold text-violet-700 hover:bg-violet-100"
                >
                  <span className="text-lg">{d.emoji}</span>
                  <span>
                    {t(d.key)}
                    <span className="block text-[10px] font-semibold text-slate-400">{d.email}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs font-semibold text-violet-100">{t('app.footer')}</p>
      </div>
    </div>
  );
}
