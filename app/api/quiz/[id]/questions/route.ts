import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDB, initDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const db = getDB();
    const { id: quizId } = await params;
    const body = await req.json();

    // Handle bulk update
    if (body.questions && Array.isArray(body.questions)) {
      for (const q of body.questions) {
        if (q.id) {
          await db.execute({
            sql: `UPDATE questions SET text=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_answer=?, position=?
                  WHERE id=? AND quiz_id=?`,
            args: [q.text, q.optionA, q.optionB, q.optionC, q.optionD, q.correctAnswer, q.position ?? 0, q.id, quizId],
          });
        }
      }
      // Update quiz updated_at
      await db.execute({
        sql: `UPDATE quizzes SET updated_at = datetime('now') WHERE id = ?`,
        args: [quizId],
      });
      return NextResponse.json({ success: true });
    }

    // Single question add
    const qId = uuidv4();
    const maxPosResult = await db.execute({
      sql: 'SELECT MAX(position) as maxPos FROM questions WHERE quiz_id = ?',
      args: [quizId],
    });
    const maxPos = (maxPosResult.rows[0]?.maxPos as number) ?? -1;

    await db.execute({
      sql: `INSERT INTO questions (id, quiz_id, text, option_a, option_b, option_c, option_d, correct_answer, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [qId, quizId, body.text || 'New Question', body.optionA || 'Option A', body.optionB || 'Option B',
             body.optionC || 'Option C', body.optionD || 'Option D', body.correctAnswer || 'A', maxPos + 1],
    });

    return NextResponse.json({ success: true, id: qId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const db = getDB();
    const { id: quizId } = await params;
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'questionId required' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM questions WHERE id = ? AND quiz_id = ?',
      args: [questionId, quizId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
