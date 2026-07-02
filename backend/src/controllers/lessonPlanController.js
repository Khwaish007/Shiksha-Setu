import { generateLessonPlan } from '../utils/lessonPlanGenerator.js';

const getRequestSessionId = (req) =>
  req.params?.sessionId || req.query?.sessionId || req.body?.sessionId || null;

/**
 * POST /api/v1/grading/lesson-plan
 * Body: { concept, misconception, studentsAffectedCount?, occurrences?, sessionId? }
 */
export const generateSessionLessonPlan = async (req, res) => {
  try {
    const {
      concept,
      misconception,
      studentsAffectedCount = 0,
      occurrences = 0,
    } = req.body || {};

    if (!concept) {
      return res.status(400).json({ error: 'concept is required.' });
    }

    const sessionId = getRequestSessionId(req);
    const plan = await generateLessonPlan({
      concept,
      misconception,
      studentsAffectedCount,
      occurrences,
      context: 'class',
    });

    res.status(200).json({
      sessionId: sessionId || null,
      plan,
    });
  } catch (error) {
    console.error('Generate Session Lesson Plan Error:', error);
    res.status(500).json({ error: 'Failed to generate lesson plan.' });
  }
};

/**
 * POST /api/students/lesson-plan
 * Body: { concept, misconception, studentsAffectedCount?, occurrences? }
 */
export const generateStudentScopeLessonPlan = async (req, res) => {
  try {
    const {
      concept,
      misconception,
      studentsAffectedCount = 0,
      occurrences = 0,
    } = req.body || {};

    if (!concept) {
      return res.status(400).json({ error: 'concept is required.' });
    }

    const plan = await generateLessonPlan({
      concept,
      misconception,
      studentsAffectedCount,
      occurrences,
      context: 'student',
    });

    res.status(200).json({ plan });
  } catch (error) {
    console.error('Generate Student Lesson Plan Error:', error);
    res.status(500).json({ error: 'Failed to generate lesson plan.' });
  }
};
