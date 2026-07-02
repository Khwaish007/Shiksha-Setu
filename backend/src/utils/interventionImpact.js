import { conceptsMatch, normalizeConcept } from './interventionUtils.js';

/**
 * Compute class-level concept struggle metrics from submission-like records.
 */
export const computeClassConceptMetrics = (records = [], concept) => {
  if (!records.length || !concept) {
    return {
      classAffectedPct: 0,
      conceptErrorRate: 0,
      studentsAffected: 0,
      totalStudents: 0,
      questionAttempts: 0,
    };
  }

  let studentsAffected = 0;
  let questionAttempts = 0;
  let questionWrong = 0;

  records.forEach((record) => {
    const mistakes = record.mistakes || [];
    const questionResults = record.questionResults || [];
    const hasMistakeOnConcept = mistakes.some((m) => conceptsMatch(m.conceptMissed, concept));

    const conceptResults = questionResults.filter(
      (qr) => conceptsMatch(qr.concept, concept)
        || (qr.questionNumber && mistakes.some(
          (m) => m.questionNumber === qr.questionNumber && conceptsMatch(m.conceptMissed, concept)
        ))
    );

    if (conceptResults.length > 0) {
      conceptResults.forEach((qr) => {
        questionAttempts += 1;
        if (!qr.isCorrect) questionWrong += 1;
      });
      if (conceptResults.some((qr) => !qr.isCorrect)) {
        studentsAffected += 1;
      }
    } else if (hasMistakeOnConcept) {
      studentsAffected += 1;
      questionAttempts += 1;
      questionWrong += 1;
    }
  });

  const totalStudents = records.length;
  const classAffectedPct = Math.round((studentsAffected / totalStudents) * 100);
  const conceptErrorRate = questionAttempts > 0
    ? Math.round((questionWrong / questionAttempts) * 1000) / 1000
    : Math.round((studentsAffected / totalStudents) * 1000) / 1000;

  return {
    classAffectedPct,
    conceptErrorRate,
    studentsAffected,
    totalStudents,
    questionAttempts,
  };
};

/**
 * Compute concept error rate from a student's test history.
 */
export const computeStudentConceptMetrics = (tests = [], concept) => {
  const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
  let attempts = 0;
  let wrong = 0;
  let testsWithError = 0;

  sorted.forEach((test) => {
    const results = (test.questionResults || []).filter((qr) => conceptsMatch(qr.concept, concept));
    const mistakeOnConcept = (test.mistakes || []).some((m) => conceptsMatch(m.conceptMissed, concept));

    if (results.length > 0) {
      let testHadError = false;
      results.forEach((qr) => {
        attempts += 1;
        if (!qr.isCorrect) {
          wrong += 1;
          testHadError = true;
        }
      });
      if (testHadError) testsWithError += 1;
    } else if (mistakeOnConcept) {
      attempts += 1;
      wrong += 1;
      testsWithError += 1;
    }
  });

  const totalTests = sorted.length;
  const errorRate = attempts > 0 ? wrong / attempts : (totalTests > 0 ? testsWithError / totalTests : 0);

  return {
    classAffectedPct: totalTests > 0 ? Math.round((testsWithError / totalTests) * 100) : 0,
    conceptErrorRate: Math.round(errorRate * 1000) / 1000,
    studentsAffected: testsWithError,
    totalStudents: totalTests,
    questionAttempts: attempts,
  };
};

const splitTestsByDate = (tests, cutoffDate) => {
  const cutoff = new Date(cutoffDate);
  const before = [];
  const after = [];

  tests.forEach((test) => {
    const d = new Date(test.date);
    if (d < cutoff) before.push(test);
    else after.push(test);
  });

  return { before, after };
};

export const computeImpactDelta = (concept, baseline, followUp) => {
  const beforePct = baseline?.classAffectedPct ?? 0;
  const afterPct = followUp?.classAffectedPct ?? 0;
  const absoluteDrop = beforePct - afterPct;
  const relativeDrop = beforePct > 0
    ? Math.round((absoluteDrop / beforePct) * 100)
    : 0;

  let status = 'awaiting_followup';
  if (followUp && followUp.totalStudents > 0) {
    if (absoluteDrop > 0) status = 'improved';
    else if (absoluteDrop < 0) status = 'worsened';
    else status = 'unchanged';
  }

  return {
    beforePct,
    afterPct,
    absoluteDrop,
    relativeDrop,
    status,
    deltaLabel: buildDeltaLabel(concept, beforePct, afterPct, absoluteDrop, relativeDrop, status),
  };
};

const buildDeltaLabel = (concept, beforePct, afterPct, absoluteDrop, relativeDrop, status) => {
  const name = concept || 'This concept';
  if (status === 'awaiting_followup') {
    return `Log recorded. Grade the next test to see if your reteach on ${name} worked.`;
  }
  if (status === 'improved') {
    if (relativeDrop >= 5) {
      return `${name} errors dropped ${relativeDrop}% after your reteach (${beforePct}% → ${afterPct}% of class).`;
    }
    return `${name} errors fell from ${beforePct}% to ${afterPct}% of class after your reteach.`;
  }
  if (status === 'worsened') {
    return `${name} errors rose from ${beforePct}% to ${afterPct}% — consider a different approach.`;
  }
  return `${name} error rate held steady at ${afterPct}% after your reteach.`;
};

export const enrichInterventionWithImpact = ({
  log,
  followUpSubmissions = [],
  followUpTests = [],
}) => {
  const concept = log.concept;
  let followUpMetrics = null;

  if (log.scope === 'student' && followUpTests.length > 0) {
    followUpMetrics = computeStudentConceptMetrics(followUpTests, concept);
  } else if (followUpSubmissions.length > 0) {
    followUpMetrics = computeClassConceptMetrics(followUpSubmissions, concept);
  }

  const impact = computeImpactDelta(log.concept, log.baseline, followUpMetrics);

  return {
    id: log._id,
    concept: log.concept,
    scope: log.scope,
    studentName: log.studentName || null,
    sessionId: log.sessionId,
    actionDescription: log.actionDescription,
    source: log.source,
    completedAt: log.completedAt,
    baseline: log.baseline,
    followUp: followUpMetrics,
    impact,
  };
};

export const summarizeImpacts = (impacts = []) => {
  const improved = impacts.filter((i) => i.impact?.status === 'improved');
  const awaiting = impacts.filter((i) => i.impact?.status === 'awaiting_followup');
  const worsened = impacts.filter((i) => i.impact?.status === 'worsened');

  return {
    totalLogged: impacts.length,
    improvedCount: improved.length,
    awaitingCount: awaiting.length,
    worsenedCount: worsened.length,
    headline: improved.length > 0
      ? `${improved.length} reteach${improved.length > 1 ? 'es' : ''} showed measurable improvement`
      : impacts.length > 0
        ? `${awaiting.length} reteach${awaiting.length !== 1 ? 'es' : ''} logged — grade the next test to measure impact`
        : 'Log a reteach to start tracking intervention impact',
  };
};
