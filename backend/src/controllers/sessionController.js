import GradingSession from '../models/GradingSession.js';
import Submission from '../models/Submission.js';
import { refreshSessionStats } from '../utils/sessionStats.js';

export const createGradingSession = async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim()
      : undefined;

    const session = new GradingSession({ title });
    await session.save();

    res.status(201).json(session);
  } catch (error) {
    console.error('Create Session Error:', error);
    res.status(500).json({ error: 'Failed to create grading session.' });
  }
};

export const listGradingSessions = async (req, res) => {
  try {
    const sessions = await GradingSession.find().sort({ lastAccessedAt: -1, createdAt: -1 }).limit(100);
    res.status(200).json(sessions);
  } catch (error) {
    console.error('List Sessions Error:', error);
    res.status(500).json({ error: 'Failed to fetch grading sessions.' });
  }
};

export const getGradingSession = async (req, res) => {
  try {
    const session = await refreshSessionStats(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error('Get Session Error:', error);
    res.status(500).json({ error: 'Failed to fetch grading session.' });
  }
};

export const resumeGradingSession = async (req, res) => {
  try {
    const session = await GradingSession.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { lastAccessedAt: new Date(), status: 'active' },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    res.status(200).json(session);
  } catch (error) {
    console.error('Resume Session Error:', error);
    res.status(500).json({ error: 'Failed to resume grading session.' });
  }
};

export const deleteGradingSession = async (req, res) => {
  try {
    const session = await GradingSession.findOneAndDelete({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    await Submission.deleteMany({ sessionId: req.params.sessionId });
    res.status(200).json({ message: 'Session deleted.' });
  } catch (error) {
    console.error('Delete Session Error:', error);
    res.status(500).json({ error: 'Failed to delete grading session.' });
  }
};

export const clearSessionSubmissions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await GradingSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    await Submission.deleteMany({ sessionId });
    const refreshed = await refreshSessionStats(sessionId);
    res.status(200).json({ message: 'Session submissions cleared.', session: refreshed });
  } catch (error) {
    console.error('Clear Session Error:', error);
    res.status(500).json({ error: 'Failed to clear session submissions.' });
  }
};
