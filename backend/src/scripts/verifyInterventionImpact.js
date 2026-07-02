/**
 * Unit verification for closed-loop intervention impact math.
 * Run: node src/scripts/verifyInterventionImpact.js
 */
import {
  computeClassConceptMetrics,
  computeStudentConceptMetrics,
  computeImpactDelta,
  summarizeImpacts,
  enrichInterventionWithImpact,
} from '../utils/interventionImpact.js';

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

console.log('Intervention impact verification\n');

// Class metrics: 2 of 4 students struggle with quadratics
const classRecords = [
  {
    studentName: 'A',
    mistakes: [{ conceptMissed: 'Quadratic factorization', questionNumber: 1 }],
    questionResults: [{ concept: 'Quadratic factorization', isCorrect: false, questionNumber: 1 }],
  },
  {
    studentName: 'B',
    mistakes: [],
    questionResults: [{ concept: 'Quadratic factorization', isCorrect: true, questionNumber: 1 }],
  },
  {
    studentName: 'C',
    mistakes: [{ conceptMissed: 'Quadratic factorization', questionNumber: 2 }],
    questionResults: [{ concept: 'Quadratic factorization', isCorrect: false, questionNumber: 2 }],
  },
  {
    studentName: 'D',
    mistakes: [],
    questionResults: [{ concept: 'Linear equations', isCorrect: true, questionNumber: 3 }],
  },
];

const baseline = computeClassConceptMetrics(classRecords, 'Quadratic factorization');
assert('baseline class affected = 50%', baseline.classAffectedPct === 50);
assert('baseline students affected = 2', baseline.studentsAffected === 2);

const improvedRecords = [
  {
    studentName: 'A',
    mistakes: [],
    questionResults: [{ concept: 'Quadratic factorization', isCorrect: true, questionNumber: 1 }],
  },
  {
    studentName: 'B',
    mistakes: [],
    questionResults: [{ concept: 'Quadratic factorization', isCorrect: true, questionNumber: 1 }],
  },
  {
    studentName: 'C',
    mistakes: [{ conceptMissed: 'Quadratic factorization', questionNumber: 2 }],
    questionResults: [{ concept: 'Quadratic factorization', isCorrect: false, questionNumber: 2 }],
  },
  {
    studentName: 'D',
    mistakes: [],
    questionResults: [{ concept: 'Linear equations', isCorrect: true, questionNumber: 3 }],
  },
];

const followUp = computeClassConceptMetrics(improvedRecords, 'Quadratic factorization');
assert('follow-up class affected = 25%', followUp.classAffectedPct === 25);

const delta = computeImpactDelta('Quadratic factorization', baseline, followUp);
assert('status is improved', delta.status === 'improved');
assert('relative drop = 50%', delta.relativeDrop === 50);
assert('delta label mentions drop', delta.deltaLabel.includes('dropped 50%'));

const awaiting = computeImpactDelta('Algebra', baseline, null);
assert('awaiting when no follow-up', awaiting.status === 'awaiting_followup');

// Student metrics
const tests = [
  {
    date: '2026-01-01',
    mistakes: [{ conceptMissed: 'Fractions' }],
    questionResults: [{ concept: 'Fractions', isCorrect: false }],
  },
  {
    date: '2026-01-15',
    mistakes: [],
    questionResults: [{ concept: 'Fractions', isCorrect: true }],
  },
];

const studentBefore = computeStudentConceptMetrics([tests[0]], 'Fractions');
assert('student baseline 100% affected', studentBefore.classAffectedPct === 100);

const studentAfter = computeStudentConceptMetrics(tests, 'Fractions');
assert('student follow-up 50% affected', studentAfter.classAffectedPct === 50);

const mockLog = {
  _id: 'mock-id',
  concept: 'Quadratic factorization',
  scope: 'class',
  completedAt: new Date('2026-02-01'),
  baseline,
  actionDescription: 'Mini-lesson on factoring',
  source: 'reteach_summary',
  sessionId: 'sess-1',
};

const enriched = enrichInterventionWithImpact({
  log: mockLog,
  followUpSubmissions: improvedRecords,
  followUpTests: [],
});

assert('enriched has improved status', enriched.impact.status === 'improved');
assert('enriched id preserved', enriched.id === 'mock-id');

const summary = summarizeImpacts([enriched]);
assert('summary counts improved', summary.improvedCount === 1);
assert('summary headline mentions improvement', summary.headline.includes('improvement'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
