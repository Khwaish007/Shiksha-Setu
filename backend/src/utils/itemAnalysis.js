/**
 * Classical Test Theory item analysis: difficulty (p-value) and
 * upper-lower 27% discrimination index (D-index) per question.
 */

export const normalizeQuestionNumber = (value) =>
  String(value || '')
    .trim()
    .replace(/^question\s*/i, '')
    .replace(/^q\s*/i, 'Q')
    .replace(/\s+/g, '')
    .toUpperCase();

const sortQuestionNumbers = (a, b) => {
  const numA = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
  if (numA !== numB) return numA - numB;
  return String(a).localeCompare(String(b));
};

export const getStudentQuestionScore = (student, questionNumber) => {
  const norm = normalizeQuestionNumber(questionNumber);
  const result = (student.questionResults || []).find(
    (q) => normalizeQuestionNumber(q.questionNumber) === norm
  );
  if (result) return result.isCorrect === true ? 1 : 0;

  const inMistakes = (student.mistakes || []).some(
    (m) => normalizeQuestionNumber(m.questionNumber) === norm
  );
  if (inMistakes) return 0;

  return null;
};

const classifyItem = ({ pValue, discriminationIndex, n }) => {
  if (n < 2) return 'insufficient_data';
  if (discriminationIndex < 0) return 'negative_discriminator';
  if (pValue > 0.85 && discriminationIndex < 0.2) return 'too_easy';
  if (pValue < 0.3) return 'too_hard';
  if (discriminationIndex < 0.2) return 'poor_discriminator';
  if (discriminationIndex >= 0.3 && pValue >= 0.3 && pValue <= 0.85) return 'good';
  return 'acceptable';
};

const flagLabel = (flag) => {
  const labels = {
    good: 'Good item',
    acceptable: 'Acceptable',
    too_easy: 'Too easy',
    too_hard: 'Too hard',
    poor_discriminator: 'Poor discriminator',
    negative_discriminator: 'Negative discriminator — review wording',
    insufficient_data: 'Insufficient data',
  };
  return labels[flag] || flag;
};

/**
 * @param {Array} students - { studentName, totalScore, questionResults, mistakes }
 * @param {Array} answerKeyQuestions - { questionNumber, concept, expectedAnswer, points }
 * @param {number} groupFraction - default 0.27 for upper/lower 27%
 */
export const computeItemAnalysis = (students = [], answerKeyQuestions = [], groupFraction = 0.27) => {
  const n = students.length;

  if (n === 0) {
    return {
      totalStudents: 0,
      groupSize: 0,
      insufficientSample: true,
      questions: [],
      summary: { tooEasy: [], tooHard: [], poorDiscriminators: [], negativeDiscriminators: [], goodItems: [] },
      insights: ['No graded worksheets in this session yet. Upload and grade tests to analyze questions.'],
    };
  }

  const questionMap = new Map();

  (answerKeyQuestions || []).forEach((q) => {
    const key = normalizeQuestionNumber(q.questionNumber);
    if (!key) return;
    questionMap.set(key, {
      questionNumber: q.questionNumber,
      concept: q.concept || 'General Mathematics',
      expectedAnswer: q.expectedAnswer || '',
      points: q.points ?? 10,
    });
  });

  students.forEach((student) => {
    (student.questionResults || []).forEach((qr) => {
      const key = normalizeQuestionNumber(qr.questionNumber);
      if (!key || questionMap.has(key)) return;
      questionMap.set(key, {
        questionNumber: qr.questionNumber,
        concept: qr.concept || 'General Mathematics',
        expectedAnswer: '',
        points: 10,
      });
    });
    (student.mistakes || []).forEach((m) => {
      const key = normalizeQuestionNumber(m.questionNumber);
      if (!key || questionMap.has(key)) return;
      questionMap.set(key, {
        questionNumber: m.questionNumber,
        concept: m.conceptMissed || 'General Mathematics',
        expectedAnswer: '',
        points: 10,
      });
    });
  });

  const questionList = [...questionMap.values()].sort((a, b) =>
    sortQuestionNumbers(a.questionNumber, b.questionNumber)
  );

  const groupSize = Math.max(1, Math.round(n * groupFraction));
  const sortedByScore = [...students].sort((a, b) => b.totalScore - a.totalScore);
  const upperGroup = sortedByScore.slice(0, groupSize);
  const lowerGroup = sortedByScore.slice(-groupSize);

  const questions = questionList.map((meta) => {
    const responses = students.map((s) => getStudentQuestionScore(s, meta.questionNumber));
    const validResponses = responses.filter((r) => r !== null);
    const respondedN = validResponses.length;
    const correctCount = validResponses.filter((r) => r === 1).length;
    const pValue = respondedN > 0 ? correctCount / respondedN : 0;

    const upperResponses = upperGroup
      .map((s) => getStudentQuestionScore(s, meta.questionNumber))
      .filter((r) => r !== null);
    const lowerResponses = lowerGroup
      .map((s) => getStudentQuestionScore(s, meta.questionNumber))
      .filter((r) => r !== null);

    const upperRate = upperResponses.length > 0
      ? upperResponses.filter((r) => r === 1).length / upperResponses.length
      : 0;
    const lowerRate = lowerResponses.length > 0
      ? lowerResponses.filter((r) => r === 1).length / lowerResponses.length
      : 0;
    const discriminationIndex = upperRate - lowerRate;

    const confidences = students.flatMap((s) => {
      const norm = normalizeQuestionNumber(meta.questionNumber);
      const qr = (s.questionResults || []).find(
        (q) => normalizeQuestionNumber(q.questionNumber) === norm
      );
      return qr?.confidence != null ? [qr.confidence] : [];
    });
    const avgConfidence = confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
      : null;

    const qualityFlag = classifyItem({ pValue, discriminationIndex, n: respondedN });

    return {
      questionNumber: meta.questionNumber,
      concept: meta.concept,
      expectedAnswer: meta.expectedAnswer,
      points: meta.points,
      n: respondedN,
      correctCount,
      pValue: Math.round(pValue * 1000) / 1000,
      pValuePercent: Math.round(pValue * 100),
      upperGroupCorrectRate: Math.round(upperRate * 1000) / 1000,
      lowerGroupCorrectRate: Math.round(lowerRate * 1000) / 1000,
      discriminationIndex: Math.round(discriminationIndex * 1000) / 1000,
      avgConfidence,
      qualityFlag,
      qualityLabel: flagLabel(qualityFlag),
    };
  });

  const summary = {
    tooEasy: questions.filter((q) => q.qualityFlag === 'too_easy').map((q) => q.questionNumber),
    tooHard: questions.filter((q) => q.qualityFlag === 'too_hard').map((q) => q.questionNumber),
    poorDiscriminators: questions.filter((q) => q.qualityFlag === 'poor_discriminator').map((q) => q.questionNumber),
    negativeDiscriminators: questions.filter((q) => q.qualityFlag === 'negative_discriminator').map((q) => q.questionNumber),
    goodItems: questions.filter((q) => q.qualityFlag === 'good').map((q) => q.questionNumber),
  };

  const insights = buildInsights(n, groupSize, questions, summary);

  return {
    totalStudents: n,
    groupSize,
    insufficientSample: n < 4,
    questions,
    summary,
    insights,
  };
};

const buildInsights = (n, groupSize, questions, summary) => {
  const insights = [];

  if (n < 4) {
    insights.push(`Only ${n} student(s) graded — item analysis is more reliable with at least 4 students.`);
  } else {
    insights.push(`Analyzed ${questions.length} question(s) across ${n} students (upper/lower groups: ${groupSize} each).`);
  }

  if (summary.negativeDiscriminators.length > 0) {
    insights.push(
      `${summary.negativeDiscriminators.join(', ')}: negative discrimination — high scorers did worse than low scorers. Review wording or answer key.`
    );
  }
  if (summary.poorDiscriminators.length > 0) {
    insights.push(
      `${summary.poorDiscriminators.join(', ')}: weak discrimination — does not separate strong from weak students.`
    );
  }
  if (summary.tooEasy.length > 0) {
    insights.push(`${summary.tooEasy.join(', ')}: very easy (>85% correct) — limited value for assessment.`);
  }
  if (summary.tooHard.length > 0) {
    insights.push(`${summary.tooHard.join(', ')}: very hard (<30% correct) — may frustrate students or be badly worded.`);
  }
  if (summary.goodItems.length > 0) {
    insights.push(`${summary.goodItems.length} question(s) show good difficulty and discrimination.`);
  }
  if (insights.length === 1 && questions.every((q) => q.qualityFlag === 'acceptable' || q.qualityFlag === 'good')) {
    insights.push('Overall, test items are performing reasonably well.');
  }

  return insights;
};

export const loadSessionStudentsForItemAnalysis = async (Submission, sessionId) => {
  const allSubmissions = await Submission.find({ sessionId, status: 'Success' }).sort({ createdAt: 1 });
  const studentMap = {};

  for (const s of allSubmissions) {
    let name = s.studentName.toLowerCase().trim();
    if (name.startsWith('name:')) name = name.replace('name:', '').trim();

    studentMap[name] = {
      studentName: s.studentName,
      totalScore: Number(s.totalScore) || 0,
      mistakes: s.mistakes || [],
      questionResults: s.questionResults || [],
    };
  }

  return Object.values(studentMap);
};
