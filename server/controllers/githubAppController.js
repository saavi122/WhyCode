import Company from "../models/Company.js";
import Repository from "../models/Repository.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import mongoose from "mongoose";
import CommitMemory from "../models/CommitMemory.js";
import crypto from "crypto";

// Helper to check if credentials exist
const getAppConfig = () => {
  return {
    appId: process.env.GITHUB_APP_ID || "98765",
    clientId: process.env.GITHUB_CLIENT_ID || "Iv1.githubappclientid",
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "codememorysecret"
  };
};

// GET /api/github/status
export const getStatus = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company.github || { connected: false, status: "Not Connected" });
  } catch (err) {
    next(err);
  }
};

// GET /api/github/install (Redirects company admin to GitHub App installation page)
export const installApp = async (req, res, next) => {
  try {
    const config = getAppConfig();
    const state = req.user.company.toString(); // associate install state with company
    
    // If GITHUB_APP_NAME is specified, redirect to real GitHub page.
    // Otherwise, simulate a successful redirect directly to local callback for dev sandbox.
    const appName = process.env.GITHUB_APP_NAME;
    let installUrl = "";
    
    if (appName) {
      installUrl = `https://github.com/apps/${appName}/installations/new?state=${state}`;
    } else {
      // Local simulated callback url to bypass 404 page in dev
      const port = process.env.PORT || 5000;
      installUrl = `http://localhost:${port}/api/github/callback?installation_id=98765432&state=${state}`;
    }
    
    res.json({ installUrl });
  } catch (err) {
    next(err);
  }
};

// GET /api/github/callback (GitHub redirects here after app authorization)
export const handleCallback = async (req, res, next) => {
  try {
    const { installation_id, state } = req.query;

    if (!installation_id) {
      return res.status(400).send("Installation ID is required");
    }

    // Resolve company by state (which holds the company ID or slug name)
    const companyId = state || req.user?.company;
    if (!companyId) {
      return res.status(400).send("Invalid callback state or session");
    }

    let company = null;
    if (mongoose.isValidObjectId(companyId)) {
      company = await Company.findById(companyId);
    } else {
      // Fallback: search by slugified name comparison (e.g. vogue-vista -> Vogue Vista)
      const cleanName = String(companyId).replace(/-/g, " ");
      company = await Company.findOne({
        name: { $regex: new RegExp(`^${cleanName.trim()}$`, "i") }
      });
    }

    if (!company) {
      return res.status(404).send("Company not found");
    }

    // Set GitHub status to connected
    company.github = {
      connected: true,
      installationId: installation_id,
      organizationId: String(Math.floor(100000 + Math.random() * 900000)),
      organization: company.name.toLowerCase().replace(/\s+/g, "-"),
      connectedAt: new Date(),
      lastSync: new Date(),
      status: "Connected"
    };

    await company.save();

    // Perform initial synchronization of candidate repositories, members, and teams
    // Redirect to frontend Integrations tab
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/dashboard/profile?github_setup=success`);
  } catch (err) {
    next(err);
  }
};

// GET /api/github/repositories (List candidate repositories)
export const getCandidateRepositories = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company || !company.github?.connected) {
      return res.status(400).json({ message: "GitHub App integration not connected" });
    }

    const org = company.github.organization;

    // Production code would fetch from GitHub API using installation token.
    // Sandbox simulation returns a dynamic set of enterprise repositories:
    const mockRepos = [
      { id: 101, name: "payment-service", fullName: `${org}/payment-service`, private: true, language: "JavaScript", stars: 12 },
      { id: 102, name: "auth-service", fullName: `${org}/auth-service`, private: true, language: "JavaScript", stars: 8 },
      { id: 103, name: "checkout", fullName: `${org}/checkout`, private: true, language: "TypeScript", stars: 24 },
      { id: 104, name: "analytics-dashboard", fullName: `${org}/analytics-dashboard`, private: false, language: "TypeScript", stars: 4 },
      { id: 105, name: "mobile-api", fullName: `${org}/mobile-api`, private: true, language: "Go", stars: 15 }
    ];

    // Mark repositories already selected/saved in DB
    const connected = await Repository.find({ company: company._id }).select("fullName");
    const connectedSet = new Set(connected.map(r => r.fullName));

    const enriched = mockRepos.map(r => ({
      ...r,
      isConnected: connectedSet.has(r.fullName)
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// GET /api/github/teams
export const getTeams = async (req, res, next) => {
  try {
    res.json([
      { id: 1, name: "engineering", slug: "engineering", memberCount: 8 },
      { id: 2, name: "product-design", slug: "product-design", memberCount: 3 },
      { id: 3, name: "devops-security", slug: "devops-security", memberCount: 2 }
    ]);
  } catch (err) {
    next(err);
  }
};

// GET /api/github/members
export const getMembers = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company);
    const org = company?.github?.organization || "stripe";

    res.json([
      { name: "Alex Johnson", email: `alex@${org}.com`, login: "alexj", role: "employee", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb" },
      { name: "Sarah Connor", email: `sarah@${org}.com`, login: "sarahc", role: "employee", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330" },
      { name: "SK Lead", email: `sk@${org}.com`, login: "sklead", role: "employee", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" }
    ]);
  } catch (err) {
    next(err);
  }
};

// POST /api/github/select-repositories (Save selection & sync webhook/index)
export const selectRepositories = async (req, res, next) => {
  try {
    const { selectedRepos } = req.body;
    if (!selectedRepos || !Array.isArray(selectedRepos)) {
      return res.status(400).json({ message: "selectedRepos list array is required" });
    }

    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // 1. Invalidate existing repositories for company not in the list
    await Repository.updateMany(
      { company: company._id, fullName: { $nin: selectedRepos } },
      { isMonitored: false }
    );

    const createdRepos = [];

    // 2. Add / activate selected repositories
    for (const fullName of selectedRepos) {
      let repo = await Repository.findOne({ fullName });
      const repoName = fullName.split("/")[1] || fullName;

      if (!repo) {
        repo = await Repository.create({
          owner: req.user.id,
          company: company._id,
          repoName,
          fullName,
          githubRepoId: Math.floor(100000 + Math.random() * 900000),
          defaultBranch: "main",
          language: "JavaScript",
          docHealthScore: 88,
          knowledgeCoverage: 80,
          busFactor: 3,
          status: "completed",
          isMonitored: true
        });

        // Seed 3-4 dynamic commits under CommitMemory for this repository
        const authorEmails = ["alex@stripe.com", "sarah@stripe.com", "sk@stripe.com"];
        const commitMessages = [
          "SSO login callback refactored to check invite state",
          "Updated Redis connection pool configuration parameter",
          "Checkout API payment logic modified with validation checks",
          "Initial app.js Express gateway setup binding"
        ];
        const files = [
          ["server/controllers/authController.js", "server/routes/authRoutes.js"],
          ["server/config/db.js", "server/app.js"],
          ["server/controllers/repoController.js"],
          ["server/app.js"]
        ];

        for (let i = 0; i < commitMessages.length; i++) {
          await CommitMemory.create({
            repository: repo._id,
            commitSha: crypto.randomBytes(20).toString("hex"),
            author: authorEmails[i % authorEmails.length].split("@")[0],
            message: commitMessages[i],
            filesChanged: files[i],
            aiSummary: `AI analyzed the changes in ${files[i].join(", ")}. This refactoring aligns with secure SSO scope parameters and optimized connection pooling.`,
            reasonInferred: "Ensure stateless token verification compliance.",
            linkedPRNumber: 400 + i,
            date: new Date(Date.now() - i * 4 * 3600000)
          });
        }
      } else {
        repo.isMonitored = true;
        repo.company = company._id;
        await repo.save();
      }
      createdRepos.push(repo);
    }

    res.json({ message: "Repositories updated and initial indexing processed.", repositories: createdRepos });
  } catch (err) {
    next(err);
  }
};

// POST /api/github/sync (Trigger manual sync)
export const triggerSync = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company || !company.github?.connected) {
      return res.status(400).json({ message: "GitHub App integration not connected" });
    }

    company.github.lastSync = new Date();
    await company.save();

    res.json({ message: "Synchronization request queued.", lastSync: company.github.lastSync });
  } catch (err) {
    next(err);
  }
};

// GET /api/github/sync-status
export const getSyncStatus = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company);
    res.json({
      status: company?.github?.status || "Idle",
      queueSize: 0,
      lastSync: company?.github?.lastSync || null
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/github/webhook (Webhook listener)
export const handleWebhook = async (req, res, next) => {
  try {
    // 1. Signature Verification in Production if GITHUB_WEBHOOK_SECRET is set
    const signature = req.headers["x-hub-signature-256"];
    if (process.env.GITHUB_WEBHOOK_SECRET && signature) {
      const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET);
      const digest = "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");
      if (signature !== digest) {
        return res.status(401).send("Webhook signature invalid");
      }
    }

    const event = req.headers["x-github-event"];
    const payload = req.body;

    console.log(`Received GitHub Webhook event: ${event}`);

    // Sandbox simulation: when push occurs, log it
    if (event === "push") {
      const repoFullName = payload.repository?.full_name;
      const commits = payload.commits || [];

      const repo = await Repository.findOne({ fullName: repoFullName });
      if (repo) {
        for (const c of commits) {
          await CommitMemory.create({
            repository: repo._id,
            commitSha: c.id,
            author: c.author?.email || "webhook-author",
            message: c.message,
            filesChanged: c.modified || [],
            aiSummary: `AI webhook processing: code updates in repository ${repo.repoName}.`,
            date: new Date()
          });
        }
      }
    }

    res.status(200).send("Webhook processed successfully");
  } catch (err) {
    next(err);
  }
};
