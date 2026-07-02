/**
 * Unit test for item analysis (no database required).
 * Run: node src/scripts/verifyItemAnalysis.js
 */
import { computeItemAnalysis } from '../utils/itemAnalysis.js';

const students = [
  { studentName: 'A', totalScore: 90, questionResults: [
    { questionNumber: 'Q1', isCorrect: true }, { questionNumber: 'Q2', isCorrect: true },
    { questionNumber: 'Q3', isCorrect: true }, { questionNumber: 'Q4', isCorrect: false },
    { questionNumber: 'Q5', isCorrect: true },
  ], mistakes: [{ questionNumber: 'Q4', conceptMissed: 'Algebra' }] },
  { studentName: 'B', totalScore: 85, questionResults: [
    { questionNumber: 'Q1', isCorrect: true }, { questionNumber: 'Q2', isCorrect: true },
    { questionNumber: 'Q3', isCorrect: false }, { questionNumber: 'Q4', isCorrect: true },
    { questionNumber: 'Q5', isCorrect: true },
  ], mistakes: [{ questionNumber: 'Q3', conceptMissed: 'Geometry' }] },
  { studentName: 'C', totalScore: 70, questionResults: [
    { questionNumber: 'Q1', isCorrect: true }, { questionNumber: 'Q2', isCorrect: false },
    { questionNumber: 'Q3', isCorrect: false }, { questionNumber: 'Q4', isCorrect: true },
    { questionNumber: 'Q5', isCorrect: true },
  ], mistakes: [{ questionNumber: 'Q2', conceptMissed: 'Algebra' }, { questionNumber: 'Q3', conceptMissed: 'Geometry' }] },
  { studentName: 'D', totalScore: 55, questionResults: [
    { questionNumber: 'Q1', isCorrect: true }, { questionNumber: 'Q2', isCorrect: false },
    { questionNumber: 'Q3', isCorrect: false }, { questionNumber: 'Q4', isCorrect: false },
    { questionNumber: 'Q5', isCorrect: true },
  ], mistakes: [{ questionNumber: 'Q2', conceptMissed: 'Algebra' }, { questionNumber: 'Q3', conceptMissed: 'Geometry' }, { questionNumber: 'Q4', conceptMissed: 'Algebra' }] },
  { studentName: 'E', totalScore: 40, questionResults: [
    { questionNumber: 'Q1', isCorrect: false }, { questionNumber: 'Q2', isCorrect: false },
    { questionNumber: 'Q3', isCorrect: false }, { questionNumber: 'Q4', isCorrect: false },
    { questionNumber: 'Q5', isCorrect: true },
  ], mistakes: [{ questionNumber: 'Q1', conceptMissed: 'Basics' }, { questionNumber: 'Q2', conceptMissed: 'Algebra' }, { questionNumber: 'Q3', conceptMissed: 'Geometry' }, { questionNumber: 'Q4', conceptMissed: 'Algebra' }] },
  { studentName: 'F', totalScore: 30, questionResults: [
    { questionNumber: 'Q1', isCorrect: false }, { questionNumber: 'Q2', isCorrect: false },
    { questionNumber: 'Q3', isCorrect: false }, { questionNumber: 'Q4', isCorrect: false },
    { questionNumber: 'Q5', isCorrect: false },
  ], mistakes: [{ questionNumber: 'Q1', conceptMissed: 'Basics' }, { questionNumber: 'Q2', conceptMissed: 'Algebra' }, { questionNumber: 'Q3', conceptMissed: 'Geometry' }, { questionNumber: 'Q4', conceptMissed: 'Algebra' }, { questionNumber: 'Q5', conceptMissed: 'Basics' }] },
  { studentName: 'G', totalScore: 20, questionResults: [
    { questionNumber: 'Q1', isCorrect: false }, { questionNumber: 'Q2', isCorrect: false },
    { questionNumber: 'Q3', isCorrect: false }, { questionNumber: 'Q4', isCorrect: false },
    { questionNumber: 'Q5', isCorrect: false },
  ], mistakes: [{ questionNumber: 'Q1', conceptMissed: 'Basics' }, { questionNumber: 'Q2', conceptMissed: 'Algebra' }, { questionNumber: 'Q3', conceptMissed: 'Geometry' }, { questionNumber: 'Q4', conceptMissed: 'Algebra' }, { questionNumber: 'Q5', conceptMissed: 'Basics' }] },
  { studentName: 'H', totalScore: 15, questionResults: [
    { questionNumber: 'Q1', isCorrect: false }, { questionNumber: 'Q2', isCorrect: false },
    { questionNumber: 'Q3', isCorrect: false }, { questionNumber: 'Q4', isCorrect: false },
    { questionNumber: 'Q5', isCorrect: false },
  ], mistakes: [{ questionNumber: 'Q1', conceptMissed: 'Basics' }, { questionNumber: 'Q2', conceptMissed: 'Algebra' }, { questionNumber: 'Q3', conceptMissed: 'Geometry' }, { questionNumber: 'Q4', conceptMissed: 'Algebra' }, { questionNumber: 'Q5', conceptMissed: 'Basics' }] },
];

const answerKey = [
  { questionNumber: 'Q1', concept: 'Basics', expectedAnswer: '5', points: 20 },
  { questionNumber: 'Q2', concept: 'Algebra', expectedAnswer: 'x=2', points: 20 },
  { questionNumber: 'Q3', concept: 'Geometry', expectedAnswer: '90°', points: 20 },
  { questionNumber: 'Q4', concept: 'Algebra', expectedAnswer: 'x=4', points: 20 },
  { questionNumber: 'Q5', concept: 'Basics', expectedAnswer: '10', points: 20 },
];

const result = computeItemAnalysis(students, answerKey);

if (result.totalStudents !== 8) throw new Error(`Expected 8 students, got ${result.totalStudents}`);
if (result.questions.length !== 5) throw new Error(`Expected 5 questions, got ${result.questions.length}`);
if (result.groupSize !== 2) throw new Error(`Expected group size 2, got ${result.groupSize}`);

const q1 = result.questions.find((q) => q.questionNumber === 'Q1');
if (!q1 || q1.pValuePercent !== 50) {
  throw new Error(`Q1 p-value expected 50%, got ${q1?.pValuePercent}`);
}
if (q1.discriminationIndex <= 0) {
  throw new Error(`Q1 should discriminate positively, got D=${q1.discriminationIndex}`);
}

console.log('✓ Item analysis unit test passed');
console.log('  students:', result.totalStudents);
console.log('  questions:', result.questions.length);
console.log('  Q1 p:', q1.pValuePercent + '%', 'D:', q1.discriminationIndex);
console.log('  insights:', result.insights.length);

result.questions.forEach((q) => {
  console.log(`  ${q.questionNumber}: p=${q.pValuePercent}% D=${q.discriminationIndex} [${q.qualityFlag}]`);
});
