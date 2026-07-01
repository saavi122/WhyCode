import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    logo: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    plan: { type: String, enum: ["free", "growth", "enterprise"], default: "free" },
    github: {
      connected: { type: Boolean, default: false },
      installationId: { type: String },
      organizationId: { type: String },
      organization: { type: String },
      connectedAt: { type: Date },
      lastSync: { type: Date },
      status: { type: String, default: "Not Connected" }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
