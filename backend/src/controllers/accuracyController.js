import AccuracyReport from '../models/AccuracyReport.js';
import {
  BENCHMARK_MAX_CASES,
  getBenchmarkSummary,
  runAccuracyBenchmark
} from '../utils/accuracyBenchmark.js';

export const getLatestAccuracyReport = async (req, res) => {
  try {
    const [latestReport, benchmark] = await Promise.all([
      AccuracyReport.findOne().sort({ createdAt: -1 }),
      getBenchmarkSummary()
    ]);

    res.status(200).json({
      benchmark,
      report: latestReport
    });
  } catch (error) {
    console.error('Accuracy Report Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch accuracy report.' });
  }
};

export const runAccuracyReport = async (req, res) => {
  try {
    const mode = req.body?.mode === 'mock' || req.query?.mode === 'mock' ? 'mock' : 'live';
    const requestedMaxCases = Number(req.body?.maxCases || req.query?.maxCases || BENCHMARK_MAX_CASES);
    const maxCases = Math.min(
      BENCHMARK_MAX_CASES,
      Math.max(1, requestedMaxCases || BENCHMARK_MAX_CASES)
    );
    const reportPayload = await runAccuracyBenchmark({ maxCases, mode });
    const savedReport = await AccuracyReport.create(reportPayload);

    res.status(201).json({
      benchmark: await getBenchmarkSummary(),
      report: savedReport
    });
  } catch (error) {
    console.error('Accuracy Report Run Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to run accuracy benchmark.'
    });
  }
};
