import mongoose from "mongoose";

const driftSchema = new mongoose.Schema(
  {
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    filePath: { type: String, required: true },
    type: { type: String, enum: ["docstring_drift", "comment_drift", "readme_drift"], required: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    currentDocText: String,
    currentCodeSnippet: String,
    suggestion: String,
    confidence: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ["open", "accepted", "rejected"], default: "open" },
  },
  { timestamps: true }
);

export default mongoose.model("Drift", driftSchema);
