import { Component, type ErrorInfo, type ReactNode } from 'react';
import { STRINGS_LANG } from '../i18n';

const DB_KEY = 'etop-db-v1';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App wide error boundary. React error boundaries must be class components and
 * cannot use hooks, so the language is read straight from localStorage. A thrown
 * render used to blank the whole single page app. This shows a friendly bilingual
 * recovery screen with reload and restore demo data options instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging without crashing the app.
    console.error('App error boundary caught an error', error, info);
  }

  private reload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  private reset = () => {
    try {
      localStorage.removeItem(DB_KEY);
    } catch {
      // ignore storage errors, reload will reseed
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const lang = localStorage.getItem('etop-lang') === 'en' ? 'en' : 'vi';
    const t = (key: string) => STRINGS_LANG(key, lang);

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-violet-500 to-fuchsia-500">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl text-center">
          <div className="text-5xl mb-4" aria-hidden="true">
            🦊
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2">{t('error.title')}</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">{t('error.body')}</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="w-full rounded-2xl bg-violet-600 py-3 font-bold text-white transition hover:bg-violet-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              {t('error.reload')}
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="w-full rounded-2xl bg-slate-100 py-3 font-bold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
            >
              {t('error.reset')}
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm font-semibold text-slate-500">
                {t('error.details')}
              </summary>
              <pre className="mt-2 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                {String(this.state.error.stack ?? this.state.error.message)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
