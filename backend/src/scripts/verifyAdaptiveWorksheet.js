/**
 * Unit verification for adaptive worksheet generation (no MongoDB / API key).
 * Run: node src/scripts/verifyAdaptiveWorksheet.js
 */
import {
  buildStudentWorksheetContext,
  generateAdaptiveQuestions,
} from '../utils/adaptiveWorksheetGenerator.js';
import { renderWorksheetPdf } from '../utils/worksheetPdfRenderer.js';

let passed = 0;
let failed = 0;

const assert = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
};

console.log('Adaptive worksheet verification\n');

const mockStudent = {
  _id: 'mock-student-id',
  studentName: 'Priya Sharma',
  averageScore: 52,
  errorDNA: [
    {
      concept: 'Quadratic Factorization',
      misconception: 'Sign error when finding factor pairs',
      occurrences: 4,
      severity: 'major',
    },
    {
      concept: 'Linear Equations',
      misconception: 'Forgets to apply operation to both sides',
      occurrences: 2,
      severity: 'minor',
    },
  ],
  tests: [
    {
      date: '2026-02-01',
      score: 45,
      mistakes: [
        { questionNumber: 3, conceptMissed: 'Quadratic Factorization' },
        { questionNumber: 7, conceptMissed: 'Quadratic Factorization' },
      ],
      questionResults: [
        { concept: 'Quadratic Factorization', isCorrect: false, questionNumber: 3 },
        { concept: 'Quadratic Factorization', isCorrect: false, questionNumber: 7 },
      ],
    },
  ],
};

const context = buildStudentWorksheetContext(mockStudent, {});
assert('context picks student name', context.studentName === 'Priya Sharma');
assert('context targets weak concept', context.concept === 'Quadratic Factorization');
assert('context includes misconceptions', context.misconceptions.length >= 1);

const generated = await generateAdaptiveQuestions(context);
assert('fallback generates questions', generated.questions.length >= 6);
assert('questions have prompts and answers', generated.questions.every((q) => q.prompt && q.answer));
assert('source is fallback without API key', generated.source === 'fallback');

const pdfBuffer = await renderWorksheetPdf({
  studentName: context.studentName,
  concept: generated.concept,
  questions: generated.questions,
  misconceptions: context.misconceptions,
});

assert('PDF buffer is non-empty', pdfBuffer.length > 500);
assert('PDF starts with magic bytes', pdfBuffer.slice(0, 4).toString() === '%PDF');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
