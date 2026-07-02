import InterventionLog from '../models/InterventionLog.js';
import Submission from '../models/Submission.js';
import Student from '../models/Student.js';
import {
  computeClassConceptMetrics,
  computeStudentConceptMetrics,
  enrichInterventionWithImpact,
  summarizeImpacts,
} from '../utils/interventionImpact.js';

const getRequestSessionId = (req) =>
  req.params?.sessionId || req.query?.sessionId || req.body?.sessionId || null;

const loadSessionSubmissions = async (sessionId) => {
  if (!sessionId) return [];
  return Submission.find({ sessionId, status: 'Success' }).sort({ createdAt: 1 });
};

const dedupeSubmissionsByStudent = (submissions) => {
  const map = {};
  submissions.forEach((s) => {
    let name = s.studentName.toLowerCase().trim();
    if (name.startsWith('name:')) name = name.replace('name:', '').trim();
    map[name] = s;
  });
  return Object.values(map);
};

const loadFollowUpSubmissions = async (completedAt, scope, studentId) => {
  const query = {
    status: 'Success',
    createdAt: { $gt: new Date(completedAt) },
  };

  const submissions = await Submission.find(query).sort({ createdAt: 1 });
  const deduped = dedupeSubmissionsByStudent(submissions);

  if (scope === 'student' && studentId) {
    const student = await Student.findById(studentId);
    if (!student) return [];
    const name = student.studentName.toLowerCase().trim();
    return deduped.filter((s) => s.studentName.toLowerCase().trim() === name);
  }

  return deduped;
};

const loadFollowUpTests = async (studentId, completedAt) => {
  if (!studentId) return [];
  const student = await Student.findById(studentId);
  if (!student) return [];
  return (student.tests || []).filter((t) => new Date(t.date) > new Date(completedAt));
};

/**
 * POST /api/v1/grading/intervention-log
 */
export const logClassReteach = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const {
      concept,
      actionDescription = '',
      source = 'reteach_summary',
      scope = 'class',
      studentId,
      studentName,
      concepts,
    } = req.body;

    if (!concept) {
      return res.status(400).json({ error: 'concept is required.' });
    }
    if (!sessionId && scope === 'class') {
      return res.status(400).json({ error: 'sessionId is required for class reteach.' });
    }

    const submissions = await loadSessionSubmissions(sessionId);
    const deduped = dedupeSubmissionsByStudent(submissions);

    let baseline;
    if (scope === 'student' && studentId) {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found.' });
      }
      baseline = computeStudentConceptMetrics(student.tests || [], concept);
    } else {
      baseline = computeClassConceptMetrics(deduped, concept);
    }

    const log = await InterventionLog.create({
      type: scope === 'student' ? 'student_reteach' : 'class_reteach',
      concept,
      concepts: concepts || [concept],
      scope,
      sessionId: sessionId || undefined,
      studentId: studentId || undefined,
      studentName: studentName || undefined,
      actionDescription,
      source,
      completedAt: new Date(),
      baseline: {
        ...baseline,
        sessionId: sessionId || '',
      },
    });

    const enriched = enrichInterventionWithImpact({
      log,
      followUpSubmissions: [],
      followUpTests: [],
    });

    res.status(201).json({
      message: 'Reteach logged successfully.',
      intervention: enriched,
    });
  } catch (error) {
    console.error('Log Reteach Error:', error);
    res.status(500).json({ error: 'Failed to log reteach.' });
  }
};

/**
 * POST /api/students/:id/intervention-log
 */
export const logStudentReteach = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      concepts = [],
      sessionId,
      actionDescription = '',
      source = 'intervention_plan',
    } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (concepts.length === 0) {
      return res.status(400).json({ error: 'At least one concept is required.' });
    }

    const created = [];
    for (const concept of concepts) {
      const baseline = computeStudentConceptMetrics(student.tests || [], concept);
      const log = await InterventionLog.create({
        type: 'student_reteach',
        concept,
        concepts,
        scope: 'student',
        sessionId: sessionId || undefined,
        studentId: student._id,
        studentName: student.studentName,
        actionDescription,
        source,
        completedAt: new Date(),
        baseline: {
          ...baseline,
          sessionId: sessionId || '',
        },
      });
      created.push(enrichInterventionWithImpact({ log, followUpSubmissions: [], followUpTests: [] }));
    }

    res.status(201).json({
      message: `Logged ${created.length} reteach action(s).`,
      interventions: created,
    });
  } catch (error) {
    console.error('Log Student Reteach Error:', error);
    res.status(500).json({ error: 'Failed to log student reteach.' });
  }
};

/**
 * GET /api/v1/grading/intervention-impact?sessionId=
 */
export const getSessionInterventionImpact = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const query = sessionId ? { sessionId } : {};
    const logs = await InterventionLog.find(query).sort({ completedAt: -1 }).limit(50);

    const impacts = await Promise.all(logs.map(async (log) => {
      const followUpSubmissions = await loadFollowUpSubmissions(
        log.completedAt,
        log.scope,
        log.studentId
      );
      const followUpTests = await loadFollowUpTests(log.studentId, log.completedAt);

      return enrichInterventionWithImpact({
        log,
        followUpSubmissions,
        followUpTests: log.scope === 'student' ? followUpTests : [],
      });
    }));

    res.status(200).json({
      sessionId: sessionId || null,
      summary: summarizeImpacts(impacts),
      interventions: impacts,
    });
  } catch (error) {
    console.error('Get Intervention Impact Error:', error);
    res.status(500).json({ error: 'Failed to fetch intervention impact.' });
  }
};

/**
 * GET /api/students/:id/intervention-impact
 */
export const getStudentInterventionImpact = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await InterventionLog.find({ studentId: id }).sort({ completedAt: -1 }).limit(20);

    const impacts = await Promise.all(logs.map(async (log) => {
      const followUpTests = await loadFollowUpTests(log.studentId, log.completedAt);
      return enrichInterventionWithImpact({
        log,
        followUpSubmissions: [],
        followUpTests,
      });
    }));

    res.status(200).json({
      studentId: id,
      summary: summarizeImpacts(impacts),
      interventions: impacts,
    });
  } catch (error) {
    console.error('Get Student Intervention Impact Error:', error);
    res.status(500).json({ error: 'Failed to fetch student intervention impact.' });
  }
};
