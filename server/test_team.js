import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "./models/User.js";
import Room from "./models/Room.js";
import Repository from "./models/Repository.js";
import CommitMemory from "./models/CommitMemory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/whycodedb";

const getAllowedRepoNames = async (userId) => {
  const rooms = await Room.find({ assignedEmployees: userId });
  return [...new Set(rooms.map(r => r.githubRepo))];
};

const run = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB!");

    // Test for user Alex River: 6a4493efd51e46017745c362
    const userId = "6a4493efd51e46017745c362";
    const user = await User.findById(userId);
    console.log("Testing for user:", user.name, "email:", user.email, "company:", user.company);

    const allowedRepos = await getAllowedRepoNames(userId);
    console.log("Allowed repos:", allowedRepos);

    const rooms = await Room.find({ githubRepo: { $in: allowedRepos } });
    console.log("Rooms found:", rooms.map(r => ({ name: r.name, assigned: r.assignedEmployees })));

    const teammateIds = new Set();
    rooms.forEach(r => {
      r.assignedEmployees.forEach(empId => {
        if (empId.toString() !== userId) {
          teammateIds.add(empId.toString());
        }
      });
    });
    console.log("Teammate IDs:", Array.from(teammateIds));

    const teammates = await User.find({
      _id: { $in: Array.from(teammateIds) },
      company: user.company
    }).select("name email role avatarUrl githubUsername");
    console.log("Teammates found in DB:", teammates);

    const enrichedTeammates = await Promise.all(
      teammates.map(async (t) => {
        // Resolve active projects count
        const activeProjCount = await Room.countDocuments({
          githubRepo: { $in: allowedRepos },
          assignedEmployees: t._id
        });

        // Test the assignedRepositories filter
        const filtered = await Promise.all(
          allowedRepos.map(async (repo) => {
            const r = await Room.findOne({ githubRepo: repo, assignedEmployees: t._id });
            return r ? repo : null;
          })
        );
        const assignedRepositories = filtered.filter(Boolean);

        return {
          _id: t._id,
          name: t.name,
          email: t.email,
          assignedRepositories
        };
      })
    );

    console.log("Enriched teammates output:", enrichedTeammates);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
