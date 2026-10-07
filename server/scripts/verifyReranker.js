export * from "../../scripts/verifyReranker.js";
import { verifyReranker } from "../../scripts/verifyReranker.js";
import { fileURLToPath } from "url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const targetUrl = process.argv[2];
  verifyReranker(targetUrl).then((r) => {
    process.exit(r.pass ? 0 : 1);
  }).catch((err) => {
    console.error("Reranker verification error:", err.message);
    process.exit(1);
  });
}
