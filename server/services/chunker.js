import crypto from "crypto";

export const MIN_CHUNK_TOKENS = 40;
export const MAX_CHUNK_TOKENS = 400;

/**
 * Estimates the token count of a string (approximately 4 characters per token).
 * @param {string} text Text string.
 * @returns {number} Estimated token count.
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Generates a stable deterministic UUID from a seed string.
 * @param {string} seed Seed string.
 * @returns {string} Standard RFC4122 UUID string.
 */
export function generateDeterministicUuid(seed) {
  const hash = crypto.createHash("md5").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Standard deterministic Point ID generator used across all indexing pipelines.
 * Seed: companyId | repositoryId | documentType | pathOrSha | chunkIndex
 */
export function buildPointId({ companyId, repositoryId, documentType, pathOrSha, chunkIndex = 0 }) {
  const cleanDocType = (documentType || "CODE").toUpperCase();
  const cleanPath = String(pathOrSha || "").trim();
  const seed = `${companyId}:${repositoryId}:${cleanDocType}:${cleanPath}:${chunkIndex}`;
  return generateDeterministicUuid(seed);
}

/**
 * Computes SHA256 content hash of string text.
 */
export function computeContentHash(text) {
  return crypto.createHash("sha256").update(text || "").digest("hex");
}

/**
 * Formats embedding model input text with File and Symbol headers.
 * Note: Used ONLY when sending text to the embedding model; not stored as raw chunk payload.
 */
export function formatEmbeddingText(chunk) {
  const filePath = chunk.filePath || chunk.path || "";
  const symbol = chunk.symbol;
  if (symbol) {
    return `File: ${filePath} | Symbol: ${symbol}\n\n${chunk.text}`;
  }
  return `File: ${filePath}\n\n${chunk.text}`;
}

/**
 * Extracts JS/TS/JSX/TSX symbol name from declaration signature line.
 */
function extractJsSymbol(line) {
  const trimmed = line.trim();
  // React Component / const function: export const Component = ...
  const constMatch = trimmed.match(/(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:React\.memo\(|React\.forwardRef\()?(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)?\s*=>/);
  if (constMatch) return constMatch[1];

  // standard function: export default function funcName
  const funcMatch = trimmed.match(/(?:export\s+)?(?:default\s+)?(?:async\s+)?function(?:\s*\*|\s+)\s*([a-zA-Z0-9_$]+)/);
  if (funcMatch) return funcMatch[1];

  // class: export class ClassName
  const classMatch = trimmed.match(/(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_$]+)/);
  if (classMatch) return classMatch[1];

  // React createContext / custom hook / helper export
  const exportConstMatch = trimmed.match(/export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/);
  if (exportConstMatch) return exportConstMatch[1];

  return null;
}

/**
 * Parses JS/TS/JSX/TSX source into structural top-level blocks by tracking brace and statement boundaries.
 */
function parseJsBlocks(lines) {
  const blocks = [];
  let currentStart = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  let currentSymbol = null;
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("/*") && !trimmed.includes("*/")) {
      inComment = true;
    }
    if (inComment) {
      if (trimmed.includes("*/")) inComment = false;
      continue;
    }

    // At top level (depth 0), detect leading symbol
    if (braceDepth === 0 && parenDepth === 0 && !currentSymbol) {
      const sym = extractJsSymbol(line);
      if (sym) currentSymbol = sym;
    }

    // Count braces outside string literals
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === "{") braceDepth++;
      else if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
      else if (char === "(") parenDepth++;
      else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    }

    // A block boundary is reached when brace depth returns to 0 and a complete declaration finished
    const isTopLevelEnd = braceDepth === 0 && parenDepth === 0;
    const isNextDeclaration =
      isTopLevelEnd &&
      i + 1 < lines.length &&
      /^(?:export\s+|function\s+|class\s+|const\s+|let\s+|var\s+|import\s+)/.test(lines[i + 1].trim());

    if (isTopLevelEnd && (isNextDeclaration || i === lines.length - 1)) {
      blocks.push({
        startLine: currentStart + 1,
        endLine: i + 1,
        lines: lines.slice(currentStart, i + 1),
        symbol: currentSymbol || undefined,
      });
      currentStart = i + 1;
      currentSymbol = null;
    }
  }

  if (currentStart < lines.length) {
    blocks.push({
      startLine: currentStart + 1,
      endLine: lines.length,
      lines: lines.slice(currentStart),
      symbol: currentSymbol || undefined,
    });
  }

  return blocks;
}

/**
 * Parses Python source into structural units using indentation-based blocks.
 */
function parsePythonBlocks(lines) {
  const blocks = [];
  let currentStart = 0;
  let currentSymbol = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines or pure comments at boundary detection
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Detect top-level or class-level function / class def (no leading whitespace or def/class at start)
    const defMatch = line.match(/^(\s*)(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/);
    const classMatch = line.match(/^(\s*)class\s+([a-zA-Z0-9_]+)/);

    const isDef = (defMatch && defMatch[1].length === 0) || (classMatch && classMatch[1].length === 0);

    if (isDef && i > currentStart) {
      blocks.push({
        startLine: currentStart + 1,
        endLine: i,
        lines: lines.slice(currentStart, i),
        symbol: currentSymbol || undefined,
      });
      currentStart = i;
      currentSymbol = defMatch ? defMatch[2] : (classMatch ? classMatch[2] : null);
    } else if (isDef && !currentSymbol) {
      currentSymbol = defMatch ? defMatch[2] : (classMatch ? classMatch[2] : null);
    }
  }

  if (currentStart < lines.length) {
    blocks.push({
      startLine: currentStart + 1,
      endLine: lines.length,
      lines: lines.slice(currentStart),
      symbol: currentSymbol || undefined,
    });
  }

  return blocks;
}

/**
 * Splits oversized block (> MAX_CHUNK_TOKENS) into smaller statement chunks with small overlap.
 */
function splitOversizedBlock(block, filePath) {
  const chunks = [];
  const lines = block.lines;
  const targetLinesPerChunk = 50;
  const overlapLines = 10;

  let startIdx = 0;
  while (startIdx < lines.length) {
    const endIdx = Math.min(startIdx + targetLinesPerChunk, lines.length);
    const chunkLines = lines.slice(startIdx, endIdx);
    const text = chunkLines.join("\n").trim();

    if (text.length > 0) {
      chunks.push({
        path: filePath,
        startLine: block.startLine + startIdx,
        endLine: block.startLine + endIdx - 1,
        text,
        symbol: block.symbol,
      });
    }

    if (endIdx >= lines.length) break;
    startIdx = endIdx - overlapLines;
  }

  return chunks;
}

/**
 * Merges tiny adjacent blocks (< MIN_CHUNK_TOKENS) and splits oversized blocks.
 */
function normalizeBlocks(rawBlocks, filePath) {
  const normalized = [];
  let accumulator = null;

  for (const block of rawBlocks) {
    const text = block.lines.join("\n").trim();
    if (!text) continue;

    const tokens = estimateTokens(text);

    // If unit is oversized, flush accumulator and split unit
    if (tokens > MAX_CHUNK_TOKENS) {
      if (accumulator) {
        normalized.push(accumulator);
        accumulator = null;
      }
      const splitChunks = splitOversizedBlock(block, filePath);
      normalized.push(...splitChunks);
      continue;
    }

    // If unit is tiny, merge with accumulator if within max budget
    if (tokens < MIN_CHUNK_TOKENS) {
      if (!accumulator) {
        accumulator = {
          path: filePath,
          startLine: block.startLine,
          endLine: block.endLine,
          text,
          symbol: block.symbol,
          tokens,
        };
      } else {
        const combinedTokens = accumulator.tokens + tokens;
        if (combinedTokens <= MAX_CHUNK_TOKENS) {
          accumulator.endLine = block.endLine;
          accumulator.text = `${accumulator.text}\n\n${text}`;
          accumulator.tokens = combinedTokens;
          if (!accumulator.symbol && block.symbol) accumulator.symbol = block.symbol;
        } else {
          normalized.push(accumulator);
          accumulator = {
            path: filePath,
            startLine: block.startLine,
            endLine: block.endLine,
            text,
            symbol: block.symbol,
            tokens,
          };
        }
      }
      continue;
    }

    // Normal sized unit (40 - 400 tokens)
    if (accumulator) {
      const combinedTokens = accumulator.tokens + tokens;
      if (combinedTokens <= MAX_CHUNK_TOKENS && accumulator.tokens < MIN_CHUNK_TOKENS) {
        accumulator.endLine = block.endLine;
        accumulator.text = `${accumulator.text}\n\n${text}`;
        accumulator.tokens = combinedTokens;
        if (!accumulator.symbol && block.symbol) accumulator.symbol = block.symbol;
        normalized.push(accumulator);
        accumulator = null;
        continue;
      } else {
        normalized.push(accumulator);
        accumulator = null;
      }
    }

    normalized.push({
      path: filePath,
      startLine: block.startLine,
      endLine: block.endLine,
      text,
      symbol: block.symbol,
    });
  }

  if (accumulator) {
    // Try to merge trailing tiny accumulator into the last chunk if possible
    if (normalized.length > 0 && accumulator.tokens < MIN_CHUNK_TOKENS) {
      const last = normalized[normalized.length - 1];
      const combinedTokens = estimateTokens(last.text) + accumulator.tokens;
      if (combinedTokens <= MAX_CHUNK_TOKENS) {
        last.endLine = accumulator.endLine;
        last.text = `${last.text}\n\n${accumulator.text}`;
        if (!last.symbol && accumulator.symbol) last.symbol = accumulator.symbol;
      } else {
        normalized.push(accumulator);
      }
    } else {
      normalized.push(accumulator);
    }
  }

  return normalized;
}

/**
 * Chunks source code with structure-aware parsing for JS/TS/JSX/TSX and Python,
 * falling back to sliding window for unsupported files.
 *
 * @param {string} content Raw file content.
 * @param {string} filePath Relative file path.
 * @returns {Array<Object>} Array of chunks.
 */
export function chunkCode(content, filePath = "") {
  if (!content || !content.trim()) return [];

  const lines = content.split(/\r?\n/);
  const totalTokens = estimateTokens(content);

  // If entire file is <= MAX_CHUNK_TOKENS, return exactly 1 chunk
  if (totalTokens <= MAX_CHUNK_TOKENS) {
    const text = content.trim();
    let symbol = undefined;
    for (const line of lines) {
      const sym = extractJsSymbol(line);
      if (sym) {
        symbol = sym;
        break;
      }
    }
    return [
      {
        chunkId: `${filePath}:0`,
        path: filePath,
        startLine: 1,
        endLine: lines.length,
        text,
        symbol,
        contentHash: computeContentHash(text),
      },
    ];
  }

  const ext = (filePath.split(".").pop() || "").toLowerCase();
  let rawBlocks = [];

  if (["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext)) {
    rawBlocks = parseJsBlocks(lines);
  } else if (["py", "pyw"].includes(ext)) {
    rawBlocks = parsePythonBlocks(lines);
  } else {
    // Fallback sliding window for unsupported code types
    return fallbackWindowChunker(content, filePath);
  }

  const normalized = normalizeBlocks(rawBlocks, filePath);

  return normalized.map((c, idx) => ({
    chunkId: `${filePath}:${idx}`,
    path: filePath,
    startLine: c.startLine,
    endLine: c.endLine,
    text: c.text,
    symbol: c.symbol || undefined,
    contentHash: computeContentHash(c.text),
  }));
}

/**
 * Chunks Markdown documentation by heading boundaries, keeping code fences intact.
 *
 * @param {string} content Markdown content.
 * @param {string} filePath File path.
 * @returns {Array<Object>} Chunks.
 */
export function chunkMarkdown(content, filePath = "") {
  if (!content || !content.trim()) return [];

  const lines = content.split(/\r?\n/);
  const rawBlocks = [];
  let currentHeading = "";
  let currentLines = [];
  let sectionStartLine = 1;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code fence flag
    if (line.trim().startsWith("```")) {
      inCodeFence = !inCodeFence;
    }

    const isHeading = !inCodeFence && /^#{1,6}\s+/.test(line);

    if (isHeading && currentLines.length > 0) {
      const text = currentLines.join("\n").trim();
      if (text.length > 0) {
        const cleanHeading = currentHeading.replace(/^#{1,6}\s+/, "").trim();
        rawBlocks.push({
          startLine: sectionStartLine,
          endLine: i,
          lines: currentHeading ? [currentHeading, "", ...currentLines] : currentLines,
          symbol: cleanHeading || undefined,
        });
      }
      currentHeading = line;
      currentLines = [];
      sectionStartLine = i + 1;
    } else {
      if (isHeading) {
        currentHeading = line;
        sectionStartLine = i + 1;
      } else {
        currentLines.push(line);
      }
    }
  }

  if (currentLines.length > 0) {
    const text = currentLines.join("\n").trim();
    if (text.length > 0) {
      const cleanHeading = currentHeading.replace(/^#{1,6}\s+/, "").trim();
      rawBlocks.push({
        startLine: sectionStartLine,
        endLine: lines.length,
        lines: currentHeading ? [currentHeading, "", ...currentLines] : currentLines,
        symbol: cleanHeading || undefined,
      });
    }
  }

  const normalized = normalizeBlocks(rawBlocks, filePath);

  return normalized.map((c, idx) => ({
    chunkId: `${filePath}:md:${idx}`,
    path: filePath,
    startLine: c.startLine,
    endLine: c.endLine,
    text: c.text,
    symbol: c.symbol || undefined,
    contentHash: computeContentHash(c.text),
  }));
}

/**
 * Fallback sliding window chunker for unsupported file formats.
 */
function fallbackWindowChunker(content, filePath) {
  const lines = content.split(/\r?\n/);
  const chunkSize = 60;
  const overlap = 10;
  const chunks = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < lines.length) {
    const end = Math.min(start + chunkSize, lines.length);
    const chunkLines = lines.slice(start, end);
    const text = chunkLines.join("\n").trim();

    if (text.length > 0) {
      chunks.push({
        chunkId: `${filePath}:${chunkIndex}`,
        path: filePath,
        startLine: start + 1,
        endLine: end,
        text,
        contentHash: computeContentHash(text),
      });
    }

    if (end >= lines.length) break;
    start = end - overlap;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Formats a single Git Commit into a document chunk.
 */
export function chunkCommit(commitData, repoFullName) {
  const text = `Commit: ${commitData.sha}\nAuthor: ${commitData.author}\nDate: ${commitData.date}\nMessage: ${commitData.message}\nChanged Files: ${(commitData.changedFiles || []).join(", ")}`;
  return {
    chunkId: `commit:${commitData.sha}`,
    path: `commits/${commitData.sha.slice(0, 7)}`,
    startLine: 1,
    endLine: 1,
    text,
    contentHash: computeContentHash(text),
    url: `https://github.com/${repoFullName}/commit/${commitData.sha}`,
  };
}

/**
 * Formats a Pull Request into a single document chunk.
 */
export function chunkPullRequest(prData, repoFullName) {
  const text = `Pull Request #${prData.number}: ${prData.title}\nState: ${prData.state}\nAuthor: ${prData.author}\nCreated: ${prData.createdAt}\nBody:\n${prData.body || "No description provided"}\n\nChanged Files: ${(prData.changedFiles || []).join(", ")}\nComments:\n${(prData.comments || []).join("\n")}`;
  return {
    chunkId: `pr:${prData.number}`,
    path: `pulls/${prData.number}`,
    startLine: 1,
    endLine: 1,
    text,
    contentHash: computeContentHash(text),
    url: `https://github.com/${repoFullName}/pull/${prData.number}`,
  };
}
