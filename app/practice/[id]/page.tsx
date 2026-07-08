'use client';
import { useState, useEffect, useCallback, use, useRef } from 'react';
import Link from 'next/link';
import { SettingsPanel } from '@/components/SettingsPanel';

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  position: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

type Screen = 'setup' | 'quiz' | 'result';

// timerMode: 'none' | 'per-question' | 'total'
// timerValue: seconds

export default function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('setup');
  
  // Quiz config
  const [randomize, setRandomize] = useState(false);
  const [timerMode, setTimerMode] = useState<'none'|'per'|'total'>('none');
  const [timerValue, setTimerValue] = useState(60); // seconds
  // Derived: positive=per-question, negative=total, 0=none
  const timerOption = timerMode === 'none' ? 0 : timerMode === 'per' ? timerValue : -timerValue;

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/quiz/${id}`)
      .then(r => r.json())
      .then(data => { setQuiz(data); setLoading(false); });
  }, [id]);

  const startQuiz = useCallback(() => {
    if (!quiz) return;
    let qs = [...quiz.questions];
    if (randomize) qs = qs.sort(() => Math.random() - 0.5);
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers({});
    setRevealed({});
    setBookmarks(new Set());
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    // Setup timer
    if (timerOption > 0) setTimeLeft(timerOption);
    else if (timerOption < 0) setTimeLeft(Math.abs(timerOption));
    else setTimeLeft(0);
    setTotalTime(timerOption);

    setScreen('quiz');
  }, [quiz, randomize, timerOption]);

  // Timer effect
  useEffect(() => {
    if (screen !== 'quiz') return;
    if (timerOption === 0) {
      // Just track elapsed
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up
            if (timerOption > 0) {
              // Per-question timer: auto-reveal
              const cur = questions[currentIdx];
              if (cur) setRevealed(r => ({ ...r, [cur.id]: true }));
            } else {
              // Total timer: end quiz
              finishQuiz();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, timerOption, questions, currentIdx]);

  // Per-question timer: reset when question changes
  useEffect(() => {
    if (screen === 'quiz' && timerOption > 0) {
      setTimeLeft(timerOption);
    }
  }, [currentIdx, screen, timerOption]);

  const handleAnswer = (qId: string, letter: string) => {
    if (revealed[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: letter }));
    setRevealed(prev => ({ ...prev, [qId]: true }));
    if (timerOption > 0 && timerRef.current) clearInterval(timerRef.current);
  };

  const finishQuiz = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setElapsedTime(elapsed);
    setScreen('result');

    // Save attempt
    const score = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    await fetch(`/api/quiz/${id}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, total: questions.length, timeTaken: elapsed, answers, bookmarks: [...bookmarks], completed: true }),
    });
  }, [questions, answers, bookmarks, id]);

  const toggleBookmark = (qId: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const exportCSV = () => {
    if (!quiz) return;
    const rows = [['#', 'Question', 'Your Answer', 'Correct Answer', 'Result']];
    questions.forEach((q, i) => {
      const userAns = answers[q.id] || 'N/A';
      const correct = q.correctAnswer;
      rows.push([
        String(i + 1), q.text, userAns, correct,
        answers[q.id] === q.correctAnswer ? 'Correct' : 'Incorrect',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${quiz.title}-results.csv`; a.click();
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'DM Mono', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Loading quiz…</div>
    </div>
  );

  if (!quiz) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--red)' }}>Quiz not found.</p>
        <Link href="/" className="btn btn-ghost" style={{ marginTop: '1rem' }}>← Back</Link>
      </div>
    </div>
  );

  // ─── SETUP SCREEN ────────────────────────────────────────────────
  const formatTimeLabel = (secs: number) => {
    if (secs < 60) return secs + 's';
    if (secs % 60 === 0) return (secs / 60) + 'm';
    return Math.floor(secs / 60) + 'm ' + (secs % 60) + 's';
  };

  if (screen === 'setup') {
    const modeBtn = (mode: 'none'|'per'|'total', label: string, icon: string) => (
      <button onClick={() => setTimerMode(mode)} style={{
        flex: 1, padding: '0.65rem 0.5rem', borderRadius: 8, border: '1.5px solid',
        borderColor: timerMode === mode ? 'var(--accent)' : 'var(--border)',
        background: timerMode === mode ? 'var(--accent-bg)' : 'var(--surface-2)',
        color: timerMode === mode ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer', textAlign: 'center' as const,
      }}>
        <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{icon}</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</div>
      </button>
    );

    // Quick preset seconds values
    const perQPresets = [15, 30, 45, 60, 90, 120, 180, 300];
    const totalPresets = [300, 600, 900, 1200, 1800, 2700, 3600, 5400];

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'DM Mono', fontSize: '0.8rem' }}>← Home</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.95rem' }}>Practice Mode</span>
          </div>
          <SettingsPanel />
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 520, padding: '2rem' }}>

            {/* Quiz info */}
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Ready to start</p>
              <h1 style={{ fontSize: '1.5rem', lineHeight: 1.2, marginBottom: '0.35rem' }}>{quiz.title}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{quiz.questions.length} questions</p>
            </div>

            {/* Timer mode */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Timer Mode</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {modeBtn('none', 'No Timer', '∞')}
                {modeBtn('per', 'Per Question', '⏱')}
                {modeBtn('total', 'Total Exam', '🕐')}
              </div>
            </div>

            {/* Timer value — only show when a mode is selected */}
            {timerMode !== 'none' && (
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <p style={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                  {timerMode === 'per' ? 'Time per Question' : 'Total Exam Duration'}
                  <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>{formatTimeLabel(timerValue)}</span>
                </p>

                {/* Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  {(timerMode === 'per' ? perQPresets : totalPresets).map(s => (
                    <button key={s} onClick={() => setTimerValue(s)} style={{
                      padding: '0.25rem 0.55rem', borderRadius: 5, border: '1px solid',
                      borderColor: timerValue === s ? 'var(--accent)' : 'var(--border)',
                      background: timerValue === s ? 'var(--accent-bg)' : 'transparent',
                      color: timerValue === s ? 'var(--accent)' : 'var(--text-dim)',
                      fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', cursor: 'pointer',
                    }}>{formatTimeLabel(s)}</button>
                  ))}
                </div>

                {/* Custom input */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Custom:</span>
                  <input
                    type="number" min="5" max="7200"
                    value={Math.floor(timerValue / 60)}
                    onChange={e => setTimerValue(Math.max(5, parseInt(e.target.value)||1) * 60)}
                    className="input" style={{ width: 64, textAlign: 'center', padding: '0.3rem' }}
                  />
                  <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-dim)' }}>min</span>
                  <input
                    type="number" min="0" max="59"
                    value={timerValue % 60}
                    onChange={e => setTimerValue(Math.floor(timerValue / 60) * 60 + Math.min(59, parseInt(e.target.value)||0))}
                    className="input" style={{ width: 64, textAlign: 'center', padding: '0.3rem' }}
                  />
                  <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-dim)' }}>sec</span>
                </div>

                {timerMode === 'total' && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                    ≈ {Math.round(timerValue / quiz.questions.length)}s per question at this pace
                  </p>
                )}
              </div>
            )}

            {/* Options */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <input type="checkbox" checked={randomize} onChange={e => setRandomize(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Shuffle questions</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Randomize question order for each attempt</p>
                </div>
              </label>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>📋 {quiz.questions.length} questions</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>⏱ {timerMode === 'none' ? 'No limit' : timerMode === 'per' ? formatTimeLabel(timerValue)+'/q' : formatTimeLabel(timerValue)+' total'}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>{randomize ? '🔀 Shuffled' : '📑 In order'}</span>
            </div>

            <button className="btn btn-primary" onClick={startQuiz} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.9rem' }}>
              Start Quiz →
            </button>
            <Link href={`/manage/${id}`} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem', display: 'flex' }}>
              Edit Questions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULT SCREEN ────────────────────────────────────────────────
  if (screen === 'result') {
    const score = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    const pct = Math.round((score / questions.length) * 100);
    const bookmarkedQuestions = questions.filter(q => bookmarks.has(q.id));

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.95rem' }}>Results</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={exportCSV}>↓ Export CSV</button>
            <button className="btn btn-ghost" onClick={() => setScreen('setup')}>↺ Restart</button>
            <Link href={`/manage/${id}`} className="btn btn-ghost">Edit</Link>
            <Link href="/" className="btn btn-primary">← Home</Link>
          </div>
        </header>

        <main style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 1.5rem' }}>
          {/* Score card */}
          <div className="card animate-fade-up" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', background: pct >= 70 ? 'rgba(76,175,125,0.05)' : pct >= 40 ? 'var(--accent-bg)' : 'var(--red-bg)', borderColor: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--accent-dim)' : 'var(--red)' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 800, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--red)', lineHeight: 1 }}>{pct}%</div>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              {score} of {questions.length} correct · {formatTime(elapsedTime)} elapsed
            </p>
            <p style={{ marginTop: '0.75rem', fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--text)', fontSize: '1rem' }}>
              {pct === 100 ? 'Perfect score! 🎉' : pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : pct >= 40 ? 'Keep practicing.' : 'Review and try again.'}
            </p>
          </div>

          {/* Question review */}
          <h3 style={{ fontSize: '0.9rem', fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Review</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const correct = userAns === q.correctAnswer;
              return (
                <div key={q.id} className="card animate-fade-up" style={{ padding: '0.875rem 1rem', animationDelay: `${i * 0.03}s`, opacity: 0, borderColor: !userAns ? 'var(--border)' : correct ? 'rgba(76,175,125,0.4)' : 'rgba(224,92,92,0.4)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0, marginTop: 2 }}>Q{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', marginBottom: '0.35rem' }}>{q.text}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {userAns && (
                          <span className="badge" style={{ background: correct ? 'var(--green-bg)' : 'var(--red-bg)', color: correct ? 'var(--green)' : 'var(--red)' }}>
                            Your: {userAns}
                          </span>
                        )}
                        {!correct && (
                          <span className="badge" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                            ✓ {q.correctAnswer}
                          </span>
                        )}
                        {!userAns && <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-dim)' }}>Skipped</span>}
                        {bookmarks.has(q.id) && <span className="badge" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>★ Bookmarked</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ─── QUIZ SCREEN ────────────────────────────────────────────────
  const q = questions[currentIdx];
  if (!q) return null;
  const isRevealed = revealed[q.id];
  const userAnswer = answers[q.id];
  const isBookmarked = bookmarks.has(q.id);
  const answeredCount = Object.keys(answers).length;
  const isTimerWarning = timerOption !== 0 && timeLeft > 0 && timeLeft <= 10;
  const isLastQuestion = currentIdx === questions.length - 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.title}</p>
        </div>

        {/* Timer */}
        {timerOption !== 0 && (
          <div className={`mono ${isTimerWarning ? 'timer-warning' : ''}`} style={{ fontSize: '1rem', fontWeight: 500, color: isTimerWarning ? 'var(--red)' : 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
            {formatTime(timeLeft)}
          </div>
        )}
        {timerOption === 0 && (
          <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-dim)', minWidth: 50, textAlign: 'right' }}>
            {formatTime(elapsedTime)}
          </div>
        )}

        <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} onClick={() => toggleBookmark(q.id)}>
          {isBookmarked ? '★' : '☆'} Bookmark
        </button>
        <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} onClick={finishQuiz}>End</button>
        <SettingsPanel />
      </header>

      {/* Progress */}
      <div className="progress-bar" style={{ height: 2, borderRadius: 0 }}>
        <div className="progress-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, borderRadius: 0 }} />
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 680, margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
        {/* Question counter + nav dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{currentIdx + 1}</span>
            <span style={{ color: 'var(--text-dim)' }}> / {questions.length}</span>
          </div>
          <div style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {answeredCount} answered
          </div>
        </div>

        {/* Mini progress dots */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {questions.map((qItem, i) => (
            <button
              key={qItem.id}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: 20, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer',
                background: i === currentIdx ? 'var(--accent)' : answers[qItem.id] ? 'rgba(76,175,125,0.5)' : bookmarks.has(qItem.id) ? 'rgba(107,159,255,0.5)' : 'var(--surface-3)',
                transition: 'background 0.15s',
              }}
              title={`Q${i + 1}`}
            />
          ))}
        </div>

        {/* Question */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', flex: 1 }}>
          {isBookmarked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'var(--blue)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>★ Bookmarked</span>
            </div>
          )}
          <p style={{ fontSize: '1rem', lineHeight: 1.65, marginBottom: '1.5rem', fontFamily: 'var(--font-body)' }}>{q.text}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(['A','B','C','D'] as const).map(letter => {
              const optText = q[`option${letter}` as keyof Question] as string;
              let btnClass = 'option-btn';
              if (isRevealed) {
                if (letter === q.correctAnswer) btnClass += ' correct';
                else if (letter === userAnswer && userAnswer !== q.correctAnswer) btnClass += ' incorrect';
              } else if (userAnswer === letter) {
                btnClass += ' selected';
              }

              return (
                <button
                  key={letter}
                  className={btnClass}
                  onClick={() => handleAnswer(q.id, letter)}
                  disabled={isRevealed}
                >
                  <span className="option-letter">{letter}</span>
                  <span>{optText}</span>
                  {isRevealed && letter === q.correctAnswer && (
                    <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: '0.8rem' }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {isRevealed && (
            <div className="animate-fade-in" style={{ marginTop: '1rem', padding: '0.75rem', background: userAnswer === q.correctAnswer ? 'var(--green-bg)' : 'var(--red-bg)', borderRadius: 'var(--radius)', border: `1px solid ${userAnswer === q.correctAnswer ? 'rgba(76,175,125,0.3)' : 'rgba(224,92,92,0.3)'}` }}>
              <p style={{ fontSize: '0.85rem', color: userAnswer === q.correctAnswer ? 'var(--green)' : 'var(--red)' }}>
                {userAnswer === q.correctAnswer ? '✓ Correct!' : `✗ The correct answer is ${q.correctAnswer}`}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto' }}>
          <button className="btn btn-ghost" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>← Prev</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isRevealed && (
              <button className="btn btn-ghost" onClick={() => setRevealed(prev => ({ ...prev, [q.id]: true }))}>
                Show Answer
              </button>
            )}
            {isLastQuestion ? (
              <button className="btn btn-primary" onClick={finishQuiz}>Submit Quiz →</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}>
                Next →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
