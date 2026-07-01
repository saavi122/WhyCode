import mongoose from "mongoose";

const knowledgeQASchema = new mongoose.Schema(
  {
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    askedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sources: [
      {
        type: { type: String, enum: ["commit", "pull_request", "file", "issue"] },
        reference: String,   // sha / PR number / file path
        excerpt: String,
      },
    ],
    confidence: Number,
  },
  { timestamps: true }
);

export default mongoose.model("KnowledgeQA", knowledgeQASchema);
