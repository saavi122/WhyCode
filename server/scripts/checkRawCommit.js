import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import axios from "axios";
import { getInstallationToken } from "../services/githubApp.js";
import GitHubConnection from "../models/GitHubConnection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const conn = await GitHubConnection.findOne({ status: "CONNECTED" });
  const token = await getInstallationToken(conn.installationId);

  const res = await axios.get("https://api.github.com/repos/saavi122/GigSure/commits/0ca2464b8254e74dcc2ad600d695344beb41c8da", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "WhyCode-App",
    },
  });

  console.log("Raw GitHub commit response:");
  console.log("c.author:", res.data.author);
  console.log("c.commit.author:", res.data.commit.author);
  console.log("c.commit.committer:", res.data.commit.committer);

  await mongoose.disconnect();
}

main().catch(console.error);
