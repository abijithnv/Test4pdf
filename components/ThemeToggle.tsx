'use client';
import { useSettings } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useSettings();
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
