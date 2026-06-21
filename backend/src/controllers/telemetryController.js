import { buildTelemetrySummary, getPilotScalePlan } from '../utils/costTelemetry.js';

const getRequestSessionId = (req) =>
  req.params?.sessionId || req.query?.sessionId || req.body?.sessionId || null;

/**
 * GET /api/v1/grading/telemetry?sessionId=
 * Live cost & throughput metrics from recorded batch runs.
 */
export const fetchTelemetry = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const summary = await buildTelemetrySummary(sessionId || null);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Telemetry Error:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry.' });
  }
};

/**
 * GET /api/v1/grading/pilot-scale-plan
 * One-page pilot-to-scale readiness document with concrete numbers.
 */
export const fetchPilotScalePlan = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const telemetry = await buildTelemetrySummary(sessionId || null);
    const plan = getPilotScalePlan();

    // Inject live telemetry into plan when available
    if (telemetry.totals.worksheetsGraded > 0) {
      plan.liveMetrics = {
        source: sessionId ? 'current session' : 'all sessions',
        worksheetsGraded: telemetry.totals.worksheetsGraded,
        totalTokens: telemetry.totals.totalTokens,
        costPerWorksheetInr: telemetry.totals.costPerWorksheetInr,
        throughputPerMin: telemetry.totals.throughputPerMin,
        totalCostInr: telemetry.totals.costInr,
        lastBatch: telemetry.lastBatch,
      };
    }

    res.status(200).json(plan);
  } catch (error) {
    console.error('Pilot Scale Plan Error:', error);
    res.status(500).json({ error: 'Failed to fetch pilot scale plan.' });
  }
};
