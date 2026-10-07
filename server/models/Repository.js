import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }, // Backwards-compatibility alias
    githubConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: "GitHubConnection" },
    githubRepositoryId: { type: Number, required: true },
    owner: { type: String, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    htmlUrl: { type: String },
    defaultBranch: { type: String, default: "main" },
    private: { type: Boolean, default: false },
    description: { type: String, default: "" },
    status: { type: String, default: "active" }, // "active" | "REVOKED" | "idle"
    syncStatus: { type: String, default: "NOT_SYNCED" },
    lastSyncedAt: { type: Date, default: null },
    lastCommitSha: { type: String, default: null },
    language: { type: String, default: "" },
    repoName: { type: String }, // Alias for name
    docHealthScore: { type: Number, default: 0 },
    knowledgeCoverage: { type: Number, default: 0 },
    busFactor: { type: Number, default: 0 },
    isMonitored: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique index on companyId + githubRepositoryId
repositorySchema.index({ companyId: 1, githubRepositoryId: 1 }, { unique: true });

export default mongoose.model("Repository", repositorySchema);

