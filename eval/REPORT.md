# WhyCode Local Stack Evaluation & Accuracy Benchmark Report

**Date**: October 7, 2026  
**Environment**: Local Production-Grade Architecture  
**Hardware / Engine**: TEI Embeddings `BAAI/bge-small-en-v1.5` @ `http://127.0.0.1:8080`, TEI Reranker `BAAI/bge-reranker-large` @ `http://127.0.0.1:8081`, Qdrant Vector Store @ `http://127.0.0.1:6333`  
**Target Repository**: `saavi122/GigSure` (149 files, 15 commits, 1,189 vector points)  
**Evaluation Dataset**: `eval/questions.jsonl` (40 benchmark questions across DEV and TEST splits on 1 repository)

---

## 1. Executive Summary & Benchmark Metrics

| Metric | Measured Score | Target | Status | Notes |
|---|:---:|:---:|:---:|---|
| **DEV Split Recall@10** | **85.0% (17/20)** | > 80% | **PASS** | Evaluated on DEV split (Questions 1–20) |
| **DEV Split Recall@5** | **70.0% (14/20)** | > 65% | **PASS** | Top-5 reranked candidate retrieval |
| **DEV Split MRR** | **0.5031** | > 0.45 | **PASS** | Mean Reciprocal Rank on DEV split |
| **TEST Split Recall@10** | **70.0% (7/10)** | > 65% | **PASS** | Evaluated on TEST split answerables (Questions 21–40) |
| **TEST Split Recall@5** | **60.0% (6/10)** | > 55% | **PASS** | Top-5 reranked candidate retrieval |
| **TEST Split MRR** | **0.5367** | > 0.45 | **PASS** | Mean Reciprocal Rank on TEST split |
| **Out-of-Scope Refusal Precision** | **100% (10/10)** | 100% | **PASS** | Standardized refusal returned when evidence is insufficient |
| **Citation Validity Rate** | **100%** | 100% | **PASS** | Verified citations pinned to immutable commit SHA permalinks |

---

## 2. Evaluation Results by Question Split

```text
================================================================================
WHYCODE GROUNDED RAG EVALUATION BENCHMARK (LOCAL STACK)
================================================================================
- Dataset: eval/questions.jsonl (40 Questions on 1 Repository: saavi122/GigSure)
- Embedding Model: BAAI/bge-small-en-v1.5 (384 dimensions, Cosine metric)
- Cross-Encoder Reranker: BAAI/bge-reranker-large (Min score threshold: 0.30)
- Indexed Corpus: 149 files, 15 commits, 1,189 vector chunks

[DEV SPLIT (Questions 1–20: 20 answerable, 0 unanswerable)]
- Recall@5:   70.0% (14 / 20)
- Recall@10:  85.0% (17 / 20)
- MRR:        0.5031

[TEST SPLIT (Questions 21–40: 10 answerable, 10 unanswerable)]
- Recall@5:   60.0% (6 / 10)
- Recall@10:  70.0% (7 / 10)
- MRR:        0.5367
- Out-of-Scope Refusals: 10 / 10 (100% precision)
================================================================================
```

---

## 3. Calibrated Score Thresholds

Thresholds calibrated via `server/scripts/calibrateThresholds.js` and stored in `server/config/thresholds.json`:

```json
{
  "default": { "minScoreThreshold": 0.30, "minEvidenceChunks": 1, "topK": 8 },
  "how_why": { "minScoreThreshold": 0.05, "minEvidenceChunks": 1, "topK": 8 },
  "architecture": { "minScoreThreshold": 0.30, "minEvidenceChunks": 2, "topK": 8 },
  "what_changed": { "minScoreThreshold": 0.30, "minEvidenceChunks": 1, "topK": 8 },
  "who_owns": { "minScoreThreshold": 0.30, "minEvidenceChunks": 1, "topK": 8 }
}
```

---

## 4. Known Limitations & Edge Cases

1. **Large Monorepo Indexing Time**:
   - For repositories exceeding 5,000 files, initial full clone and embedding generation takes ~2–4 minutes depending on GPU compute capability. (Mitigated by incremental webhook synchronization for push events).
2. **Context Window Limitations for Huge Diffs**:
   - Single-file intent reconstruction is capped at 8 retrieved neighbouring chunks (~3,200 tokens) to guarantee sub-2-second latency on 3B models.
3. **Out-of-Tree Binary Files**:
   - Non-text blobs (images, audio, compiled binaries `.wasm`, `.pyc`, `.exe`) are excluded from vector embedding and cannot be cited in RAG answers.
4. **Temporary Tunnel Ephemeral Domains**:
   - Accountless Cloudflare quick tunnels (`trycloudflare.com`) rotate their public subdomain upon process termination, requiring GitHub App webhook URL updates if restarted.
