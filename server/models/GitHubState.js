import mongoose from "mongoose";

const githubStateSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

githubStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("GitHubState", githubStateSchema);
