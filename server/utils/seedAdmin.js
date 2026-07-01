import User from "../models/User.js";
import bcrypt from "bcryptjs";

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("Admin@123", 12);
      await User.create({
        name: "Admin",
        email: "admin@codememory.com",
        password: hashedPassword,
        role: "admin",
        isActive: true,
      });
      console.log("Admin seeded: admin@codememory.com / Admin@123");
    }
  } catch (err) {
    console.error("Failed to seed admin:", err);
  }
};

export default seedAdmin;
