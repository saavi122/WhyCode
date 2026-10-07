# Comprehensive GitHub App & Grounded RAG Audit

**Project:** WhyCode (CodeMemory MERN Workspace)  
**Audit Date:** October 04, 2026  
**Scope:** Architecture, Authentication, Multi-Tenancy, GitHub Integration, Grounded RAG, AI Assistant, Job Processing, Environment Configuration, and Webhooks.

---

## 1. Authentication & Multi-Tenancy Architecture

### 1.1 Login Mechanisms
* **Unified Email/Password Login (`POST /api/auth/login`)**:
  * Implementation: [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L73-L120), routed in [authRoutes.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/routes/authRoutes.js#L13).
  * Accepts `{ email, password }`. Queries `User` by lowercase email, selecting the password field (`+password`). Validates hash using `bcrypt.compare`.
  * Signs a JWT with payload `{ id: user._id, role: user.role, company: user.company }` (expires in 7 days).
* **Company Admin Registration (`POST /api/auth/register`)**:
  * Implementation: [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L9-L70), routed in [authRoutes.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/routes/authRoutes.js#L12).
  * Creates a new `Company` document ([Company.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/Company.js#L3-L21)), hashes the password using `bcrypt.hash(password, 12)`, creates a `User` document with `role: "company"` ([User.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/User.js#L9)), sets `company.ownerId = user._id`, and returns a signed JWT.
* **Passwordless Employee Login (`POST /api/auth/employee-login`)**:
  * Implementation: [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L136-L240), routed in [authRoutes.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/routes/authRoutes.js#L14).
  * Accepts `{ email, companyName }`. Searches for `Company` by name (case-insensitive regex). Verifies an active `Invite` record with status `pending` or `accepted` for that email and company.
  * On first login, auto-creates an employee `User` (`role: "employee"`, `company: company._id`), updates invite status to `accepted`, assigns the user to a `Room` if `assignedRepo` is present ([authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L186-L207)), and issues a JWT.
* **Employee Invite Acceptance (`POST /api/invites/accept`)**:
  * Implementation: [inviteController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/inviteController.js#L163-L282), routed in [inviteRoutes.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/routes/inviteRoutes.js#L10).
  * Public endpoint used when an invited employee sets a password via token link (`/invite/accept?token=...`). Verifies token validity and expiration, creates `User` with `role: "employee"`, sets password hash, updates invite status to `accepted`, and returns JWT.
* **Google OAuth (`GET /api/auth/google`, `GET /api/auth/google/callback`)**:
  * Implementation: [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L509-L606), routed in [authRoutes.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/routes/authRoutes.js#L25-L26).
  * Redirects user to Google consent screen, exchanges `code` for tokens, fetches user profile from Google API, upserts `User` (creates fallback company if new user), issues JWT, and redirects to `${CLIENT_URL}/auth/callback?token=${token}`.

### 1.2 User and Company Resolution on Server
* **Authentication Middleware (`protect`)**:
  * Implementation: [authMiddleware.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/middleware/authMiddleware.js#L4-L31).
  * Extracts Bearer token from `Authorization` header. Decodes JWT using `process.env.JWT_SECRET`.
  * Constructs `req.user = { id: decoded.id, _id: decoded.id, role: decoded.role, company: decoded.company }`.
  * Queries `User.findById(decoded.id).select("+githubAccessToken")` to populate `req.user.githubAccessToken`, `req.user.name`, and `req.user.email`.
* **Multi-Tenant Context Guard (`validateTenantContext`)**:
  * Implementation: [tenantGuard.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/tenantGuard.js#L26-L46).
  * Strictly extracts `companyId` from `authContext.companyId || authContext.company` (from `req.user`).
  * Explicitly ignores/strips any `companyId` passed in untrusted request bodies or query parameters ([tenantGuard.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/tenantGuard.js#L28-L30)) to prevent cross-tenant data leakage.

### 1.3 Roles & Access Control
* Roles enum in [User.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/User.js#L9): `["admin", "company", "employee"]`.
* **Company Admin**: A user with `role === "company"`. Assigned when a user registers a new organization or creates a company via OAuth fallback. Has administrative rights over company profile, employees, invites, and repositories.
* **Role Middleware (`roleMiddleware(...roles)`)**:
  * Implementation: [roleMiddleware.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/middleware/roleMiddleware.js#L1-L8).
  * Verifies `req.user.role` against allowed roles, returning HTTP 403 `Access denied` if unauthorized.

### 1.4 Invitations and Onboarding
* **Sending Invites (`POST /api/invites/send`)**:
  * Implementation: [inviteController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/inviteController.js#L21-L104), routed in [inviteRoutes.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/routes/inviteRoutes.js#L8).
  * Allowed for Company Admin (`protect`, `roleMiddleware("company")`). Generates a 32-byte hex crypto token, sets 48-hour expiration (`expiresAt`), saves `Invite` document ([Invite.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/Invite.js#L3-L16)), and sends an email via Nodemailer ([sendEmail.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/utils/sendEmail.js)) containing link `${clientUrl}/invite/accept?token=${token}`.
* **Verifying Invites (`GET /api/invites/verify/:token`)**:
  * Implementation: [inviteController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/inviteController.js#L107-L160).
  * Public endpoint returning invite status, pre-filled name, email, company name, and assigned repository.

---

## 2. Company Dashboard (Frontend)

### 2.1 Route Structure & Protection
* **Main Dashboard Gateway Route**:
  * Defined in [App.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/App.jsx#L65-L69) as `/dashboard/*` wrapped inside `<ProtectedRoute>` ([ProtectedRoute.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ProtectedRoute.jsx)).
* **Dashboard Component Switcher**:
  * Implementation: `Dashboard()` in [Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L82-L93). Evaluates `user?.role`:
    * `role === "admin"` -> renders `<AdminDashboard />`
    * `role === "employee"` -> renders `<EmployeeDashboard />`
    * `role === "company"` -> renders `<CompanyDashboard />`
* **Company Dashboard Sub-Routes**:
  * Defined inside `CompanyDashboard()` in [Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L253-L261):
    * `/dashboard` -> `OverviewPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L296-L690))
    * `/dashboard/employees` -> `EmployeesPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L697-L800))
    * `/dashboard/invites` -> `InvitationsPanel`
    * `/dashboard/repositories` -> `RepositoriesPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1100-L1232))
    * `/dashboard/repositories/:repoId` -> `RepositoryDetailPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1237-L1519))
    * `/dashboard/chat` -> `KnowledgeChatPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1659-L1708))
    * `/dashboard/profile` -> `CompanyProfilePanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1713-L1750))

### 2.2 Key Frontend Components
* `CompanyDashboard`: Main layout shell with collapsible sidebar and navigation links ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L95-L291)).
* `ConnectRepoModal`: Modal dialog for linking repositories ([ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx)).
* `InviteModal`: Modal dialog for inviting developers ([InviteModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/InviteModal.jsx)).
* `StatCard`: Reusable KPI capsule card ([StatCard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/StatCard.jsx)).
* `ConfirmDialog`: Confirmation modal for repository disconnection ([ConfirmDialog.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConfirmDialog.jsx)).
* `EmptyState`: Placeholder UI for empty repository/invite lists ([EmptyState.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/EmptyState.jsx)).

### 2.3 Current GitHub and Connect Repository UI
* Triggered by clicking **Link Repository** or **Connect Repo** buttons in the Overview or Repositories panel, rendering `ConnectRepoModal` ([ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx#L11-L502)).
* **Tab 1: "From GitHub Account"**:
  * On mount/select, invokes `GET /api/github/status` ([ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx#L34-L40)).
  * If not connected, displays a "Connect GitHub App" button calling `GET /api/github/install` ([ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx#L62-L101)) to fetch `installUrl` and opens a browser popup window. Listens for `window.postMessage` (`GITHUB_CONNECTED`).
  * Once connected, calls `GET /api/github/repositories` ([ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx#L45)) to render repository list. User selects a repo, triggering `POST /api/github/select-repositories` with `{ selectedRepos: [repoFullName] }` ([ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx#L122)).
* **Tab 2: "Enter Manually"**:
  * Provides an input field for `owner/repo` string format. Submits to `POST /api/repositories` with `{ fullName }` ([ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx#L141)).
* **Post-Connection Sub-Flow**:
  * Renders a success panel with an option to immediately send developer invitations assigned to that specific repository (`InviteToRepoForm` in [ConnectRepoModal.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/components/ConnectRepoModal.jsx#L507-L673)).

### 2.4 State Management Strategy
* **Global Session State**: Provided by `AuthProvider` in [AuthContext.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/context/AuthContext.jsx#L7-L76). Reads JWT from `localStorage.getItem("token")` and decodes user payload using `jwtDecode`.
* **Server Data & Caching**: Managed by `@tanstack/react-query` (`useQuery`, `useMutation`). Query keys include `["stats"]`, `["repositories"]`, `["employees"]`, `["profile"]`, `["drift", repoId]`, and `["timeline", repoId]`.
* **HTTP Client**: Axios instance configured in [api.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/services/api.js#L13-L44). Automatically attaches `Authorization: Bearer ${token}` header to requests and redirects to `/` on HTTP 401 response.

---

## 3. Existing GitHub Code Audit

### 3.1 OAuth & App Code
* **User OAuth Flow (Personal Accounts)**:
  * Implemented in [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L405-L504).
  * `githubAuthorize` redirects to `https://github.com/login/oauth/authorize?client_id=...&scope=repo,read:org,read:user,user:email`.
  * `githubCallback` receives authorization `code`, exchanges it via `POST https://github.com/login/oauth/access_token`, fetches profile from `https://api.github.com/user`, stores `githubAccessToken` on `User` model, signs JWT, and redirects to `${CLIENT_URL}/auth/callback?token=${token}`.
* **Mock GitHub Dev Flow**:
  * `githubLogin` in [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L243-L389) allows bypass when `code === "mock_dev_code"`, seeding a mock user (`dev@whycode.local`) and company (`Mock Organization`).
* **Octokit Integration Helper**:
  * Implemented in [github.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/config/github.js#L3-L5). Instantiates Octokit using `new Octokit({ auth: accessToken })`.
* **GitHub API Client Service**:
  * Implemented in [githubService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/githubService.js). Fetches repository metadata, file trees via Git Trees API (`fetchRepoTree`), raw file content (`fetchFileContent`), and commit history (`fetchFileCommits`).

### 3.2 Token Type Used by Scan Controller
* `scanController.js` ([scanController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/scanController.js#L24)) passes `req.user.githubAccessToken` to `runBackgroundScan`.
* **Token Type**: This is a **User Access Token (OAuth Token)** attached to the user record during OAuth login/linking. It is **NOT** a server-side GitHub App Installation Access Token.

### 3.3 Redirect URLs & Hardcoded Values
* **Callback Redirect URL**: `process.env.GITHUB_APP_CALLBACK_URL` or `${process.env.SERVER_URL || "http://localhost:5000"}/api/github/callback` ([authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L406)).
* **Frontend OAuth Completion Redirect**: `${process.env.CLIENT_URL || "http://localhost:5173"}/auth/callback?token=${token}` ([authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L499)).
* **Hardcoded Fallbacks**:
  * `mock-token-xyz` fallback in [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L267) and [repoController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/repoController.js#L44).
  * `Default Corporation` / `corp@whycode.local` in [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L349-L352) and [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L478-L481).
  * Capped limits in `scanController.js`: max 10 code files scanned per repo (`slice(0, 10)` in [scanController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/scanController.js#L40)), max 5 commits saved per file (`slice(0, 5)` in [scanController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/scanController.js#L89)).

---

## 4. Models Audit

### 4.1 User Model (`User.js`)
* Source file: [User.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/User.js).
* Fields:
  * `name`: String (required)
  * `email`: String (required, unique, lowercase)
  * `password`: String (optional for employees, `select: false`)
  * `role`: String (enum: `["admin", "company", "employee"]`, required)
  * `company`: ObjectId (ref `Company`, default: `null`)
  * `isActive`: Boolean (default: `true`)
  * `githubId`: String (unique, sparse)
  * `githubAccessToken`: String (`select: false`)
  * `googleId`: String (unique, sparse)
  * `avatarUrl`: String
  * `timestamps`: auto `createdAt`, `updatedAt`

### 4.2 Company Model (`Company.js`)
* Source file: [Company.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/Company.js).
* Fields:
  * `name`: String (required)
  * `email`: String (required, unique)
  * `logo`: String
  * `ownerId`: ObjectId (ref `User`)
  * `plan`: String (enum: `["free", "growth", "enterprise"]`, default: `"free"`)
  * `github`: Embedded object:
    * `connected`: Boolean (default: `false`)
    * `installationId`: String
    * `organizationId`: String
    * `organization`: String
    * `connectedAt`: Date
    * `lastSync`: Date
    * `status`: String (default: `"Not Connected"`)
  * `timestamps`: auto `createdAt`, `updatedAt`

### 4.3 Repository Model (`Repository.js`)
* Source file: [Repository.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/Repository.js).
* Fields:
  * `owner`: ObjectId (ref `User`, required)
  * `company`: ObjectId (ref `Company`, required)
  * `repoName`: String (required, e.g. `"whycode-app"`)
  * `fullName`: String (required, e.g. `"org/whycode-app"`)
  * `githubRepoId`: Number (required)
  * `defaultBranch`: String (default: `"main"`)
  * `language`: String
  * `lastScanAt`: Date
  * `docHealthScore`: Number (default: `0`)
  * `knowledgeCoverage`: Number (default: `0`)
  * `busFactor`: Number (default: `0`)
  * `status`: String (enum: `["idle", "scanning", "completed", "failed"]`, default: `"idle"`)
  * `isMonitored`: Boolean (default: `true`)
  * `timestamps`: auto `createdAt`, `updatedAt`

### 4.4 GitHub Connection Model
* **Finding**: There is **no dedicated standalone `GitHubConnection` model** in the codebase.
* GitHub App connection state is stored inside the `github` subdocument on `Company` ([Company.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/Company.js#L10-L18)), while individual user OAuth tokens are stored directly on the `User` model (`githubAccessToken`, `githubId`) ([User.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/User.js#L12-L13)).

---

## 5. Grounded RAG Architecture Audit

### 5.1 Qdrant Vector Payload Schema
* Implemented in `upsertChunks` in [qdrantStore.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/qdrantStore.js#L59-L73).
* Every vector point payload stored in Qdrant strictly contains the following fields:
  ```json
  {
    "companyId": "<string>",
    "repositoryId": "<string>",
    "chunkId": "<string, e.g. 'src/app.js:0'>",
    "path": "<string, file path>",
    "startLine": "<number, 1-indexed>",
    "endLine": "<number, 1-indexed>",
    "commitSha": "<string>",
    "url": "<string, GitHub blob URL>",
    "content": "<string, raw code snippet text>"
  }
  ```

### 5.2 Qdrant Collection Name and Vector Dimensions
* **Collection Name**: `"repository_chunks"` ([indexingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/indexingService.js#L5), [groundingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/groundingService.js#L69)).
* **Vector Dimension**: Determined dynamically by the Hugging Face TEI Embeddings microservice (`getEmbedding` in [teiService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/teiService.js#L39-L72)). Dimensions match the model hosted by TEI (typically 384, 768, or 1024 dimensions). No fixed dimension constant is hardcoded in the Node backend.

### 5.3 Indexing Service Function Signatures
* `indexFile(authContext, repositoryId, file, commitSha = "", url = "")`:
  * Location: [indexingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/indexingService.js#L19-L25).
  * Chunks file content, requests embeddings from TEI, constructs points payload, and calls `upsertChunks`.
* `chunkCode(content, filePath, options = { chunkSize: 80, overlap: 15 })`:
  * Location: [chunker.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/chunker.js#L14).
  * Splices source code into line-bounded chunks with overlapping context.
* `upsertChunks(authContext, repositoryId, collectionName, points)`:
  * Location: [qdrantStore.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/qdrantStore.js#L51).
  * Enforces `validateTenantContext`, attaches `companyId` and `repositoryId` to payload, and executes HTTP `PUT` to Qdrant API.
* `deleteRepositoryChunks(authContext, repositoryId, collectionName)`:
  * Location: [qdrantStore.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/qdrantStore.js#L166).
  * Executes tenant-scoped deletion filter (`buildTenantFilter`) in Qdrant before re-indexing.

### 5.4 Retrieval Service Function Signatures
* `queryRepositoryKnowledge(authContext, repositoryId, query, options = { collectionName: "repository_chunks", topK: 5, minScoreThreshold: 0.3, temperature: 0 })`:
  * Location: [groundingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/groundingService.js#L57).
  * Orchestrates tenant validation, query embedding, vector search, TEI reranking, score threshold verification, vLLM answer generation, and citation mapping.
* `searchChunks(authContext, repositoryId, collectionName, queryVector, topK = 5)`:
  * Location: [qdrantStore.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/qdrantStore.js#L116).
  * Executes vector similarity search in Qdrant with `must` match filter on `companyId` and `repositoryId`.
* `rerank(query, chunks)`:
  * Location: [teiService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/teiService.js#L81).
  * Posts candidate chunks to TEI Rerank endpoint (`/rerank`) and sorts results descending by relevance score.
* `generateGroundedAnswer(query, chunks, options = { temperature: 0, model: "default-vllm-model" })`:
  * Location: [vllmService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/vllmService.js#L61).
  * Wraps untrusted code chunks inside `<untrusted_repository_code chunk_id="...">` tags to prevent prompt injection and queries the vLLM OpenAI-compatible endpoint.

### 5.5 Citation Mapping Strategy
* Server-Side Mapping Function: `mapCitations(citedChunkIds = [], retrievedChunks = [])` in [groundingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/groundingService.js#L17-L42).
* **Grounding Rule**: The LLM is instructed **NEVER** to invent line numbers, file paths, or URLs. It must only cite `[chunk_id]` bracket tags ([vllmService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/vllmService.js#L72-L73)).
* The server extracts cited chunk IDs, looks them up in the authoritative retrieved chunks payload map, and returns precise citations containing `{ chunkId, path, lineRange: [startLine, endLine], commitSha, url }`.

### 5.6 Refusal Logic & Thresholds
* **Refusal Message Constant**: `INSUFFICIENT_EVIDENCE_MESSAGE` in [groundingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/groundingService.js#L7):
  > *"I couldn't find sufficient evidence in the connected repository to answer that. I can help with questions about the repository's code, APIs, documentation, architecture, commits, and implementation."*
* **Refusal Conditions**:
  1. Empty or whitespace-only query string ([groundingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/groundingService.js#L61-L67)).
  2. Score Threshold Failure: Chunks returned from reranking are filtered by `minScoreThreshold` (default `0.3`). If `validMatches.length === 0`, **the LLM call is completely bypassed**, avoiding hallucination, and `INSUFFICIENT_EVIDENCE_MESSAGE` is returned immediately with `grounded: false` ([groundingService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/groundingService.js#L90-L104)).

### 5.7 Embedding Client
* Function: `getEmbedding(text)` in [teiService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/teiService.js#L39-L72).
* Sends HTTP `POST` to `${getTeiEmbeddingsUrl()}/embed` (default `http://localhost:8080/embed`) with payload `{ inputs: text }`. Attaches `Authorization: Bearer ${INTERNAL_SERVICE_TOKEN}` if configured.

---

## 6. AI Assistant Architecture

### 6.1 Backend Route
* Route: `POST /api/chat/:repoId` (protected by `protect` middleware) in [chatRoutes.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/routes/chatRoutes.js#L7).
* Controller: `askQuestion` in [chatController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/chatController.js#L7-L42).
* Logic: Passes `req.user` (carrying `companyId`) and `repoId` to `queryRepositoryKnowledge`. Saves question, answer, sources, and confidence to `KnowledgeQA` collection ([KnowledgeQA.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/models/KnowledgeQA.js)), then responds with JSON.

### 6.2 Frontend Screens
* **Global Knowledge Chat**: `KnowledgeChatPanel` in [Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1659-L1708).
* **Repository-Specific Chat**: `RepositoryChatPanel` in [Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1524-L1654), rendered inside `RepositoryDetailPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1514-L1516)) and `EmployeeDashboard.jsx` ([EmployeeDashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/EmployeeDashboard.jsx#L185-L196)).

### 6.3 Repository Selection Mechanism
* In `KnowledgeChatPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1686-L1695)), the UI renders a `<select>` dropdown populated by `GET /api/repositories`. Selecting a repository updates `selectedRepoId`, mounting `<RepositoryChatPanel repoId={selectedRepoId} />`.
* In `RepositoryDetailPanel` ([Dashboard.jsx](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/client/src/pages/Dashboard.jsx#L1238)), `repoId` is automatically selected from the URL route parameter `/dashboard/repositories/:repoId`.

---

## 7. Job System & Async Runner Audit

* **Question**: Is there a job queue system (Redis / BullMQ / Agenda) or background runner?
* **Findings**:
  * **No queue system (Redis or BullMQ) is installed or used.**
  * Verification: `server/package.json` ([package.json](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/package.json#L12-L24)) contains only basic dependencies (`express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `@octokit/rest`, `@google/genai`, `axios`, `nodemailer`).
  * Current Scan Execution: In `scanController.js` ([scanController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/scanController.js#L24-L26)), scanning is launched in-memory via an unawaited async function call:
    ```javascript
    runBackgroundScan(repo, req.user.githubAccessToken, req.user).catch((err) => { ... });
    ```
* **Risks**:
  * Unhandled in-memory async tasks will be killed if the Node.js server restarts or deploys during a scan.
  * No retry mechanism, concurrency limits, or job status persistence exists outside of updating `repo.status = "failed"`.

---

## 8. Environment Variable Audit

### 8.1 `.env` Loading Mechanism
* Loaded in `server/app.js` ([app.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/app.js#L28-L29)):
  ```javascript
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  ```

### 8.2 Environment Variable Names Index
*(Note: Values are omitted as requested)*
* `PORT` (Server listening port, [app.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/app.js#L82))
* `CLIENT_URL` (CORS origin & OAuth redirect base, [app.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/app.js#L37))
* `SERVER_URL` (Backend server base URL, [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L406))
* `MONGO_URI` (MongoDB connection string, [db.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/config/db.js#L5))
* `JWT_SECRET` (JWT signing key, [authMiddleware.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/middleware/authMiddleware.js#L11))
* `GITHUB_CLIENT_ID` (GitHub OAuth / App Client ID, [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L302))
* `GITHUB_CLIENT_SECRET` (GitHub OAuth / App Client Secret, [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L303))
* `GITHUB_APP_CALLBACK_URL` (GitHub OAuth Callback URL, [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L406))
* `GOOGLE_CLIENT_ID` (Google OAuth Client ID, [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L511))
* `GOOGLE_CLIENT_SECRET` (Google OAuth Client Secret, [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L535))
* `GOOGLE_REDIRECT_URI` (Google OAuth Redirect URI, [authController.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/controllers/authController.js#L512))
* `GEMINI_API_KEY` (Google Gemini API Key, [ai.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/config/ai.js#L6))
* `QDRANT_URL` (Qdrant Vector Database URL, [qdrantStore.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/qdrantStore.js#L10))
* `TEI_EMBEDDINGS_URL` (Hugging Face TEI Embeddings URL, [teiService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/teiService.js#L9))
* `TEI_RERANK_URL` (Hugging Face TEI Reranker URL, [teiService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/teiService.js#L17))
* `VLLM_BASE_URL` (vLLM Inference Server URL, [vllmService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/vllmService.js#L9))
* `VLLM_MODEL` (vLLM Model Identifier, [vllmService.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/vllmService.js#L63))
* `INTERNAL_SERVICE_TOKEN` (Service-to-service authorization bearer token, [qdrantStore.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/services/qdrantStore.js#L19))
* `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `EMAIL_FROM` (Email transport credentials, [sendEmail.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/utils/sendEmail.js))

---

## 9. Existing Webhook Code Audit

* **Findings**: **Zero backend GitHub webhook handlers exist today.**
* Audit Details:
  * No `/api/webhooks` or `/api/github/webhook` routes are registered in [app.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/app.js).
  * A search across all files reveals references to `"webhook"` only within static marketing copy in frontend landing pages (`Landing.jsx` and `LandingOS.jsx`).

---

## 10. Architectural Mismatches Analysis

Compared against the target product flow:
`Login` -> `Company Dashboard` -> `Connect GitHub (GitHub App, server-side secrets)` -> `Real repositories` -> `Connect` -> `Sync` -> `Chunk` -> `Embed` -> `Qdrant` -> `Scoped Retrieval` -> `LLM` -> `Evidence` -> `Webhook` -> `Incremental Sync`.

1. **GitHub App Token vs. User Access Token Mismatch**:
   * Current code in `scanController.js` relies on `req.user.githubAccessToken` (a personal user OAuth token).
   * Target flow requires server-side GitHub App Installation Tokens so repository indexing and webhook synchronization work independently of individual user OAuth logins.
2. **Broken Frontend GitHub App Connection Integration**:
   * `ConnectRepoModal.jsx` calls `/api/github/status`, `/api/github/install`, `/api/github/repositories`, and `/api/github/select-repositories`.
   * However, `app.js` maps `/api/github` to `githubAnalyzeRoutes.js`, which only implements `/analyze-commit` and `/analyze-repo`. The GitHub App installation endpoints do not exist on the server, causing 404 errors when connecting GitHub Apps.
3. **In-Memory Job Execution vs Queue Infrastructure**:
   * Repository scanning runs via floating in-memory promises (`runBackgroundScan`). There is no BullMQ/Redis queue.
   * Scanning is capped to 10 files (`slice(0, 10)`) and 5 commits (`slice(0, 5)`), skipping full repository contents.
4. **Missing Webhook Gateway & Incremental Sync**:
   * No webhook receivers exist to handle GitHub events (`push`, `pull_request`, `installation`).
   * Every re-scan executes a destructive full wipe of Qdrant chunks and MongoDB drift logs rather than an incremental diff sync.
5. **RAG vs Gemini Dual Execution**:
   * `indexingService.js` indexes vector embeddings via TEI + Qdrant.
   * However, `scanController.js` simultaneously invokes Gemini (`aiService.detectDrift`) directly on file snippets without utilizing vector retrieval or Qdrant context.

---

## 11. Numbered Implementation Plan & Risk Analysis

### 11.1 Numbered Implementation Plan (Prompts 2 to 5)

#### Phase 1: GitHub App & Server-Side Token Controller
1. **Create `server/controllers/githubAppController.js`**:
   * Implement `getAppStatus`, `getInstallUrl`, `githubAppCallback`, `listAppRepositories`, and `selectRepositories`.
   * Use `@octokit/auth-app` or App JWT authentication with server-side secrets (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`) to generate installation tokens.
   * Update `Company.github` document with `installationId`, `connected: true`, and `organization`.
2. **Update `server/routes/githubRoutes.js` (or `githubAnalyzeRoutes.js`)**:
   * Register routes for `/api/github/status`, `/api/github/install`, `/api/github/callback`, `/api/github/repositories`, and `/api/github/select-repositories`.
   * Mount routes under `/api/github` in [app.js](file:///C:/Users/Saavi/OneDrive/Desktop/Mern/WhyCode/server/app.js).

#### Phase 2: Full Repository Sync & BullMQ Job Runner
3. **Install and Configure BullMQ + Redis**:
   * Add `bullmq` and `ioredis` to `server/package.json`.
   * Create `server/queues/scanQueue.js` and worker `server/workers/scanWorker.js`.
4. **Refactor `scanController.js`**:
   * Remove `slice(0, 10)` file limit and `slice(0, 5)` commit limit.
   * Replace in-memory `runBackgroundScan` with `scanQueue.add("scanRepository", { repoId, companyId })`.
   * Use GitHub App installation token to clone/fetch complete repo AST tree.

#### Phase 3: Webhook Receiver & Incremental Sync
5. **Create `server/controllers/webhookController.js` & `server/routes/webhookRoutes.js`**:
   * Implement `POST /api/webhooks/github` handling `push` and `pull_request` events using `X-Hub-Signature-256` HMAC validation.
   * On `push` event: extract added/modified/deleted files from commit payload, queue incremental chunk re-indexing (`indexFile` / `deleteRepositoryChunks` by path), and update commit timeline.

#### Phase 4: Grounded RAG & Frontend Alignment
6. **Refactor RAG Indexing & Retrieval Integration**:
   * Ensure `scanWorker` invokes `indexFile` for all source code files, writing exact payload metadata (`companyId`, `repositoryId`, `chunkId`, `path`, `startLine`, `endLine`, `commitSha`, `url`, `content`) into Qdrant collection `"repository_chunks"`.
   * Update `chatController.js` and `vllmService.js` to format returned citations consistently for the frontend `KnowledgeChatPanel`.

---

### 11.2 Risks & Open Questions

#### Technical & Security Risks
1. **GitHub App Private Key Storage**:
   * *Risk*: GitHub App private keys (`.pem` format) contain multiline strings. Formatting them in `.env` or Render environment variables can cause parsing errors if not properly base64-encoded or escaped.
2. **Qdrant Collection Dimension Mismatch**:
   * *Risk*: If the Hugging Face TEI Embeddings model is changed or restarted with a different model (e.g., switching from 384-dim `all-MiniLM-L6-v2` to 768-dim `bge-base-en-v1.5`), Qdrant vector upserts will fail unless the collection is re-created.
3. **GitHub API Rate Limits on Full Repositories**:
   * *Risk*: Syncing large repositories via GitHub REST API file-by-file can hit API rate limits (5,000 requests/hr). Fetching git tarballs (`GET /repos/{owner}/{repo}/tarball/{ref}`) or using shallow git clones inside worker jobs is recommended.

#### Open Questions for Project Lead
1. **GitHub App Installation Scope**:
   * Should the GitHub App be configured for **Single-Tenant (Internal)** or **Multi-Tenant (Public Marketplace App)** installation?
2. **Redis & Worker Infrastructure**:
   * Is a managed Redis instance (e.g., Upstash / Render Redis) available for BullMQ job queue management in production?
3. **TEI Model Specification**:
   * What exact embedding model is intended for the TEI service container so we can fix the Qdrant vector dimension configuration?
