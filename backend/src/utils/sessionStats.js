import GradingSession from '../models/GradingSession.js';
import Submission from '../models/Submission.js';

export const summarizeSession = async (sessionId) => {
  const submissions = await Submission.find({ sessionId });
  const graded = submissions.filter(item => item.status === 'Success');
  const totalScore = graded.reduce((sum, item) => sum + Number(item.totalScore || 0), 0);

  return {
    totalUploads: submissions.length,
    gradedCount: graded.length,
    manualReviewCount: submissions.filter(item => item.status === 'Manual Review Required').length,
    averageScore: graded.length ? Math.round(totalScore / graded.length) : 0
  };
};

export const refreshSessionStats = async (sessionId, source = 'batch') => {
  if (!sessionId) return null;

  const stats = await summarizeSession(sessionId);
  const existing = await GradingSession.findOne({ sessionId });
  const nextSource = existing?.totalUploads > 0 && existing.source !== source ? 'mixed' : source;

  return GradingSession.findOneAndUpdate(
    { sessionId },
    {
      ...stats,
      source: nextSource,
      lastAccessedAt: new Date()
    },
    { new: true }
  );
};
