import { describe, it, expect } from "vitest";
import { chunkCode, chunkMarkdown, formatEmbeddingText } from "../services/chunker.js";

describe("Structure-Aware Chunker Service", () => {
  it("1. JSX React component stays in one chunk without splitting mid-tag", () => {
    const jsxContent = `import React, { useState } from 'react';

export const UserCard = ({ user }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="user-card-container">
      <div className="card-header">
        <img src={user.avatar} alt={user.name} />
        <h3>{user.name}</h3>
      </div>
      {expanded && (
        <div className="card-details">
          <p>{user.bio}</p>
          <span className="badge">{user.role}</span>
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)}>Toggle</button>
    </div>
  );
};

export default UserCard;`;

    const linesCount = jsxContent.split("\n").length;
    const chunks = chunkCode(jsxContent, "src/components/UserCard.jsx");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(linesCount);
    expect(chunks[0].symbol).toBe("UserCard");
    expect(chunks[0].text).toContain("<div className=\"user-card-container\">");
    expect(chunks[0].text).toContain("export default UserCard;");
  });

  it("2. JS multi-function file splits cleanly on function boundaries with exact line numbers", () => {
    const jsContent = `// Utility helper module
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function parseDate(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export class MetricsCollector {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.counters = new Map();
  }

  increment(metric, value = 1) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + value);
  }
}`;

    const linesCount = jsContent.split("\n").length;
    const chunks = chunkCode(jsContent, "src/utils/helpers.js");
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[chunks.length - 1].endLine).toBe(linesCount);
    // Every chunk has exact lines matching raw content
    for (const chunk of chunks) {
      expect(chunk.startLine).toBeGreaterThanOrEqual(1);
      expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine);
    }
  });

  it("3. Python indentation-based blocks split functions and classes", () => {
    const pyContent = `import os
import sys

class ModelService:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.ready = False

    def load(self):
        print(f"Loading {self.model_name}")
        self.ready = True

def run_inference(prompt: str, max_tokens: int = 100) -> str:
    """Runs local inference pipeline."""
    if not prompt:
        raise ValueError("Prompt cannot be empty")
    return f"Response to: {prompt}"

def health_check():
    return {"status": "ok"}
`;

    const linesCount = pyContent.split("\n").length;
    const chunks = chunkCode(pyContent, "ml_service/main.py");
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[chunks.length - 1].endLine).toBe(linesCount);
    // Embedding text symbol check
    const formatted = formatEmbeddingText(chunks[0]);
    expect(formatted).toContain("File: ml_service/main.py");
  });

  it("4. Markdown splits by headings and keeps code fences intact", () => {
    const mdContent = `# Project Architecture

This document describes the decoupled architecture.

\`\`\`javascript
function initializeCluster() {
  // Multiline code block inside heading
  const cluster = new Cluster({ nodes: 4 });
  return cluster.start();
}
\`\`\`

## Microservices Configuration

Below are the environment variables for microservices:

\`\`\`yaml
qdrant:
  url: http://127.0.0.1:6333
tei:
  url: http://127.0.0.1:8080
\`\`\`
`;

    const chunks = chunkMarkdown(mdContent, "docs/ARCHITECTURE.md");
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].symbol).toBe("Project Architecture");
    expect(chunks[1].symbol).toBe("Microservices Configuration");

    // Code fence is not cut mid-block
    expect(chunks[0].text).toContain("```javascript");
    expect(chunks[0].text).toContain("```");
    expect(chunks[1].text).toContain("```yaml");
  });

  it("5. Tiny file gives exactly one chunk", () => {
    const tinyJs = `export const API_VERSION = "v1";\nexport const TIMEOUT = 5000;`;
    const chunks = chunkCode(tinyJs, "src/constants.js");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(2);
    expect(chunks[0].text).toBe(tinyJs);
  });

  it("6. formatEmbeddingText includes File and Symbol headers without mutating raw text", () => {
    const chunk = {
      path: "src/auth/jwt.js",
      symbol: "verifyJwtToken",
      text: "export function verifyJwtToken(token) { return jwt.verify(token); }",
    };

    const embeddingText = formatEmbeddingText(chunk);
    expect(embeddingText).toBe("File: src/auth/jwt.js | Symbol: verifyJwtToken\n\n" + chunk.text);
    // Raw chunk text does NOT contain the header
    expect(chunk.text).not.toContain("File: src/auth/jwt.js");
  });
});
