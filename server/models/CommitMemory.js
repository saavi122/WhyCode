import mongoose from "mongoose";

const commitMemorySchema = new mongoose.Schema(
  {
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    commitSha: { type: String, required: true },
    author: String,
    authorName: String,
    authorEmail: String,
    authorLogin: String,
    avatarUrl: String,
    message: String,
    parentShas: [String],
    filesChanged: [String],
    diffSummary: String,
    stats: {
      additions: { type: Number, default: 0 },
      deletions: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    aiSummary: String,        // short plain-language summary of the change
    reasonInferred: String,   // "why" reconstructed by AI, if applicable
    linkedPRNumber: Number,
    date: Date,
    committedAt: Date,
    htmlUrl: String,
  },
  { timestamps: true }
);

commitMemorySchema.index({ repository: 1, commitSha: 1 }, { unique: true });
commitMemorySchema.index({ repository: 1, committedAt: -1 });
commitMemorySchema.index({ repository: 1, author: 1 });

export default mongoose.model("CommitMemory", commitMemorySchema);
