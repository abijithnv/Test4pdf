'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useRouter } from 'next/navigation';

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

export default function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    const r = await fetch(`/api/quiz/${id}`);
    const data = await r.json();
    setQuiz(data);
    setEditTitle(data.title || '');
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const updateQuestion = (qId: string, field: keyof Question, value: string) => {
    if (!quiz) return;
    setQuiz({
      ...quiz,
      questions: quiz.questions.map(q => q.id === qId ? { ...q, [field]: value } : q),
    });
    setSaved(false);
  };

  const saveAll = async () => {
    if (!quiz) return;
    setSaving(true);
    await fetch(`/api/quiz/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle }) });
    await fetch(`/api/quiz/${id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: quiz.questions }),
    });
    setSaving(false);
    setSaved(true);
    setQuiz({ ...quiz, title: editTitle });
    setTimeout(() => setSaved(false), 2000);
  };

  const addQuestion = async () => {
    const r = await fetch(`/api/quiz/${id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'New question?', optionA: 'Option A', optionB: 'Option B', optionC: 'Option C', optionD: 'Option D', correctAnswer: 'A' }),
    });
    const data = await r.json();
    await fetchQuiz();
    setExpandedId(data.id);
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/quiz/${id}/questions?questionId=${qId}`, { method: 'DELETE' });
    setQuiz(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.id !== qId) } : null);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'DM Mono', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Loading…</div>
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'DM Mono', fontSize: '0.8rem' }}>← Home</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.95rem' }}>Edit Quiz</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {saved && <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--green)' }}>✓ Saved</span>}
          <button className="btn btn-ghost" onClick={saveAll} disabled={saving}>{saving ? 'Saving…' : '↑ Save Changes'}</button>
          <Link href={`/practice/${id}`} className="btn btn-primary">Preview Quiz →</Link>
          <SettingsPanel />
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Title edit */}
        <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quiz Title</label>
          <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ fontSize: '1rem', fontFamily: 'Syne', fontWeight: 600 }} />
        </div>

        {/* Stats bar */}
        <div className="animate-fade-up stagger-1" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div><span style={{ fontFamily: 'DM Mono', fontSize: '1.1rem', fontWeight: 500, color: 'var(--accent)' }}>{quiz.questions.length}</span><span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginLeft: '0.35rem' }}>questions</span></div>
          {(['A','B','C','D'] as const).map(letter => {
            const count = quiz.questions.filter(q => q.correctAnswer === letter).length;
            return count > 0 ? (
              <div key={letter}><span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{letter}</span><span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginLeft: '0.35rem' }}>{count}</span></div>
            ) : null;
          })}
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="card animate-fade-up" style={{ animationDelay: `${index * 0.03}s`, opacity: 0 }}>
              {/* Question header */}
              <div
                style={{ padding: '0.875rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-dim)', flexShrink: 0, marginTop: 2 }}>Q{index + 1}</span>
                <p style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>{q.text}</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                  <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(245,166,35,0.3)' }}>✓ {q.correctAnswer}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{expandedId === q.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded editor */}
              {expandedId === q.id && (
                <div style={{ padding: '0 1.1rem 1rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ paddingTop: '0.875rem', marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Question Text</label>
                    <textarea
                      className="input"
                      value={q.text}
                      onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                      rows={2}
                      style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {(['A', 'B', 'C', 'D'] as const).map(letter => (
                      <div key={letter}>
                        <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Option {letter}</label>
                        <input className="input" value={q[`option${letter}` as keyof Question] as string} onChange={e => updateQuestion(q.id, `option${letter}` as keyof Question, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Correct:</label>
                      {(['A','B','C','D'] as const).map(letter => (
                        <button
                          key={letter}
                          onClick={() => updateQuestion(q.id, 'correctAnswer', letter)}
                          style={{
                            width: 32, height: 32, borderRadius: 6, border: '1px solid',
                            borderColor: q.correctAnswer === letter ? 'var(--accent)' : 'var(--border)',
                            background: q.correctAnswer === letter ? 'var(--accent)' : 'var(--surface-3)',
                            color: q.correctAnswer === letter ? '#0d0d0f' : 'var(--text-muted)',
                            fontFamily: 'DM Mono', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >{letter}</button>
                      ))}
                    </div>
                    <button className="btn btn-danger" onClick={() => deleteQuestion(q.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={addQuestion}>+ Add Question</button>
          <button className="btn btn-primary" onClick={saveAll} disabled={saving}>{saving ? 'Saving…' : '↑ Save All Changes'}</button>
        </div>
      </main>
    </div>
  );
}
