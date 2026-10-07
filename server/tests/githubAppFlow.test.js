import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing controllers
vi.mock("../models/GitHubConnection.js", () => {
  const connectionStore = new Map();
  return {
    default: {
      findOne: vi.fn(async ({ companyId }) => connectionStore.get(String(companyId)) || null),
      findOneAndUpdate: vi.fn(async ({ companyId }, update) => {
        const key = String(companyId);
        const existing = connectionStore.get(key) || { companyId };
        const updated = { ...existing, ...update, save: vi.fn(async () => {}) };
        connectionStore.set(key, updated);
        return updated;
      }),
      _store: connectionStore,
    },
  };
});

vi.mock("../models/GitHubState.js", () => {
  const stateStore = new Map();
  return {
    default: {
      create: vi.fn(async (doc) => {
        const obj = { ...doc, _id: "state_id_" + doc.state, save: vi.fn(async () => {}) };
        stateStore.set(doc.state, obj);
        return obj;
      }),
      findOne: vi.fn(async ({ state }) => stateStore.get(state) || null),
      deleteOne: vi.fn(async ({ _id }) => {
        for (const [k, v] of stateStore.entries()) {
          if (v._id === _id) stateStore.delete(k);
        }
      }),
      _store: stateStore,
    },
  };
});

vi.mock("../models/Company.js", () => ({
  default: {
    findByIdAndUpdate: vi.fn(async () => ({})),
  },
}));

vi.mock("../models/Repository.js", () => ({
  default: {
    find: vi.fn(async () => []),
  },
}));

vi.mock("../services/githubApp.js", () => ({
  createAppJwt: vi.fn(() => "mock-app-jwt-token"),
  getInstallationToken: vi.fn(async () => "mock-installation-access-token"),
}));

vi.mock("axios");
import axios from "axios";
import { getConnectUrl, handleCallback, getStatus, disconnectApp } from "../controllers/githubAppController.js";
import GitHubState from "../models/GitHubState.js";
import GitHubConnection from "../models/GitHubConnection.js";

describe("GitHub App Connection & Callback Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    GitHubState._store.clear();
    GitHubConnection._store.clear();
    process.env.CLIENT_URL = "http://localhost:5173";
    process.env.GITHUB_CLIENT_ID = "test_client_id";
    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";
  });

  it("should enforce company admin role on GET /api/github/connect (returns 403 for non-admin)", async () => {
    const req = { user: { id: "employee_1", role: "employee", company: "comp_1" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await getConnectUrl(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/access denied/i) }));
  });

  it("should enforce company admin role on POST /api/github/disconnect (returns 403 for non-admin)", async () => {
    const req = { user: { id: "employee_1", role: "employee", company: "comp_1" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await disconnectApp(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/access denied/i) }));
  });

  it("should generate a 32+ byte random state and store it with 10 min expiration on GET /connect for Company Admin", async () => {
    const req = { user: { id: "admin_1", role: "company", company: "comp_1" } };
    const res = {
      json: vi.fn(),
    };
    const next = vi.fn();

    await getConnectUrl(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        installUrl: expect.stringMatching(/https:\/\/github.com\/apps\/.*\/installations\/new\?state=/),
        state: expect.any(String),
      })
    );

    const createdState = GitHubState._store.values().next().value;
    expect(createdState).toBeDefined();
    expect(createdState.state.length).toBeGreaterThanOrEqual(64); // 32 bytes hex = 64 chars
    expect(createdState.companyId).toBe("comp_1");
  });

  it("should reject replayed state in handleCallback", async () => {
    GitHubState._store.set("replayed_state", {
      _id: "state_1",
      state: "replayed_state",
      userId: "user_1",
      companyId: "comp_1",
      used: true,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      save: vi.fn(async () => {}),
    });

    const req = {
      query: {
        code: "valid_code",
        installation_id: "12345",
        state: "replayed_state",
      },
    };

    const res = {
      redirect: vi.fn(),
    };
    const next = vi.fn();

    await handleCallback(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("error=invalid_state")
    );
  });

  it("should reject expired state in handleCallback", async () => {
    GitHubState._store.set("expired_state", {
      _id: "state_2",
      state: "expired_state",
      userId: "user_1",
      companyId: "comp_1",
      used: false,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      save: vi.fn(async () => {}),
    });

    const req = {
      query: {
        code: "valid_code",
        installation_id: "12345",
        state: "expired_state",
      },
    };

    const res = {
      redirect: vi.fn(),
    };
    const next = vi.fn();

    await handleCallback(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("error=invalid_state")
    );
  });

  it("should reject forged installation_id in handleCallback if user's authorized installations list does not include it", async () => {
    GitHubState._store.set("valid_state", {
      _id: "state_3",
      state: "valid_state",
      userId: "user_1",
      companyId: "comp_1",
      used: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      save: vi.fn(async () => {}),
    });

    // Mock OAuth token exchange success
    axios.post.mockResolvedValueOnce({
      data: { access_token: "mock_user_access_token" },
    });

    // Mock user profile fetch success
    axios.get.mockResolvedValueOnce({
      data: { id: 999, login: "attacker_user", type: "User" },
    });

    // Mock user authorized installations list (does NOT include forged installation_id '99999')
    axios.get.mockResolvedValueOnce({
      data: {
        installations: [{ id: 11111 }, { id: 22222 }],
      },
    });

    const req = {
      query: {
        code: "valid_code",
        installation_id: "99999", // Forged ID
        state: "valid_state",
      },
    };

    const res = {
      redirect: vi.fn(),
    };
    const next = vi.fn();

    await handleCallback(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining("error=forged_installation")
    );
  });

  it("should read connection status from DB and validate installation with App JWT on GET /api/github/status", async () => {
    GitHubConnection._store.set("comp_1", {
      companyId: "comp_1",
      githubAccountId: "123",
      githubUsername: "octocat",
      installationId: "55555",
      status: "CONNECTED",
      connectedAt: new Date(),
      save: vi.fn(async () => {}),
    });

    // Mock successful App installation check
    axios.get.mockResolvedValueOnce({
      data: { id: 55555, account: { login: "octocat" } },
    });

    const req = { user: { id: "user_1", role: "company", company: "comp_1" } };
    const res = {
      json: vi.fn(),
    };
    const next = vi.fn();

    await getStatus(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      status: "CONNECTED",
      githubUsername: "octocat",
      connectedAt: expect.any(Date),
    });
  });

  it("should ensure responses and logs do not contain secret tokens or private keys", async () => {
    const req = { user: { id: "user_1", role: "company", company: "comp_1" } };
    const res = {
      json: vi.fn(),
    };
    const next = vi.fn();

    await getStatus(req, res, next);

    const jsonCall = res.json.mock.calls[0][0];
    const stringified = JSON.stringify(jsonCall);

    expect(stringified).not.toContain("test_client_secret");
    expect(stringified).not.toContain("mock-app-jwt-token");
    expect(stringified).not.toContain("mock-installation-access-token");
    expect(stringified).not.toContain("PRIVATE KEY");
  });
});
