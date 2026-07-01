import mongoose from "mongoose";

const commitMemorySchema = new mongoose.Schema(
  {
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    commitSha: { type: String, required: true },
    author: String,
    message: String,
    filesChanged: [String],
    aiSummary: String,        // short plain-language summary of the change
    reasonInferred: String,   // "why" reconstructed by AI, if applicable
    linkedPRNumber: Number,
    date: Date,
  },
  { timestamps: true }
);

export default mongoose.model("CommitMemory", commitMemorySchema);
