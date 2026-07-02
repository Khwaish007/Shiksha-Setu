import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import WorksheetFeedback from '../models/WorksheetFeedback.js';
import {
  buildPracticePdfPath,
  conceptToPdfSlug,
} from './interventionUtils.js';

export const generateFeedbackToken = () => crypto.randomUUID();

const PRACTICE_PROBLEMS = {
  'Linear Equations': {
    question: 'Solve for x: 2x + 5 = 13',
    hint: 'Subtract 5 from both sides, then divide by 2.',
    answer: 'x = 4',
  },
  'Area Calculation': {
    question: 'Find the area of a rectangle with length 8 cm and width 5 cm.',
    hint: 'Area of rectangle = length × width.',
    answer: '40 cm²',
  },
  Trigonometry: {
    question: 'In a right triangle, if opposite = 3 and hypotenuse = 5, find sin θ.',
    hint: 'sin θ = opposite / hypotenuse.',
    answer: 'sin θ = 3/5 = 0.6',
  },
  'Quadratic Factorization': {
    question: 'Factorize: x² + 5x + 6',
    hint: 'Find two numbers that multiply to 6 and add to 5.',
    answer: '(x + 2)(x + 3)',
  },
  'Pythagorean Theorem': {
    question: 'A right triangle has legs 6 cm and 8 cm. Find the hypotenuse.',
    hint: 'Use a² + b² = c².',
    answer: 'c = 10 cm',
  },
  'Calculus Differentiation': {
    question: 'Differentiate: f(x) = 3x² + 2x',
    hint: 'Use the power rule: d/dx(xⁿ) = nxⁿ⁻¹.',
    answer: "f'(x) = 6x + 2",
  },
  Probability: {
    question: 'A fair coin is tossed once. What is P(heads)?',
    hint: 'A fair coin has 2 equally likely outcomes.',
    answer: 'P(heads) = 1/2',
  },
  'System of Linear Equations': {
    question: 'Solve: x + y = 7 and x − y = 1',
    hint: 'Add the two equations to eliminate y.',
    answer: 'x = 4, y = 3',
  },
  'Calculus Integration': {
    question: 'Integrate: ∫ 2x dx',
    hint: 'Reverse the power rule.',
    answer: 'x² + C',
  },
};

const DEFAULT_PRACTICE = {
  question: 'Solve: 15 + 27 = ?',
  hint: 'Add the ones place, then the tens place.',
  answer: '42',
};

export const buildPracticeProblem = (concept) => {
  const match = Object.entries(PRACTICE_PROBLEMS).find(
    ([key]) => key.toLowerCase() === String(concept || '').toLowerCase()
  );
  const base = match ? match[1] : DEFAULT_PRACTICE;
  return {
    concept: concept || 'General Mathematics',
    question: base.question,
    hint: base.hint,
    answer: base.answer,
    practicePdfPath: buildPracticePdfPath(concept),
  };
};

const normalizeQuestionNumber = (value) =>
  String(value || '').replace(/\s+/g, '').toLowerCase();

export const buildWrongQuestionsWithSolutions = (questionResults = [], answerKey = null) => {
  const keyMap = {};
  (answerKey?.questions || []).forEach((q) => {
    keyMap[normalizeQuestionNumber(q.questionNumber)] = q;
  });

  return (questionResults || [])
    .filter((q) => q.isCorrect === false)
    .map((qr) => {
      const key = keyMap[normalizeQuestionNumber(qr.questionNumber)];
      return {
        questionNumber: qr.questionNumber,
        concept: qr.concept || key?.concept || 'General Mathematics',
        evidence: qr.evidence || '',
        workedSolution: key?.expectedAnswer
          || qr.evidence
          || 'Ask your teacher to walk through this step by step.',
        rubric: key?.rubric || '',
      };
    });
};

export const buildLocalizedFeedbackContent = ({
  studentFirstName,
  score,
  totalQuestions,
  wrongQuestions,
  practiceProblem,
}) => {
  const name = studentFirstName || 'Student';
  const mistakeCount = wrongQuestions.length;
  const topConcept = wrongQuestions[0]?.concept || practiceProblem.concept;

  return {
    en: {
      greeting: `Hi ${name}! Here is your worksheet feedback.`,
      scoreSummary: `You scored ${score}% on this test (${totalQuestions} questions).`,
      mistakesTitle: mistakeCount > 0
        ? `You missed ${mistakeCount} question${mistakeCount > 1 ? 's' : ''}. Review these:`
        : 'Great job — no mistakes this time!',
      workedSolutionLabel: 'Worked solution',
      practiceTitle: 'Practice this at home',
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
      practiceTitle: 'घर पर यह अभ्यास करें',
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
      practiceTitle: 'घरी हा सराव करा',
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
  const wrongQuestions = buildWrongQuestionsWithSolutions(questionResults, answerKey);
  const primaryConcept = mistakes[0]?.conceptMissed
    || wrongQuestions[0]?.concept
    || 'General Mathematics';
  const practiceProblem = buildPracticeProblem(primaryConcept);
  const localizedContent = buildLocalizedFeedbackContent({
    studentFirstName,
    score,
    totalQuestions,
    wrongQuestions,
    practiceProblem,
  });

  const feedback = await WorksheetFeedback.create({
    feedbackToken,
    studentFirstName,
    score,
    totalQuestions,
    mistakes,
    wrongQuestions,
    practiceProblem,
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

export const enhanceFeedbackWithAi = async (feedback, language = 'hi') => {
  if (!process.env.ANTHROPIC_API_KEY || feedback.aiEnhanced) return feedback;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Improve student worksheet feedback text for a ${feedback.studentFirstName}.
Score: ${feedback.score}%. Wrong questions: ${JSON.stringify(feedback.wrongQuestions.slice(0, 3))}.
Practice: ${JSON.stringify(feedback.practiceProblem)}.

Return ONLY valid JSON with keys en, hi, mr. Each language object:
{ "greeting", "scoreSummary", "mistakesTitle", "workedSolutionLabel", "practiceTitle", "encouragement" }
Keep each field under 2 sentences. Child-friendly tone.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    let text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    const enhanced = JSON.parse(text);

    feedback.localizedContent = {
      en: { ...feedback.localizedContent.en, ...enhanced.en },
      hi: { ...feedback.localizedContent.hi, ...enhanced.hi },
      mr: { ...feedback.localizedContent.mr, ...enhanced.mr },
    };
    feedback.aiEnhanced = true;
    await feedback.save();
  } catch (err) {
    console.warn('AI feedback enhancement skipped:', err.message);
  }

  return feedback;
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
    practiceProblem: {
      ...feedback.practiceProblem,
      practicePdfPath: buildPracticePdfPath(feedback.practiceProblem?.concept),
      conceptSlug: conceptToPdfSlug(feedback.practiceProblem?.concept),
    },
    mistakes: feedback.mistakes,
  };
};
