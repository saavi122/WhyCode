import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    // Password is optional for employees (they log in via email + company name only)
    password: { type: String, select: false },
    role: { type: String, enum: ["admin", "company", "employee"], required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    isActive: { type: Boolean, default: true },
    githubId: { type: String, unique: true, sparse: true },
    githubAccessToken: { type: String, select: false },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
