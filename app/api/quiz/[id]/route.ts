import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const db = getDB();
    const { id } = await params;

    const quizResult = await db.execute({
      sql: 'SELECT * FROM quizzes WHERE id = ?',
      args: [id],
    });

    if (quizResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const questionsResult = await db.execute({
      sql: 'SELECT * FROM questions WHERE quiz_id = ? ORDER BY position',
      args: [id],
    });

    const quiz = quizResult.rows[0];
    const questions = questionsResult.rows.map(q => ({
      id: q.id,
      text: q.text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctAnswer: q.correct_answer,
      position: q.position,
    }));

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
      questions,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const db = getDB();
    const { id } = await params;
    const body = await req.json();

    if (body.title) {
      await db.execute({
        sql: `UPDATE quizzes SET title = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [body.title, id],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const db = getDB();
    const { id } = await params;

    await db.execute({ sql: 'DELETE FROM questions WHERE quiz_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM quiz_attempts WHERE quiz_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM quizzes WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
