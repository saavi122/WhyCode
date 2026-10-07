import mongoose from "mongoose";

const githubConnectionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    githubAccountId: { type: String, required: true },
    githubUsername: { type: String, required: true },
    githubAccountType: { type: String, default: "User" },
    installationId: { type: String, required: true },
    status: {
      type: String,
      enum: ["NOT_CONNECTED", "CONNECTED", "EXPIRED", "ERROR", "DISCONNECTED"],
      default: "NOT_CONNECTED",
    },
    connectedAt: { type: Date, default: Date.now },
    lastValidatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("GitHubConnection", githubConnectionSchema);
