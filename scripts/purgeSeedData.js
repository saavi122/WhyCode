import path from "path";
import { fileURLToPath } from "url";
import { fork } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverScript = path.resolve(__dirname, "../server/scripts/purgeSeedData.js");
const child = fork(serverScript, process.argv.slice(2), {
  cwd: path.resolve(__dirname, "../server"),
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
