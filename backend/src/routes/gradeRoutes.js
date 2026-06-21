import express from 'express';
import multer from 'multer';
import { 
  processWorksheets,
  approveReviewSubmission,
  clearSubmissions,
  fetchClassroomHeatmap,
  fetchClassAnalytics,
  fetchReviewQueue,
  fetchTopicRecommendations,
  fetchRecommendationsDebug,
  fetchStudentRankings,
  fetchConceptAnalysis,
  fetchStudentWeakAndStrengths,
  fetchAtRiskStudents,
  fetchClassStrengthsAndWeaknesses,
  fetchPeerBenchmarking,
  fetchPerformanceDistribution,
  fetchClassMisconceptions
} from '../controllers/gradeController.js';

import { getPracticeTest } from '../controllers/practiceTestController.js';
import {
  clearAnswerKey,
  getAnswerKey,
  saveTypedAnswerKey,
  transcribeModelWorksheet
} from '../controllers/answerKeyController.js';
import {
  clearSessionSubmissions,
  createGradingSession,
  deleteGradingSession,
  getGradingSession,
  listGradingSessions,
  resumeGradingSession
} from '../controllers/sessionController.js';

const router = express.Router();

// Store incoming files directly in memory buffers for swift execution processing
const uploadConfiguration = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

const MAX_FILES_PER_REQUEST = Number(process.env.UPLOAD_BATCH_SIZE) || 10;

router.post('/clear-submissions', clearSubmissions);
router.post('/sessions', createGradingSession);
router.get('/sessions', listGradingSessions);
router.get('/sessions/:sessionId', getGradingSession);
router.post('/sessions/:sessionId/resume', resumeGradingSession);
router.patch('/sessions/:sessionId/resume', resumeGradingSession);
router.get('/sessions/:sessionId/answer-key', getAnswerKey);
router.get('/sessions/:sessionId/review-queue', fetchReviewQueue);
router.patch('/sessions/:sessionId/review-queue/:submissionId/approve', approveReviewSubmission);
router.put('/sessions/:sessionId/answer-key', saveTypedAnswerKey);
router.post('/sessions/:sessionId/answer-key/transcribe', (req, res, next) => {
  uploadConfiguration.single('modelWorksheet')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 4 MB per file.' });
      }
      return next(err);
    }
    transcribeModelWorksheet(req, res, next);
  });
});
router.delete('/sessions/:sessionId/answer-key', clearAnswerKey);
router.delete('/sessions/:sessionId', deleteGradingSession);
router.delete('/sessions/:sessionId/submissions', clearSessionSubmissions);

const runWorksheetUpload = (req, res, next) => {
  uploadConfiguration.array('worksheets', MAX_FILES_PER_REQUEST)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 4 MB per file.' });
      }
      return next(err);
    }
    processWorksheets(req, res, next);
  });
};

router.post('/evaluate', runWorksheetUpload);
router.post('/sessions/:sessionId/evaluate', runWorksheetUpload);
router.get('/heatmap-report', fetchClassroomHeatmap);
router.get('/analytics', fetchClassAnalytics);
router.get('/recommendations', fetchTopicRecommendations);
router.get('/recommendations-debug', fetchRecommendationsDebug);
router.get('/student-rankings', fetchStudentRankings);
router.get('/concept-analysis', fetchConceptAnalysis);
router.get('/student-strengths', fetchStudentWeakAndStrengths);
router.get('/at-risk-students', fetchAtRiskStudents);
router.get('/class-strengths', fetchClassStrengthsAndWeaknesses);
router.get('/peer-benchmarking', fetchPeerBenchmarking);
router.get('/performance-distribution', fetchPerformanceDistribution);
router.get('/class-misconceptions', fetchClassMisconceptions);
router.get('/practice-test/:concept', getPracticeTest);

export default router;
