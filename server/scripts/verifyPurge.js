import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function checkAlex() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  let alexHits = 0;
  let shaHits = 0;

  for (const colInfo of collections) {
    const col = db.collection(colInfo.name);
    const countAlex = await col.countDocuments({
      $or: [
        { author: "alex" },
        { authorName: "alex" },
        { authorLogin: "alex" },
        { message: { $regex: "Refactored authentication logic", $options: "i" } }
      ]
    });
    const countSha = await col.countDocuments({
      $or: [
        { commitSha: { $regex: "1491a2d", $options: "i" } },
        { sha: { $regex: "1491a2d", $options: "i" } }
      ]
    });
    if (countAlex > 0 || countSha > 0) {
      console.log(`Found in collection ${colInfo.name}: alex=${countAlex}, 1491a2d=${countSha}`);
      alexHits += countAlex;
      shaHits += countSha;
    }
  }

  console.log(`Total MongoDB hits for alex / Refactored auth: ${alexHits}`);
  console.log(`Total MongoDB hits for 1491a2d: ${shaHits}`);
  process.exit(0);
}

checkAlex().catch((e) => {
  console.error(e);
  process.exit(1);
});
