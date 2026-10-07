import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function createIsolationTenant() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/whycode";
  await mongoose.connect(uri);

  const Companies = mongoose.connection.db.collection("companies");
  const Users = mongoose.connection.db.collection("users");
  const Repositories = mongoose.connection.db.collection("repositories");

  // Check if isolation company already exists
  let isolatedCompany = await Companies.findOne({ name: "Isolated Tenant Corp" });
  if (!isolatedCompany) {
    const res = await Companies.insertOne({
      name: "Isolated Tenant Corp",
      domain: "isolated.local",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    isolatedCompany = { _id: res.insertedId, name: "Isolated Tenant Corp" };
    console.log("Created Isolated Company:", isolatedCompany._id);
  } else {
    console.log("Found existing Isolated Company:", isolatedCompany._id);
  }

  // Check if isolated user exists
  let isolatedUser = await Users.findOne({ email: "isolated_user@isolated.local" });
  if (!isolatedUser) {
    const userRes = await Users.insertOne({
      name: "Isolated User",
      email: "isolated_user@isolated.local",
      password: "hashed_dummy_password",
      role: "employee",
      company: isolatedCompany._id,
      companyId: isolatedCompany._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    isolatedUser = { _id: userRes.insertedId, email: "isolated_user@isolated.local", company: isolatedCompany._id };
    console.log("Created Isolated User:", isolatedUser._id);
  } else {
    console.log("Found existing Isolated User:", isolatedUser._id);
  }

  // Verify that this company has 0 repositories
  const repoCount = await Repositories.countDocuments({
    $or: [
      { companyId: isolatedCompany._id.toString() },
      { company: isolatedCompany._id },
    ],
  });

  console.log(`Verified: Isolated Tenant Corp has ${repoCount} repositories.`);

  await mongoose.disconnect();
}

createIsolationTenant().catch(err => {
  console.error("Error creating isolation tenant:", err);
  process.exit(1);
});
