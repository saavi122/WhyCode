import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature, handleWebhook } from "../controllers/githubAppController.js";
import { processWebhookEvent } from "../services/syncService.js";
import Repository from "../models/Repository.js";
import RepositorySync from "../models/RepositorySync.js";
import GitHubConnection from "../models/GitHubConnection.js";
import WebhookDelivery from "../models/WebhookDelivery.js";
import * as qdrantStore from "../services/qdrantStore.js";
import * as teiService from "../services/teiService.js";
import * as githubApp from "../services/githubApp.js";
import axios from "axios";

vi.mock("axios");
vi.mock("../models/Repository.js");
vi.mock("../models/RepositorySync.js");
vi.mock("../models/GitHubConnection.js");
vi.mock("../models/WebhookDelivery.js");
vi.mock("../services/githubApp.js");
vi.mock("../services/teiService.js");
vi.mock("../services/qdrantStore.js");

describe("Webhook & Incremental Sync Test Suite", () => {
  const SECRET = "test_webhook_secret_key_123";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
  });

  describe("1. HMAC SHA-256 Webhook Signature Verification", () => {
    it("should accept valid HMAC SHA-256 signature with constant-time comparison", () => {
      const payload = JSON.stringify({ action: "opened", repository: { id: 12345 } });
      const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
      const signature = `sha256=${hmac}`;

      const isValid = verifyWebhookSignature(payload, signature, SECRET);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature and return false", () => {
      const payload = JSON.stringify({ action: "opened" });
      const badSignature = "sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      const isValid = verifyWebhookSignature(payload, badSignature, SECRET);
      expect(isValid).toBe(false);
    });

    it("should return 401 when handleWebhook receives invalid signature", async () => {
      const req = {
        headers: {
          "x-hub-signature-256": "sha256=invalid_sig_hex_here",
          "x-github-delivery": "delivery-111",
        },
        rawBody: Buffer.from("bad-body"),
        body: {},
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid webhook signature" });
    });
  });

  describe("2. Webhook Idempotency by X-GitHub-Delivery", () => {
    it("should skip processing if X-GitHub-Delivery was already recorded", async () => {
      const rawBody = JSON.stringify({ ref: "refs/heads/main" });
      const hmac = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
      const req = {
        headers: {
          "x-hub-signature-256": `sha256=${hmac}`,
          "x-github-delivery": "existing-delivery-guid",
          "x-github-event": "push",
        },
        rawBody: Buffer.from(rawBody),
        body: { ref: "refs/heads/main" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      // Mock delivery already in DB
      WebhookDelivery.findOne = vi.fn().mockResolvedValue({ deliveryId: "existing-delivery-guid" });

      await handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({
        received: true,
        duplicate: true,
        deliveryId: "existing-delivery-guid",
      });
    });
  });

  describe("3. Incremental Push Sync & Tenant Isolation", () => {
    const mockRepo = {
      _id: "repo_123",
      companyId: "comp_real_456",
      fullName: "testowner/testrepo",
      defaultBranch: "main",
      lastCommitSha: "sha_before_111",
      syncStatus: "COMPLETED",
      lastSyncedAt: new Date("2026-01-01"),
      save: vi.fn().mockResolvedValue(true),
    };

    const mockSyncRecord = {
      _id: "sync_record_789",
      counts: {},
      status: "IN_PROGRESS",
      step: "FETCHING_DATA",
      save: vi.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      Repository.findOne = vi.fn().mockResolvedValue(mockRepo);
      RepositorySync.create = vi.fn().mockResolvedValue(mockSyncRecord);
      GitHubConnection.findOne = vi.fn().mockResolvedValue({ installationId: 99999 });
      githubApp.getInstallationToken = vi.fn().mockResolvedValue("ghs_mocktoken");
      teiService.getEmbeddingsBatch = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
      qdrantStore.deleteFileChunks = vi.fn().mockResolvedValue({ status: "ok" });
      qdrantStore.upsertChunks = vi.fn().mockResolvedValue({ status: "ok" });
      qdrantStore.fetchNeighbouringChunks = vi.fn().mockResolvedValue([]);
    });

    it("should resolve repository strictly from database and NEVER from payload company fields", async () => {
      const payload = {
        ref: "refs/heads/main",
        before: "sha_before_111",
        after: "sha_after_222",
        repository: { id: 98765 },
        companyId: "forged_company_attempt", // Untrusted input
      };

      axios.get = vi.fn().mockResolvedValue({
        data: {
          files: [{ filename: "src/newFile.js", status: "added" }],
          commits: [],
        },
      });

      await processWebhookEvent({ deliveryId: "del-1", event: "push", payload });

      expect(Repository.findOne).toHaveBeenCalledWith({ githubRepositoryId: 98765 });
      // RepositorySync must be created with DB companyId ("comp_real_456"), not forged
      expect(RepositorySync.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "comp_real_456",
          repositoryId: "repo_123",
          syncType: "WEBHOOK",
        })
      );
    });

    it("should delete vectors when a file is removed", async () => {
      const payload = {
        ref: "refs/heads/main",
        before: "sha_before_111",
        after: "sha_after_222",
        repository: { id: 98765 },
      };

      axios.get = vi.fn().mockResolvedValue({
        data: {
          files: [{ filename: "src/oldFile.js", status: "removed" }],
          commits: [],
        },
      });

      await processWebhookEvent({ deliveryId: "del-2", event: "push", payload });

      expect(qdrantStore.deleteFileChunks).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ companyId: "comp_real_456" }) }),
        "repo_123",
        "repository_chunks",
        ["src/oldFile.js"]
      );
    });

    it("should edit one file by deleting its old vectors and indexing only updated chunks", async () => {
      const payload = {
        ref: "refs/heads/main",
        before: "sha_before_111",
        after: "sha_after_222",
        repository: { id: 98765 },
      };

      axios.get = vi.fn()
        .mockResolvedValueOnce({
          data: {
            files: [{ filename: "src/edited.js", status: "modified" }],
            commits: [],
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from("export function updatedFeature() { return true; }").toString("base64"),
          },
        });

      await processWebhookEvent({ deliveryId: "del-3", event: "push", payload });

      expect(qdrantStore.deleteFileChunks).toHaveBeenCalledWith(
        expect.anything(),
        "repo_123",
        "repository_chunks",
        ["src/edited.js"]
      );
      expect(teiService.getEmbeddingsBatch).toHaveBeenCalled();
      expect(qdrantStore.upsertChunks).toHaveBeenCalled();
      expect(mockRepo.lastCommitSha).toBe("sha_after_222");
    });

    it("should NOT advance lastCommitSha if the sync fails during processing", async () => {
      mockRepo.lastCommitSha = "sha_before_111";

      const payload = {
        ref: "refs/heads/main",
        before: "sha_before_111",
        after: "sha_after_222",
        repository: { id: 98765 },
      };

      axios.get = vi.fn().mockRejectedValue(new Error("GitHub API rate limit exceeded"));

      await processWebhookEvent({ deliveryId: "del-4", event: "push", payload });

      // Must NOT advance lastCommitSha
      expect(mockRepo.lastCommitSha).toBe("sha_before_111");
      expect(mockSyncRecord.status).toBe("FAILED");
      expect(mockSyncRecord.error).toBe("GitHub API rate limit exceeded");
    });
  });
});
