# Test4pdf — PDF to Interactive Quiz

A full-stack Next.js application that converts PDF files with multiple-choice questions into interactive practice tests.

## Features

- **PDF Upload & Parsing**: Drag-and-drop PDF upload with automatic MCQ extraction
- **Auto Answer Detection**: Detects correct answers from patterns like "Answer: B", "(Correct)", "[B]", `**B**`
- **Quiz Manager**: Edit all questions, options, and correct answers inline
- **Practice Mode**: Interactive quiz with immediate feedback
- **Timer Options**: Per-question timers OR total quiz timers
- **Bookmarking**: Bookmark questions for later review
- **Randomization**: Shuffle question order
- **Progress Tracking**: Visual progress bar and mini dot navigation
- **Results & Review**: Detailed score breakdown with per-question review
- **CSV Export**: Export results to spreadsheet
- **Dashboard**: Statistics with score history sparklines per quiz

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: LibSQL (SQLite) via `@libsql/client`
- **PDF Parsing**: `pdf-parse`
- **Styling**: Tailwind CSS + custom CSS variables (dark academic theme)
- **Fonts**: Syne + Lora + DM Mono (Google Fonts)

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## PDF Format Support

The parser handles these answer patterns:
- `Answer: B` / `Ans: B` / `Correct Answer: B`
- `(B) correct` / `B) ✓`
- `[B]`
- `**B**`

Question numbering: `1.` `1)` `Q1.` `Q1:` `Question 1`

Options: `A.` `A)` `(A)` `[A]`

## Database

SQLite file at `./quiz.db` (auto-created on first run).

Models: `quizzes`, `questions`, `quiz_attempts`
