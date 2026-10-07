import mongoose from "mongoose";

const webhookDeliverySchema = new mongoose.Schema(
  {
    deliveryId: { type: String, required: true, unique: true, index: true },
    event: { type: String, required: true },
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    status: {
      type: String,
      enum: ["RECEIVED", "PROCESSING", "COMPLETED", "FAILED", "SKIPPED"],
      default: "RECEIVED",
    },
    counts: {
      added: { type: Number, default: 0 },
      modified: { type: Number, default: 0 },
      removed: { type: Number, default: 0 },
      commits: { type: Number, default: 0 },
      vectorsUpserted: { type: Number, default: 0 },
      vectorsDeleted: { type: Number, default: 0 },
    },
    error: { type: String, default: null },
    processedAt: { type: Date },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // 7-day TTL index
  },
  { timestamps: true }
);

export default mongoose.model("WebhookDelivery", webhookDeliverySchema);
