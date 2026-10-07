export * from "../../scripts/llmProviders.js";
import { checkAllLlmProviders } from "../../scripts/llmProviders.js";
import { fileURLToPath } from "url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  checkAllLlmProviders().then(() => process.exit(0)).catch((err) => {
    console.error("Provider audit error:", err.message);
    process.exit(1);
  });
}
