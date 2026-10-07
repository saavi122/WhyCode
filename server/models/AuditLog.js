import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
