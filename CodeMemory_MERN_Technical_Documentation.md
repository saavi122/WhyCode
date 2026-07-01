# CodeMemory — MERN Stack Technical Documentation

AI-Powered Knowledge Recovery & Documentation Intelligence for Software Teams

---

## 1. Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React (Vite), TailwindCSS, React Query, Axios, Monaco Editor, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas), Mongoose ODM |
| Auth | JWT + GitHub OAuth (Passport.js or custom OAuth flow) |
| AI | Claude API (Anthropic) |
| Git Data Source | GitHub REST API v3 + GitHub GraphQL API v4 (for blame) |
| Deployment | Vercel (frontend), Render/Railway (backend), MongoDB Atlas (DB) |

---

## 2. Project Folder Structure

```
codememory/
├── client/                        # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/               # axios instances, API call wrappers
│   │   │   ├── api.js
│   │   │   ├── repoService.js
│   │   │   ├── driftService.js
│   │   │   ├── chatService.js
│   │   ├── context/                 # AuthContext, RepoContext
│   │   └── App.jsx
│   └── .env                         # VITE_API_BASE_URL
│
├── server/                          # Express app
│   ├── config/
│   │   ├── db.js                    # Mongo connection
│   │   ├── github.js                # Octokit/GitHub client config
│   │   └── ai.js                    # Anthropic client config
│   ├── models/
│   │   ├── User.js
│   │   ├── Repository.js
│   │   ├── Drift.js
│   │   ├── CommitMemory.js
│   │   └── KnowledgeQA.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── repoController.js
│   │   ├── scanController.js
│   │   ├── driftController.js
│   │   ├── chatController.js
│   │   └── timelineController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── repoRoutes.js
│   │   ├── scanRoutes.js
│   │   ├── driftRoutes.js
│   │   ├── chatRoutes.js
│   │   └── timelineRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js        # verifies JWT
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── githubService.js         # all GitHub API calls
│   │   └── aiService.js             # all Claude prompt calls
│   ├── server.js
│   └── .env                          # MONGO_URI, JWT_SECRET, GITHUB_CLIENT_ID/SECRET, ANTHROPIC_API_KEY
│
└── package.json (root, optional concurrently script)
```

---

## 3. Database Connection Setup (MongoDB + Mongoose)

`server/config/db.js`

```javascript
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 7+ no longer needs useNewUrlParser/useUnifiedTopology
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

`server/server.js`

```javascript
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "5mb" })); // larger limit for code/diff payloads

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/repositories", require("./routes/repoRoutes"));
app.use("/api/scan", require("./routes/scanRoutes"));
app.use("/api/drift", require("./routes/driftRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/timeline", require("./routes/timelineRoutes"));

app.use(require("./middleware/errorHandler"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

`.env` (server)

```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/codememory
JWT_SECRET=your_jwt_secret
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
ANTHROPIC_API_KEY=your_claude_api_key
CLIENT_URL=http://localhost:5173
```

---

## 4. Mongoose Schemas (Detailed)

### 4.1 User Model — `models/User.js`

```javascript
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    githubId: { type: String, unique: true, sparse: true },
    githubAccessToken: { type: String, select: false }, // encrypted/hidden by default
    avatarUrl: String,
    role: { type: String, enum: ["developer", "team_lead", "admin"], default: "developer" },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
```

### 4.2 Repository Model — `models/Repository.js`

```javascript
const repositorySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    repoName: { type: String, required: true },       // e.g. "codememory-demo"
    fullName: { type: String, required: true },        // e.g. "username/codememory-demo"
    githubRepoId: { type: Number, required: true },
    defaultBranch: { type: String, default: "main" },
    language: String,
    lastScanAt: Date,
    docHealthScore: { type: Number, default: 0 },       // 0-100
    knowledgeCoverage: { type: Number, default: 0 },
    busFactor: { type: Number, default: 0 },
    status: { type: String, enum: ["idle", "scanning", "completed", "failed"], default: "idle" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Repository", repositorySchema);
```

### 4.3 Drift Model — `models/Drift.js`

```javascript
const driftSchema = new mongoose.Schema(
  {
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    filePath: { type: String, required: true },
    type: { type: String, enum: ["docstring_drift", "comment_drift", "readme_drift"], required: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    currentDocText: String,
    currentCodeSnippet: String,
    suggestion: String,
    confidence: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ["open", "accepted", "rejected"], default: "open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Drift", driftSchema);
```

### 4.4 CommitMemory Model — `models/CommitMemory.js`

```javascript
const commitMemorySchema = new mongoose.Schema(
  {
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    commitSha: { type: String, required: true },
    author: String,
    message: String,
    filesChanged: [String],
    aiSummary: String,        // short plain-language summary of the change
    reasonInferred: String,   // "why" reconstructed by AI, if applicable
    linkedPRNumber: Number,
    date: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommitMemory", commitMemorySchema);
```

### 4.5 KnowledgeQA Model — `models/KnowledgeQA.js`

```javascript
const knowledgeQASchema = new mongoose.Schema(
  {
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    askedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sources: [
      {
        type: { type: String, enum: ["commit", "pull_request", "file", "issue"] },
        reference: String,   // sha / PR number / file path
        excerpt: String,
      },
    ],
    confidence: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("KnowledgeQA", knowledgeQASchema);
```

---

## 5. GitHub Integration — Data Fetching Layer

### 5.1 GitHub Client Config — `config/github.js`

```javascript
const { Octokit } = require("@octokit/rest");

const getGithubClient = (accessToken) => {
  return new Octokit({ auth: accessToken });
};

module.exports = getGithubClient;
```

Use the **user's own GitHub OAuth token** (stored encrypted on `User.githubAccessToken`) for all calls — this avoids rate-limit issues tied to a single app token and only exposes repos the user already has access to.

### 5.2 GitHub Service — `services/githubService.js`

```javascript
const getGithubClient = require("../config/github");

// Fetch repo metadata
const fetchRepoMeta = async (token, owner, repo) => {
  const octokit = getGithubClient(token);
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
};

// Fetch file tree (recursive)
const fetchRepoTree = async (token, owner, repo, branch) => {
  const octokit = getGithubClient(token);
  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const { data: tree } = await octokit.git.getTree({
    owner, repo, tree_sha: refData.object.sha, recursive: true,
  });
  return tree.tree.filter((item) => item.type === "blob");
};

// Fetch file content
const fetchFileContent = async (token, owner, repo, path) => {
  const octokit = getGithubClient(token);
  const { data } = await octokit.repos.getContent({ owner, repo, path });
  return Buffer.from(data.content, "base64").toString("utf-8");
};

// Fetch commit history for a file
const fetchFileCommits = async (token, owner, repo, path) => {
  const octokit = getGithubClient(token);
  const { data } = await octokit.repos.listCommits({ owner, repo, path, per_page: 30 });
  return data; // includes sha, commit.message, author, date
};

// Fetch git blame via GraphQL (line-level authorship)
const fetchBlame = async (token, owner, repo, path, branch) => {
  const octokit = getGithubClient(token);
  const query = `
    query ($owner: String!, $repo: String!, $expr: String!) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $expr) {
          target {
            ... on Commit {
              blame(path: "${path}") {
                ranges {
                  startingLine
                  endingLine
                  commit {
                    oid
                    message
                    committedDate
                    author { name }
                  }
                }
              }
            }
          }
        }
      }
    }`;
  const result = await octokit.graphql(query, { owner, repo, expr: `refs/heads/${branch}` });
  return result.repository.ref.target.blame.ranges;
};

// Fetch PR linked to a commit (search by SHA)
const fetchLinkedPR = async (token, owner, repo, sha) => {
  const octokit = getGithubClient(token);
  const { data } = await octokit.search.issuesAndPullRequests({ q: `${sha} repo:${owner}/${repo} type:pr` });
  return data.items[0] || null;
};

module.exports = {
  fetchRepoMeta, fetchRepoTree, fetchFileContent,
  fetchFileCommits, fetchBlame, fetchLinkedPR,
};
```

**Why each endpoint is used:**

- `GET /repos/{owner}/{repo}` → basic metadata to register a repo (language, default branch, stars).
- `GET /git/trees` (recursive) → builds the file list to scan for documentation/code pairs.
- `GET /repos/{owner}/{repo}/contents/{path}` → pulls raw file content (code + comments + README) for drift comparison.
- `GET /repos/{owner}/{repo}/commits?path=` → commit history scoped to a single file, used to reconstruct "why" for that file.
- GraphQL `blame` → line-level authorship, used to trace exactly which commit introduced a specific block of code (the flagship "intent reconstruction" feature).
- Search API (`type:pr`) → links a commit SHA back to its pull request discussion, giving the AI extra context (PR description, review comments) beyond the bare commit message.

---

## 6. AI Integration Layer (Claude API)

### 6.1 AI Client Config — `config/ai.js`

```javascript
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = anthropic;
```

### 6.2 AI Service — `services/aiService.js`

```javascript
const anthropic = require("../config/ai");

// Module 1: Documentation Drift Detection
const detectDrift = async (codeSnippet, docText) => {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Compare this function's documentation against its implementation.

Documentation:
${docText}

Code:
${codeSnippet}

Return ONLY valid JSON in this exact shape:
{
  "driftDetected": boolean,
  "severity": "low" | "medium" | "high",
  "explanation": string,
  "suggestedDocumentation": string,
  "confidence": number
}`,
      },
    ],
  });
  return JSON.parse(response.content[0].text);
};

// Module 2: Intent Reconstruction ("Why does this exist")
const reconstructIntent = async (codeSnippet, commits, prContext) => {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Given the code below and its history, explain WHY this code exists — not what it does.

Code:
${codeSnippet}

Commit History:
${JSON.stringify(commits)}

Linked PR Discussion:
${prContext || "none available"}

Return ONLY valid JSON:
{
  "reason": string,
  "addedDate": string,
  "riskIfRemoved": string,
  "confidence": number,
  "evidenceCommits": [string]
}`,
      },
    ],
  });
  return JSON.parse(response.content[0].text);
};

// Module 3: Tribal Knowledge Search (grounded Q&A)
const answerKnowledgeQuestion = async (question, contextChunks) => {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Answer the question using ONLY the provided context (commits, PRs, file excerpts). Never hallucinate. If the answer isn't in the context, say so clearly.

Context:
${JSON.stringify(contextChunks)}

Question: ${question}

Return ONLY valid JSON:
{
  "answer": string,
  "confidence": number,
  "sources": [{"type": string, "reference": string, "excerpt": string}]
}`,
      },
    ],
  });
  return JSON.parse(response.content[0].text);
};

module.exports = { detectDrift, reconstructIntent, answerKnowledgeQuestion };
```

> All AI calls are kept structured-JSON-only (no preamble) so the backend can safely `JSON.parse()` the response without regex cleanup. Wrap each call in try/catch and strip ```` ```json ```` fences defensively in case the model adds them.

---

## 7. REST API Design (Express Routes)

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/github` | Exchange GitHub OAuth code for access token, create/find user, return JWT | Public |
| GET | `/api/auth/me` | Get logged-in user profile | JWT |
| GET | `/api/repositories` | List repos the user has connected | JWT |
| POST | `/api/repositories` | Register a new repo (fetch meta from GitHub, save to DB) | JWT |
| POST | `/api/scan/:repoId` | Trigger full scan: fetch tree, files, commits → run drift + commit memory analysis | JWT |
| GET | `/api/drift/:repoId` | List all open drift issues for a repo | JWT |
| PATCH | `/api/drift/:driftId` | Accept/reject an AI suggestion (apply doc update) | JWT |
| GET | `/api/timeline/:repoId/:filePath` | Get commit/intent timeline for a specific file | JWT |
| POST | `/api/chat/:repoId` | Ask a natural-language question, returns grounded answer | JWT |
| GET | `/api/repositories/:repoId/risk` | Get bus-factor / risk analysis for a repo | JWT |

### 7.1 Example Controller — `controllers/scanController.js`

```javascript
const Repository = require("../models/Repository");
const Drift = require("../models/Drift");
const CommitMemory = require("../models/CommitMemory");
const githubService = require("../services/githubService");
const aiService = require("../services/aiService");

exports.scanRepository = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    repo.status = "scanning";
    await repo.save();

    const token = req.user.githubAccessToken; // attached by authMiddleware
    const [owner, name] = repo.fullName.split("/");

    const files = await githubService.fetchRepoTree(token, owner, name, repo.defaultBranch);
    const docFiles = files.filter((f) => /\.(js|ts|py|md)$/.test(f.path)).slice(0, 25); // cap for demo speed

    for (const file of docFiles) {
      const content = await githubService.fetchFileContent(token, owner, name, file.path);
      const driftResult = await aiService.detectDrift(content, extractDocBlock(content));

      if (driftResult.driftDetected) {
        await Drift.create({
          repository: repo._id,
          filePath: file.path,
          type: "docstring_drift",
          severity: driftResult.severity,
          currentCodeSnippet: content.slice(0, 500),
          suggestion: driftResult.suggestedDocumentation,
          confidence: driftResult.confidence,
        });
      }

      const commits = await githubService.fetchFileCommits(token, owner, name, file.path);
      await CommitMemory.insertMany(
        commits.slice(0, 5).map((c) => ({
          repository: repo._id,
          commitSha: c.sha,
          author: c.commit.author.name,
          message: c.commit.message,
          filesChanged: [file.path],
          date: c.commit.author.date,
        }))
      );
    }

    repo.status = "completed";
    repo.lastScanAt = new Date();
    await repo.save();

    res.json({ message: "Scan completed", repoId: repo._id });
  } catch (err) {
    next(err);
  }
};

function extractDocBlock(content) {
  const match = content.match(/\/\*\*[\s\S]*?\*\//);
  return match ? match[0] : "";
}
```

### 7.2 Example Controller — `controllers/chatController.js`

```javascript
const KnowledgeQA = require("../models/KnowledgeQA");
const CommitMemory = require("../models/CommitMemory");
const aiService = require("../services/aiService");

exports.askQuestion = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const { question } = req.body;

    // Pull relevant context: simple keyword match for demo; can upgrade to vector search later
    const relevantCommits = await CommitMemory.find({
      repository: repoId,
      $or: [
        { message: { $regex: question.split(" ").join("|"), $options: "i" } },
      ],
    }).limit(10);

    const result = await aiService.answerKnowledgeQuestion(question, relevantCommits);

    const saved = await KnowledgeQA.create({
      repository: repoId,
      askedBy: req.user._id,
      question,
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
    });

    res.json(saved);
  } catch (err) {
    next(err);
  }
};
```

---

## 8. Auth Middleware — `middleware/authMiddleware.js`

```javascript
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("+githubAccessToken");
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid or expired" });
  }
};

module.exports = protect;
```

---

## 9. Frontend — API Fetching Layer

### 9.1 Axios Instance — `client/src/services/api.js`

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### 9.2 Repo Service — `client/src/services/repoService.js`

```javascript
import api from "./api";

export const getRepositories = () => api.get("/repositories");
export const addRepository = (data) => api.post("/repositories", data);
export const triggerScan = (repoId) => api.post(`/scan/${repoId}`);
export const getDrift = (repoId) => api.get(`/drift/${repoId}`);
export const resolveDrift = (driftId, action) => api.patch(`/drift/${driftId}`, { action });
export const getTimeline = (repoId, filePath) =>
  api.get(`/timeline/${repoId}/${encodeURIComponent(filePath)}`);
export const askQuestion = (repoId, question) =>
  api.post(`/chat/${repoId}`, { question });
```

### 9.3 Consuming with React Query — example in a page component

```javascript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDrift, resolveDrift } from "../services/repoService";

function DriftPanel({ repoId }) {
  const queryClient = useQueryClient();

  const { data: driftItems, isLoading } = useQuery({
    queryKey: ["drift", repoId],
    queryFn: () => getDrift(repoId).then((res) => res.data),
  });

  const mutation = useMutation({
    mutationFn: ({ driftId, action }) => resolveDrift(driftId, action),
    onSuccess: () => queryClient.invalidateQueries(["drift", repoId]),
  });

  if (isLoading) return <p>Loading drift issues...</p>;

  return (
    <div>
      {driftItems.map((item) => (
        <div key={item._id} className="border p-4 rounded mb-2">
          <p className="font-semibold">{item.filePath}</p>
          <p>{item.suggestion}</p>
          <button onClick={() => mutation.mutate({ driftId: item._id, action: "accepted" })}>
            Accept
          </button>
          <button onClick={() => mutation.mutate({ driftId: item._id, action: "rejected" })}>
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 10. End-to-End Data Flow Summary

1. User logs in via GitHub OAuth → backend exchanges code for access token → token stored (encrypted) on `User` document → JWT issued to frontend.
2. User selects a repo → `POST /api/repositories` fetches metadata from GitHub and saves a `Repository` document.
3. User clicks **Analyze Repository** → `POST /api/scan/:repoId` walks the file tree, pulls file content + commit history from GitHub, runs each file through `aiService.detectDrift`, and stores results in `Drift` and `CommitMemory` collections.
4. Frontend dashboard fetches `/api/drift/:repoId` and `/api/repositories/:repoId/risk` to render Documentation Health, Drift count, and Bus Factor cards.
5. User opens a flagged file → frontend calls `/api/timeline/:repoId/:filePath`, backend pulls blame + commit data via `githubService.fetchBlame`/`fetchFileCommits`, then `aiService.reconstructIntent` generates the "why this exists" explanation.
6. User asks a free-text question in AI Chat → `/api/chat/:repoId` retrieves relevant `CommitMemory` documents as grounding context, calls `aiService.answerKnowledgeQuestion`, stores and returns the answer with cited sources.
7. User clicks **Accept** on a suggested doc fix → `PATCH /api/drift/:driftId` updates status (full GitHub commit-back of the doc fix is a stretch goal beyond the 2-day MVP; for the hackathon, "accept" just marks it resolved and displays the new text).

---

## 11. 2-Day Build Order (Condensed)

**Day 1**
1. Scaffold client (Vite + React + Tailwind) and server (Express).
2. Set up MongoDB Atlas, connect via `config/db.js`, define all 5 schemas.
3. Implement GitHub OAuth login flow + JWT issuance.
4. Implement `githubService.js` (tree, content, commits, blame).
5. Build repo connect/list UI and `/api/repositories` endpoints.

**Day 2**
1. Implement `aiService.js` (drift detection, intent reconstruction, Q&A).
2. Implement `/api/scan`, `/api/drift`, `/api/timeline`, `/api/chat` endpoints end-to-end.
3. Build Dashboard (health/drift/coverage cards), File Viewer with split-screen AI explanation, AI Chat page.
4. Deploy: frontend → Vercel, backend → Render, DB → Atlas. Final demo run-through.

---

*Document generated for the CodeMemory MERN-stack hackathon build.*
