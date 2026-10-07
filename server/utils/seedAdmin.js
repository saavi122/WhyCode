import User from "../models/User.js";
import Company from "../models/Company.js";
import Room from "../models/Room.js";
import Repository from "../models/Repository.js";
import bcrypt from "bcryptjs";

const seedAdmin = async () => {
  try {
    // 1. Seed or ensure Super Admin (admin@codememory.com)
    let adminUser = await User.findOne({ email: "admin@codememory.com" }).select("+password");
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("Admin@123", 12);
      adminUser = await User.create({
        name: "Admin",
        email: "admin@codememory.com",
        password: hashedPassword,
        role: "admin",
        isActive: true,
      });
      console.log("Admin seeded: admin@codememory.com / Admin@123");
    } else {
      let changed = false;
      if (adminUser.role !== "admin") {
        adminUser.role = "admin";
        changed = true;
      }
      if (!adminUser.isActive) {
        adminUser.isActive = true;
        changed = true;
      }
      if (changed) {
        await adminUser.save();
      }
    }

    // 2. Seed or ensure Demo Company (Stripe / saavi@stripe.com)
    let demoCompany = await Company.findOne({
      $or: [{ name: "Stripe" }, { email: "saavi@stripe.com" }],
    });
    if (!demoCompany) {
      demoCompany = await Company.create({
        name: "Stripe",
        email: "saavi@stripe.com",
        plan: "enterprise",
      });
    }

    let companyUser = await User.findOne({ email: "saavi@stripe.com" });
    if (!companyUser) {
      const companyHashedPassword = await bcrypt.hash("12345678", 12);
      companyUser = await User.create({
        name: "Saavi (Company Admin)",
        email: "saavi@stripe.com",
        password: companyHashedPassword,
        role: "company",
        company: demoCompany._id,
        isActive: true,
      });
      demoCompany.ownerId = companyUser._id;
      await demoCompany.save();
      console.log("Demo company user seeded: saavi@stripe.com / 12345678");
    }

    // 3. Seed or ensure Demo Developer / Employee (ruchi@stripe.com)
    let devUser = await User.findOne({ email: "ruchi@stripe.com" });
    if (!devUser) {
      const devHashedPassword = await bcrypt.hash("12345678", 12);
      devUser = await User.create({
        name: "Ruchi (Developer)",
        email: "ruchi@stripe.com",
        password: devHashedPassword,
        role: "employee",
        company: demoCompany._id,
        isActive: true,
      });
      console.log("Demo developer user seeded: ruchi@stripe.com / 12345678");
    }

    // 4. Seed or ensure Mock Developer (dev@whycode.local)
    let mockDev = await User.findOne({ email: "dev@whycode.local" });
    if (!mockDev) {
      const mockDevHashedPassword = await bcrypt.hash("Admin@123", 12);
      mockDev = await User.create({
        name: "Alex River",
        email: "dev@whycode.local",
        password: mockDevHashedPassword,
        role: "employee",
        company: demoCompany._id,
        isActive: true,
      });
      console.log("Mock developer user seeded: dev@whycode.local / Admin@123");
    }

    // 5. Seed default repo and room if company has none
    const existingRepo = await Repository.findOne({ companyId: demoCompany._id });
    if (!existingRepo) {
      await Repository.create({
        companyId: demoCompany._id,
        company: demoCompany._id,
        githubRepositoryId: 88991122,
        owner: "saavi122",
        name: "WhyCode",
        fullName: "saavi122/WhyCode",
        htmlUrl: "https://github.com/saavi122/WhyCode",
        defaultBranch: "main",
        status: "active",
        syncStatus: "SYNCED",
        docHealthScore: 92,
        knowledgeCoverage: 88,
        busFactor: 4,
        isMonitored: true,
      });
    }

    const existingRoom = await Room.findOne({ company: demoCompany._id });
    if (!existingRoom) {
      const employeeIds = [devUser?._id, mockDev?._id].filter(Boolean);
      await Room.create({
        name: "Main Engineering Workspace",
        githubRepo: "saavi122/WhyCode",
        company: demoCompany._id,
        assignedEmployees: employeeIds,
      });
    }
  } catch (err) {
    console.error("Failed to seed initial accounts:", err);
  }
};

export default seedAdmin;
