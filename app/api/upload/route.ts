import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDB, initDB } from '@/lib/db';
import { parsePDFText } from '@/lib/pdfParser';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    await initDB();
    const db = getDB();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = (formData.get('title') as string) || file?.name?.replace('.pdf', '') || 'Untitled Quiz';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF — using pdf-parse v1.1.1 which exports a plain async function
    let pdfText = '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(buffer);
      pdfText = parsed.text;
    } catch (e) {
      console.error('PDF parse error:', e);
      return NextResponse.json({ error: 'Failed to parse PDF. Please ensure it is a valid PDF file.' }, { status: 400 });
    }

    if (!pdfText || pdfText.trim().length < 10) {
      return NextResponse.json({ error: 'PDF appears to be empty or scanned (image-based). Only text-based PDFs are supported.' }, { status: 400 });
    }

    // Extract questions
    const questions = parsePDFText(pdfText);

    // Create quiz in DB
    const quizId = uuidv4();
    await db.execute({
      sql: `INSERT INTO quizzes (id, title, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
      args: [quizId, title],
    });

    // Insert questions
    for (const q of questions) {
      await db.execute({
        sql: `INSERT INTO questions (id, quiz_id, text, option_a, option_b, option_c, option_d, correct_answer, position)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [q.id, quizId, q.text, q.optionA, q.optionB, q.optionC, q.optionD, q.correctAnswer, q.position],
      });
    }

    return NextResponse.json({
      success: true,
      quizId,
      title,
      questionCount: questions.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 });
  }
}
