import { NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await initDB();
    const db = getDB();
    
    const result = await db.execute(`
      SELECT q.id, q.title, q.created_at, q.updated_at,
             COUNT(qst.id) as question_count
      FROM quizzes q
      LEFT JOIN questions qst ON qst.quiz_id = q.id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `);

    const quizzes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      questionCount: row.question_count,
    }));

    return NextResponse.json(quizzes);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
