import mongoose from 'mongoose';

const baselineSnapshotSchema = new mongoose.Schema({
  classAffectedPct: { type: Number, default: 0 },
  conceptErrorRate: { type: Number, default: 0 },
  studentsAffected: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  sessionId: { type: String, trim: true },
}, { _id: false });

const interventionLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['class_reteach', 'student_reteach'],
    default: 'class_reteach',
  },
  concept: { type: String, required: true, trim: true, index: true },
  concepts: [{ type: String, trim: true }],
  scope: {
    type: String,
    enum: ['class', 'student'],
    default: 'class',
  },
  sessionId: { type: String, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentName: { type: String, trim: true },
  actionDescription: { type: String, trim: true, default: '' },
  source: {
    type: String,
    enum: ['reteach_summary', 'intervention_plan', 'recommendations', 'manual'],
    default: 'reteach_summary',
  },
  completedAt: { type: Date, default: Date.now },
  baseline: baselineSnapshotSchema,
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

interventionLogSchema.index({ sessionId: 1, completedAt: -1 });
interventionLogSchema.index({ studentId: 1, completedAt: -1 });

export default mongoose.model('InterventionLog', interventionLogSchema);
