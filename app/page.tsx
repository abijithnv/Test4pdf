'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SettingsPanel } from '@/components/SettingsPanel';

interface Quiz {
  id: string;
  title: string;
  createdAt: string;
  questionCount: number;
}

export default function Home() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ success?: boolean; error?: string; quizId?: string; questionCount?: number } | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      const r = await fetch('/api/quizzes');
      const data = await r.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch { setQuizzes([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadResult({ error: 'Please upload a PDF file.' });
      return;
    }
    setSelectedFile(file);
    setCustomTitle(file.name.replace('.pdf', '').replace(/[-_]/g, ' '));
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(10);
    setUploadResult(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', customTitle || selectedFile.name.replace('.pdf', ''));
    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 12, 85)), 400);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      clearInterval(interval);
      setUploadProgress(100);
      setUploadResult(data);
      if (data.success) { fetchQuizzes(); setTimeout(() => { setSelectedFile(null); setUploadProgress(0); }, 1500); }
    } catch { clearInterval(interval); setUploadResult({ error: 'Network error. Please try again.' }); }
    finally { setUploading(false); }
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz?')) return;
    await fetch(`/api/quiz/${id}`, { method: 'DELETE' });
    fetchQuizzes();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 800, fontSize: '0.9rem', color: '#0d0d0f' }}>Q</div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Test4pdf</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>Dashboard →</Link>
          <SettingsPanel />
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-block', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem', padding: '0.25rem 0.75rem', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 20 }}>PDF → Interactive Quiz</div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', marginBottom: '0.75rem', lineHeight: 1.1 }}>
            Turn any PDF into<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>a practice test</em>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 480, margin: '0 auto' }}>
            Upload a PDF with multiple-choice questions. We extract them automatically and serve them as a timed interactive quiz.
          </p>
        </div>

        <div className="animate-fade-up stagger-1 card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div
            onDragEnter={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : selectedFile ? 'var(--green)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-lg)', padding: '2.5rem', textAlign: 'center',
              cursor: selectedFile ? 'default' : 'pointer', transition: 'all 0.2s',
              background: dragging ? 'var(--accent-bg)' : selectedFile ? 'var(--green-bg)' : 'var(--surface-2)',
            }}
          >
            {selectedFile ? (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                <p style={{ fontFamily: 'DM Mono', fontSize: '0.85rem', color: 'var(--text)' }}>{selectedFile.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
                <p style={{ color: 'var(--text)', fontWeight: 500, marginBottom: '0.25rem' }}>Drop PDF here or click to browse</p>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Text-based PDFs only · MCQ format</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {selectedFile && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quiz Title</label>
                <input className="input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Enter quiz title..." />
              </div>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading} style={{ height: 38 }}>
                {uploading ? '⏳ Processing...' : '→ Extract & Create'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setSelectedFile(null); setUploadResult(null); }} style={{ height: 38 }}>Clear</button>
            </div>
          )}

          {uploading && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Parsing PDF…</span>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--accent)' }}>{uploadProgress}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          )}

          {uploadResult && (
            <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius)', background: uploadResult.success ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${uploadResult.success ? 'var(--green)' : 'var(--red)'}` }}>
              {uploadResult.success ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--green)', fontSize: '0.875rem' }}>✓ Extracted <strong>{uploadResult.questionCount}</strong> questions</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/manage/${uploadResult.quizId}`} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>Edit Questions</Link>
                    <Link href={`/practice/${uploadResult.quizId}`} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>Start Practice →</Link>
                  </div>
                </div>
              ) : (
                <span style={{ color: 'var(--red)', fontSize: '0.875rem' }}>✗ {uploadResult.error}</span>
              )}
            </div>
          )}
        </div>

        <div className="animate-fade-up stagger-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Your Quizzes
              {quizzes.length > 0 && <span style={{ fontFamily: 'DM Mono', fontSize: '0.75rem', marginLeft: '0.5rem', color: 'var(--text-dim)' }}>({quizzes.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              <p style={{ fontSize: '0.9rem' }}>No quizzes yet. Upload a PDF to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quizzes.map((quiz, i) => (
                <div key={quiz.id} className="card animate-fade-up" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', animationDelay: `${i * 0.04}s`, opacity: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.title}</p>
                    <p style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {quiz.questionCount} questions · {new Date(quiz.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <Link href={`/manage/${quiz.id}`} className="btn btn-ghost" style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}>Edit</Link>
                    <Link href={`/practice/${quiz.id}`} className="btn btn-primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}>Practice →</Link>
                    <button className="btn btn-danger" onClick={() => deleteQuiz(quiz.id)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
