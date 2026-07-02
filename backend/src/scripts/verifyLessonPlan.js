/**
 * Unit verification for lesson plan generation (no API key).
 * Run: node src/scripts/verifyLessonPlan.js
 */
import { buildFallbackLessonPlan } from '../utils/lessonPlanGenerator.js';

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

console.log('Lesson plan verification\n');

const plan = buildFallbackLessonPlan({
  concept: 'Quadratic Factorization',
  misconception: 'Sign error when finding factor pairs',
  studentsAffectedCount: 8,
  occurrences: 12,
});

assert('has title', Boolean(plan.title));
assert('duration is 15 min', plan.durationMinutes === 15);
assert('has hook', plan.hook.length > 20);
assert('has 2 worked examples', plan.workedExamples.length === 2);
assert('examples have teacher talk', plan.workedExamples.every((e) => e.teacherTalk));
assert('board plan has 4 steps', plan.boardPlan.length === 4);
assert('board plan times sum to ~15', plan.boardPlan.reduce((s, b) => s + b.durationMinutes, 0) === 15);
assert('has exit ticket', Boolean(plan.exitTicket?.question));
assert('mentions misconception', plan.hook.includes('Sign error') || plan.misconception.includes('Sign error'));
assert('source is fallback', plan.source === 'fallback');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
