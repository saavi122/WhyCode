import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    plan: { type: String, default: "SaaS Pro Trial" },
    employees: { type: Number, default: 0 },
    status: { type: String, default: "Active" },
    apiRequests: { type: String, default: "0/mo" }
  },
  { timestamps: true }
);

export default mongoose.model("Organization", organizationSchema);
