import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    if (typeof console !== 'undefined') {
      console.error('App crash:', error, info);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <CrashScreen error={this.state.error} onReset={this.reset} />;
  }
}

function CrashScreen({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-violet-50 p-6 text-center dark:bg-slate-900">
      <div aria-hidden="true" className="text-6xl">🐢</div>
      <div>
        <h1 className="text-xl font-black text-violet-700 dark:text-violet-300">Something broke</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
          The app hit an unexpected error. You can try again — your work is saved locally.
        </p>
      </div>
      <button onClick={onReset} className="btn-primary">
        Try again
      </button>
      <details className="mt-2 max-w-lg text-left text-xs font-mono text-slate-400 dark:text-slate-500">
        <summary className="cursor-pointer">Technical details</summary>
        <pre className="mt-2 whitespace-pre-wrap break-all rounded-xl bg-white p-3 dark:bg-slate-800">
          {error.message}
          {error.stack ? '\n\n' + error.stack.split('\n').slice(0, 6).join('\n') : ''}
        </pre>
      </details>
    </div>
  );
}
