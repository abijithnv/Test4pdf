import { v4 as uuidv4 } from 'uuid';

export interface ParsedQuestion {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  position: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function stripPageNumbers(text: string): string {
  return text
    .replace(/\n[ \t]*\d{1,3}[ \t]*\n[ \t]*\n/g, '\n')
    .replace(/\n[ \t]*\d{1,3}[ \t]*\n/g, '\n');
}

function fixAnswerCollisions(text: string): string {
  return text.replace(/(Answer\s*:\s*[^\n]+?)\s+(\d+\s*:\s+\S)/g, '$1\n\n$2');
}

function normaliseQuestionNumbers(text: string): string {
  return text.replace(/^(\d+)\.\s+([A-Z"&_\(])/gm, (_, n, c) => `${n}: ${c}`);
}

/**
 * Fix merged option lines. Three patterns found in PDFs:
 *  1. "C. IDS)D. Firewall"            → "C. IDS)\nD. Firewall"
 *  2. "standards B. Select..."        → "standards\nB. Select..."
 *  3. "SolutionsD. Vulnerability..."  → "Solutions\nD. Vulnerability..."
 *
 * Rule: insert a newline before any [A-D]. that appears mid-line
 * (not at start of line) and is followed by a capital letter.
 */
function splitMergedOptions(line: string): string {
  // Insert newline before "X. " where X is A-D appearing mid-line
  return line.replace(/([^\n])([A-D]\.\s+[A-Z])/g, (_, before, match) => {
    return before.trimEnd() + '\n' + match;
  });
}

/**
 * Apply splitMergedOptions to every line of a text block.
 */
function fixMergedOptionsInText(text: string): string {
  return text.split('\n').map(splitMergedOptions).join('\n');
}

// ─── FORMAT DETECTION ─────────────────────────────────────────────────────────

type Format = 'table' | 'inline-colon' | 'inline-dot' | 'qprefix';

function detectFormat(text: string): Format {
  const bareLetters  = (text.match(/\n[A-D] *\n/g) || []).length;
  const bareNumbers  = (text.match(/\n\d{1,3} *\n/g) || []).length;
  const answerLines  = (text.match(/\nAnswer\s*:/gi) || []).length;
  const colonQs      = (text.match(/\n\d+\s*:\s+[A-Z]/g) || []).length;
  const qPrefix      = (text.match(/\n[Qq](?:uestion\s*)?\d+[\.\)]/g) || []).length;

  // Table format: many bare letter lines AND many bare number lines,
  // and far more bare letters than answer-keyword lines
  if (bareLetters >= 5 && bareNumbers >= 5 && bareLetters >= answerLines * 2) {
    return 'table';
  }
  if (qPrefix > 5) return 'qprefix';
  if (colonQs > answerLines) return 'inline-colon';
  return 'inline-dot';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT A — Table style parser
// Handles: CSA PDF, temp_41-60 PDF
// Structure: bare_number / question_lines / option_lines / bare_answer_letter
// ═══════════════════════════════════════════════════════════════════════════════

function parseTableFormat(rawText: string): ParsedQuestion[] {
  // Step 1: fix merged options on each line before splitting
  const text = fixMergedOptionsInText(rawText);
  const lines = text.split('\n').map(l => l.trimEnd());
  const questions: ParsedQuestion[] = [];

  const isBareNumber = (l: string) => /^\d{1,3}\s*$/.test(l.trim()) && l.trim().length > 0;
  const isBareAnswer = (l: string) => /^[A-D]\s*$/.test(l.trim());
  const isHeader     = (l: string) => /SL No|Questions|Options|Correct Answer/i.test(l);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || isHeader(line)) { i++; continue; }
    if (!isBareNumber(line))     { i++; continue; }

    const qNum = parseInt(line, 10);
    i++;

    const blockLines: string[] = [];
    let answerLetter = 'A';

    while (i < lines.length) {
      const cur = lines[i].trim();

      if (isBareAnswer(cur)) {
        answerLetter = cur.trim();
        i++;
        break;
      }
      // Stop at next question number
      if (isBareNumber(cur) && Math.abs(parseInt(cur, 10) - qNum) <= 5) break;

      blockLines.push(lines[i]);
      i++;
    }

    // Parse options and question text from collected block
    const optionMap: Record<string, string> = {};
    const questionLines: string[] = [];

    let j = 0;
    while (j < blockLines.length) {
      const bl = blockLines[j].trim();
      if (!bl || isHeader(bl)) { j++; continue; }

      const optMatch = bl.match(/^([A-D])\.\s+(.*)/);
      if (optMatch) {
        const letter = optMatch[1];
        let optText = optMatch[2];

        // Absorb continuation lines (not a new option, not a bare answer/number)
        while (
          j + 1 < blockLines.length &&
          blockLines[j + 1].trim() &&
          !blockLines[j + 1].trim().match(/^[A-D]\.\s+/) &&
          !isBareNumber(blockLines[j + 1].trim()) &&
          !isBareAnswer(blockLines[j + 1].trim())
        ) {
          j++;
          optText += ' ' + blockLines[j].trim();
        }
        if (!optionMap[letter]) {
          optionMap[letter] = clean(decodeEntities(optText));
        }
      } else {
        questionLines.push(bl);
      }
      j++;
    }

    if (!optionMap['A'] || !optionMap['B']) continue;

    let questionText = questionLines.join(' ');
    questionText = decodeEntities(questionText);
    questionText = clean(questionText);
    if (questionText.length < 5) continue;

    questions.push({
      id: uuidv4(),
      text: questionText,
      optionA: optionMap['A'],
      optionB: optionMap['B'],
      optionC: optionMap['C'] || 'N/A',
      optionD: optionMap['D'] || 'N/A',
      correctAnswer: answerLetter,
      position: questions.length,
    });
  }

  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANSWER DETECTION — for answer-line formats
// ═══════════════════════════════════════════════════════════════════════════════

function detectAnswerLetter(block: string, optionMap: Record<string, string>): string {
  const answerLine = block.split('\n')
    .find(l => /(?:Answer|Correct Answer|Ans|Correct)\s*:/i.test(l)) ?? '';
  const afterColon = answerLine.replace(/^.*?(?:Answer|Correct Answer|Ans|Correct)\s*:\s*/i, '').trim();

  const letterM = afterColon.match(/^([A-D])[\.\)]{1,2}\s*\S/i)
               ?? afterColon.match(/^([A-D])$/i);
  if (letterM) return letterM[1].toUpperCase();

  if (/^true\b/i.test(afterColon)) return 'A';
  if (/^false\b/i.test(afterColon)) return 'B';
  if (!afterColon) return 'A';

  const norm = (s: string) =>
    decodeEntities(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const ansNorm = norm(afterColon);

  for (const [letter, opt] of Object.entries(optionMap)) {
    if (norm(opt) === ansNorm) return letter;
  }
  for (const [letter, opt] of Object.entries(optionMap)) {
    const o = norm(opt);
    if (ansNorm.startsWith(o) || o.startsWith(ansNorm)) return letter;
  }

  const ansWords = new Set(ansNorm.split(' ').filter(w => w.length > 2));
  let best = 'A', bestScore = -1;
  for (const [letter, opt] of Object.entries(optionMap)) {
    const optWords = new Set(norm(opt).split(' ').filter(w => w.length > 2));
    let m = 0;
    for (const w of ansWords) { if (optWords.has(w)) m++; }
    const score = ansWords.size > 0 ? m / ansWords.size : 0;
    if (score > bestScore) { bestScore = score; best = letter; }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION LINE PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parseOptionLine(raw: string): { letter: string; text: string } | null {
  const line = raw.replace(/^[\s]*[¢©]\s*\)/, 'c)').replace(/^[\s]*ë\s*\)/, 'e)');
  const m = line.match(/^([A-Ea-e])[\.\)]\s+(.*)/);
  if (!m) return null;
  const text = clean(decodeEntities(m[2]));
  return text ? { letter: m[1].toUpperCase(), text } : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT B/C/D PARSER — Answer-line style
// ═══════════════════════════════════════════════════════════════════════════════

function parseAnswerLineFormat(text: string, splitPattern: RegExp): ParsedQuestion[] {
  const processed = fixMergedOptionsInText(text);
  const blocks = processed.split(splitPattern).map(b => b.trim()).filter(b => b.length > 20);
  const questions: ParsedQuestion[] = [];

  for (const block of blocks) {
    if (!/^[A-Ea-e][\.\)]\s/m.test(block)) continue;

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const optionMap: Record<string, string> = {};
    const questionLines: string[] = [];

    let j = 0;
    while (j < lines.length) {
      const line = lines[j];
      if (/^(?:Answer|Correct Answer|Ans|Correct)\s*:/i.test(line)) { j++; continue; }
      if (/^(?:Module|MODULE|DOMAIN|Section)\s*[-–]?\s*\d*/i.test(line)) { j++; continue; }

      const opt = parseOptionLine(line);
      if (opt) {
        if (!optionMap[opt.letter]) {
          let optText = opt.text;
          while (
            j + 1 < lines.length && lines[j + 1] &&
            !/^[A-Ea-e][\.\)]\s/.test(lines[j + 1]) &&
            !/^(?:Answer|Correct)\s*:/i.test(lines[j + 1])
          ) {
            j++;
            optText += ' ' + lines[j];
          }
          optionMap[opt.letter] = clean(decodeEntities(optText));
        }
      } else {
        questionLines.push(line);
      }
      j++;
    }

    if (!optionMap['A'] || !optionMap['B']) continue;

    const rawAnswer = detectAnswerLetter(block, optionMap);
    let correctAnswer = rawAnswer;
    if (optionMap['E']) {
      if (rawAnswer === 'E') { optionMap['D'] = optionMap['E']; correctAnswer = 'D'; }
      delete optionMap['E'];
    }

    let questionText = questionLines.join(' ');
    questionText = decodeEntities(questionText);
    questionText = questionText.replace(/^\s*(?:[Qq](?:uestion\s*)?)?\d+[\.\):\s]+/, '');
    questionText = clean(questionText);
    if (questionText.length < 4) continue;

    questions.push({
      id: uuidv4(),
      text: questionText,
      optionA: optionMap['A'],
      optionB: optionMap['B'],
      optionC: optionMap['C'] || 'N/A',
      optionD: optionMap['D'] || 'N/A',
      correctAnswer,
      position: questions.length,
    });
  }

  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

export function parsePDFText(rawText: string): ParsedQuestion[] {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect format BEFORE stripping page numbers
  const format = detectFormat(text);

  if (format === 'table') {
    return parseTableFormat(text);
  }

  let processed = stripPageNumbers(text);
  processed = normaliseQuestionNumbers(processed);
  processed = fixAnswerCollisions(processed);

  const colonCount = (processed.match(/\n\s*\d+\s*:\s+\S/g) || []).length;
  const qCount     = (processed.match(/\n\s*[Qq](?:uestion\s*)?\d+[\.\)]/g) || []).length;

  const splitPattern = qCount > colonCount / 2
    ? /\n(?=\s*[Qq](?:uestion\s*)?\d+[\.\)])/g
    : /\n(?=\s*\d+\s*:\s+\S)/g;

  return parseAnswerLineFormat(processed, splitPattern);
}
