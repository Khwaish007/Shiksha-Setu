import crypto from 'crypto';

const PASSPORT_VERSION = '1.0';
const PRIVACY_NOTICE =
  'This file belongs to you. Share it only with tools you trust. It contains no school name, teacher name, or class identifiers.';

export const extractFirstName = (studentName) => {
  const name = String(studentName || 'Student').trim();
  return name.split(/\s+/)[0] || 'Student';
};

export const computePassportContentHash = (student) => {
  const payload = {
    tests: (student.tests || []).map((t) => ({
      score: t.score,
      date: t.date,
      mistakes: t.mistakes,
      questionResults: (t.questionResults || []).map((q) => ({
        concept: q.concept,
        isCorrect: q.isCorrect,
      })),
    })),
    errorDNA: student.errorDNA || [],
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

export const aggregateConceptStats = (tests = []) => {
  const map = {};

  tests.forEach((test) => {
    const testDate = test.date;
    (test.questionResults || []).forEach((qr) => {
      const concept = qr.concept || 'General Mathematics';
      if (!map[concept]) {
        map[concept] = { correct: 0, total: 0, testDates: new Set() };
      }
      map[concept].total += 1;
      if (qr.isCorrect) map[concept].correct += 1;
      map[concept].testDates.add(new Date(testDate).toISOString());
    });

    (test.mistakes || []).forEach((m) => {
      const concept = m.conceptMissed;
      if (!concept) return;
      if (!map[concept]) {
        map[concept] = { correct: 0, total: 0, testDates: new Set() };
      }
      if (map[concept].total === 0) {
        map[concept].total += 1;
        map[concept].testDates.add(new Date(testDate).toISOString());
      }
    });
  });

  return map;
};

export const masteryLevelFromStats = (scoreOnConcept, timesTested) => {
  if (!timesTested || timesTested === 0) return 'not_started';
  if (timesTested >= 2 && scoreOnConcept >= 75) return 'strong';
  if (scoreOnConcept >= 40) return 'developing';
  return 'needs_work';
};

export const priorityFromMastery = (masteryLevel) => {
  if (masteryLevel === 'strong') return 'maintain';
  if (masteryLevel === 'not_started') return 'upcoming';
  if (masteryLevel === 'needs_work') return 'high';
  return 'medium';
};

export const computeTrend = (tests = []) => {
  const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length < 2) {
    return {
      trend: 'insufficient_data',
      trend_detail: 'Take at least 2 tests to see your progress trend.',
    };
  }

  const recent = sorted.slice(-3);
  const firstScore = recent[0].score;
  const lastScore = recent[recent.length - 1].score;
  const overallAvg = Math.round(sorted.reduce((s, t) => s + t.score, 0) / sorted.length);

  if (lastScore > firstScore + 5) {
    return {
      trend: 'improving',
      trend_detail: `Average rose from ${firstScore}% to ${lastScore}% over last ${recent.length} test${recent.length > 1 ? 's' : ''}`,
    };
  }
  if (lastScore < firstScore - 5) {
    return {
      trend: 'declining',
      trend_detail: `Score fell from ${firstScore}% to ${lastScore}% over last ${recent.length} test${recent.length > 1 ? 's' : ''}`,
    };
  }
  return {
    trend: 'stable',
    trend_detail: `Scores holding steady around ${overallAvg}%`,
  };
};

const findGapForConcept = (concept, errorDNA = []) => {
  const match = errorDNA.find(
    (d) => d.concept.toLowerCase() === concept.toLowerCase()
      || concept.toLowerCase().includes(d.concept.toLowerCase())
      || d.concept.toLowerCase().includes(concept.toLowerCase())
  );
  return match ? match.misconception : null;
};

export const buildMasteryMap = (tests, errorDNA = []) => {
  const conceptStats = aggregateConceptStats(tests);
  const allConcepts = new Set([
    ...Object.keys(conceptStats),
    ...errorDNA.map((d) => d.concept),
  ]);

  const masteryMap = [...allConcepts].map((concept) => {
    const stats = conceptStats[concept];
    const timesTested = stats ? stats.testDates.size : 0;
    const scoreOnConcept = stats && stats.total > 0
      ? Math.round((stats.correct / stats.total) * 100)
      : null;
    const mastery_level = masteryLevelFromStats(scoreOnConcept ?? 0, timesTested);
    const dates = stats ? [...stats.testDates].sort() : [];

    return {
      concept,
      mastery_level,
      score_on_concept: scoreOnConcept,
      times_tested: timesTested,
      last_seen: dates.length ? formatDate(dates[dates.length - 1]) : null,
      specific_gap: findGapForConcept(concept, errorDNA),
      priority: priorityFromMastery(mastery_level),
    };
  });

  const priorityOrder = { high: 0, medium: 1, maintain: 2, upcoming: 3 };
  return masteryMap.sort(
    (a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
  );
};

export const buildErrorPatterns = (errorDNA = []) =>
  errorDNA.map((d) => ({
    pattern: d.misconception,
    concepts_affected: [d.concept],
    recurrence_count: d.occurrences,
    first_observed: formatDate(d.firstSeen),
    last_observed: formatDate(d.lastSeen),
    severity: d.severity || 'minor',
  }));

export const buildStrengths = (masteryMap) =>
  masteryMap
    .filter((m) => m.mastery_level === 'strong')
    .map((m) => m.concept);

export const buildSuggestedNextSteps = (masteryMap, errorDNA = []) => {
  const immediate = masteryMap
    .filter((m) => m.priority === 'high' || m.priority === 'medium')
    .slice(0, 3)
    .map((m) => (m.specific_gap ? `${m.concept} — ${m.specific_gap}` : m.concept));

  const mediumTerm = masteryMap
    .filter((m) => m.priority === 'upcoming' || m.mastery_level === 'not_started')
    .slice(0, 3)
    .map((m) => m.concept);

  const stretch = masteryMap
    .filter((m) => m.mastery_level === 'strong')
    .slice(0, 2)
    .map((m) => `Advanced ${m.concept} challenges`);

  if (stretch.length === 0) {
    stretch.push('Olympiad-style problem solving', 'Competition math practice');
  }

  return {
    immediate_gaps: immediate.length ? immediate : ['Review recent test mistakes'],
    medium_term: mediumTerm.length ? mediumTerm : ['Explore new topics from your syllabus'],
    stretch_goals: stretch,
  };
};

export const buildFallbackLlmPrimer = ({
  firstName,
  gradeLevel,
  totalTests,
  overallAverage,
  trend,
  strengths,
  errorPatterns,
  immediateGaps,
}) => {
  const strengthText = strengths.length
    ? strengths.join(' and ')
    : 'basic arithmetic';
  const topPattern = errorPatterns[0];
  const gapText = topPattern
    ? `My biggest recurring mistake is "${topPattern.pattern}" (seen ${topPattern.recurrence_count} times).`
    : immediateGaps[0]
      ? `I need help with ${immediateGaps[0]}.`
      : 'I am working on improving my math skills.';
  const trendWord = trend === 'improving' ? 'improving' : trend === 'declining' ? 'working to improve' : 'making steady progress';

  return `I am ${firstName}, a ${gradeLevel} student who has taken ${totalTests} math test${totalTests !== 1 ? 's' : ''}. My overall average is ${overallAverage}% and I am ${trendWord}. My strongest areas are ${strengthText}. ${gapText} Please help me based on this profile — give practice at my level and explain where I commonly go wrong.`;
};

export const buildLearningPassport = ({
  student,
  llmPrimer,
  gradeLevel = 'Class 8',
}) => {
  const tests = student.tests || [];
  const errorDNA = student.errorDNA || [];
  const firstName = extractFirstName(student.studentName);
  const overallAverage = tests.length
    ? Math.round(tests.reduce((s, t) => s + t.score, 0) / tests.length)
    : 0;
  const { trend, trend_detail } = computeTrend(tests);
  const mastery_map = buildMasteryMap(tests, errorDNA);
  const error_patterns = buildErrorPatterns(errorDNA);
  const strengths = buildStrengths(mastery_map);
  const suggested_next_steps = buildSuggestedNextSteps(mastery_map, errorDNA);

  const immediateGaps = suggested_next_steps.immediate_gaps;

  return {
    passport_version: PASSPORT_VERSION,
    generated_at: new Date().toISOString(),
    privacy_notice: PRIVACY_NOTICE,
    learner_profile: {
      first_name: firstName,
      grade_level: gradeLevel,
      subject: 'Mathematics',
      total_tests_taken: tests.length,
      overall_average: overallAverage,
      trend,
      trend_detail,
    },
    mastery_map,
    error_patterns,
    strengths,
    suggested_next_steps,
    llm_primer: llmPrimer || buildFallbackLlmPrimer({
      firstName,
      gradeLevel,
      totalTests: tests.length,
      overallAverage,
      trend,
      strengths,
      errorPatterns: error_patterns,
      immediateGaps,
    }),
  };
};

export { PASSPORT_VERSION, PRIVACY_NOTICE };
