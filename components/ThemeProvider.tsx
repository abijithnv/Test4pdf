'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type Font = 'lora' | 'inter' | 'system' | 'georgia' | 'mono';

interface AppSettings {
  theme: Theme;
  font: Font;
  setTheme: (t: Theme) => void;
  setFont: (f: Font) => void;
}

const SettingsContext = createContext<AppSettings>({
  theme: 'dark',
  font: 'lora',
  setTheme: () => {},
  setFont: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with whatever the inline script already applied (dark fallback)
  const [theme, setThemeState] = useState<Theme>('dark');
  const [font, setFontState] = useState<Font>('lora');

  // After mount, sync React state with what the inline script set
  useEffect(() => {
    const savedTheme = (localStorage.getItem('qf-theme') as Theme) || 'dark';
    const savedFont  = (localStorage.getItem('qf-font')  as Font)  || 'lora';
    setThemeState(savedTheme);
    setFontState(savedFont);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('qf-theme', t);
  };

  const setFont = (f: Font) => {
    setFontState(f);
    document.documentElement.setAttribute('data-font', f);
    localStorage.setItem('qf-font', f);
  };

  return (
    <SettingsContext.Provider value={{ theme, font, setTheme, setFont }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
