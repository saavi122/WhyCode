export * from "../server/scripts/compareEmbeddingRetrieval.js";
import { runEmbeddingComparison } from "../server/scripts/compareEmbeddingRetrieval.js";
import { fileURLToPath } from "url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runEmbeddingComparison()
    .then((res) => {
      process.exit(res.pass ? 0 : 1);
    })
    .catch((err) => {
      console.error("Comparison execution failed:", err);
      process.exit(1);
    });
}
