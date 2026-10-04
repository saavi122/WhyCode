import User from "../models/User.js";
import Company from "../models/Company.js";
import Invite from "../models/Invite.js";
import Repository from "../models/Repository.js";
import Room from "../models/Room.js";
import RepositorySync from "../models/RepositorySync.js";
import RepositoryChunk from "../models/RepositoryChunk.js";
import PullRequest from "../models/PullRequest.js";
import Drift from "../models/Drift.js";
import CommitMemory from "../models/CommitMemory.js";
import KnowledgeQA from "../models/KnowledgeQA.js";
import GitHubConnection from "../models/GitHubConnection.js";
import GitHubState from "../models/GitHubState.js";
import { deleteCompanyChunks } from "../services/qdrantStore.js";

// GET /api/admin/stats
export const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalCompanies,
      totalUsers,
      activeLicenses,
      totalRepositories,
      totalRooms,
      totalPendingInvites,
      totalAcceptedInvites,
    ] = await Promise.all([
      Company.countDocuments(),
      User.countDocuments({ role: { $ne: "admin" } }),
      Company.countDocuments({ plan: "enterprise" }),
      Repository.countDocuments(),
      Room.countDocuments(),
      Invite.countDocuments({ status: "pending" }),
      Invite.countDocuments({ status: "accepted" }),
    ]);

    // Plan breakdown
    const planBreakdown = await Company.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);

    // Recent companies (last 5)
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("ownerId", "name email");

    res.json({
      totalCompanies,
      totalUsers,
      activeLicenses,
      totalRepositories,
      totalRooms,
      totalPendingInvites,
      totalAcceptedInvites,
      planBreakdown,
      recentCompanies,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/companies
export const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find()
      .sort({ createdAt: -1 })
      .populate("ownerId", "name email");

    // Enrich with employee/repo counts
    const enriched = await Promise.all(
      companies.map(async (co) => {
        const [employeeCount, repoCount, roomCount] = await Promise.all([
          User.countDocuments({ role: "employee", company: co._id, isActive: true }),
          Repository.countDocuments({ owner: co.ownerId }),
          Room.countDocuments({ company: co._id }),
        ]);
        return {
          ...co.toObject(),
          employeeCount,
          repoCount,
          roomCount,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/companies/:companyId/plan
export const updateCompanyPlan = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { plan } = req.body;

    if (!["free", "growth", "enterprise"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan. Must be free, growth, or enterprise." });
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { plan },
      { new: true }
    ).populate("ownerId", "name email");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/companies/:companyId
export const deleteCompany = async (req, res, next) => {
  try {
    if (process.env.DEMO_MODE === "true" || process.env.DEMO_READ_ONLY === "true") {
      return res.status(403).json({
        message: "Demo Mode: Destructive organization deletion is disabled in read-only demo environment.",
        code: "DEMO_READ_ONLY",
      });
    }

    const { companyId } = req.params;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // 1. Delete Qdrant vectors for company
    try {
      await deleteCompanyChunks(companyId.toString(), "repository_chunks");
    } catch (qErr) {
      // Log but continue
    }

    // 2. Cascade: delete all repositories, syncs, chunks, drifts, memories, QAs, connections, invites, rooms, users, company
    await Promise.all([
      Repository.deleteMany({ $or: [{ companyId }, { company: companyId }] }),
      RepositorySync.deleteMany({ companyId }),
      RepositoryChunk.deleteMany({ companyId }),
      PullRequest.deleteMany({ companyId }),
      Drift.deleteMany({ companyId }),
      CommitMemory.deleteMany({ companyId }),
      KnowledgeQA.deleteMany({ companyId }),
      GitHubConnection.deleteMany({ companyId }),
      GitHubState.deleteMany({ companyId }),
      User.deleteMany({ company: companyId }),
      Room.deleteMany({ company: companyId }),
      Invite.deleteMany({ company: companyId }),
      Company.findByIdAndDelete(companyId),
    ]);

    res.json({ message: "Company and all associated data removed" });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .sort({ createdAt: -1 })
      .populate("company", "name plan");

    res.json(users);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/companies/:companyId/details
export const getCompanyAdminDetails = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId).populate("ownerId", "name email");
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Get all invites sent by this company
    const invites = await Invite.find({ company: companyId }).sort({ createdAt: -1 });

    // Get all registered employees in this company
    const employees = await User.find({ company: companyId, role: "employee" }).sort({ createdAt: -1 });

    // Get all connected repositories
    const repositories = await Repository.find({ company: companyId }).sort({ createdAt: -1 });

    res.json({
      company,
      invites,
      employees,
      repositories
    });
  } catch (err) {
    next(err);
  }
};
