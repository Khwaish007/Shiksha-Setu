import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import {
  buildGradingSystemPrompt,
  formatBufferToClaudePart,
  normalizeAnswerKeyPayload,
  parseAndNormalizeGradingResponse
} from './gradingSafety.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_MANIFEST_PATH = path.resolve(__dirname, '../benchmark/benchmarkCases.json');

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

const generateWithClaude = async (client, systemPrompt, imagePart) => {
  const result = await client.messages.create({
    model: 'claude-opus-4-1-20250805',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          imagePart,
          {
            type: 'text',
            text: 'Grade this benchmark worksheet and return only the required JSON.'
          }
        ]
      }
    ]
  });

  return result.content?.[0]?.text || '';
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

const gradeBenchmarkCase = async ({ benchmarkCase, client, answerKeyCache, mode, index }) => {
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
  const responseText = await generateWithClaude(
    client,
    buildGradingSystemPrompt(answerKey),
    formatBufferToClaudePart(buffer, mimeType)
  );

  return parseAndNormalizeGradingResponse(responseText);
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

export const runAccuracyBenchmark = async ({ maxCases = 12, mode = 'live' } = {}) => {
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
  const selectedCases = benchmarkCases.slice(0, Math.max(1, Number(maxCases) || 12));
  const answerKeyCache = new Map();
  const client = mode === 'live'
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  if (mode === 'live' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required to run the live accuracy benchmark.');
  }

  const comparedCases = [];

  for (let index = 0; index < selectedCases.length; index += 1) {
    const benchmarkCase = selectedCases[index];
    try {
      const actual = await gradeBenchmarkCase({
        benchmarkCase,
        client,
        answerKeyCache,
        mode,
        index
      });
      comparedCases.push(compareCase(benchmarkCase, actual));
    } catch (error) {
      comparedCases.push(compareCase(benchmarkCase, {
        status: 'Failed',
        totalScore: 0,
        mistakes: [],
        errorSummary: error.message
      }));
    }
  }

  return buildAggregateReport({
    manifest,
    comparedCases,
    mode,
    notes: mode === 'mock'
      ? 'Mock mode is for UI checks only. Use live mode before presenting accuracy claims.'
      : selectedCases.length < manifest.cases.length
      ? `Live Vercel-safe benchmark sample run through the same Claude grading prompt used by uploads (${selectedCases.length}/${manifest.cases.length} labeled cases). Run the backend CLI for the full benchmark.`
      : 'Live benchmark run through the same Claude grading prompt used by uploads.'
  });
};
