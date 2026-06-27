import dotenv from 'dotenv';
import connectDatabase from '../config/db.js';
import AccuracyReport from '../models/AccuracyReport.js';
import { BENCHMARK_MAX_CASES, runAccuracyBenchmark } from '../utils/accuracyBenchmark.js';

dotenv.config();

const getArgValue = (name, fallback) => {
  const prefix = `--${name}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const main = async () => {
  const maxCases = Number(getArgValue('maxCases', BENCHMARK_MAX_CASES));
  const mode = getArgValue('mode', 'live') === 'mock' ? 'mock' : 'live';

  await connectDatabase();
  const reportPayload = await runAccuracyBenchmark({ maxCases, mode });
  const savedReport = await AccuracyReport.create(reportPayload);

  console.log('Accuracy benchmark saved.');
  console.log(`Report ID: ${savedReport._id}`);
  console.log(`Cases: ${savedReport.totalCases}`);
  console.log(`Score MAE: ${savedReport.scoreMae}`);
  console.log(`Concept precision: ${Math.round(savedReport.conceptPrecision * 100)}%`);
  console.log(`Concept recall: ${Math.round(savedReport.conceptRecall * 100)}%`);
  console.log(`Manual review rate: ${Math.round(savedReport.manualReviewRate * 100)}%`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Accuracy benchmark failed:', error.message);
    process.exit(1);
  });
