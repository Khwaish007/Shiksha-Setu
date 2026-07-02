import Anthropic from '@anthropic-ai/sdk';
import { extractWeakConcepts } from './interventionUtils.js';

const FALLBACK_TEMPLATES = {
  'linear equations': [
    { prompt: 'Solve for x: 3x + 7 = 22', answer: 'x = 5', difficulty: 'easy', targetsMisconception: 'balance method' },
    { prompt: 'Solve for y: 2y - 5 = y + 3', answer: 'y = 8', difficulty: 'medium', targetsMisconception: 'variable isolation' },
    { prompt: 'Solve: 4(x - 2) = 16', answer: 'x = 6', difficulty: 'medium', targetsMisconception: 'distributive property' },
    { prompt: 'Solve for a: 5a + 2 = 3a + 10', answer: 'a = 4', difficulty: 'medium', targetsMisconception: 'combining like terms' },
    { prompt: 'If 2x + 1 = 15, find x.', answer: 'x = 7', difficulty: 'easy', targetsMisconception: 'inverse operations' },
    { prompt: 'Solve: x/4 + 3 = 7', answer: 'x = 16', difficulty: 'medium', targetsMisconception: 'fraction handling' },
  ],
  'quadratic factorization': [
    { prompt: 'Factor: x² + 7x + 12', answer: '(x + 3)(x + 4)', difficulty: 'medium', targetsMisconception: 'factor pairs' },
    { prompt: 'Factor: x² - 9', answer: '(x - 3)(x + 3)', difficulty: 'easy', targetsMisconception: 'difference of squares' },
    { prompt: 'Solve by factoring: x² - 5x + 6 = 0', answer: 'x = 2 or x = 3', difficulty: 'medium', targetsMisconception: 'zero product property' },
    { prompt: 'Factor: 2x² + 5x + 2', answer: '(2x + 1)(x + 2)', difficulty: 'hard', targetsMisconception: 'leading coefficient' },
    { prompt: 'Factor: x² + 6x + 9', answer: '(x + 3)²', difficulty: 'medium', targetsMisconception: 'perfect square trinomial' },
    { prompt: 'Factor: x² - x - 20', answer: '(x - 5)(x + 4)', difficulty: 'medium', targetsMisconception: 'sign errors' },
  ],
  default: [
    { prompt: 'Solve: 2x + 4 = 14', answer: 'x = 5', difficulty: 'easy', targetsMisconception: 'basic algebra' },
    { prompt: 'Calculate the area of a rectangle with length 8 and width 5.', answer: '40 sq units', difficulty: 'easy', targetsMisconception: 'area formula' },
    { prompt: 'What is 3/4 + 1/2? Express as a fraction.', answer: '5/4 or 1¼', difficulty: 'medium', targetsMisconception: 'fraction addition' },
    { prompt: 'If sin(30°) = 0.5, find cos(60°).', answer: '0.5', difficulty: 'medium', targetsMisconception: 'trig ratios' },
    { prompt: 'A triangle has base 10 and height 6. Find its area.', answer: '30 sq units', difficulty: 'easy', targetsMisconception: 'triangle area' },
    { prompt: 'Simplify: 3(x + 2) - 2x', answer: 'x + 6', difficulty: 'medium', targetsMisconception: 'distribution' },
  ],
};

const normalizeKey = (concept) => String(concept || '').toLowerCase().trim();

const getFallbackQuestions = (concept, misconceptions = []) => {
  const key = normalizeKey(concept);
  const template = FALLBACK_TEMPLATES[key]
    || FALLBACK_TEMPLATES[Object.keys(FALLBACK_TEMPLATES).find((k) => key.includes(k)) || '']
    || FALLBACK_TEMPLATES.default;

  const topMisconception = misconceptions[0]?.misconception || concept;

  return template.map((q, i) => ({
    ...q,
    targetsMisconception: misconceptions[i % misconceptions.length]?.misconception || topMisconception,
  }));
};

/**
 * Build worksheet context from a student document and optional concept override.
 */
export const buildStudentWorksheetContext = (student, { concept, sessionMistakes = [] } = {}) => {
  const errorDNA = [...(student.errorDNA || [])].sort((a, b) => b.occurrences - a.occurrences);

  let targetConcept = concept;
  if (!targetConcept) {
    const recentTest = [...(student.tests || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const weakFromTest = extractWeakConcepts(recentTest?.mistakes || sessionMistakes, 1);
    targetConcept = weakFromTest[0]?.concept
      || errorDNA[0]?.concept
      || 'General Mathematics';
  }

  const relevantDna = errorDNA.filter(
    (d) => normalizeKey(d.concept) === normalizeKey(targetConcept)
      || normalizeKey(targetConcept).includes(normalizeKey(d.concept))
      || normalizeKey(d.concept).includes(normalizeKey(targetConcept))
  );

  const misconceptions = relevantDna.length > 0
    ? relevantDna
    : errorDNA.slice(0, 3);

  const recentMistakes = (student.tests || [])
    .flatMap((t) => t.mistakes || [])
    .filter((m) => !targetConcept || normalizeKey(m.conceptMissed) === normalizeKey(targetConcept));

  return {
    studentName: student.studentName,
    studentId: student._id,
    concept: targetConcept,
    misconceptions: misconceptions.map((m) => ({
      concept: m.concept,
      misconception: m.misconception,
      occurrences: m.occurrences,
      severity: m.severity,
    })),
    recentMistakeCount: recentMistakes.length,
    score: student.averageScore ?? 0,
  };
};

/**
 * Generate personalized questions via Claude or deterministic fallback.
 */
export const generateAdaptiveQuestions = async (context) => {
  const { studentName, concept, misconceptions, recentMistakeCount, score } = context;

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      concept,
      questions: getFallbackQuestions(concept, misconceptions),
      source: 'fallback',
    };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const misconceptionText = misconceptions.length
      ? misconceptions.map((m) => `- "${m.misconception}" on ${m.concept} (${m.occurrences} times, ${m.severity || 'major'})`).join('\n')
      : 'No specific misconceptions recorded yet — target common errors for this concept.';

    const prompt = `You are an adaptive math practice generator (like Eedi or DreamBox).
Generate exactly 8 practice problems for a middle-school student.

Student: ${studentName}
Average score: ${score}%
Focus concept: ${concept}
Recent mistakes on this concept: ${recentMistakeCount}

Error DNA (persistent misconceptions to target):
${misconceptionText}

Rules:
- Each problem must directly target at least one listed misconception
- Mix easy (2), medium (4), hard (2) difficulty
- Use clear, printable math notation (x^2 not LaTeX)
- Problems should be solvable on paper in 3-5 minutes each
- Do NOT repeat the same problem structure

Return ONLY valid JSON:
{
  "concept": "${concept}",
  "questions": [
    {
      "prompt": "problem text",
      "answer": "concise answer",
      "difficulty": "easy|medium|hard",
      "targetsMisconception": "which misconception this targets"
    }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });

    let responseText = response.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) responseText = jsonMatch[0];

    const parsed = JSON.parse(responseText);
    const questions = (parsed.questions || []).filter((q) => q.prompt && q.answer);

    if (questions.length < 4) {
      throw new Error('Insufficient questions from AI');
    }

    return {
      concept: parsed.concept || concept,
      questions: questions.slice(0, 10),
      source: 'ai',
    };
  } catch (error) {
    console.warn('Adaptive worksheet AI fallback:', error.message);
    return {
      concept,
      questions: getFallbackQuestions(concept, misconceptions),
      source: 'fallback',
    };
  }
};
