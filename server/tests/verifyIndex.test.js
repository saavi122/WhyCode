import { describe, it, expect } from "vitest";
import { evaluateIndexCompliance } from "../../scripts/verifyIndex.js";

describe("verifyIndex Compliance & Quality Suite", () => {
  const validSha = "0ca2464b8254e74dcc2ad600d695344beb41c8da";
  const basePoint = {
    id: "p1",
    payload: {
      companyId: "comp_1",
      repositoryId: "repo_1",
      documentType: "CODE",
      filePath: "src/index.js",
      commitSha: validSha,
      embedModel: "BAAI/bge-small-en-v1.5",
      startLine: 1,
      endLine: 20,
      url: `https://github.com/saavi122/GigSure/blob/${validSha}/src/index.js#L1-L20`,
      text: "console.log('hello world');",
    },
  };

  it("1. passes when GitHub has zero PRs and vector index has zero PR chunks", () => {
    const points = [
      { ...basePoint, id: "p1", payload: { ...basePoint.payload, filePath: "src/a.js" } },
      { ...basePoint, id: "p2", payload: { ...basePoint.payload, filePath: "src/b.js" } },
      { ...basePoint, id: "p3", payload: { ...basePoint.payload, documentType: "COMMIT", commitSha: validSha } },
    ];
    const githubTruth = {
      expectedFilesCount: 2,
      expectedCommitsCount: 1,
      expectedPrsCount: 0,
    };

    const res = evaluateIndexCompliance(points, githubTruth);
    expect(res.passed).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.stats.fileCoverage).toBe(100);
    expect(res.stats.commitCoverage).toBe(100);
    expect(res.stats.prCoverage).toBe(100);
  });

  it("2. fails when file or commit coverage is below 95 percent", () => {
    // 10 files expected, only 5 distinct files indexed (50% coverage)
    const points = [
      { ...basePoint, id: "p1", payload: { ...basePoint.payload, filePath: "src/1.js" } },
      { ...basePoint, id: "p2", payload: { ...basePoint.payload, filePath: "src/2.js" } },
      { ...basePoint, id: "p3", payload: { ...basePoint.payload, filePath: "src/3.js" } },
      { ...basePoint, id: "p4", payload: { ...basePoint.payload, filePath: "src/4.js" } },
      { ...basePoint, id: "p5", payload: { ...basePoint.payload, filePath: "src/5.js" } },
    ];
    const githubTruth = {
      expectedFilesCount: 10,
      expectedCommitsCount: 10,
      expectedPrsCount: 0,
    };

    const res = evaluateIndexCompliance(points, githubTruth);
    expect(res.passed).toBe(false);
    expect(res.errors.some((e) => e.includes("File coverage"))).toBe(true);
    expect(res.errors.some((e) => e.includes("Commit coverage"))).toBe(true);
  });

  it("3. fails when lockfile chunk is present in the index", () => {
    const points = [
      { ...basePoint, id: "p1", payload: { ...basePoint.payload, filePath: "package-lock.json" } },
    ];
    const res = evaluateIndexCompliance(points, null);
    expect(res.passed).toBe(false);
    expect(res.errors.some((e) => e.includes("lockfile chunks"))).toBe(true);
  });

  it("4. fails when points lack embedModel", () => {
    const points = [
      { ...basePoint, id: "p1", payload: { ...basePoint.payload, embedModel: "" } },
    ];
    const res = evaluateIndexCompliance(points, null);
    expect(res.passed).toBe(false);
    expect(res.errors.some((e) => e.includes("embedModel"))).toBe(true);
  });

  it("5. fails when points lack documentType", () => {
    const points = [
      { ...basePoint, id: "p1", payload: { ...basePoint.payload, documentType: null } },
    ];
    const res = evaluateIndexCompliance(points, null);
    expect(res.passed).toBe(false);
    expect(res.errors.some((e) => e.includes("documentType"))).toBe(true);
  });

  it("6. fails when points lack a valid 40-hex commitSha", () => {
    const points = [
      { ...basePoint, id: "p1", payload: { ...basePoint.payload, commitSha: "invalid-sha-123" } },
    ];
    const res = evaluateIndexCompliance(points, null);
    expect(res.passed).toBe(false);
    expect(res.errors.some((e) => e.includes("40-hex commitSha"))).toBe(true);
  });

  it("7. fails when points lack tenancy payload (companyId or repositoryId)", () => {
    const points = [
      { ...basePoint, id: "p1", payload: { ...basePoint.payload, companyId: null } },
    ];
    const res = evaluateIndexCompliance(points, null);
    expect(res.passed).toBe(false);
    expect(res.errors.some((e) => e.includes("missing companyId or repositoryId"))).toBe(true);
  });
});
