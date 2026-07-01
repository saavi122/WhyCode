import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    repoName: { type: String, required: true },       // e.g. "codememory-demo"
    fullName: { type: String, required: true },        // e.g. "username/codememory-demo"
    githubRepoId: { type: Number, required: true },
    defaultBranch: { type: String, default: "main" },
    language: String,
    lastScanAt: Date,
    docHealthScore: { type: Number, default: 0 },       // 0-100
    knowledgeCoverage: { type: Number, default: 0 },
    busFactor: { type: Number, default: 0 },
    status: { type: String, enum: ["idle", "scanning", "completed", "failed"], default: "idle" },
    isMonitored: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Repository", repositorySchema);
