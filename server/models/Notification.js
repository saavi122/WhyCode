import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["FALLBACK_ALERT", "RECOVERY_ALERT", "INFO", "SECURITY"], default: "INFO" },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
