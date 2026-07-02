import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  studentName: { type: String, trim: true },
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'ivr'],
    required: true,
  },
  templateType: {
    type: String,
    enum: ['parent_message', 'intervention_plan'],
    default: 'parent_message',
  },
  body: { type: String, required: true },
  phone: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'mock', 'manual'],
    default: 'pending',
  },
  provider: {
    type: String,
    enum: ['twilio', 'mock', 'manual'],
    default: 'mock',
  },
  providerId: { type: String },
  error: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

notificationLogSchema.index({ createdAt: -1 });

export default mongoose.model('NotificationLog', notificationLogSchema);
