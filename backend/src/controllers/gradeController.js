import Anthropic from '@anthropic-ai/sdk';
import GradingSession from '../models/GradingSession.js';
import Submission from '../models/Submission.js';
import Student from '../models/Student.js';
import { refreshSessionStats } from '../utils/sessionStats.js';
import { extractUsage, recordGradingRun } from '../utils/costTelemetry.js';
import {
  buildManualReviewPayload,
  buildGradingSystemPrompt,
  escapeRegExp,
  MANUAL_REVIEW_MESSAGE,
  NEEDS_TEACHER_REVIEW_STATUS,
  parseAndNormalizeGradingResponse,
  validateUploadedImage
} from '../utils/gradingSafety.js';

// Helper function to format image buffer data into valid input for Claude SDK
const formatBufferToClaudePart = (buffer, mimeType) => {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType,
      data: buffer.toString("base64")
    }
  };
};

// Helper to automatically retry API calls when rate-limited (429 Quota Exceeded)
const generateWithRetry = async (client, systemPrompt, imageData, maxRetries = 3) => {
  let delayMs = 15000; // Wait 15 seconds if we hit a rate limit
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.messages.create({
        model: "claude-opus-4-1-20250805",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [imageData, {
              type: "text",
              text: "Please analyze this worksheet image and provide the grading results in JSON format."
            }]
          }
        ]
      });
    } catch (error) {
      const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`[429 Quota Exceeded] Server too busy. Retrying in ${delayMs / 1000} seconds... (Attempt ${i + 1} of ${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs += 10000; // Increase exponentially if it fails again
        continue;
      }
      throw error;
    }
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getRequestSessionId = (req) => (
  req.params?.sessionId ||
  req.query?.sessionId ||
  req.body?.sessionId ||
  null
);

const ensureSessionExists = async (sessionId) => {
  if (!sessionId) return null;
  return GradingSession.findOneAndUpdate(
    { sessionId },
    { lastAccessedAt: new Date() },
    { new: true }
  );
};

const processInBatches = async (items, batchSize, processor, delayBetweenBatchesMs = 0) => {
  const results = [];

  for (let startIndex = 0; startIndex < items.length; startIndex += batchSize) {
    const batch = items.slice(startIndex, startIndex + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((item, batchIndex) => processor(item, startIndex + batchIndex))
    );

    results.push(...batchResults);

    if (startIndex + batchSize < items.length && delayBetweenBatchesMs > 0) {
      await sleep(delayBetweenBatchesMs);
    }
  }

  return results;
};

// Create adaptive buckets from the actual concept distribution.
// This keeps the top concepts visible in a small class while still exposing
// stable threshold values derived from the data itself.
const buildAdaptiveConceptBuckets = (items) => {
  const sorted = [...items].sort((a, b) => {
    const pctDiff = b.percentageOfClass - a.percentageOfClass;
    if (pctDiff !== 0) return pctDiff;
    return b.totalStudentsAffected - a.totalStudentsAffected;
  });

  const total = sorted.length;
  if (total === 0) {
    return { thresholds: { p25: 0, p50: 0, p75: 0 }, items: [] };
  }

  const maxPct = sorted[0]?.percentageOfClass ?? 0;

  // Use relative percentage thresholds so the same concept gets the same
  // category in heatmap and recommendations, while still scaling to small data.
  const veryHighThreshold = Math.max(25, Math.round(maxPct * 0.8));
  const highThreshold = Math.max(15, Math.round(maxPct * 0.6));
  const mediumThreshold = Math.max(8, Math.round(maxPct * 0.4));

  const decorated = sorted.map((item, index) => {
    let intensityLabel = 'low';
    if (item.percentageOfClass >= veryHighThreshold) intensityLabel = 'very_high';
    else if (item.percentageOfClass >= highThreshold) intensityLabel = 'high';
    else if (item.percentageOfClass >= mediumThreshold) intensityLabel = 'medium';

    return { ...item, intensityLabel, categoryKey: intensityLabel };
  });

  const thresholds = {
    p25: mediumThreshold,
    p50: highThreshold,
    p75: veryHighThreshold
  };

  return { thresholds, items: decorated };
};

const buildSubmissionUpdate = (sessionId, payload, overrides = {}) => ({
  sessionId,
  studentName: (payload.studentName || 'Unknown').trim(),
  totalScore: Number(payload.totalScore) || 0,
  mistakes: payload.mistakes || [],
  questionResults: payload.questionResults || [],
  confidenceSummary: payload.confidenceSummary || {
    averageConfidence: 0,
    minimumConfidence: 0,
    lowConfidenceCount: 0
  },
  reviewReason: payload.reviewReason || '',
  reviewStatus: payload.status === NEEDS_TEACHER_REVIEW_STATUS ? 'pending' : 'none',
  errorSummary: payload.errorSummary || '',
  status: payload.status,
  createdAt: new Date(),
  ...overrides
});

const DEFAULT_CONCEPTS = [
  'Linear Equations', 'Area Calculation', 'Trigonometry',
  'Quadratic Factorization', 'Pythagorean Theorem',
  'Calculus Differentiation', 'Probability',
  'System of Linear Equations', 'Calculus Integration'
];

const getSessionConcepts = async (sessionId, submissions = []) => {
  const session = sessionId ? await GradingSession.findOne({ sessionId }) : null;
  const concepts = new Set();

  (session?.answerKey?.questions || []).forEach(question => {
    if (question.concept) concepts.add(question.concept);
  });

  submissions.forEach(submission => {
    (submission.mistakes || []).forEach(mistake => {
      if (mistake.conceptMissed) concepts.add(mistake.conceptMissed);
    });
  });

  return concepts.size ? Array.from(concepts) : DEFAULT_CONCEPTS;
};

// Mock data generator for development/UI testing (bypasses API limits)
const generateMockGrading = () => {
  const concepts = [
    'Linear Equations', 'Area Calculation', 'Trigonometry', 
    'Quadratic Factorization', 'Pythagorean Theorem', 
    'Calculus Differentiation', 'Probability', 
    'System of Linear Equations', 'Calculus Integration'
  ];
  
  const mistakes = [];
  const numMistakes = Math.random() > 0.6 ? 0 : Math.floor(Math.random() * 4) + 1;
  
  for (let i = 0; i < numMistakes; i++) {
    mistakes.push({
      questionNumber: `Q${Math.floor(Math.random() * 10) + 1}`,
      conceptMissed: concepts[Math.floor(Math.random() * concepts.length)]
    });
  }
  
  const baseScore = Math.floor(Math.random() * 40) + 60; // 60-100
  const totalScore = Math.max(0, baseScore - mistakes.length * 5);
  
  return {
    studentName: `Student_${Math.floor(Math.random() * 1000)}`,
    totalScore,
    mistakes,
    status: mistakes.length > 3 ? "Needs Review" : "Success"
  };
};

export const clearSubmissions = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required. Global clearing is disabled.' });
    }

    await Submission.deleteMany({ sessionId });
    const session = await refreshSessionStats(sessionId);
    res.status(200).json({ message: 'Session submissions cleared.', session });
  } catch (err) {
    console.error('Clear Submissions Error:', err);
    res.status(500).json({ error: 'Failed to clear submissions.' });
  }
};

export const fetchReviewQueue = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const queue = await Submission.find({
      sessionId,
      status: NEEDS_TEACHER_REVIEW_STATUS,
      reviewStatus: 'pending'
    }).sort({ createdAt: -1 });

    res.status(200).json(queue);
  } catch (error) {
    console.error('Review Queue Error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher review queue.' });
  }
};

export const approveReviewSubmission = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const { submissionId } = req.params;

    if (!sessionId || !submissionId) {
      return res.status(400).json({ error: 'sessionId and submissionId are required.' });
    }

    const submission = await Submission.findOne({
      _id: submissionId,
      sessionId,
      status: NEEDS_TEACHER_REVIEW_STATUS,
      reviewStatus: 'pending'
    });

    if (!submission) {
      return res.status(404).json({ error: 'Pending review submission not found.' });
    }

    submission.status = 'Success';
    submission.reviewStatus = 'approved';
    submission.reviewedAt = new Date();
    await submission.save();

    if (submission.sourceStudentId) {
      const student = await Student.findById(submission.sourceStudentId);
      if (student) {
        student.tests.push({
          date: submission.reviewedAt,
          score: Number(submission.totalScore) || 0,
          totalQuestions: Math.max(submission.questionResults?.length || 0, 1),
          mistakes: submission.mistakes || [],
          questionResults: submission.questionResults || [],
          confidenceSummary: submission.confidenceSummary,
          reviewReason: submission.reviewReason,
          errorSummary: submission.errorSummary || ''
        });
        await student.save();
      }
    }

    const session = await refreshSessionStats(sessionId, 'batch');

    res.status(200).json({
      message: 'Review approved and added to analytics.',
      submission,
      session
    });
  } catch (error) {
    console.error('Approve Review Submission Error:', error);
    res.status(500).json({ error: 'Failed to approve review submission.' });
  }
};

export const processWorksheets = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required for grading." });
    }

    const session = await ensureSessionExists(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Grading session not found." });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No image files uploaded." });
    }

    // Each upload is scoped to the active session. No global data is deleted.

    // Use mock mode for development (set USE_MOCK_AI=true in .env)
    const useMockAI = false; // FORCED TO FALSE TO GUARANTEE CLAUDE USE

    if (useMockAI) {
      console.log(`[MOCK MODE] Generating mock grades for ${files.length} files...`);
      const consolidatedGradingLogs = [];
      
      for (let i = 0; i < files.length; i++) {
        try {
          const mockGrade = generateMockGrading();
          const savedDocument = new Submission({
            sessionId,
            studentName: mockGrade.studentName,
            totalScore: mockGrade.totalScore,
            mistakes: mockGrade.mistakes,
            status: mockGrade.status
          });
          await savedDocument.save();
          consolidatedGradingLogs.push(savedDocument);
          
          // Small delay for visual feedback
          if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          consolidatedGradingLogs.push({
            studentName: "Error File",
            totalScore: 0,
            mistakes: [],
            status: "Manual Review Required"
          });
        }
      }
      
      await refreshSessionStats(sessionId, 'batch');
      return res.status(200).json(consolidatedGradingLogs);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Process files in parallel batches
    const consolidatedGradingLogs = [];

    const batchSize = Number(process.env.CLAUDE_BATCH_SIZE) || (process.env.VERCEL ? 2 : 5);
    const batchDelayMs = Number(process.env.CLAUDE_BATCH_DELAY_MS) || 1000;

    const batchStartMs = Date.now();
    let batchInputTokens = 0;
    let batchOutputTokens = 0;
    let batchSuccessCount = 0;

    const gradedResults = await processInBatches(
      files,
      batchSize,
      async (file) => {
        try {
          const imageValidation = validateUploadedImage(file);
          if (!imageValidation.ok) {
            const manualPayload = buildManualReviewPayload(imageValidation.reason, file.originalname || 'Unknown');
            const savedManualDocument = new Submission(buildSubmissionUpdate(sessionId, manualPayload));
            await savedManualDocument.save();
            return savedManualDocument;
          }

          const imagePart = formatBufferToClaudePart(file.buffer, file.mimetype);

          // --- Single Step: Transcribe and Grade the image in one call ---
          const gradingPrompt = buildGradingSystemPrompt(session.answerKey);
          const gradingResult = await generateWithRetry(client, gradingPrompt, imagePart);

          const usage = extractUsage(gradingResult);
          batchInputTokens += usage.inputTokens;
          batchOutputTokens += usage.outputTokens;

          // Extract text from Claude response
          const responseText = gradingResult.content?.[0]?.text || '';
          const parsedGradingPayload = parseAndNormalizeGradingResponse(responseText);

          // Save entry block directly to MongoDB Atlas - Overwriting old records to keep only the latest
          const cleanName = parsedGradingPayload.studentName.trim();
          const update = buildSubmissionUpdate(sessionId, parsedGradingPayload, {
            studentName: cleanName
          });

          const savedDocument = parsedGradingPayload.status === 'Success'
            ? await Submission.findOneAndUpdate(
                { sessionId, studentName: { $regex: new RegExp(`^${escapeRegExp(cleanName)}$`, 'i') } },
                update,
                { returnDocument: 'after', upsert: true }
              )
            : await new Submission(update).save();

          if (parsedGradingPayload.status === 'Success') {
            batchSuccessCount += 1;
          }

          return savedDocument;
        } catch (innerTaskError) {
          console.error("Individual File Processing Error:", innerTaskError);
          return {
            studentName: "Error File",
            sessionId,
            totalScore: 0,
            mistakes: [],
            errorSummary: MANUAL_REVIEW_MESSAGE,
            status: "Manual Review Required"
          };
        }
      },
      batchDelayMs
    );

    for (const result of gradedResults) {
      consolidatedGradingLogs.push(
        result.status === 'fulfilled' ? result.value : {
          studentName: "Error File",
          sessionId,
          totalScore: 0,
          mistakes: [],
          status: "Manual Review Required"
        }
      );
    }

    await refreshSessionStats(sessionId, 'batch');

    const batchDurationMs = Date.now() - batchStartMs;
    if (files.length > 0) {
      await recordGradingRun({
        sessionId,
        worksheetsCount: files.length,
        successCount: batchSuccessCount,
        inputTokens: batchInputTokens,
        outputTokens: batchOutputTokens,
        durationMs: batchDurationMs,
        batchSize,
        source: 'batch',
      });
    }

    res.status(200).json(consolidatedGradingLogs);

  } catch (globalControllerError) {
    console.error("Global Evaluation Pipeline Error:", globalControllerError);
    res.status(500).json({ error: "Internal grading pipeline execution failure." });
  }
};

export const fetchClassroomHeatmap = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    const studentsSet = {};
    const questionsSet = {};

    allSubmissions.forEach(s => {
      s.mistakes.forEach(m => {
        const concept = m.conceptMissed;
        if (!studentsSet[concept]) studentsSet[concept] = new Set();
        if (!questionsSet[concept]) questionsSet[concept] = new Set();
        
        studentsSet[concept].add(s.studentName.toLowerCase());
        questionsSet[concept].add(m.questionNumber);
      });
    });

    const aggregated = Object.keys(studentsSet).map(concept => ({
      _id: concept,
      totalStudentsAffected: studentsSet[concept].size,
      questionReferences: Array.from(questionsSet[concept])
    })).sort((a, b) => b.totalStudentsAffected - a.totalStudentsAffected);

    const totalSubmissions = allSubmissions.length;

    // Attach percentage of class affected for each concept to provide a stable
    // metric that matches how recommendations compute priority.
    const withPercentage = aggregated.map(item => ({
      ...item,
      percentageOfClass: totalSubmissions > 0 ? Math.round((item.totalStudentsAffected / totalSubmissions) * 100) : 0
    }));
    const adaptiveBuckets = buildAdaptiveConceptBuckets(withPercentage);

    res.status(200).json({
      totalSubmissions,
      thresholds: adaptiveBuckets.thresholds,
      items: adaptiveBuckets.items
    });
  } catch (aggregationError) {
    console.error("Database Aggregation Pipeline Crash:", aggregationError);
    res.status(500).json({ error: "Failed to generate class conceptual heatmap metrics." });
  }
};


// HELPER: Merge multiple test submissions for the exact same student.
// This properly maps multiple tests back into 20 unique students instead of duplicating them.
const getAggregatedStudents = async (sessionId) => {
  if (!sessionId) return [];

  const allSubmissions = await Submission.find({ sessionId, status: 'Success' }).sort({ createdAt: 1 });
  const studentMap = {};
  
  for (const s of allSubmissions) {
    let name = s.studentName.toLowerCase().trim();
    if (name.startsWith('name:')) name = name.replace('name:', '').trim(); 
    
    // Keep only the latest submission (older ones are overwritten due to sort order)
    studentMap[name] = { 
      studentName: s.studentName,
      totalScore: s.totalScore, 
      mistakes: s.mistakes, 
      status: s.status 
    };
  }
  
  return Object.values(studentMap);
};

export const fetchClassAnalytics = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    
    if (!allSubmissions.length) {
      return res.status(200).json({
        totalStudents: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        studentsAboveAverage: 0,
        scoreDistribution: [],
        performanceMetrics: {
          excellent: 0,
          good: 0,
          average: 0,
          needsImprovement: 0
        }
      });
    }

    // Core metrics
    const scores = allSubmissions.map(s => s.totalScore);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const studentsAboveAverage = scores.filter(s => s > averageScore).length;

    // Score distribution buckets
    const scoreDistribution = [
      { range: '0-20', count: scores.filter(s => s >= 0 && s <= 20).length },
      { range: '21-40', count: scores.filter(s => s >= 21 && s <= 40).length },
      { range: '41-60', count: scores.filter(s => s >= 41 && s <= 60).length },
      { range: '61-80', count: scores.filter(s => s >= 61 && s <= 80).length },
      { range: '81-100', count: scores.filter(s => s >= 81 && s <= 100).length }
    ];

    // Performance categories
    const excellent = scores.filter(s => s >= 80).length;
    const good = scores.filter(s => s >= 60 && s < 80).length;
    const average = scores.filter(s => s >= 40 && s < 60).length;
    const needsImprovement = scores.filter(s => s < 40).length;

    res.status(200).json({
      totalStudents: allSubmissions.length,
      averageScore,
      highestScore,
      lowestScore,
      studentsAboveAverage,
      scoreDistribution,
      performanceMetrics: {
        excellent,
        good,
        average,
        needsImprovement
      }
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to generate analytics." });
  }
};

export const fetchTopicRecommendations = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    const studentsSet = {};
    
    allSubmissions.forEach(s => {
      s.mistakes.forEach(m => {
        const concept = m.conceptMissed;
        if (!studentsSet[concept]) studentsSet[concept] = new Set();
        studentsSet[concept].add(s.studentName.toLowerCase());
      });
    });

    const heatmapData = Object.keys(studentsSet).map(concept => ({
      _id: concept,
      totalStudentsAffected: studentsSet[concept].size
    })).sort((a, b) => b.totalStudentsAffected - a.totalStudentsAffected);

    const totalSubmissions = allSubmissions.length;

    const withPct = heatmapData.map(item => ({
      topic: item._id,
      studentsAffected: item.totalStudentsAffected,
      percentageOfClass: totalSubmissions > 0 ? Math.round((item.totalStudentsAffected / totalSubmissions) * 100) : 0
    }));
    const adaptiveBuckets = buildAdaptiveConceptBuckets(withPct);

    // If a debug view was requested, return a merged heatmap + recommendations
    if (req.query && (req.query.debug === '1' || req.query.debug === 'true')) {
      const recommendationsDebug = adaptiveBuckets.items.map(item => {
        const priority = item.categoryKey === 'very_high'
          ? 'VERY_HIGH'
          : item.categoryKey === 'high'
          ? 'HIGH'
          : item.categoryKey === 'medium'
          ? 'MEDIUM'
          : 'LOW';

        const displayPriority = priority === 'VERY_HIGH'
          ? 'Very High'
          : priority === 'HIGH'
          ? 'High'
          : priority === 'MEDIUM'
          ? 'Medium'
          : 'Low';

        const recommendation = priority === 'VERY_HIGH'
          ? 'Urgent: Most students struggling. Consider re-teaching with examples.'
          : priority === 'HIGH'
          ? 'Important: Many students need support. Add practice worksheets.'
          : priority === 'MEDIUM'
          ? 'Moderate: Several students need targeted help.'
          : 'Minor: A few students need help. Offer extra tutoring.';

        return { topic: item.topic, studentsAffected: item.studentsAffected, percentageOfClass: item.percentageOfClass, intensityLabel: item.intensityLabel, categoryKey: item.categoryKey, priority, displayPriority, recommendation };
      });

      const merged = adaptiveBuckets.items.map(it => {
        const rec = recommendationsDebug.find(r => r.topic === it.topic) || null;
        return {
          topic: it.topic,
          heatmapItem: {
            studentsAffected: it.studentsAffected,
            percentageOfClass: it.percentageOfClass,
            intensityLabel: it.intensityLabel,
            categoryKey: it.categoryKey
          },
          recommendation: rec,
        };
      });

      return res.status(200).json({ thresholds: adaptiveBuckets.thresholds, merged });
    }

    const recommendations = adaptiveBuckets.items.map(item => {
      const priority = item.categoryKey === 'very_high'
        ? 'VERY_HIGH'
        : item.categoryKey === 'high'
        ? 'HIGH'
        : item.categoryKey === 'medium'
        ? 'MEDIUM'
        : 'LOW';

      const displayPriority = priority === 'VERY_HIGH'
        ? 'Very High'
        : priority === 'HIGH'
        ? 'High'
        : priority === 'MEDIUM'
        ? 'Medium'
        : 'Low';

      const recommendation = priority === 'VERY_HIGH'
        ? 'Urgent: Most students struggling. Consider re-teaching with examples.'
        : priority === 'HIGH'
        ? 'Important: Many students need support. Add practice worksheets.'
        : priority === 'MEDIUM'
        ? 'Moderate: Several students need targeted help.'
        : 'Minor: A few students need help. Offer extra tutoring.';

      return { ...item, categoryKey: item.categoryKey || item.intensityLabel, priority, displayPriority, recommendation };
    });

    res.status(200).json({ thresholds: adaptiveBuckets.thresholds, recommendations });
  } catch (error) {
    console.error("Recommendations Error:", error);
    res.status(500).json({ error: "Failed to generate recommendations." });
  }
};

export const fetchStudentRankings = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    const rankings = allSubmissions.sort((a,b) => b.totalScore - a.totalScore).slice(0, 20);

    const withRank = rankings.map((student, index) => ({
      rank: index + 1,
      studentName: student.studentName,
      totalScore: student.totalScore,
      mistakeCount: student.mistakes.length,
      status: student.status
    }));

    res.status(200).json(withRank);
  } catch (error) {
    console.error("Rankings Error:", error);
    res.status(500).json({ error: "Failed to generate rankings." });
  }
};

export const fetchConceptAnalysis = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    const conceptData = {};
    
    allSubmissions.forEach(s => {
      s.mistakes.forEach(m => {
        const concept = m.conceptMissed;
        if (!conceptData[concept]) {
          conceptData[concept] = { students: new Set(), scores: [] };
        }
        if (!conceptData[concept].students.has(s.studentName.toLowerCase())) {
          conceptData[concept].students.add(s.studentName.toLowerCase());
          conceptData[concept].scores.push(s.totalScore);
        }
      });
    });

    const aggregated = Object.keys(conceptData).map(concept => {
      const data = conceptData[concept];
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      return {
        _id: concept,
        frequency: data.students.size,
        studentsList: Array.from(data.students),
        totalStudentsAffected: data.students.size,
        avgScoreOfAffected: avgScore
      };
    }).sort((a, b) => b.frequency - a.frequency);

    const totalSubmissions = allSubmissions.length;

    const withPct = aggregated.map(item => ({
      topic: item._id,
      frequency: item.frequency,
      studentsList: item.studentsList,
      avgScoreOfAffected: item.avgScoreOfAffected,
      percentageOfClass: totalSubmissions > 0 ? Math.round((item.frequency / totalSubmissions) * 100) : 0
    }));

    const adaptive = buildAdaptiveConceptBuckets(withPct);

    const analysis = adaptive.items.map(item => ({
      concept: item._id || item.topic || item.topic,
      failureFrequency: item.totalStudentsAffected || item.frequency || 0,
      uniqueStudentsAffected: (item.studentsList && item.studentsList.length) || item.totalStudentsAffected || 0,
      averageScoreOfAffectedStudents: Math.round(item.avgScoreOfAffected || 0),
      percentageOfClass: item.percentageOfClass || 0,
      categoryKey: item.categoryKey,
      difficulty: item.categoryKey === 'very_high' ? 'VERY HARD' : item.categoryKey === 'high' ? 'HARD' : item.categoryKey === 'medium' ? 'MODERATE' : 'LOW'
    }));

    res.status(200).json({ thresholds: adaptive.thresholds, analysis });
  } catch (error) {
    console.error("Concept Analysis Error:", error);
    res.status(500).json({ error: "Failed to generate concept analysis." });
  }
};

// NEW INSIGHT: Student-Centric Performance (each student's weak/strong concepts)
export const fetchStudentWeakAndStrengths = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const allSubmissions = await getAggregatedStudents(sessionId);
    const allConcepts = await getSessionConcepts(sessionId, allSubmissions);
    
    const studentAnalysis = allSubmissions.map(student => {
      const weakConcepts = [...new Set(student.mistakes.map(m => m.conceptMissed))];
      const strongConcepts = allConcepts.filter(c => !weakConcepts.includes(c));
      
      return {
        studentName: student.studentName,
        score: student.totalScore,
        weakAreas: weakConcepts,
        strongAreas: strongConcepts.slice(0, 3),
        mistakeCount: student.mistakes.length,
        riskLevel: student.totalScore < 40 ? 'CRITICAL' : student.totalScore < 60 ? 'HIGH' : student.totalScore < 80 ? 'MEDIUM' : 'LOW',
        personalizedMessage: student.totalScore >= 80 ? 'Excellent work! Keep it up!' :
                            student.totalScore >= 60 ? 'Good progress. Focus on the highlighted weak areas.' :
                            student.totalScore >= 40 ? 'You need support. Please see teacher for intervention.' :
                            'Critical attention needed. Urgent tutoring recommended.'
      };
    });

    // Sort by risk level
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const sorted = studentAnalysis.sort((a, b) => {
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return a.score - b.score;
    });
    
    res.status(200).json(sorted);
  } catch (error) {
    console.error("Student Strength Analysis Error:", error);
    res.status(500).json({ error: "Failed to generate student analysis." });
  }
};

// NEW INSIGHT: At-Risk Students Identification
export const fetchAtRiskStudents = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    if (!allSubmissions.length) {
      return res.status(200).json([]);
    }

    const scores = allSubmissions.map(s => s.totalScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - avgScore, 2), 0) / scores.length);
    
    const atRiskStudents = allSubmissions
      .filter(s => s.totalScore < 60 || s.mistakes.length > 4)
      .map(s => ({
        studentName: s.studentName,
        score: s.totalScore,
        mistakes: s.mistakes.length,
        performanceGap: Math.round(avgScore - s.totalScore),
        topMistakes: [...new Set(s.mistakes.map(m => m.conceptMissed))],
        interventionType: s.mistakes.length > 4 ? 'Comprehensive Tutoring' : 'Targeted Concept Review',
        estimatedStudyHours: s.totalScore < 40 ? 10 : s.totalScore < 60 ? 6 : 3
      }))
      .sort((a, b) => a.score - b.score);
    
    res.status(200).json(atRiskStudents);
  } catch (error) {
    console.error("At-Risk Analysis Error:", error);
    res.status(500).json({ error: "Failed to identify at-risk students." });
  }
};



// NEW INSIGHT: Class Strengths & Collective Performance
export const fetchClassStrengthsAndWeaknesses = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const allSubmissions = await getAggregatedStudents(sessionId);
    const allConcepts = await getSessionConcepts(sessionId, allSubmissions);
    
    const conceptStats = allConcepts.map(concept => {
      const mistakeCount = allSubmissions.filter(
        s => s.mistakes.some(m => m.conceptMissed === concept)
      ).length;
      return { concept, mistakeRate: mistakeCount };
    });
    
    const sorted = conceptStats.sort((a, b) => b.mistakeRate - a.mistakeRate);
    const strengths = sorted.slice(-3).reverse();
    const weaknesses = sorted.slice(0, 3);
    
    res.status(200).json({
      classStrengths: strengths.map(s => ({ topic: s.concept, mistakesCount: s.mistakeRate })),
      classWeaknesses: weaknesses.map(w => ({ topic: w.concept, mistakesCount: w.mistakeRate })),
      overallTrend: 'The class shows strong conceptual foundation but needs targeted support on advanced topics'
    });
  } catch (error) {
    console.error("Class Strengths Analysis Error:", error);
    res.status(500).json({ error: "Failed to analyze class strengths." });
  }
};

// NEW INSIGHT: Peer Benchmarking (how each student compares to peers)
export const fetchPeerBenchmarking = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    if (!allSubmissions.length) {
      return res.status(200).json([]);
    }

    allSubmissions.sort((a, b) => b.totalScore - a.totalScore);
    const avgScore = allSubmissions.reduce((a, b) => a + b.totalScore, 0) / allSubmissions.length;
    
    const benchmarks = allSubmissions.map(student => ({
      studentName: student.studentName,
      score: student.totalScore,
      percentile: Math.round((allSubmissions.filter(s => s.totalScore <= student.totalScore).length / allSubmissions.length) * 100),
      vsClassAverage: student.totalScore - Math.round(avgScore),
      performanceLevel: student.totalScore >= avgScore * 1.2 ? 'Top Tier' :
                       student.totalScore >= avgScore ? 'Above Average' :
                       student.totalScore >= avgScore * 0.8 ? 'Average' : 'Below Average',
      peers: allSubmissions
        .filter(s => Math.abs(s.totalScore - student.totalScore) < 10 && s.studentName !== student.studentName)
        .slice(0, 3)
        .map(p => p.studentName)
    }));
    
    res.status(200).json(benchmarks);
  } catch (error) {
    console.error("Peer Benchmarking Error:", error);
    res.status(500).json({ error: "Failed to generate peer benchmarking." });
  }
};



// NEW INSIGHT: Performance Distribution Analysis
export const fetchPerformanceDistribution = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    const scores = allSubmissions.map(s => s.totalScore);
    
    if (scores.length === 0) {
       return res.status(200).json({
         min: 0, max: 0, mean: 0, median: 0, stdDev: 0, bimodal: false, skewness: 'symmetric', insights: [], distributionType: 'Normal'
       });
    }

    const mean = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const sortedScores = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    const median = sortedScores.length % 2 === 0 ? Math.round((sortedScores[mid - 1] + sortedScores[mid]) / 2) : sortedScores[mid];
    const stdDev = Math.round(Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / scores.length));

    // Check if bimodal
    const groupedScores = [[], [], [], [], []];
    scores.forEach(s => {
      if (s < 20) groupedScores[0].push(s);
      else if (s < 40) groupedScores[1].push(s);
      else if (s < 60) groupedScores[2].push(s);
      else if (s < 80) groupedScores[3].push(s);
      else groupedScores[4].push(s);
    });
    
    const bucketCounts = groupedScores.map(g => g.length);
    let peaks = 0;
    for (let i = 0; i < 5; i++) {
      const prev = i === 0 ? 0 : bucketCounts[i-1];
      const next = i === 4 ? 0 : bucketCounts[i+1];
      if (bucketCounts[i] > prev && bucketCounts[i] > next && bucketCounts[i] > scores.length * 0.1) {
        peaks++;
      }
    }
    const bimodal = peaks >= 2;
    
    let skewness = 'symmetric';
    if (mean > median + 3) skewness = 'right-skewed';
    if (mean < median - 3) skewness = 'left-skewed';

    const distributionType = bimodal ? 'Bimodal' : (skewness !== 'symmetric' ? 'Skewed' : 'Normal');

    const dynamicInsights = [];
    if (bimodal) {
      dynamicInsights.push("Performance is polarized, suggesting two distinct groups of learners.");
    } else if (skewness === 'left-skewed') {
      dynamicInsights.push("Most students are performing well above average, with a few falling behind.");
    } else if (skewness === 'right-skewed') {
      dynamicInsights.push("Many students are struggling, pulling the majority of scores below average.");
    } else {
      dynamicInsights.push("Class performance follows a relatively balanced, symmetric distribution.");
    }

    if (stdDev > 15) {
      dynamicInsights.push("There is high variance in scores, indicating a need for differentiated instruction.");
    } else {
      dynamicInsights.push("Scores are tightly clustered, showing consistent understanding across the cohort.");
    }
    
    dynamicInsights.push(`Overall class average is ${mean}%, with a score range of ${Math.max(...scores) - Math.min(...scores)} points.`);

    const distribution = {
      min: Math.min(...scores),
      max: Math.max(...scores),
      mean,
      median,
      stdDev,
      bimodal,
      skewness,
      distributionType,
      insights: dynamicInsights
    };
    
    res.status(200).json(distribution);
  } catch (error) {
    console.error("Performance Distribution Error:", error);
    res.status(500).json({ error: "Failed to analyze performance distribution." });
  }
};

export const fetchClassMisconceptions = async (req, res) => {
  try {
    const allSubmissions = await getAggregatedStudents(getRequestSessionId(req));
    const misconceptionMap = {};

    allSubmissions.forEach(student => {
      (student.mistakes || []).forEach(mistake => {
        const concept = mistake.conceptMissed || 'Unknown Concept';
        const key = concept.toLowerCase();

        if (!misconceptionMap[key]) {
          misconceptionMap[key] = {
            concept,
            misconception: `Repeated difficulty with ${concept}`,
            severity: 'minor',
            occurrences: 0,
            studentsAffected: new Set()
          };
        }

        misconceptionMap[key].occurrences += 1;
        misconceptionMap[key].studentsAffected.add(student.studentName);
      });
    });

    const misconceptions = Object.values(misconceptionMap)
      .map(item => {
        const studentsAffectedCount = item.studentsAffected.size;
        return {
          concept: item.concept,
          misconception: item.misconception,
          severity: studentsAffectedCount >= 3 || item.occurrences >= 5 ? 'major' : item.severity,
          occurrences: item.occurrences,
          studentsAffectedCount
        };
      })
      .sort((a, b) => b.studentsAffectedCount - a.studentsAffectedCount || b.occurrences - a.occurrences)
      .slice(0, 5);

    res.status(200).json(misconceptions);
  } catch (error) {
    console.error('Session Misconceptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch session misconceptions.' });
  }
};

// Debug endpoint: return merged heatmap items and recommendations side-by-side
export const fetchRecommendationsDebug = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const heatmapData = await Submission.aggregate([
      { $match: { sessionId, status: 'Success' } },
      { $unwind: "$mistakes" },
      { $group: { _id: "$mistakes.conceptMissed", studentsSet: { $addToSet: { $toLower: "$studentName" } } } },
      { $addFields: { totalStudentsAffected: { $size: "$studentsSet" } } },
      { $sort: { totalStudentsAffected: -1 } }
    ]);

    const totalSubmissions = (await getAggregatedStudents(sessionId)).length;

    const withPct = heatmapData.map(item => ({
      topic: item._id,
      studentsAffected: item.totalStudentsAffected,
      percentageOfClass: totalSubmissions > 0 ? Math.round((item.totalStudentsAffected / totalSubmissions) * 100) : 0
    }));

    const adaptiveBuckets = buildAdaptiveConceptBuckets(withPct);

    const recommendations = adaptiveBuckets.items.map(item => {
      const priority = item.categoryKey === 'very_high'
        ? 'VERY_HIGH'
        : item.categoryKey === 'high'
        ? 'HIGH'
        : item.categoryKey === 'medium'
        ? 'MEDIUM'
        : 'LOW';

      const displayPriority = priority === 'VERY_HIGH'
        ? 'Very High'
        : priority === 'HIGH'
        ? 'High'
        : priority === 'MEDIUM'
        ? 'Medium'
        : 'Low';

      const recommendation = priority === 'VERY_HIGH'
        ? 'Urgent: Most students struggling. Consider re-teaching with examples.'
        : priority === 'HIGH'
        ? 'Important: Many students need support. Add practice worksheets.'
        : priority === 'MEDIUM'
        ? 'Moderate: Several students need targeted help.'
        : 'Minor: A few students need help. Offer extra tutoring.';

      return { topic: item.topic, studentsAffected: item.studentsAffected, percentageOfClass: item.percentageOfClass, intensityLabel: item.intensityLabel, categoryKey: item.categoryKey, priority, displayPriority, recommendation };
    });

    const merged = adaptiveBuckets.items.map(it => {
      const rec = recommendations.find(r => r.topic === it.topic) || null;
      return {
        topic: it.topic,
        heatmapItem: {
          studentsAffected: it.studentsAffected,
          percentageOfClass: it.percentageOfClass,
          intensityLabel: it.intensityLabel,
          categoryKey: it.categoryKey
        },
        recommendation: rec,
      };
    });

    res.status(200).json({ thresholds: adaptiveBuckets.thresholds, merged });
  } catch (error) {
    console.error('Recommendations Debug Error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations debug view.' });
  }
};
