import { runRetrievalCheck } from "../server/scripts/retrievalCheck.js";

runRetrievalCheck().catch((err) => {
  console.error("Retrieval check error:", err);
  process.exit(1);
});
