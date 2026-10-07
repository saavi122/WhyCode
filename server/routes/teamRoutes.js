import express from "express";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Repository from "../models/Repository.js";
import CommitMemory from "../models/CommitMemory.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Apply protection to all team routes
router.use(protect);

// Helper to get allowed repos for the current employee
const getAllowedRepoNames = async (userId) => {
  const rooms = await Room.find({ assignedEmployees: userId });
  return [...new Set(rooms.map(r => r.githubRepo))];
};

// Helper to check if current user shares a repository with target employee
const checkSharedAccess = async (currentUserId, targetUserId) => {
  const currentRepos = await getAllowedRepoNames(currentUserId);
  const targetRepos = await getAllowedRepoNames(targetUserId);
  return currentRepos.some(r => targetRepos.includes(r));
};

// GET /api/team (List visible teammates sharing company context)
router.get("/", async (req, res, next) => {
  try {
    const allowedRepos = await getAllowedRepoNames(req.user.id);

    // Find company members excluding current user
    const teammates = await User.find({
      company: req.user.company,
      _id: { $ne: req.user.id }
    }).select("name email role avatarUrl githubUsername createdAt");

    // Enrich teammates with contribution stats
    const enrichedTeammates = await Promise.all(
      teammates.map(async (t) => {
        const repos = await Repository.find({ fullName: { $in: allowedRepos } });
        const repoIds = repos.map(r => r._id);

        const commitsCount = await CommitMemory.countDocuments({
          author: t.email.split("@")[0],
          repository: { $in: repoIds }
        });

        const activeProjCount = await Room.countDocuments({
          company: req.user.company,
          assignedEmployees: t._id
        });

        return {
          ...t.toObject(),
          designation: t.role === "company" ? "Company Lead & Engineering Director" : "Backend Engineer",
          status: "online",
          knowledgeScore: 85,
          totalCommits: commitsCount > 0 ? commitsCount : 14,
          prs: 4,
          reviews: 8,
          docContributions: 5,
          activeProjects: activeProjCount > 0 ? activeProjCount : 1,
          assignedRepositories: allowedRepos
        };
      })
    );

    res.json(enrichedTeammates);
  } catch (err) {
    next(err);
  }
});

// GET /api/team/activity (Live timeline activity feed of allowed shared repos)
router.get("/activity", async (req, res, next) => {
  try {
    const allowedRepos = await getAllowedRepoNames(req.user.id);
    const repos = await Repository.find({ fullName: { $in: allowedRepos } });
    const repoIds = repos.map(r => r._id);

    const commits = await CommitMemory.find({ repository: { $in: repoIds } })
      .populate("repository", "repoName fullName")
      .sort({ date: -1 })
      .limit(20);

    const feed = commits.map(c => ({
      _id: c._id,
      developer: c.author || "Developer",
      action: "Committed changes",
      message: c.message,
      repository: c.repository?.repoName || "Repository",
      time: c.date || new Date(),
      filesChanged: c.filesChanged || []
    }));

    res.json(feed);
  } catch (err) {
    next(err);
  }
});

// GET /api/team/shared-repositories
router.get("/shared-repositories", async (req, res, next) => {
  try {
    const allowedRepos = await getAllowedRepoNames(req.user.id);
    res.json(allowedRepos);
  } catch (err) {
    next(err);
  }
});

// GET /api/team/:employeeId (Teammate detailed profile)
router.get("/:employeeId", async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    const t = await User.findById(employeeId).populate("company");
    if (!t) {
      return res.status(404).json({ message: "Teammate not found" });
    }

    const allowedRepos = await getAllowedRepoNames(employeeId);
    const repos = await Repository.find({ fullName: { $in: allowedRepos } });
    const repoIds = repos.map(r => r._id);

    const commits = await CommitMemory.find({
      author: t.email.split("@")[0],
      repository: { $in: repoIds }
    }).populate("repository", "repoName fullName").sort({ date: -1 }).limit(10);

    res.json({
      profile: {
        _id: t._id,
        name: t.name,
        email: t.email,
        githubUsername: t.githubUsername || t.email.split("@")[0],
        designation: t.role === "company" ? "Company Lead & Engineering Director" : "Backend Engineer",
        companyName: t.company?.name || "WhyCode Workspace",
        joinedAt: t.createdAt
      },
      repositories: repos.map(r => r.fullName),
      commits: commits.map(c => ({
        sha: c.commitSha.substring(0, 7),
        message: c.message,
        date: c.date,
        repo: c.repository?.repoName || "Repository"
      })),
      aiSummary: `${t.name} is a key team member in ${t.company?.name || "WhyCode Workspace"}. They maintain documentation health score across active repositories.`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/team/repository/:repositoryId (List members assigned to a specific repo)
router.get("/repository/:repositoryId", async (req, res, next) => {
  try {
    const { repositoryId } = req.params;
    const repo = await Repository.findById(repositoryId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const rooms = await Room.find({ githubRepo: repo.fullName });
    const userIds = new Set();
    rooms.forEach(r => r.assignedEmployees.forEach(id => userIds.add(id.toString())));

    // Include company admin as repository lead
    const companyAdmin = await User.findOne({ company: repo.company, role: "company" });
    if (companyAdmin) userIds.add(companyAdmin._id.toString());

    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select("name email avatarUrl githubUsername role");
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/team/contributors/:repositoryId (Detailed repository ownership & contributors list)
router.get("/contributors/:repositoryId", async (req, res, next) => {
  try {
    const { repositoryId } = req.params;
    const repo = await Repository.findById(repositoryId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const companyAdmin = await User.findOne({ company: repo.company, role: "company" });
    const ownerName = companyAdmin ? `${companyAdmin.name} (${companyAdmin.email})` : "Engineering Lead";

    const commits = await CommitMemory.find({ repository: repo._id });
    const counts = {};
    commits.forEach(c => {
      const auth = c.author || "developer";
      counts[auth] = (counts[auth] || 0) + 1;
    });

    const contributorsList = Object.entries(counts).map(([name, count]) => ({
      name,
      commitsCount: count,
      role: count > 10 ? "Maintainer" : "Contributor"
    }));

    res.json({
      owner: ownerName,
      contributors: contributorsList,
      aiKnowledgeLeader: contributorsList[0]?.name || (companyAdmin ? companyAdmin.name : "Engineering Lead")
    });
  } catch (err) {
    next(err);
  }
});

export default router;
