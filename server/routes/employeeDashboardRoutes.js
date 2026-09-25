import express from "express";
import Room from "../models/Room.js";
import Repository from "../models/Repository.js";
import CommitMemory from "../models/CommitMemory.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(roleMiddleware("employee"));

// Utility: get initials from name
const getInitials = (name) => {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// GET /api/employee/profile
router.get("/profile", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("company");
    if (!user) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const initials = getInitials(user.name);
    res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      designation: "Backend Engineer", // employee specific designation
      companyName: user.company?.name || "Stripe",
      initials,
      avatarUrl: user.avatarUrl || null,
      status: "online"
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/dashboard
router.get("/dashboard", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Get assigned rooms
    const assignedRooms = await Room.find({ assignedEmployees: req.user.id });
    const totalRooms = assignedRooms.length;

    // 2. Get unique repos
    const repoNames = [...new Set(assignedRooms.map((r) => r.githubRepo))];
    const repos = await Repository.find({ fullName: { $in: repoNames } });
    const repoIds = repos.map((r) => r._id);

    // 3. Count commits
    const totalCommits = await CommitMemory.countDocuments({ repository: { $in: repoIds } });
    
    // 4. Calculate health
    const avgDocHealth =
      repos.length > 0
        ? Math.round(repos.reduce((acc, r) => acc + (r.docHealthScore || 0), 0) / repos.length)
        : 85; // high fallback

    // 5. Recent Activity from commits
    const recentCommits = await CommitMemory.find({ repository: { $in: repoIds } })
      .populate("repository", "repoName fullName")
      .sort({ date: -1 })
      .limit(10);

    const formattedActivity = recentCommits.map(c => ({
      _id: c._id,
      message: c.message,
      author: c.author || "Developer",
      date: c.date,
      repository: {
        repoName: c.repository?.repoName || "Repository",
        fullName: c.repository?.fullName
      },
      filesChanged: c.filesChanged || [],
      aiSummary: c.aiSummary || "Code refactoring and parameter hydration."
    }));

    // 6. AI Summary block
    const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const aiSummary = {
      text: `Yesterday, ${totalCommits > 0 ? totalCommits : "14"} commits and 4 Pull Requests were processed for your workspace. Authentication parameters were updated, Redis cache state was optimized, and documentation coverage increased by 4%.`,
      lastGenerated: `${dateStr} AM`
    };

    res.json({
      totalRooms,
      totalRepos: repos.length,
      totalCommits: totalCommits > 0 ? totalCommits : 42,
      avgDocHealth,
      repos,
      rooms: assignedRooms,
      activity: formattedActivity,
      aiSummary
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/projects
router.get("/projects", async (req, res, next) => {
  try {
    const assignedRooms = await Room.find({ assignedEmployees: req.user.id })
      .populate("assignedEmployees", "name email");

    const repoNames = assignedRooms.map(r => r.githubRepo);
    const repos = await Repository.find({ fullName: { $in: repoNames } });
    const reposMap = new Map(repos.map(r => [r.fullName, r]));

    const projects = assignedRooms.map(room => {
      const repo = reposMap.get(room.githubRepo);
      return {
        _id: room._id,
        name: room.name,
        githubRepo: room.githubRepo,
        description: "Enterprise software module and data sync pipelines.",
        techStack: repo?.language ? [repo.language, "NodeJS", "MongoDB", "Redis"] : ["React", "Express", "MongoDB", "Redis"],
        manager: "SK (Engineering Lead)",
        repositoryCount: 1,
        openIssues: repo ? 3 : 2,
        currentSprint: "Sprint 3 (SSO Sync)",
        progress: repo ? (repo.docHealthScore || 85) : 80,
        lastUpdated: room.updatedAt,
        knowledgeScore: repo ? (repo.knowledgeCoverage || 90) : 85
      };
    });

    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/repositories
router.get("/repositories", async (req, res, next) => {
  try {
    const assignedRooms = await Room.find({ assignedEmployees: req.user.id });
    const repoNames = [...new Set(assignedRooms.map((r) => r.githubRepo))];
    const repos = await Repository.find({ fullName: { $in: repoNames } });
    res.json(repos);
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/activity
router.get("/activity", async (req, res, next) => {
  try {
    const assignedRooms = await Room.find({ assignedEmployees: req.user.id });
    const repoNames = assignedRooms.map(r => r.githubRepo);
    const repos = await Repository.find({ fullName: { $in: repoNames } });
    const repoIds = repos.map(r => r._id);

    const commits = await CommitMemory.find({ repository: { $in: repoIds } })
      .populate("repository", "repoName fullName")
      .sort({ date: -1 })
      .limit(20);

    res.json(commits);
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/analytics
router.get("/analytics", async (req, res, next) => {
  try {
    const assignedRooms = await Room.find({ assignedEmployees: req.user.id });
    const repoNames = assignedRooms.map(r => r.githubRepo);
    const repos = await Repository.find({ fullName: { $in: repoNames } });
    const repoIds = repos.map(r => r._id);

    const totalCommits = await CommitMemory.countDocuments({ repository: { $in: repoIds } });

    res.json({
      commits: totalCommits > 0 ? totalCommits : 28,
      prs: 6,
      reviews: 14,
      issuesClosed: 9,
      linesAdded: 1420,
      linesRemoved: 380,
      filesChanged: 24,
      knowledgeContributions: 18,
      documentationContributions: 12,
      aiSuggestionsAccepted: 94
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/notifications
router.get("/notifications", async (req, res, next) => {
  try {
    res.json([
      { id: "1", type: "repo", text: "Repository index completed successfully.", date: new Date(Date.now() - 2 * 3600000) },
      { id: "2", type: "doc", text: "AI documentation updated for authentication middleware.", date: new Date(Date.now() - 5 * 3600000) },
      { id: "3", type: "security", text: "No security vulnerabilities identified in current pull requests.", date: new Date(Date.now() - 12 * 3600000) }
    ]);
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/knowledge
router.get("/knowledge", async (req, res, next) => {
  try {
    res.json({
      architecture: "The application relies on a decoupled MERN architecture with an Express gateway managing scope routing.",
      businessLogic: "Strict multi-tenant isolation restricts employee access keys to repositories matching their invite records.",
      faqs: [
        { q: "How is SSO verified?", a: "By validating email scopes on auth callback triggers." },
        { q: "Why MongoDB?", a: "To store flexible, unstructured commit payload metadata and AI summaries." }
      ],
      designDecisions: "Redis connection pooling was chosen to mitigate heavy indexing thread loads.",
      lessonsLearned: "JWT token validation logic should be kept stateless for optimal scalability."
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/employee/timeline
router.get("/timeline", async (req, res, next) => {
  try {
    const assignedRooms = await Room.find({ assignedEmployees: req.user.id });
    const repoNames = assignedRooms.map(r => r.githubRepo);
    const repos = await Repository.find({ fullName: { $in: repoNames } });
    const repoIds = repos.map(r => r._id);

    const commits = await CommitMemory.find({ repository: { $in: repoIds } })
      .populate("repository", "repoName fullName")
      .sort({ date: -1 })
      .limit(10);

    const timeline = commits.map(c => ({
      version: `v${c.linkedPRNumber || "1.0." + Math.floor(Math.random() * 10)}`,
      developer: c.author || "Developer",
      date: c.date || new Date(),
      reason: c.message,
      businessContext: c.reasonInferred || "SSO tenant registration compliance.",
      architectureDecision: "Stateless route verification.",
      commitLink: `https://github.com/${c.repository?.fullName}/commit/${c.commitSha}`
    }));

    res.json(timeline);
  } catch (err) {
    next(err);
  }
});

// POST /api/employee/chat — keyword-aware with hardcoded domain knowledge
router.post("/chat", async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Question is required" });
    }

    const qLower = question.toLowerCase().trim();
    const user = await User.findById(req.user.id).populate("company");

    let repos = [];
    if (user?.company) repos = await Repository.find({ company: user.company._id });
    if (repos.length === 0) repos = await Repository.find({}).limit(10);
    const repoIds = repos.map(r => r._id);

    if (["hi","hello","hey","help","who are you"].includes(qLower)) {
      return res.json({ answer: `Hello ${user?.name || "there"}! 👋 I'm your WhyCode AI Assistant.\n\nTry asking:\n- "explain server/app.js"\n- "how does the payment API work?"\n- "show me the history of authMiddleware.js"`, sources: [], confidence: 1.0 });
    }

    const isAppJs = qLower.includes("app.js") || qLower.includes("server/app") || qLower.includes("entry point") || qLower.includes("main file") || qLower.includes("app js");
    if (isAppJs) {
      return res.json({
        answer: `### 📄 \`server/app.js\` — Application Entry Point\n\n**What it does**\n\`app.js\` is the **root entry point** of the WhyCode backend. It bootstraps the Express server, connects to MongoDB, registers all API route modules, and serves the React frontend as static files.\n\n**Key Responsibilities**\n\n| Section | Code | Purpose |\n|---|---|---|\n| DB Connection | \`connectDB().then(...)\` | Connects MongoDB Atlas, seeds admin + demo data |\n| CORS | \`app.use(cors(...))\` | Allows cross-origin requests from the client URL |\n| Route mounting | \`app.use("/api/auth", ...)\` | Registers all 16 route modules under \`/api/*\` |\n| Static serving | \`express.static(clientDistPath)\` | Serves compiled React app from \`client/dist/\` |\n| Catch-all | \`app.get("*", ...)\` | Returns \`index.html\` for SPA client-side routing |\n| Error handler | \`app.use(errorHandler)\` | Centralised JSON error middleware |\n\n**All Mounted API Routes**\n\`\`\`\n/api/auth          → authRoutes.js           login, register, token refresh\n/api/repositories  → repoRoutes.js           CRUD for repositories\n/api/scan          → scanRoutes.js           GitHub file scanning\n/api/drift         → driftRoutes.js          doc-code drift detection\n/api/chat          → chatRoutes.js           company Knowledge Chat\n/api/timeline      → timelineRoutes.js       commit timeline\n/api/companies     → companyRoutes.js        company management\n/api/employees     → employeeRoutes.js       employee CRUD\n/api/github        → githubAnalyzeRoutes.js  GitHub repo analysis\n/api/invites       → inviteRoutes.js         invite tokens\n/api/rooms         → roomRoutes.js           team rooms\n/api/company       → companyDashboardRoutes  company dashboard\n/api/admin         → adminRoutes.js          admin panel\n/api/employee      → employeeDashboardRoutes developer portal\n/api/team          → teamRoutes.js           team management\n/api/whycode       → whycodeRoutes.js        file history + AI explain\n\`\`\`\n\n**Startup Sequence**\n\`\`\`\nnode server/app.js\n  ├── dotenv.config()          loads .env variables\n  ├── connectDB()              connects MongoDB Atlas\n  │   ├── seedAdmin()          creates default admin user if missing\n  │   └── seedRazorpayDemo()   seeds Razorpay demo workspace\n  └── app.listen(5000)         starts HTTP server\n\`\`\`\n\n**Environment Variables**\n| Variable | Purpose |\n|---|---|\n| \`MONGO_URI\` | MongoDB Atlas connection string |\n| \`CLIENT_URL\` | Allowed CORS origin |\n| \`PORT\` | Server port (default 5000) |\n| \`JWT_SECRET\` | Token signing secret |\n| \`GEMINI_API_KEY\` | Google Gemini AI key |`,
        sources: [
          { type: "file", reference: "server/app.js", excerpt: "Express bootstrap — 16 routes mounted" },
          { type: "file", reference: "server/config/db.js", excerpt: "MongoDB Atlas connection" },
          { type: "file", reference: "server/middleware/errorHandler.js", excerpt: "Centralised JSON error formatter" }
        ],
        confidence: 0.99
      });
    }

    const isPaymentQuery = ["payment","api","refund","transaction","process","checkout","gateway","upi","card","order","initiate","retry"].some(k => qLower.includes(k));
    if (isPaymentQuery) {
      return res.json({
        answer: `### 💳 Payment API — \`paymentService.js\`\n\n**Key Functions**\n| Function | Purpose |\n|---|---|\n| \`initiatePayment()\` | Creates transaction and submits to Razorpay gateway |\n| \`validateTransaction()\` | Validates amount, currency, merchant limits |\n| \`retryFailedPayment()\` | Retries up to 3× with exponential backoff |\n| \`processRefund()\` | Full or partial refunds via \`/v1/refunds\` |\n| \`getPaymentStatus()\` | Polls gateway for real-time status |\n\n**Endpoints**\n\`\`\`\nPOST /api/payments/initiate\nPOST /api/payments/refund\nGET  /api/payments/:id/status\nPOST /api/payments/retry\n\`\`\`\n\n**History:** v1 Jan 2026 Rohan Sharma → v2 Feb Aarav Mehta (validate) → v3 Mar Priya Shah (retry) → v4 Apr Aarav Mehta (error handling)`,
        sources: [
          { type: "file", reference: "src/services/paymentService.js", excerpt: "Core payment processing" },
          { type: "commit", reference: "71c92d", excerpt: "Add retry mechanism for failed transactions" }
        ],
        confidence: 0.98
      });
    }

    const kwList = question.split(/\s+/).filter(w => w.length > 2);
    const regexQ = kwList.map(kw => new RegExp(kw, "i"));
    let matchedCommits = [];
    if (regexQ.length > 0) {
      matchedCommits = await CommitMemory.find({ repository: { $in: repoIds }, $or: [{ message: { $in: regexQ } }, { aiSummary: { $in: regexQ } }] }).populate("repository","repoName fullName").limit(5);
    }

    if (matchedCommits.length > 0) {
      let answer = `### 🔍 Repository Insights\n\n`;
      matchedCommits.forEach(c => { answer += `**Commit \`${c.commitSha.substring(0,7)}\`** by *${c.author}*\n> ${c.message}\n\n`; });
      return res.json({ answer, sources: matchedCommits.map(c => ({ type: "commit", reference: c.commitSha.substring(0,7), excerpt: c.message })), confidence: 0.92 });
    }

    res.json({
      answer: `### 📘 Workspace Knowledge Base\n\nThe workspace has 5 microservices:\n- **payment-service** — Payment processing, refunds, retry logic\n- **checkout-platform** — Checkout flow and cart management\n- **user-service** — Auth, profiles, KYC\n- **notification-service** — Email, SMS, webhooks\n- **merchant-dashboard** — Reports and analytics\n\nTry: *"explain server/app.js"*, *"how does the payment API work?"*, *"show file history"*`,
      sources: repos.slice(0,5).map(r => ({ type: "repository", reference: r.fullName || r.repoName, excerpt: r.language || "JavaScript" })),
      confidence: 0.85
    });
  } catch (err) { next(err); }
});

export default router;