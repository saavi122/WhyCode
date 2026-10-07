// Single source of truth for the interactive product preview
export const PREVIEW_DATA = {
  overview: {
    repoName: "company/platform",
    repoUrl: "https://github.com/company/platform",
    syncedTime: "Synced 2 min ago",
    statusSummary: "Continuous intent indexing active across 24 AST modules.",
    metrics: [
      {
        id: "health",
        label: "Repository Health",
        value: 94,
        unit: "%",
        tag: "Optimal",
        type: "optimal",
        desc: "AST integrity and code-to-doc consistency"
      },
      {
        id: "coverage",
        label: "Knowledge Coverage",
        value: 87,
        unit: "%",
        tag: "AST Mapped",
        type: "mapped",
        desc: "Functions and routes with extracted intent"
      },
      {
        id: "drift",
        label: "Documentation Drift",
        value: 3,
        unit: "files",
        tag: "Action Needed",
        type: "warning",
        desc: "Docs requiring synchronized updates"
      }
    ]
  },

  repository: {
    title: "Repository Tree & Intent Map",
    branch: "main",
    defaultNode: "auth",
    nodes: {
      src: {
        id: "src",
        name: "src/",
        path: "src",
        type: "Root Module",
        status: "Fully Indexed",
        desc: "Core application source tree with 100% AST intent coverage.",
        isDrift: false
      },
      components: {
        id: "components",
        name: "components/",
        path: "src/components",
        type: "UI Layer",
        status: "Synced",
        desc: "Interface components & design system bindings.",
        isDrift: false
      },
      services: {
        id: "services",
        name: "services/",
        path: "src/services",
        type: "Service Bus",
        status: "Synced",
        desc: "Backend communication gateways & middleware pipelines.",
        isDrift: false
      },
      utils: {
        id: "utils",
        name: "utils/",
        path: "src/utils",
        type: "Utilities",
        status: "Synced",
        desc: "Stateless helper functions & encoding routines.",
        isDrift: false
      },
      auth: {
        id: "auth",
        name: "auth/",
        path: "src/services/auth",
        type: "Authentication",
        status: "Drift Detected",
        desc: "src/services/auth: Authentication. Token lifecycle logic modified in auth module.",
        isDrift: true
      },
      api: {
        id: "api",
        name: "api/",
        path: "src/services/api",
        type: "API Gateway",
        status: "Synced",
        desc: "Resilient HTTP client with automatic exponential backoff.",
        isDrift: false
      }
    }
  },

  knowledge: {
    title: "WhyCode Knowledge Q&A",
    modelBadge: "Gemini Intent Engine",
    suggestedQuestions: [
      {
        id: "auth-refresh",
        label: "Token Refresh Logic",
        question: "Why does authService refresh tokens here?",
        answer: "Because the refresh flow is triggered before API requests expire to maintain uninterrupted sessions during high-frequency requests.",
        evidenceNote: "Referenced from 2 verified source files",
        citations: [
          { label: "authService.ts#L12-L35", path: "src/services/auth/authService.ts" },
          { label: "apiClient.ts#L40-L65", path: "src/services/api/apiClient.ts" }
        ]
      },
      {
        id: "retry-backoff",
        label: "Retry & Backoff",
        question: "How does the retry queue handle exponential backoff?",
        answer: "The retry queue applies randomized jitter with exponential multiplier to prevent server contention during transient 5xx errors.",
        evidenceNote: "Referenced from 2 verified source files",
        citations: [
          { label: "retryQueue.ts#L18-L42", path: "src/utils/retryQueue.ts" },
          { label: "networkGuard.ts#L05-L22", path: "src/utils/networkGuard.ts" }
        ]
      },
      {
        id: "rbac-guards",
        label: "RBAC Route Guard",
        question: "Where is permission validation enforced for admin routes?",
        answer: "Route guard middleware verifies JWT claims and organization role bindings prior to controller action dispatch.",
        evidenceNote: "Referenced from 2 verified source files",
        citations: [
          { label: "rbacMiddleware.ts#L29-L64", path: "src/services/auth/rbacMiddleware.ts" },
          { label: "routes.ts#L14-L30", path: "src/routes.ts" }
        ]
      }
    ]
  },

  drift: {
    title: "Documentation Drift Monitor",
    countBadge: 3,
    items: [
      {
        id: "readme",
        file: "README.md",
        path: "README.md",
        status: "Desynced",
        summary: "Implementation changed in auth module",
        diff: {
          codeTitle: "Actual Code (authService.ts)",
          codeLines: [
            { type: "context", text: "export async function loginUser(credentials) {" },
            { type: "removed", text: "-  return await auth.login(username, password);" },
            { type: "added",   text: "+  return await auth.login({ username, token, mfaCode });" },
            { type: "context", text: "}" }
          ],
          docTitle: "Documented Spec (README.md)",
          docSnippet: "auth.login(username, password)  // Missing MFA & token signature"
        }
      },
      {
        id: "api",
        file: "API.md",
        path: "docs/API.md",
        status: "Outdated Signature",
        summary: "Response envelope wrapped in pagination cursor metadata",
        diff: {
          codeTitle: "Actual Code (apiClient.ts)",
          codeLines: [
            { type: "context", text: "export async function getReports(filter) {" },
            { type: "removed", text: "-  return response.data.items;" },
            { type: "added",   text: "+  return { status: 'success', data: response.data.items, page: cursor };" },
            { type: "context", text: "}" }
          ],
          docTitle: "Documented Spec (docs/API.md)",
          docSnippet: "Returns: Array<ReportItem>  // Missing pagination metadata object"
        }
      },
      {
        id: "setup",
        file: "SETUP.md",
        path: "SETUP.md",
        status: "Missing Env",
        summary: "New required environment variable added to vector configuration",
        diff: {
          codeTitle: "Actual Code (vectorService.ts)",
          codeLines: [
            { type: "context", text: "export function initQdrant() {" },
            { type: "added",   text: "+  const qdrantUrl = process.env.QDRANT_URL ?? fail('Missing QDRANT_URL');" },
            { type: "context", text: "   return new QdrantClient({ url: qdrantUrl });" },
            { type: "context", text: "}" }
          ],
          docTitle: "Documented Spec (SETUP.md)",
          docSnippet: "Required env: DATABASE_URL, PORT, REDIS_URL  // Missing QDRANT_URL"
        }
      }
    ]
  },

  team: {
    title: "Engineering Context & Ownership",
    busFactor: 3,
    busFactorNote: "Knowledge is distributed across 3 maintainers with zero single-point-of-failure files.",
    contributors: [
      {
        name: "Sarah Chen",
        role: "Lead Architect",
        commitShare: 44,
        initials: "SC",
        color: "#00e5ff",
        areas: ["services/auth", "apiClient", "tokenRefresher"]
      },
      {
        name: "Alex Rivera",
        role: "Senior Backend",
        commitShare: 31,
        initials: "AR",
        color: "#818cf8",
        areas: ["utils/retry", "queueProvider", "networkGuard"]
      },
      {
        name: "Priya Sharma",
        role: "Frontend Lead",
        commitShare: 25,
        initials: "PS",
        color: "#c084fc",
        areas: ["components/ui", "themeEngine", "stateBindings"]
      }
    ]
  }
};
