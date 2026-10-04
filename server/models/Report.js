import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: ["DRIFT", "INTENT", "CHANGE_SUMMARY"],
      required: true,
      index: true,
    },
    targetPath: {
      type: String,
      required: true,
      index: true,
    },
    targetSymbol: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING_REVIEW", "PUBLISHED", "REJECTED", "FAILED"],
      default: "PENDING_REVIEW",
      index: true,
    },
    isAiGenerated: {
      type: Boolean,
      default: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.85,
    },
    requiresReview: {
      type: Boolean,
      default: true,
    },
    // References to retrieved context (Never store raw repository text)
    inputReferences: {
      chunkIds: [{ type: String }],
      commitShas: [{ type: String }],
      filePaths: [{ type: String }],
      lineRanges: [
        {
          start: { type: Number },
          end: { type: Number },
        },
      ],
    },
    // AI Output
    output: {
      title: { type: String, default: "" },
      summary: { type: String, default: "" },
      driftDetected: { type: Boolean, default: false },
      driftDetails: { type: String, default: "" },
      intentDescription: { type: String, default: "" },
      suggestedDoc: { type: String, default: "" },
      changeSummary: { type: String, default: "" },
      citations: [{ type: String }],
      evidenceCommits: [{ type: String }],
    },
    // Published snapshot when approved (draft output is never overwritten)
    publishedVersion: {
      publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      publishedAt: { type: Date },
      title: { type: String },
      summary: { type: String },
      suggestedDoc: { type: String },
      intentDescription: { type: String },
      changeSummary: { type: String },
      notes: { type: String },
      isCustomEdited: { type: Boolean, default: false },
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    model: {
      type: String,
      default: "qwen2.5-coder:3b",
    },
    promptVersion: {
      type: String,
      default: "v1.0.0",
    },
    triggerType: {
      type: String,
      enum: ["MANUAL", "AUTO_SYNC", "WEBHOOK"],
      default: "MANUAL",
    },
  },
  { timestamps: true }
);

// Indexes for high performance multi-tenant querying
reportSchema.index({ companyId: 1, repositoryId: 1, status: 1 });
reportSchema.index({ companyId: 1, reportType: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
