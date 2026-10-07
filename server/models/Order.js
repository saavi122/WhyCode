import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, sparse: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    customerEmail: { type: String, lowercase: true, required: true },
    customerName: { type: String },
    companyName: { type: String },
    planId: { type: String, enum: ["free", "startup", "team", "custom"], default: "team" },
    planName: { type: String, default: "Team" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    billingCycle: { type: String, default: "monthly" },
    paymentMethod: { type: String, enum: ["upi", "card", "netbanking", "wallet", "bank_transfer", "demo"], default: "card" },
    status: { 
      type: String, 
      enum: ["pending", "processing", "completed", "failed", "expired", "verification_pending"], 
      default: "pending" 
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date },
    paidAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
