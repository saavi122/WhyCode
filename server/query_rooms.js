import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/whycodedb";

const run = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB!");

    const Room = mongoose.connection.model("Room", new mongoose.Schema({}, { strict: false }));
    const rooms = await Room.find({}).lean();
    console.log("ROOMS:", rooms.map(r => ({
      _id: r._id,
      name: r.name,
      githubRepo: r.githubRepo,
      assignedEmployees: r.assignedEmployees,
      company: r.company
    })));

    const User = mongoose.connection.model("User", new mongoose.Schema({}, { strict: false }));
    const users = await User.find({}).lean();
    console.log("USERS:", users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      company: u.company
    })));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
