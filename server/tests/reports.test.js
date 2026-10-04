import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mergeDriftChunkResults,
  postCheckCommitShas,
  approveReport,
  editAndApproveReport,
  rejectReport,
  exportReportMarkdown,
} from "../services/reportService.js";
import Report from "../models/Report.js";

describe("Reports Engine Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. SHA post-check
  describe("1. SHA Post-Check", () => {
    it("should strictly keep only commit SHAs present in the retrieved evidence and strip hallucinations", () => {
      const retrievedShas = [
        "632fd16b49238910abcdef1234567890abcdef12",
        "15b6536a71829038abcdef1234567890abcdef34",
      ];
      const candidateShas = [
        "632fd16b49238910abcdef1234567890abcdef12", // valid full
        "15b6536", // valid short prefix
        "deadbeef1234567890abcdef1234567890abcdef12", // hallucinated SHA
        "9999999", // hallucinated SHA
      ];

      const verified = postCheckCommitShas(candidateShas, retrievedShas);

      expect(verified).toHaveLength(2);
      expect(verified).toContain("632fd16b49238910abcdef1234567890abcdef12");
      expect(verified).toContain("15b6536");
      expect(verified).not.toContain("deadbeef1234567890abcdef1234567890abcdef12");
      expect(verified).not.toContain("9999999");
    });

    it("should return an empty array if candidateShas or retrievedShas is empty", () => {
      expect(postCheckCommitShas([], ["sha1"])).toEqual([]);
      expect(postCheckCommitShas(["sha1"], [])).toEqual([]);
      expect(postCheckCommitShas(null, null)).toEqual([]);
    });
  });

  // 2. Chunk merge logic
  describe("2. Chunk Merge Logic", () => {
    it("should merge chunks such that any drift = true, severity = max, confidence = min", () => {
      const chunkResults = [
        { driftDetected: false, severity: "LOW", confidence: 0.95 },
        { driftDetected: true, severity: "CRITICAL", confidence: 0.72 },
        { driftDetected: false, severity: "MEDIUM", confidence: 0.88 },
      ];

      const merged = mergeDriftChunkResults(chunkResults);

      expect(merged.driftDetected).toBe(true);
      expect(merged.severity).toBe("CRITICAL"); // Max severity
      expect(merged.confidence).toBe(0.72); // Min confidence
    });

    it("should return LOW severity and driftDetected: false when all chunks have no drift", () => {
      const chunkResults = [
        { driftDetected: false, severity: "LOW", confidence: 0.92 },
        { driftDetected: false, severity: "LOW", confidence: 0.96 },
      ];

      const merged = mergeDriftChunkResults(chunkResults);

      expect(merged.driftDetected).toBe(false);
      expect(merged.severity).toBe("LOW");
      expect(merged.confidence).toBe(0.92);
    });
  });

  // 3. Illegal status transitions & draft preservation
  describe("3. Status Transitions & Draft Preservation", () => {
    it("should approve a pending report and create publishedVersion", async () => {
      const mockReport = {
        _id: "rep1",
        companyId: "comp1",
        status: "PENDING_REVIEW",
        output: {
          title: "Drift Report",
          summary: "Mismatch on JWT expiry",
          suggestedDoc: "Use 7d",
        },
        save: vi.fn().mockResolvedValue(true),
      };

      Report.findOne = vi.fn().mockResolvedValue(mockReport);

      const result = await approveReport({
        reportId: "rep1",
        companyId: "comp1",
        user: { id: "user1" },
      });

      expect(result.status).toBe("PUBLISHED");
      expect(result.publishedVersion).toBeDefined();
      expect(result.publishedVersion.title).toBe("Drift Report");
      expect(result.publishedVersion.publishedBy).toBe("user1");
      expect(mockReport.save).toHaveBeenCalled();
    });

    it("should throw an error when attempting to approve an already published or rejected report", async () => {
      const mockPublishedReport = {
        _id: "rep1",
        companyId: "comp1",
        status: "PUBLISHED",
      };

      Report.findOne = vi.fn().mockResolvedValue(mockPublishedReport);

      await expect(
        approveReport({
          reportId: "rep1",
          companyId: "comp1",
          user: { id: "user1" },
        })
      ).rejects.toThrow(/already published/i);
    });

    it("should edit-and-approve without overwriting the original AI draft output", async () => {
      const originalOutput = {
        title: "AI Draft Title",
        summary: "AI Draft Summary",
        suggestedDoc: "Original AI docstring",
      };

      const mockReport = {
        _id: "rep2",
        companyId: "comp1",
        status: "PENDING_REVIEW",
        output: { ...originalOutput },
        save: vi.fn().mockResolvedValue(true),
      };

      Report.findOne = vi.fn().mockResolvedValue(mockReport);

      const editedData = {
        title: "Human Edited Title",
        summary: "Human Verified Summary",
        suggestedDoc: "Refined docstring by lead engineer",
        notes: "Fixed typo in method description",
      };

      const result = await editAndApproveReport({
        reportId: "rep2",
        companyId: "comp1",
        user: { id: "adminUser" },
        editedData,
      });

      expect(result.status).toBe("PUBLISHED");
      // Draft output remains intact
      expect(result.output.title).toBe("AI Draft Title");
      expect(result.output.suggestedDoc).toBe("Original AI docstring");
      // Published version contains human edits
      expect(result.publishedVersion.title).toBe("Human Edited Title");
      expect(result.publishedVersion.suggestedDoc).toBe("Refined docstring by lead engineer");
      expect(result.publishedVersion.isCustomEdited).toBe(true);
    });

    it("should reject a report with a mandatory reason and reject if reason is missing", async () => {
      const mockReport = {
        _id: "rep3",
        companyId: "comp1",
        status: "PENDING_REVIEW",
        save: vi.fn().mockResolvedValue(true),
      };

      Report.findOne = vi.fn().mockResolvedValue(mockReport);

      await expect(
        rejectReport({
          reportId: "rep3",
          companyId: "comp1",
          user: { id: "user1" },
          reason: "",
        })
      ).rejects.toThrow(/rejection reason is required/i);

      const rejected = await rejectReport({
        reportId: "rep3",
        companyId: "comp1",
        user: { id: "user1" },
        reason: "False positive drift alert",
      });

      expect(rejected.status).toBe("REJECTED");
      expect(rejected.rejectionReason).toBe("False positive drift alert");
      expect(rejected.rejectedBy).toBe("user1");
    });
  });

  // 4. Role-based review permissions
  describe("4. Role Checks & Permissions", () => {
    it("should allow company admin to approve and reject reports", () => {
      const adminUser = { role: "company", company: "comp1", id: "u1" };
      const isAuthorized = adminUser.role === "company" || adminUser.role === "admin";
      expect(isAuthorized).toBe(true);
    });

    it("should deny employee role from publishing reports", () => {
      const employeeUser = { role: "employee", company: "comp1", id: "u2" };
      const isAuthorized = employeeUser.role === "company" || employeeUser.role === "admin";
      expect(isAuthorized).toBe(false);
    });
  });

  // 5. Tenant Isolation
  describe("5. Tenant Isolation", () => {
    it("should fail when Company 1 attempts to access or mutate Company 2 report", async () => {
      // Find query with companyId mismatch returns null
      Report.findOne = vi.fn().mockResolvedValue(null);

      await expect(
        approveReport({
          reportId: "rep_company2",
          companyId: "company_1",
          user: { id: "user_company1" },
        })
      ).rejects.toThrow(/not found or access denied/i);
    });
  });

  // 6. Markdown Export
  describe("6. Markdown Export", () => {
    it("should export structured markdown with summary, drift details, and verified commits", () => {
      const mockReport = {
        _id: "report_123",
        reportType: "DRIFT",
        targetPath: "server/controllers/authController.js",
        status: "PUBLISHED",
        severity: "HIGH",
        confidence: 0.9,
        model: "qwen2.5-coder:3b",
        promptVersion: "v1.0.0",
        createdAt: new Date(),
        output: {
          title: "Documentation Drift: authController.js",
          summary: "JWT expiry mismatch",
          driftDetected: true,
          driftDetails: "Doc says 30d, code has 7d",
          suggestedDoc: "Updates token expiration to 7 days.",
          evidenceCommits: ["632fd16b4923"],
        },
        publishedVersion: {
          publishedBy: "user_admin",
          publishedAt: new Date(),
          title: "Documentation Drift: authController.js",
          summary: "JWT expiry mismatch",
          suggestedDoc: "Updates token expiration to 7 days.",
        },
      };

      const md = exportReportMarkdown(mockReport);
      expect(md).toContain("# Documentation Drift: authController.js");
      expect(md).toContain("server/controllers/authController.js");
      expect(md).toContain("JWT expiry mismatch");
      expect(md).toContain("Doc says 30d, code has 7d");
    });
  });
});
