export * from "../../scripts/verifyEmbeddings.js";
import { verifyEmbeddings } from "../../scripts/verifyEmbeddings.js";
import { fileURLToPath } from "url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const targetUrl = process.argv[2];
  verifyEmbeddings(targetUrl).then((r) => {
    process.exit(r.pass ? 0 : 1);
  }).catch((err) => {
    console.error("Embeddings verification error:", err.message);
    process.exit(1);
  });
}
