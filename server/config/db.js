import mongoose from "mongoose";

// ─── Connection Options ──────────────────────────────────────────────────────
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,  // fail fast if server is unreachable
  socketTimeoutMS: 45000,          // close sockets after 45s of inactivity
  maxPoolSize: 10,                 // maintain up to 10 socket connections
};

// ─── Event Listeners ─────────────────────────────────────────────────────────
mongoose.connection.on("connected", () => {
  console.log("✅ [MongoDB] Connection established");
});

mongoose.connection.on("error", (err) => {
  console.error(`❌ [MongoDB] Connection error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  [MongoDB] Disconnected from database");
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n🔌 [MongoDB] Received ${signal}. Closing connection...`);
  await mongoose.connection.close();
  console.log("🔌 [MongoDB] Connection closed. Exiting process.");
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ─── Connect Function ─────────────────────────────────────────────────────────
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ [MongoDB] MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    console.log("🔄 [MongoDB] Connecting to database...");
    const conn = await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    console.log(`📦 [MongoDB] Host     : ${conn.connection.host}`);
    console.log(`📦 [MongoDB] Database : ${conn.connection.name}`);
  } catch (err) {
    console.error(`❌ [MongoDB] Failed to connect: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
