import Anthropic from '@anthropic-ai/sdk';
import Student from '../models/Student.js';
import Submission from '../models/Submission.js';
import {
  buildPracticePdfUrl,
  buildFallbackParentMessage,
  buildFallbackTeacherAction,
  extractWeakConcepts,
} from '../utils/interventionUtils.js';

const getRequestSessionId = (req) =>
  req.params?.sessionId || req.query?.sessionId || req.body?.sessionId || null;

const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAggregatedStudents = async (sessionId) => {
  if (!sessionId) return [];

  const allSubmissions = await Submission.find({ sessionId, status: 'Success' }).sort({ createdAt: 1 });
  const studentMap = {};

  for (const s of allSubmissions) {
    let name = s.studentName.toLowerCase().trim();
    if (name.startsWith('name:')) name = name.replace('name:', '').trim();

    studentMap[name] = {
      studentName: s.studentName,
      totalScore: s.totalScore,
      mistakes: s.mistakes,
      status: s.status,
    };
  }

  return Object.values(studentMap);
};

const findStudentByName = async (name) => {
  if (!name) return null;
  return Student.findOne({
    studentName: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i'),
  });
};

const getBaseUrl = (req) => {
  const origin = req.get('origin') || req.get('referer');
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      /* fall through */
    }
  }
  return process.env.FRONTEND_URL || '';
};

const generateAiMessages = async ({ studentName, score, weakConcepts, pdfUrls, tone = 'friendly' }) => {
  const conceptList = weakConcepts.map((c) => c.concept);

  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackParentMessage({ studentName, score, weakConcepts, pdfUrls });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Generate a parent communication message for a student intervention plan.
Tone: ${tone} and encouraging.
Language: Hindi (Devanagari) with English translation below.
Include:
1) One-line progress summary mentioning score ${score}%
2) Specific weak concepts to practice: ${conceptList.join(', ')}
3) Mention that practice PDF worksheets are linked below
4) One positive, encouraging closing line
Keep under 100 words per language.

Practice PDF links to include in whatsappText:
${pdfUrls.join('\n')}

Return ONLY valid JSON:
{
  "hindi": "...",
  "english": "...",
  "whatsappText": "emoji-friendly merged version with PDF links included"
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1500,
      system: prompt,
      messages: [{ role: 'user', content: `Student: ${studentName}` }],
    });

    let responseText = response.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) responseText = jsonMatch[0];
    return JSON.parse(responseText);
  } catch (error) {
    console.warn('AI parent message fallback:', error.message);
    return buildFallbackParentMessage({ studentName, score, weakConcepts, pdfUrls });
  }
};

const buildInterventionPlan = async (req, { studentName, score, mistakes, studentDoc = null }) => {
  const baseUrl = getBaseUrl(req);
  let weakConcepts = extractWeakConcepts(mistakes, 3);

  if (weakConcepts.length === 0 && studentDoc?.errorDNA?.length) {
    weakConcepts = studentDoc.errorDNA.slice(0, 3).map((dna) => ({
      concept: dna.concept,
      mistakeCount: dna.occurrences,
      practicePdfPath: `/practice_tests_pdf/${dna.concept.toLowerCase().replace(/\s+/g, '_')}_practice_test.pdf`,
      hasPracticePdf: true,
    }));
  }

  const weakConceptsWithActions = weakConcepts.map((wc) => ({
    ...wc,
    reteachAction: buildFallbackTeacherAction(wc.concept),
    practicePdfUrl: buildPracticePdfUrl(wc.concept, baseUrl),
  }));

  const pdfUrls = weakConceptsWithActions
    .filter((c) => c.hasPracticePdf)
    .map((c) => c.practicePdfUrl);

  const parentMessage = await generateAiMessages({
    studentName,
    score,
    weakConcepts: weakConceptsWithActions,
    pdfUrls,
  });

  const estimatedStudyHours = score < 40 ? 10 : score < 60 ? 6 : 3;
  const interventionType =
    (mistakes?.length || 0) > 4 ? 'Comprehensive Tutoring' : 'Targeted Concept Review';

  return {
    studentName,
    studentId: studentDoc?._id?.toString() || null,
    parentPhone: studentDoc?.parentPhone || '',
    score,
    weakConcepts: weakConceptsWithActions,
    parentMessage,
    teacherActions: weakConceptsWithActions.map((c) => ({
      concept: c.concept,
      action: c.reteachAction,
    })),
    estimatedStudyHours,
    interventionType,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * POST /api/v1/grading/intervention-plan
 * Body: { studentName, sessionId? }
 */
export const generateSessionInterventionPlan = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const { studentName } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    if (!studentName) {
      return res.status(400).json({ error: 'studentName is required' });
    }

    const allSubmissions = await getAggregatedStudents(sessionId);
    const normalizedTarget = studentName.toLowerCase().trim();
    const submission = allSubmissions.find(
      (s) => s.studentName.toLowerCase().trim() === normalizedTarget
    );

    if (!submission) {
      return res.status(404).json({ error: 'Student not found in this session' });
    }

    const studentDoc = await findStudentByName(submission.studentName);
    const plan = await buildInterventionPlan(req, {
      studentName: submission.studentName,
      score: submission.totalScore,
      mistakes: submission.mistakes,
      studentDoc,
    });

    res.status(200).json(plan);
  } catch (error) {
    console.error('Session Intervention Plan Error:', error);
    res.status(500).json({ error: 'Failed to generate intervention plan.' });
  }
};

/**
 * POST /api/students/:id/intervention-plan
 */
export const generateStudentInterventionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const recentTest = [...student.tests].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const score = recentTest?.score ?? student.averageScore ?? 0;
    const mistakes = recentTest?.mistakes || [];

    const plan = await buildInterventionPlan(req, {
      studentName: student.studentName,
      score,
      mistakes,
      studentDoc: student,
    });

    res.status(200).json(plan);
  } catch (error) {
    console.error('Student Intervention Plan Error:', error);
    res.status(500).json({ error: 'Failed to generate intervention plan.' });
  }
};

/**
 * GET /api/v1/grading/reteach-summary?sessionId=
 * Teacher-facing "what to reteach tomorrow" summary
 */
export const getReteachTomorrowSummary = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const allSubmissions = await getAggregatedStudents(sessionId);
    if (!allSubmissions.length) {
      return res.status(200).json({
        atRiskCount: 0,
        totalStudents: 0,
        tomorrowFocus: [],
        atRiskStudents: [],
        summaryText: 'No graded worksheets yet. Upload and grade tests to get tomorrow\'s re-teach plan.',
      });
    }

    const totalStudents = allSubmissions.length;
    const conceptStudents = {};

    allSubmissions.forEach((s) => {
      s.mistakes.forEach((m) => {
        const concept = m.conceptMissed;
        if (!conceptStudents[concept]) conceptStudents[concept] = new Set();
        conceptStudents[concept].add(s.studentName.toLowerCase());
      });
    });

    const topicStats = Object.entries(conceptStudents)
      .map(([topic, students]) => ({
        topic,
        studentsAffected: students.size,
        percentageOfClass: Math.round((students.size / totalStudents) * 100),
      }))
      .sort((a, b) => b.studentsAffected - a.studentsAffected);

    const tomorrowFocus = topicStats.slice(0, 5).map((item, idx) => {
      const priority =
        item.percentageOfClass >= 50
          ? 'VERY_HIGH'
          : item.percentageOfClass >= 30
            ? 'HIGH'
            : item.percentageOfClass >= 15
              ? 'MEDIUM'
              : 'LOW';

      const action =
        priority === 'VERY_HIGH'
          ? `Priority #${idx + 1}: Re-teach ${item.topic} to the whole class with 2 worked examples`
          : priority === 'HIGH'
            ? `Re-teach ${item.topic} in first 15 min of class; assign practice PDF`
            : priority === 'MEDIUM'
              ? `Quick review of ${item.topic} for struggling students during lab time`
              : `Offer optional tutoring on ${item.topic} for interested students`;

      return {
        ...item,
        priority,
        action,
        practicePdfPath: `/practice_tests_pdf/${item.topic.toLowerCase().replace(/\s+/g, '_')}_practice_test.pdf`,
      };
    });

    const atRiskStudents = allSubmissions
      .filter((s) => s.totalScore < 60 || s.mistakes.length > 4)
      .map((s) => ({
        studentName: s.studentName,
        score: s.totalScore,
        topMistakes: [...new Set(s.mistakes.map((m) => m.conceptMissed))].slice(0, 3),
      }))
      .sort((a, b) => a.score - b.score);

    const topTopic = tomorrowFocus[0]?.topic || 'core concepts';
    const summaryText =
      atRiskStudents.length > 0
        ? `Tomorrow: Start with ${topTopic} (${tomorrowFocus[0]?.studentsAffected || 0} students affected). ${atRiskStudents.length} at-risk student${atRiskStudents.length > 1 ? 's' : ''} need individual intervention plans.`
        : `Tomorrow: Focus on ${topTopic}. Class is performing well overall — reinforce with a short review.`;

    res.status(200).json({
      atRiskCount: atRiskStudents.length,
      totalStudents,
      tomorrowFocus,
      atRiskStudents,
      summaryText,
    });
  } catch (error) {
    console.error('Reteach Summary Error:', error);
    res.status(500).json({ error: 'Failed to generate re-teach summary.' });
  }
};

/**
 * PATCH /api/students/:id/parent-phone
 * Save parent phone for WhatsApp delivery
 */
export const updateParentPhone = async (req, res) => {
  try {
    const { id } = req.params;
    const { parentPhone } = req.body;

    const student = await Student.findByIdAndUpdate(
      id,
      { parentPhone: parentPhone || '' },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.status(200).json({ parentPhone: student.parentPhone || '' });
  } catch (error) {
    console.error('Update Parent Phone Error:', error);
    res.status(500).json({ error: 'Failed to update parent phone.' });
  }
};
