import WorksheetFeedback from '../models/WorksheetFeedback.js';
import {
  enhanceFeedbackWithAi,
  formatPublicFeedback,
  buildFeedbackUrl,
} from '../utils/feedbackUtils.js';

/**
 * GET /api/feedback/:token?lang=en|hi|mr
 * Public student-facing feedback — no auth required.
 */
export const getWorksheetFeedback = async (req, res) => {
  try {
    const { token } = req.params;
    const lang = req.query.lang || 'hi';

    const feedback = await WorksheetFeedback.findOne({ feedbackToken: token });
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found. The QR link may have expired or is invalid.' });
    }

    if (!feedback.aiEnhanced && process.env.ANTHROPIC_API_KEY) {
      await enhanceFeedbackWithAi(feedback, lang);
    }

    res.status(200).json(formatPublicFeedback(feedback, lang));
  } catch (error) {
    console.error('Get Worksheet Feedback Error:', error);
    res.status(500).json({ error: 'Failed to load worksheet feedback.' });
  }
};

/**
 * GET /api/feedback/:token/meta
 * Lightweight metadata for teacher QR display (no sensitive data).
 */
export const getWorksheetFeedbackMeta = async (req, res) => {
  try {
    const { token } = req.params;
    const feedback = await WorksheetFeedback.findOne({ feedbackToken: token })
      .select('feedbackToken studentFirstName score gradedAt');

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }

    res.status(200).json({
      feedbackToken: feedback.feedbackToken,
      studentFirstName: feedback.studentFirstName,
      score: feedback.score,
      gradedAt: feedback.gradedAt,
      feedbackUrl: buildFeedbackUrl(feedback.feedbackToken),
    });
  } catch (error) {
    console.error('Get Feedback Meta Error:', error);
    res.status(500).json({ error: 'Failed to load feedback metadata.' });
  }
};
