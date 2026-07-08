'use client';
import { useState } from 'react';
import { useSettings, Theme, Font } from './ThemeProvider';

const FONTS: { value: Font; label: string; sample: string; css: string }[] = [
  { value: 'lora',    label: 'Lora',        sample: 'Elegant serif',    css: "'Lora', Georgia, serif" },
  { value: 'inter',   label: 'Inter',       sample: 'Clean & modern',   css: "'Inter', system-ui, sans-serif" },
  { value: 'system',  label: 'System UI',   sample: 'Native & fast',    css: "system-ui, -apple-system, sans-serif" },
  { value: 'georgia', label: 'Georgia',     sample: 'Classic readable', css: "Georgia, 'Times New Roman', serif" },
  { value: 'mono',    label: 'Monospace',   sample: 'Code-style look',  css: "'DM Mono', 'Courier New', monospace" },
];

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'dark',  label: 'Dark',  icon: '🌙' },
  { value: 'light', label: 'Light', icon: '☀️' },
];

export function SettingsPanel() {
  const { theme, font, setTheme, setFont } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Appearance settings"
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '1rem',
          flexShrink: 0,
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-light)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
        }}
      >
        ⚙
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            zIndex: 998,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: '4rem',
            right: '1.5rem',
            zIndex: 999,
            width: 280,
            background: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow)',
            padding: '1.25rem',
            animation: 'fadeUp 0.2s ease forwards',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>Appearance</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1rem', padding: 4 }}
            >✕</button>
          </div>

          {/* Theme */}
          <div style={{ marginBottom: '1.1rem' }}>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Theme</p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 8,
                    border: '1.5px solid',
                    borderColor: theme === t.value ? 'var(--accent)' : 'var(--border)',
                    background: theme === t.value ? 'var(--accent-bg)' : 'var(--surface-2)',
                    color: theme === t.value ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Body Font</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {FONTS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFont(f.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 8,
                    border: '1.5px solid',
                    borderColor: font === f.value ? 'var(--accent)' : 'var(--border)',
                    background: font === f.value ? 'var(--accent-bg)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontFamily: f.css,
                    fontSize: '0.9rem',
                    color: font === f.value ? 'var(--accent)' : 'var(--text)',
                    fontWeight: 500,
                  }}>{f.label}</span>
                  <span style={{
                    fontFamily: f.css,
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                  }}>{f.sample}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
