import express from 'express';
import multer from 'multer';
import { 
  processWorksheets, 
  fetchClassroomHeatmap,
  fetchClassAnalytics,
  fetchTopicRecommendations,
  fetchRecommendationsDebug,
  fetchStudentRankings,
  fetchConceptAnalysis,
  fetchStudentWeakAndStrengths,
  fetchAtRiskStudents,
  fetchClassStrengthsAndWeaknesses,
  fetchPeerBenchmarking,
  fetchPerformanceDistribution
} from '../controllers/gradeController.js';

import { getPracticeTest } from '../controllers/practiceTestController.js';

const router = express.Router();

// Store incoming files directly in memory buffers for swift execution processing
const uploadConfiguration = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

router.post('/evaluate', (req, res, next) => {
  uploadConfiguration.array('worksheets', 1)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 4 MB per file.' });
      }
      return next(err);
    }
    processWorksheets(req, res, next);
  });
});
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
router.get('/practice-test/:concept', getPracticeTest);

export default router;