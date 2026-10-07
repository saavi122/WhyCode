export * from "../../scripts/checkGithubApp.js";
import { checkGithubApp } from "../../scripts/checkGithubApp.js";
import { fileURLToPath } from "url";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  checkGithubApp().then((res) => {
    process.exit(res.pass ? 0 : 1);
  }).catch((err) => {
    console.error("Check GitHub App error:", err.message);
    process.exit(1);
  });
}
