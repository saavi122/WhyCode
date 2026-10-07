import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await import(path.resolve(__dirname, "../../scripts/reindexRepository.js"));
