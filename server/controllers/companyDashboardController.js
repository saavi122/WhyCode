import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";
import Invite from "../models/Invite.js";
import Repository from "../models/Repository.js";
import Drift from "../models/Drift.js";
import CommitMemory from "../models/CommitMemory.js";

// GET /api/company/employees
export const getCompanyEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({
      role: "employee",
      company: req.user.company,
      isActive: true,
    }).select("name email createdAt repositoriesAccess");

    res.json(employees);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/company/employees/:userId
export const removeCompanyEmployee = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ _id: userId, company: req.user.company });
    if (!user) {
      return res.status(404).json({ message: "Employee not found or unauthorized" });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: "Employee removed" });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/profile
export const getCompanyProfile = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company).populate("ownerId", "name email");
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/company/profile
export const updateCompanyProfile = async (req, res, next) => {
  try {
    const { name, logo } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const company = await Company.findOne({ _id: req.user.company });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.name = name;
    if (logo !== undefined) {
      company.logo = logo;
    }
    await company.save();

    res.json(company);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/company/change-password
export const changeCompanyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
};

// GET /api/company/stats
export const getCompanyStats = async (req, res, next) => {
  try {
    // 1. Total active employees in this company
    const totalEmployees = await User.countDocuments({
      role: "employee",
      company: req.user.company,
      isActive: true,
    });

    // 2. Pending invites
    const pendingInvites = await Invite.countDocuments({
      company: req.user.company,
      status: "pending",
    });

    // 3. Accepted invites
    const acceptedInvites = await Invite.countDocuments({
      company: req.user.company,
      status: "accepted",
    });

    // 4. Total repos owned by company admin (req.user.id)
    const repos = await Repository.find({ owner: req.user.id });
    const totalRepositories = repos.length;
    const repoIds = repos.map((r) => r._id);

    // 5. Open drift issues count across all company repos
    const totalDriftIssues = await Drift.countDocuments({
      repository: { $in: repoIds },
      status: "open",
    });

    // 6. Average documentation health score
    let avgDocHealth = 0;
    if (totalRepositories > 0) {
      const sumHealth = repos.reduce((acc, r) => acc + (r.docHealthScore || 0), 0);
      avgDocHealth = Math.round(sumHealth / totalRepositories);
    }

    // 7. Recent 5 commits across all company repos
    const recentActivity = await CommitMemory.find({
      repository: { $in: repoIds },
    })
      .sort({ date: -1 })
      .limit(5)
      .populate("repository", "repoName fullName");

    res.json({
      totalEmployees,
      pendingInvites,
      acceptedInvites,
      totalRepositories,
      totalDriftIssues,
      avgDocHealth,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
};
