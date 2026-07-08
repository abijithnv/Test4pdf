'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SettingsPanel } from '@/components/SettingsPanel';

interface Quiz {
  id: string;
  title: string;
  createdAt: string;
  questionCount: number;
}

interface Attempt {
  id: string;
  quizId: string;
  score: number;
  total: number;
  timeTaken: number;
  completed: boolean;
  createdAt: string;
}

interface QuizStats {
  quiz: Quiz;
  attempts: Attempt[];
  avgScore: number;
  bestScore: number;
  totalAttempts: number;
}

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<QuizStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const r = await fetch('/api/quizzes');
      const qs: Quiz[] = await r.json();
      setQuizzes(Array.isArray(qs) ? qs : []);

      const allStats = await Promise.all(
        (Array.isArray(qs) ? qs : []).map(async quiz => {
          const r2 = await fetch(`/api/quiz/${quiz.id}/attempts`);
          const attempts: Attempt[] = await r2.json();
          const completed = Array.isArray(attempts) ? attempts.filter(a => a.completed) : [];
          const avgScore = completed.length > 0
            ? Math.round(completed.reduce((sum, a) => sum + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / completed.length)
            : -1;
          const bestScore = completed.length > 0
            ? Math.max(...completed.map(a => a.total > 0 ? Math.round((a.score / a.total) * 100) : 0))
            : -1;
          return { quiz, attempts: completed, avgScore, bestScore, totalAttempts: completed.length };
        })
      );
      setStats(allStats);
      setLoading(false);
    }
    load();
  }, []);

  const totalAttempts = stats.reduce((s, q) => s + q.totalAttempts, 0);
  const overallAvg = stats.filter(s => s.avgScore >= 0).length > 0
    ? Math.round(stats.filter(s => s.avgScore >= 0).reduce((s, q) => s + q.avgScore, 0) / stats.filter(s => s.avgScore >= 0).length)
    : null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'DM Mono', fontSize: '0.8rem' }}>← Home</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.95rem' }}>Dashboard</span>
          <SettingsPanel />
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <h1 className="animate-fade-up" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>Statistics</h1>
        <p className="animate-fade-up stagger-1" style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Track your performance across all quizzes</p>

        {/* Summary cards */}
        <div className="animate-fade-up stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Total Quizzes', value: quizzes.length, color: 'var(--text)' },
            { label: 'Total Attempts', value: totalAttempts, color: 'var(--blue)' },
            { label: 'Avg Score', value: overallAvg !== null ? `${overallAvg}%` : '—', color: overallAvg !== null ? (overallAvg >= 70 ? 'var(--green)' : overallAvg >= 40 ? 'var(--accent)' : 'var(--red)') : 'var(--text-dim)' },
          ].map(card => (
            <div key={card.label} className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontFamily: 'Syne', fontSize: '1.8rem', fontWeight: 800, color: card.color }}>{loading ? '—' : card.value}</p>
              <p style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</p>
            </div>
          ))}
        </div>

        {/* Per-quiz stats */}
        <h2 style={{ fontSize: '1rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per Quiz</h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : stats.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <p>No quizzes yet. <Link href="/" style={{ color: 'var(--accent)' }}>Upload a PDF</Link> to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.map((s, i) => (
              <div key={s.quiz.id} className="card animate-fade-up" style={{ padding: '1.25rem', animationDelay: `${i * 0.04}s`, opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.35rem' }}>{s.quiz.title}</p>
                    <p style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {s.quiz.questionCount} questions · {s.totalAttempts} attempt{s.totalAttempts !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {s.totalAttempts > 0 ? (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.3rem', color: s.avgScore >= 70 ? 'var(--green)' : s.avgScore >= 40 ? 'var(--accent)' : 'var(--red)' }}>{s.avgScore}%</p>
                        <p style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Avg</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.3rem', color: 'var(--blue)' }}>{s.bestScore}%</p>
                        <p style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Best</p>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--text-dim)' }}>No attempts yet</span>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Link href={`/manage/${s.quiz.id}`} className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>Edit</Link>
                    <Link href={`/practice/${s.quiz.id}`} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>Practice →</Link>
                  </div>
                </div>

                {/* Score history sparkline */}
                {s.attempts.length > 1 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>Score history</p>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32 }}>
                      {s.attempts.slice(-12).map((a, ai) => {
                        const pct = a.total > 0 ? (a.score / a.total) : 0;
                        return (
                          <div
                            key={a.id}
                            title={`${Math.round(pct * 100)}%`}
                            style={{
                              flex: 1, maxWidth: 20,
                              height: `${Math.max(4, pct * 32)}px`,
                              background: pct >= 0.7 ? 'var(--green)' : pct >= 0.4 ? 'var(--accent)' : 'var(--red)',
                              borderRadius: 2, opacity: 0.8,
                              transition: 'height 0.3s',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
