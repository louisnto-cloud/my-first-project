import { useCallback, useEffect, useState } from 'react';

const KEY = 'etop-theme-v1';
type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}

// Apply the persisted theme immediately at boot so there's no light-to-dark flash.
export function primeTheme(): void {
  apply(initialTheme());
}
