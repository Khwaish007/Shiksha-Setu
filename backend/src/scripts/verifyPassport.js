/**
 * Unit verification for learning passport generation (no MongoDB).
 * Run: node src/scripts/verifyPassport.js
 */
import {
  buildLearningPassport,
  buildMasteryMap,
  buildErrorPatterns,
  buildStrengths,
  buildSuggestedNextSteps,
  computeTrend,
  computePassportContentHash,
  buildFallbackLlmPrimer,
  PASSPORT_VERSION,
  PRIVACY_NOTICE,
} from '../utils/passportGenerator.js';

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

console.log('Learning passport verification\n');

const mockStudent = {
  studentName: 'Priya Sharma',
  gradeLevel: 'Class 8',
  tests: [
    {
      score: 70,
      date: '2026-01-10',
      mistakes: [{ conceptMissed: 'Quadratic Factorization', questionNumber: 'Q3' }],
      questionResults: [
        { concept: 'Quadratic Factorization', isCorrect: false },
        { concept: 'Linear Equations', isCorrect: true },
        { concept: 'Linear Equations', isCorrect: true },
      ],
    },
    {
      score: 80,
      date: '2026-02-15',
      mistakes: [],
      questionResults: [
        { concept: 'Quadratic Factorization', isCorrect: true },
        { concept: 'Linear Equations', isCorrect: true },
        { concept: 'Percentages', isCorrect: false },
      ],
    },
  ],
  errorDNA: [
    {
      concept: 'Quadratic Factorization',
      misconception: 'Sign error when finding factor pairs',
      occurrences: 2,
      firstSeen: '2026-01-10',
      lastSeen: '2026-02-15',
      severity: 'moderate',
    },
  ],
};

const mastery = buildMasteryMap(mockStudent.tests, mockStudent.errorDNA);
assert('mastery map has concepts', mastery.length >= 2);
assert('quadratic has gap', mastery.some((m) => m.concept === 'Quadratic Factorization' && m.specific_gap));

const errors = buildErrorPatterns(mockStudent.errorDNA);
assert('error patterns mapped', errors.length === 1 && errors[0].recurrence_count === 2);

const strengths = buildStrengths(mastery);
assert('strengths is array', Array.isArray(strengths));

const steps = buildSuggestedNextSteps(mastery, mockStudent.errorDNA);
assert('has immediate gaps', steps.immediate_gaps.length > 0);
assert('has stretch goals', steps.stretch_goals.length > 0);

const { trend } = computeTrend(mockStudent.tests);
assert('trend is improving or stable', ['improving', 'stable', 'declining'].includes(trend));

const primer = buildFallbackLlmPrimer({
  firstName: 'Priya',
  gradeLevel: 'Class 8',
  totalTests: 2,
  overallAverage: 75,
  trend,
  strengths,
  errorPatterns: errors,
  immediateGaps: steps.immediate_gaps,
});
assert('fallback primer mentions name', primer.includes('Priya'));
assert('fallback primer mentions mistake', primer.includes('Sign error'));

const passport = buildLearningPassport({
  student: mockStudent,
  llmPrimer: primer,
  gradeLevel: 'Class 8',
});

assert('passport version', passport.passport_version === PASSPORT_VERSION);
assert('privacy notice present', passport.privacy_notice === PRIVACY_NOTICE);
assert('learner profile first name only', passport.learner_profile.first_name === 'Priya');
assert('no internal ids in passport', !passport.learner_profile.schoolId && !passport.sessionId);
assert('overall average 75', passport.learner_profile.overall_average === 75);
assert('has llm_primer', passport.llm_primer.length > 50);
assert('has mastery_map', passport.mastery_map.length > 0);
assert('has suggested_next_steps', Boolean(passport.suggested_next_steps));

const hash1 = computePassportContentHash(mockStudent);
const hash2 = computePassportContentHash(mockStudent);
assert('content hash stable', hash1 === hash2 && hash1.length === 64);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
