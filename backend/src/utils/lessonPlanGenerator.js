/**
 * Generate a 15-minute micro-lesson targeting a specific misconception.
 */

const buildFallbackLessonPlan = ({ concept, misconception, studentsAffectedCount = 0, occurrences = 0 }) => {
  const target = misconception || `difficulty with ${concept}`;
  return {
    title: `15-Min Reteach: ${concept}`,
    durationMinutes: 15,
    concept,
    misconception: target,
    studentsAffectedCount,
    occurrences,
    hook: `Ask: "Who has seen this mistake before — ${target}?" Show one wrong answer on the board. ${studentsAffectedCount > 0 ? `${studentsAffectedCount} students in class showed this pattern.` : 'Several students struggled with this on the recent test.'} Today we fix it in 15 minutes.`,
    workedExamples: [
      {
        problem: `Example 1 (${concept}): A guided problem that commonly triggers "${target}".`,
        solution: 'Walk through step-by-step, naming the exact error students make and the correct move.',
        teacherTalk: 'Think aloud: "Here is where many of us go wrong… instead we should…"',
      },
      {
        problem: `Example 2 (${concept}): A slightly harder variant of the same misconception.`,
        solution: 'Have students predict the next step before you write it. Correct the misconception explicitly.',
        teacherTalk: 'Cold-call 2 students to explain why the wrong approach fails.',
      },
    ],
    boardPlan: [
      { step: 1, action: 'Write the misconception in red: what students wrongly believe.', durationMinutes: 2 },
      { step: 2, action: 'Work Example 1 slowly — circle the decision point where the error happens.', durationMinutes: 5 },
      { step: 3, action: 'Work Example 2 with pair discussion (think-pair-share).', durationMinutes: 5 },
      { step: 4, action: 'Post exit ticket on board; students solve independently.', durationMinutes: 3 },
    ],
    exitTicket: {
      question: `One ${concept} problem that tests whether students still make this mistake: "${target}".`,
      expectedAnswer: 'Accept correct method even if arithmetic differs; watch for the specific misconception.',
      successCriteria: '≥80% of class uses the correct approach (not just the right final answer).',
    },
    source: 'fallback',
  };
};

export const generateLessonPlan = async ({
  concept,
  misconception,
  studentsAffectedCount = 0,
  occurrences = 0,
  context = 'class',
}) => {
  if (!concept) {
    throw new Error('concept is required');
  }

  const misconceptionText = misconception || `Repeated difficulty with ${concept}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackLessonPlan({
      concept,
      misconception: misconceptionText,
      studentsAffectedCount,
      occurrences,
    });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are an expert middle-school math teacher in India.
Create a 15-minute micro-lesson plan that directly fixes this specific misconception.

Concept: ${concept}
Misconception to fix: "${misconceptionText}"
Students affected in class: ${studentsAffectedCount || 'unknown'}
Total occurrences: ${occurrences || 'unknown'}
Context: ${context === 'student' ? 'one-on-one or small group tutoring' : 'whole-class reteach'}

Requirements:
- Total lesson: 15 minutes
- Include: engaging hook (1-2 min), exactly 2 worked examples with teacher talk, board plan (4 steps with time allocations summing to ~15 min), exit ticket with success criteria
- Target the EXACT misconception — not generic chapter review
- Use simple language a teacher can read aloud
- Math notation in plain text (x^2 not LaTeX)

Return ONLY valid JSON:
{
  "title": "short lesson title",
  "durationMinutes": 15,
  "concept": "${concept}",
  "misconception": "${misconceptionText.replace(/"/g, '\\"')}",
  "hook": "opening hook text",
  "workedExamples": [
    { "problem": "...", "solution": "...", "teacherTalk": "..." },
    { "problem": "...", "solution": "...", "teacherTalk": "..." }
  ],
  "boardPlan": [
    { "step": 1, "action": "...", "durationMinutes": 3 }
  ],
  "exitTicket": {
    "question": "...",
    "expectedAnswer": "...",
    "successCriteria": "..."
  }
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

    if (!parsed.hook || !parsed.workedExamples?.length || !parsed.boardPlan?.length || !parsed.exitTicket) {
      throw new Error('Incomplete lesson plan from AI');
    }

    return {
      ...parsed,
      durationMinutes: 15,
      concept,
      misconception: misconceptionText,
      studentsAffectedCount,
      occurrences,
      source: 'ai',
    };
  } catch (error) {
    console.warn('Lesson plan AI fallback:', error.message);
    return buildFallbackLessonPlan({
      concept,
      misconception: misconceptionText,
      studentsAffectedCount,
      occurrences,
    });
  }
};

export { buildFallbackLessonPlan };
