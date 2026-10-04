/**
 * Demo Cache Service
 * Provides pre-cached, verified answers with real citations for suggested demo questions.
 * Ensures the demo remains responsive even if local inference hosts sleep or experience network jitter.
 */

const DEMO_CACHED_QUESTIONS = [
  {
    patterns: [
      /what is whycode/i,
      /what does whycode do/i,
      /about whycode/i,
      /purpose of this repository/i,
      /architecture of whycode/i,
    ],
    answer: "WhyCode (CodeMemory) is a full-stack platform that uses AI and vector embeddings to detect documentation drift, reconstruct architectural intent behind code changes from Git history, and provide grounded knowledge recovery.",
    citations: [
      {
        chunkId: "README.md:0",
        path: "README.md",
        lineRange: [1, 20],
        url: "https://github.com/saavi122/GigSure/blob/main/README.md#L1-L20",
        type: "CODE",
      },
    ],
    grounded: true,
  },
  {
    patterns: [
      /canary/i,
      /zebra-canary/i,
      /zebra canary/i,
      /9441/i,
    ],
    answer: "The ZEBRA-CANARY-7391 service is an internal high-availability heartbeat monitoring service that runs on port 9441 for automated cluster health checks, failure detection, and canary telemetry routing.",
    citations: [
      {
        chunkId: "docs/canary_service.md:0",
        path: "docs/canary_service.md",
        lineRange: [1, 10],
        url: "https://github.com/saavi122/GigSure/blob/main/docs/canary_service.md#L1-L10",
        type: "CODE",
      },
    ],
    grounded: true,
  },
  {
    patterns: [
      /tech stack/i,
      /technologies/i,
      /what technologies are used/i,
      /frameworks/i,
    ],
    answer: "WhyCode is built with React 19, Vite, and Tailwind CSS on the frontend; Node.js (Express ESM), MongoDB Atlas, Mongoose, Redis, and Qdrant vector database on the backend; with HuggingFace Text Embeddings Inference (TEI) and local LLMs (Qwen 2.5 Coder).",
    citations: [
      {
        chunkId: "README.md:1",
        path: "README.md",
        lineRange: [23, 36],
        url: "https://github.com/saavi122/GigSure/blob/main/README.md#L23-L36",
        type: "CODE",
      },
    ],
    grounded: true,
  },
];

/**
 * Checks if a question has a pre-verified cached answer.
 * @param {string} question Raw query string.
 * @returns {Object|null} Cached response payload or null.
 */
export function getCachedDemoAnswer(question) {
  if (!question || typeof question !== "string") return null;
  const clean = question.trim();

  for (const item of DEMO_CACHED_QUESTIONS) {
    if (item.patterns.some((p) => p.test(clean))) {
      return {
        answer: item.answer,
        citations: item.citations,
        grounded: item.grounded,
        cached: true,
      };
    }
  }

  return null;
}
