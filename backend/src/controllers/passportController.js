import Student from '../models/Student.js';
import Submission from '../models/Submission.js';
import {
  buildLearningPassport,
  computePassportContentHash,
  buildMasteryMap,
  buildErrorPatterns,
  buildStrengths,
  buildSuggestedNextSteps,
  computeTrend,
  extractFirstName,
} from '../utils/passportGenerator.js';
import { generateLlmPrimer } from '../utils/llmPrimerGenerator.js';

const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getGradeLevel = (student) => student.gradeLevel || 'Class 8';

const resolveLlmPrimer = async (student) => {
  const contentHash = computePassportContentHash(student);
  const cached = student.passportCache;

  if (cached?.llmPrimer && cached.contentHash === contentHash) {
    return { primer: cached.llmPrimer, contentHash, fromCache: true };
  }

  const tests = student.tests || [];
  const errorDNA = student.errorDNA || [];
  const overallAverage = tests.length
    ? Math.round(tests.reduce((s, t) => s + t.score, 0) / tests.length)
    : 0;
  const { trend } = computeTrend(tests);
  const mastery_map = buildMasteryMap(tests, errorDNA);
  const error_patterns = buildErrorPatterns(errorDNA);
  const strengths = buildStrengths(mastery_map);
  const { immediate_gaps } = buildSuggestedNextSteps(mastery_map, errorDNA);

  const primer = await generateLlmPrimer({
    firstName: extractFirstName(student.studentName),
    gradeLevel: getGradeLevel(student),
    totalTests: tests.length,
    overallAverage,
    trend,
    strengths,
    errorPatterns: error_patterns,
    immediateGaps: immediate_gaps,
  });

  student.passportCache = {
    llmPrimer: primer,
    contentHash,
    generatedAt: new Date(),
  };
  await student.save();

  return { primer, contentHash, fromCache: false };
};

/**
 * GET /api/students/:id/passport
 */
export const getStudentPassport = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (!student.tests?.length) {
      return res.status(400).json({
        error: 'Grade at least one test before generating a learning passport.',
      });
    }

    const { primer } = await resolveLlmPrimer(student);
    const passport = buildLearningPassport({
      student,
      llmPrimer: primer,
      gradeLevel: getGradeLevel(student),
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="my_learning_passport.json"');
    res.status(200).json(passport);
  } catch (error) {
    console.error('Get Student Passport Error:', error);
    res.status(500).json({ error: 'Failed to generate learning passport.' });
  }
};

/**
 * GET /api/students/:id/passport/preview
 */
export const previewStudentPassport = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (!student.tests?.length) {
      return res.status(400).json({
        error: 'Grade at least one test before generating a learning passport.',
      });
    }

    const { primer, fromCache } = await resolveLlmPrimer(student);
    const passport = buildLearningPassport({
      student,
      llmPrimer: primer,
      gradeLevel: getGradeLevel(student),
    });

    res.status(200).json({ passport, primerCached: fromCache });
  } catch (error) {
    console.error('Preview Student Passport Error:', error);
    res.status(500).json({ error: 'Failed to preview learning passport.' });
  }
};

const findStudentByName = async (name) => {
  if (!name) return null;
  return Student.findOne({
    studentName: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i'),
  });
};

/**
 * POST /api/v1/grading/sessions/:sessionId/export-passports
 */
export const exportSessionPassports = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const submissions = await Submission.find({ sessionId, status: 'Success' });
    const uniqueNames = [...new Set(submissions.map((s) => s.studentName))];

    const passports = [];
    const skipped = [];

    for (const name of uniqueNames) {
      const student = await findStudentByName(name);
      if (!student || !student.tests?.length) {
        skipped.push({ name, reason: 'No student profile with graded tests in Students section' });
        continue;
      }

      const { primer } = await resolveLlmPrimer(student);
      const passport = buildLearningPassport({
        student,
        llmPrimer: primer,
        gradeLevel: getGradeLevel(student),
      });

      passports.push({
        folder: extractFirstName(student.studentName),
        passport,
      });
    }

    if (passports.length === 0) {
      return res.status(400).json({
        error: 'No passports to export. Students need profiles in the Students section with graded tests.',
        skipped,
      });
    }

    const archiver = (await import('archiver')).default;
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="class_learning_passports.zip"');
    archive.pipe(res);

    passports.forEach(({ folder, passport }) => {
      archive.append(JSON.stringify(passport, null, 2), {
        name: 'my_learning_passport.json',
        prefix: `${folder}/`,
      });
    });

    archive.append(
      JSON.stringify({
        exported_count: passports.length,
        skipped,
        privacy_reminder: 'Distribute each passport privately (one-to-one). Do not share in class groups.',
      }, null, 2),
      { name: '_export_manifest.json' }
    );

    await archive.finalize();
  } catch (error) {
    console.error('Export Session Passports Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export class passports.' });
    }
  }
};
