import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    name: { type: String }, // pre-filled name from invite
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "accepted", "expired"], default: "pending" },
    expiresAt: { type: Date, required: true },
    // Optional repo assignment when inviting
    assignedRepo: { type: String, default: null }, // fullName e.g. "octocat/Hello-World"
  },
  { timestamps: true }
);

export default mongoose.model("Invite", inviteSchema);
