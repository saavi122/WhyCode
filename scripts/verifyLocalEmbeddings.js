export * from "../server/scripts/verifyLocalEmbeddings.js";
import { runLocalEmbeddingsVerification } from "../server/scripts/verifyLocalEmbeddings.js";
import { fileURLToPath } from "url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runLocalEmbeddingsVerification()
    .then((res) => {
      process.exit(res.pass ? 0 : 1);
    })
    .catch((err) => {
      console.error("Local embedding verification failed:", err);
      process.exit(1);
    });
}
