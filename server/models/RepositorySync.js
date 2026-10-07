import mongoose from "mongoose";

const repositorySyncSchema = new mongoose.Schema(
  {
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    syncType: {
      type: String,
      enum: ["INITIAL", "MANUAL", "INCREMENTAL", "WEBHOOK"],
      default: "INITIAL",
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    step: {
      type: String,
      default: "QUEUED", // "QUEUED", "FETCHING_DATA", "GENERATING_EMBEDDINGS", "UPDATING_VECTOR_DB", "COMPLETED", "FAILED"
    },
    counts: {
      files: { type: Number, default: 0 },
      commits: { type: Number, default: 0 },
      pullRequests: { type: Number, default: 0 },
      chunks: { type: Number, default: 0 },
      embedded: { type: Number, default: 0 },
      upserted: { type: Number, default: 0 },
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    lastCommitSha: { type: String, default: "" },
    failedStep: { type: String, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("RepositorySync", repositorySyncSchema);
