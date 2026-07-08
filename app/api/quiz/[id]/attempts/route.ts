import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDB, initDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const db = getDB();
    const { id: quizId } = await params;

    const result = await db.execute({
      sql: 'SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY created_at DESC',
      args: [quizId],
    });

    return NextResponse.json(result.rows.map(r => ({
      id: r.id,
      quizId: r.quiz_id,
      score: r.score,
      total: r.total,
      timeTaken: r.time_taken,
      answers: JSON.parse(r.answers as string || '{}'),
      bookmarks: JSON.parse(r.bookmarks as string || '[]'),
      completed: r.completed === 1,
      createdAt: r.created_at,
    })));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const db = getDB();
    const { id: quizId } = await params;
    const body = await req.json();

    const attemptId = uuidv4();
    await db.execute({
      sql: `INSERT INTO quiz_attempts (id, quiz_id, score, total, time_taken, answers, bookmarks, completed, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        attemptId,
        quizId,
        body.score ?? 0,
        body.total ?? 0,
        body.timeTaken ?? 0,
        JSON.stringify(body.answers ?? {}),
        JSON.stringify(body.bookmarks ?? []),
        body.completed ? 1 : 0,
      ],
    });

    return NextResponse.json({ success: true, id: attemptId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
