import Student from '../models/Student.js';
import NotificationLog from '../models/NotificationLog.js';
import {
  sendParentNotification,
  getChannelStatus,
  buildTwiml,
} from '../utils/parentChannelService.js';

const DEFAULT_COMMUNICATION = {
  preferredChannel: 'auto',
  preferredLanguage: 'hindi',
  hasSmartphone: true,
};

/**
 * POST /api/students/:id/send-parent-notification
 * Body: { channel, messageData, templateType?, language? }
 */
export const sendStudentParentNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      channel = 'auto',
      messageData,
      templateType = 'parent_message',
      language,
    } = req.body;

    if (!messageData || typeof messageData !== 'object') {
      return res.status(400).json({ error: 'messageData is required.' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const parentCommunication = {
      ...DEFAULT_COMMUNICATION,
      ...(student.parentCommunication?.toObject?.() || student.parentCommunication || {}),
    };

    const resolvedLanguage = language || parentCommunication.preferredLanguage || 'hindi';
    const langForChannel = resolvedLanguage === 'both' ? 'hindi' : resolvedLanguage;

    const result = await sendParentNotification({
      studentId: student._id,
      studentName: student.studentName,
      phone: student.parentPhone,
      channel,
      messageData,
      language: langForChannel,
      templateType,
      parentCommunication,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Send Parent Notification Error:', error);
    res.status(error.message?.includes('phone') ? 400 : 500).json({
      error: error.message || 'Failed to send parent notification.',
      logId: error.logId,
    });
  }
};

/**
 * PATCH /api/students/:id/communication-preferences
 * Body: { preferredChannel?, preferredLanguage?, hasSmartphone?, parentPhone? }
 */
export const updateCommunicationPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { preferredChannel, preferredLanguage, hasSmartphone, parentPhone } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const current = {
      ...DEFAULT_COMMUNICATION,
      ...(student.parentCommunication?.toObject?.() || student.parentCommunication || {}),
    };

    if (preferredChannel !== undefined) current.preferredChannel = preferredChannel;
    if (preferredLanguage !== undefined) current.preferredLanguage = preferredLanguage;
    if (hasSmartphone !== undefined) current.hasSmartphone = Boolean(hasSmartphone);

    const update = { parentCommunication: current };
    if (parentPhone !== undefined) update.parentPhone = parentPhone;

    const updated = await Student.findByIdAndUpdate(id, update, { new: true });

    res.status(200).json({
      parentPhone: updated.parentPhone || '',
      parentCommunication: updated.parentCommunication,
    });
  } catch (error) {
    console.error('Update Communication Preferences Error:', error);
    res.status(500).json({ error: 'Failed to update communication preferences.' });
  }
};

/**
 * GET /api/students/:id/notification-logs
 */
export const getStudentNotificationLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const logs = await NotificationLog.find({ studentId: id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json(logs);
  } catch (error) {
    console.error('Get Notification Logs Error:', error);
    res.status(500).json({ error: 'Failed to fetch notification logs.' });
  }
};

/**
 * GET /api/students/parent-channels/status
 */
export const getParentChannelStatus = async (_req, res) => {
  res.status(200).json(getChannelStatus());
};

/**
 * GET /api/students/ivr-twiml?lang=hindi&script=...
 * Twilio webhook for outbound IVR calls (when BACKEND_URL is configured).
 */
export const serveIvrTwiml = (req, res) => {
  const lang = req.query.lang === 'english' ? 'english' : 'hindi';
  const script = req.query.script || 'नमस्ते। यह आपके बच्चे की शिक्षा से संबंधित संदेश है।';
  const twiml = buildTwiml(decodeURIComponent(script), lang);

  res.type('text/xml');
  res.send(twiml);
};
