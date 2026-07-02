import crypto from 'crypto';
import WorksheetFeedback from '../models/WorksheetFeedback.js';
import { conceptToPdfSlug } from './interventionUtils.js';

export const generateFeedbackToken = () => crypto.randomUUID();

const normalizeQuestionNumber = (value) =>
  String(value || '').replace(/\s+/g, '').toLowerCase();

/**
 * Build wrong-question list from both questionResults AND mistakes arrays.
 * Claude sometimes lists more mistakes than it marks isCorrect:false — we merge both.
 */
export const buildWrongQuestionsWithSolutions = (questionResults = [], mistakes = [], answerKey = null) => {
  const keyMap = {};
  (answerKey?.questions || []).forEach((q) => {
    keyMap[normalizeQuestionNumber(q.questionNumber)] = q;
  });

  const resultsByQ = {};
  (questionResults || []).forEach((qr) => {
    resultsByQ[normalizeQuestionNumber(qr.questionNumber)] = qr;
  });

  const seen = new Set();
  const wrongQuestions = [];

  const addWrong = (questionNumber, concept, evidence = '') => {
    const key = normalizeQuestionNumber(questionNumber);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const answerKeyEntry = keyMap[key];
    wrongQuestions.push({
      questionNumber,
      concept: concept || answerKeyEntry?.concept || 'General Mathematics',
      evidence,
      workedSolution: answerKeyEntry?.expectedAnswer
        || evidence
        || 'Ask your teacher to walk through this step by step.',
      rubric: answerKeyEntry?.rubric || '',
    });
  };

  (questionResults || [])
    .filter((q) => q.isCorrect === false)
    .forEach((qr) => addWrong(qr.questionNumber, qr.concept, qr.evidence || ''));

  (mistakes || []).forEach((m) => {
    const qr = resultsByQ[normalizeQuestionNumber(m.questionNumber)];
    addWrong(m.questionNumber, m.conceptMissed || qr?.concept, qr?.evidence || '');
  });

  return wrongQuestions;
};

export const buildLocalizedFeedbackContent = ({
  studentFirstName,
  score,
  totalQuestions,
  wrongQuestions,
}) => {
  const name = studentFirstName || 'Student';
  const mistakeCount = wrongQuestions.length;
  const topConcept = wrongQuestions[0]?.concept || 'key topics';

  return {
    en: {
      greeting: `Hi ${name}! Here is your worksheet feedback.`,
      scoreSummary: `You scored ${score}% on this test (${totalQuestions} questions).`,
      mistakesTitle: mistakeCount > 0
        ? `You missed ${mistakeCount} question${mistakeCount > 1 ? 's' : ''}. Review these:`
        : 'Great job — no mistakes this time!',
      workedSolutionLabel: 'Worked solution',
      encouragement: mistakeCount > 0
        ? `Focus on ${topConcept} for 15 minutes today. You can do it!`
        : 'Keep up the excellent work!',
    },
    hi: {
      greeting: `नमस्ते ${name}! यह आपकी worksheet की प्रतिक्रिया है।`,
      scoreSummary: `आपने इस परीक्षा में ${score}% अंक प्राप्त किए (${totalQuestions} प्रश्न)।`,
      mistakesTitle: mistakeCount > 0
        ? `आपसे ${mistakeCount} प्रश्न छूटे। इन्हें देखें:`
        : 'बहुत बढ़िया — इस बार कोई गलती नहीं!',
      workedSolutionLabel: 'हल (चरण-दर-चरण)',
      encouragement: mistakeCount > 0
        ? `आज ${topConcept} पर 15 मिनट अभ्यास करें। आप कर सकते हैं!`
        : 'ऐसे ही मेहनत जारी रखें!',
    },
    mr: {
      greeting: `नमस्कार ${name}! ही तुमच्या worksheet चा अभिप्राय आहे.`,
      scoreSummary: `या चाचणीत तुम्हाला ${score}% गुण मिळाले (${totalQuestions} प्रश्न).`,
      mistakesTitle: mistakeCount > 0
        ? `तुम्ही ${mistakeCount} प्रश्न चुकवले. हे पाहा:`
        : 'छान काम — यावेळी चूक नाही!',
      workedSolutionLabel: 'सोडवण्याची पद्धत',
      encouragement: mistakeCount > 0
        ? `आज ${topConcept} वर 15 मिनिटे सराव करा. तुम्ही करू शकता!`
        : 'अशीच मेहनत सुरू ठेवा!',
    },
  };
};

const getFrontendBaseUrl = () =>
  process.env.FRONTEND_URL || 'http://localhost:5173';

export const buildFeedbackUrl = (token) =>
  `${getFrontendBaseUrl().replace(/\/$/, '')}/feedback/${token}`;

export const createWorksheetFeedback = async ({
  sessionId,
  studentId,
  studentName,
  submissionId,
  testId,
  score,
  totalQuestions = 10,
  mistakes = [],
  questionResults = [],
  answerKey = null,
}) => {
  const feedbackToken = generateFeedbackToken();
  const studentFirstName = String(studentName || 'Student').trim().split(/\s+/)[0];
  const wrongQuestions = buildWrongQuestionsWithSolutions(questionResults, mistakes, answerKey);
  const localizedContent = buildLocalizedFeedbackContent({
    studentFirstName,
    score,
    totalQuestions,
    wrongQuestions,
  });

  const feedback = await WorksheetFeedback.create({
    feedbackToken,
    studentFirstName,
    score,
    totalQuestions,
    mistakes,
    wrongQuestions,
    localizedContent,
    sessionId: sessionId || undefined,
    studentId: studentId || undefined,
    submissionId: submissionId || undefined,
    testId: testId || undefined,
    sourceType: testId ? 'student_test' : 'submission',
    gradedAt: new Date(),
  });

  return {
    feedback,
    feedbackToken,
    feedbackUrl: buildFeedbackUrl(feedbackToken),
  };
};

export const formatPublicFeedback = (feedback, lang = 'hi') => {
  const language = ['en', 'hi', 'mr'].includes(lang) ? lang : 'hi';
  const content = feedback.localizedContent?.[language] || feedback.localizedContent?.hi;

  return {
    feedbackToken: feedback.feedbackToken,
    language,
    studentFirstName: feedback.studentFirstName,
    score: feedback.score,
    totalQuestions: feedback.totalQuestions,
    gradedAt: feedback.gradedAt,
    content,
    wrongQuestions: feedback.wrongQuestions,
    mistakes: feedback.mistakes,
  };
};
