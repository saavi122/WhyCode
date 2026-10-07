import mongoose from "mongoose";

const modelSwitchEventSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    time: { type: Date, default: Date.now },
    from: { type: String, default: "primary" },
    to: { type: String, enum: ["gemini", "evidence"], required: true },
    reason: { type: String, required: true },
    mode: { type: String, enum: ["AUTO", "PRIMARY_ONLY", "GEMINI_ONLY"], default: "AUTO" },
    requestCount: { type: Number, default: 1 },
    recoveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

modelSwitchEventSchema.index({ companyId: 1, recoveredAt: 1, to: 1 });

export default mongoose.models.ModelSwitchEvent || mongoose.model("ModelSwitchEvent", modelSwitchEventSchema);
