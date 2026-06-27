import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  normalizeAnswerKeyPayload,
} from './gradingSafety.js';
import { executeWorksheetGrading } from './gradingPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_MANIFEST_PATH = path.resolve(__dirname, '../benchmark/benchmarkCases.json');
export const BENCHMARK_MAX_CASES = 5;

const MIME_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

const normalizeConcept = (value) => String(value || '').trim().toLowerCase();

const uniqueConcepts = (values = []) => (
  [...new Set(values.map(normalizeConcept).filter(Boolean))]
);

const displayConcept = (value) => String(value || '').trim();

const roundMetric = (value, digits = 2) => Number((Number(value) || 0).toFixed(digits));

const getWorkspaceRootCandidates = () => [
  process.cwd(),
  path.resolve(__dirname, '../..'),
  path.resolve(process.cwd(), '..'),
  path.resolve(__dirname, '../../..')
];

const resolveWorkspacePath = (relativePath) => {
  if (path.isAbsolute(relativePath)) return relativePath;

  for (const root of getWorkspaceRootCandidates()) {
    const candidate = path.resolve(root, relativePath);
    if (existsSync(candidate)) return candidate;
  }

  return path.resolve(process.cwd(), relativePath);
};

export const loadBenchmarkManifest = async (manifestPath = process.env.BENCHMARK_LABELS_PATH || DEFAULT_MANIFEST_PATH) => {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const cases = Array.isArray(manifest.cases) ? manifest.cases : [];

  return {
    title: manifest.title || 'Prototype Accuracy Benchmark',
    datasetVersion: manifest.datasetVersion || 'prototype-v1',
    description: manifest.description || '',
    cases
  };
};

export const getBenchmarkSummary = async () => {
  const manifest = await loadBenchmarkManifest();
  const availableCases = manifest.cases.filter(item => existsSync(resolveWorkspacePath(item.file))).length;

  return {
    title: manifest.title,
    datasetVersion: manifest.datasetVersion,
    description: manifest.description,
    totalCases: manifest.cases.length,
    availableCases
  };
};

const loadAnswerKeyForCase = async (benchmarkCase, answerKeyCache) => {
  if (!benchmarkCase.answerKeyFile) return null;
  const answerKeyPath = resolveWorkspacePath(benchmarkCase.answerKeyFile);

  if (answerKeyCache.has(answerKeyPath)) {
    return answerKeyCache.get(answerKeyPath);
  }

  const raw = await fs.readFile(answerKeyPath, 'utf8');
  const parsed = JSON.parse(raw);
  const normalized = normalizeAnswerKeyPayload(parsed, 'typed');
  answerKeyCache.set(answerKeyPath, normalized);
  return normalized;
};

const simulateBenchmarkResult = (benchmarkCase, index) => {
  const expectedConcepts = benchmarkCase.expectedConcepts || [];
  const scoreOffset = [-4, 2, 0, 5, -1][index % 5];
  const conceptDrop = index % 4 === 0 ? 1 : 0;

  return {
    status: benchmarkCase.expectedStatus || 'Success',
    totalScore: Math.min(100, Math.max(0, Number(benchmarkCase.expectedScore || 0) + scoreOffset)),
    mistakes: expectedConcepts.slice(conceptDrop).map((concept, conceptIndex) => ({
      questionNumber: `Q${conceptIndex + 1}`,
      conceptMissed: concept
    })),
    errorSummary: '',
    reviewReason: '',
    questionResults: [],
    confidenceSummary: {
      averageConfidence: 0.9,
      minimumConfidence: 0.82,
      lowConfidenceCount: 0
    }
  };
};

const gradeBenchmarkCase = async ({ benchmarkCase, answerKeyCache, mode, index }) => {
  if (mode === 'mock') {
    return simulateBenchmarkResult(benchmarkCase, index);
  }

  const imagePath = resolveWorkspacePath(benchmarkCase.file);
  const extension = path.extname(imagePath).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension];

  if (!mimeType) {
    throw new Error(`Unsupported benchmark image type for ${benchmarkCase.file}`);
  }

  const buffer = await fs.readFile(imagePath);
  const answerKey = await loadAnswerKeyForCase(benchmarkCase, answerKeyCache);
  const gradeResult = await executeWorksheetGrading(
    {
      buffer,
      mimetype: mimeType,
      originalname: path.basename(imagePath)
    },
    answerKey
  );

  return gradeResult.payload;
};

const processBenchmarkCases = async (cases, processor) => {
  const batchSize = Number(process.env.CLAUDE_BATCH_SIZE) || (process.env.VERCEL ? 2 : 5);
  const batchDelayMs = Number(process.env.CLAUDE_BATCH_DELAY_MS) || 1000;
  const results = [];

  for (let startIndex = 0; startIndex < cases.length; startIndex += batchSize) {
    const batch = cases.slice(startIndex, startIndex + batchSize);
    const batchResults = await Promise.all(
      batch.map((benchmarkCase, batchIndex) => processor(benchmarkCase, startIndex + batchIndex))
    );
    results.push(...batchResults);

    if (startIndex + batchSize < cases.length && batchDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  return results;
};

const compareCase = (benchmarkCase, actual) => {
  const expectedConcepts = uniqueConcepts(benchmarkCase.expectedConcepts);
  const actualConcepts = uniqueConcepts((actual.mistakes || []).map(item => item.conceptMissed));
  const truePositiveConcepts = actualConcepts.filter(concept => expectedConcepts.includes(concept));
  const falsePositiveConcepts = actualConcepts.filter(concept => !expectedConcepts.includes(concept));
  const falseNegativeConcepts = expectedConcepts.filter(concept => !actualConcepts.includes(concept));
  const actualStatus = actual.status || 'Failed';
  const expectedStatus = benchmarkCase.expectedStatus || 'Success';
  const isScoreComparable =
    expectedStatus === 'Success' &&
    actualStatus !== 'Manual Review Required' &&
    actualStatus !== 'Failed';
  const expectedScore = Number(benchmarkCase.expectedScore) || 0;
  const actualScore = Number(actual.totalScore) || 0;

  return {
    caseId: benchmarkCase.caseId,
    dataset: benchmarkCase.dataset || '',
    file: benchmarkCase.file,
    studentName: benchmarkCase.studentName || 'Unknown',
    expectedStatus,
    actualStatus,
    expectedScore,
    actualScore,
    scoreError: isScoreComparable ? Math.abs(expectedScore - actualScore) : null,
    expectedConcepts: (benchmarkCase.expectedConcepts || []).map(displayConcept),
    actualConcepts: (actual.mistakes || []).map(item => displayConcept(item.conceptMissed)).filter(Boolean),
    truePositiveConcepts,
    falsePositiveConcepts,
    falseNegativeConcepts,
    errorSummary: actual.errorSummary || '',
    reviewReason: actual.reviewReason || ''
  };
};

const buildAggregateReport = ({ manifest, comparedCases, mode, notes }) => {
  const scoreErrors = comparedCases
    .map(item => item.scoreError)
    .filter(value => Number.isFinite(value));
  const truePositiveCount = comparedCases.reduce((sum, item) => sum + item.truePositiveConcepts.length, 0);
  const falsePositiveCount = comparedCases.reduce((sum, item) => sum + item.falsePositiveConcepts.length, 0);
  const falseNegativeCount = comparedCases.reduce((sum, item) => sum + item.falseNegativeConcepts.length, 0);
  const totalCases = comparedCases.length;

  const manualReviewCount = comparedCases.filter(item => item.actualStatus === 'Manual Review Required').length;
  const needsTeacherReviewCount = comparedCases.filter(item => item.actualStatus === 'Needs Teacher Review').length;
  const successCount = comparedCases.filter(item => item.actualStatus === 'Success').length;
  const failedCount = comparedCases.filter(item => item.actualStatus === 'Failed').length;

  return {
    title: manifest.title,
    datasetVersion: manifest.datasetVersion,
    runMode: mode,
    status: failedCount === totalCases ? 'failed' : 'completed',
    totalCases,
    scoreMae: scoreErrors.length
      ? roundMetric(scoreErrors.reduce((sum, value) => sum + value, 0) / scoreErrors.length)
      : 0,
    conceptPrecision: truePositiveCount + falsePositiveCount
      ? roundMetric(truePositiveCount / (truePositiveCount + falsePositiveCount), 3)
      : 0,
    conceptRecall: truePositiveCount + falseNegativeCount
      ? roundMetric(truePositiveCount / (truePositiveCount + falseNegativeCount), 3)
      : 0,
    manualReviewRate: totalCases ? roundMetric(manualReviewCount / totalCases, 3) : 0,
    teacherReviewRate: totalCases ? roundMetric(needsTeacherReviewCount / totalCases, 3) : 0,
    statusBreakdown: {
      success: successCount,
      manualReview: manualReviewCount,
      needsTeacherReview: needsTeacherReviewCount,
      failed: failedCount
    },
    cases: comparedCases,
    notes
  };
};

export const runAccuracyBenchmark = async ({ maxCases = BENCHMARK_MAX_CASES, mode = 'live' } = {}) => {
  const manifest = await loadBenchmarkManifest();
  const benchmarkCases = mode === 'live'
    ? [...manifest.cases].sort((a, b) => {
        const aPath = resolveWorkspacePath(a.file);
        const bPath = resolveWorkspacePath(b.file);
        const aSize = existsSync(aPath) ? statSync(aPath).size : Number.MAX_SAFE_INTEGER;
        const bSize = existsSync(bPath) ? statSync(bPath).size : Number.MAX_SAFE_INTEGER;
        return aSize - bSize;
      })
    : manifest.cases;
  const caseLimit = Math.min(
    BENCHMARK_MAX_CASES,
    Math.max(1, Number(maxCases) || BENCHMARK_MAX_CASES)
  );
  const selectedCases = benchmarkCases.slice(0, caseLimit);
  const answerKeyCache = new Map();

  if (mode === 'live' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required to run the live accuracy benchmark.');
  }

  const comparedCases = await processBenchmarkCases(
    selectedCases,
    async (benchmarkCase, index) => {
      try {
        const actual = await gradeBenchmarkCase({
          benchmarkCase,
          answerKeyCache,
          mode,
          index
        });
        return compareCase(benchmarkCase, actual);
      } catch (error) {
        return compareCase(benchmarkCase, {
          status: 'Failed',
          totalScore: 0,
          mistakes: [],
          errorSummary: error.message
        });
      }
    }
  );

  return buildAggregateReport({
    manifest,
    comparedCases,
    mode,
    notes: mode === 'mock'
      ? 'Mock mode is for UI checks only. Use live mode before presenting accuracy claims.'
      : 'Live benchmark run through the same Claude grading prompt used by uploads.'
  });
};
