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
const storageConfig = multer.memoryStorage();
const uploadConfiguration = multer({ storage: storageConfig });

router.post('/evaluate', uploadConfiguration.array('worksheets', 50), processWorksheets);
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