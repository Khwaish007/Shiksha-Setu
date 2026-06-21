import mongoose from 'mongoose';

const benchmarkCaseSchema = new mongoose.Schema({
  caseId: { type: String, required: true },
  dataset: { type: String, default: '' },
  file: { type: String, default: '' },
  studentName: { type: String, default: 'Unknown' },
  expectedStatus: { type: String, default: 'Success' },
  actualStatus: { type: String, default: 'Not Run' },
  expectedScore: { type: Number, default: 0 },
  actualScore: { type: Number, default: 0 },
  scoreError: { type: Number, default: null },
  expectedConcepts: { type: [String], default: [] },
  actualConcepts: { type: [String], default: [] },
  truePositiveConcepts: { type: [String], default: [] },
  falsePositiveConcepts: { type: [String], default: [] },
  falseNegativeConcepts: { type: [String], default: [] },
  errorSummary: { type: String, default: '' },
  reviewReason: { type: String, default: '' }
}, { _id: false });

const accuracyReportSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Accuracy Benchmark'
  },
  datasetVersion: {
    type: String,
    default: 'prototype-v1'
  },
  runMode: {
    type: String,
    enum: ['live', 'mock'],
    default: 'live'
  },
  status: {
    type: String,
    enum: ['completed', 'failed'],
    default: 'completed'
  },
  totalCases: {
    type: Number,
    default: 0
  },
  scoreMae: {
    type: Number,
    default: 0
  },
  conceptPrecision: {
    type: Number,
    default: 0
  },
  conceptRecall: {
    type: Number,
    default: 0
  },
  manualReviewRate: {
    type: Number,
    default: 0
  },
  teacherReviewRate: {
    type: Number,
    default: 0
  },
  statusBreakdown: {
    success: { type: Number, default: 0 },
    manualReview: { type: Number, default: 0 },
    needsTeacherReview: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  cases: {
    type: [benchmarkCaseSchema],
    default: []
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

accuracyReportSchema.index({ createdAt: -1 });

export default mongoose.model('AccuracyReport', accuracyReportSchema);
