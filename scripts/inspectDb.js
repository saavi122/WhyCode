import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../server/.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

async function inspect() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/whycode";
  await mongoose.connect(uri);
  console.log("Connected to Mongo:", uri);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));

  const Repositories = mongoose.connection.db.collection("repositories");
  const repos = await Repositories.find({}).toArray();
  console.log(`Found ${repos.length} repositories:`);
  for (const r of repos) {
    console.log(` - ID: ${r._id}, Name: ${r.fullName || r.name}, Company: ${r.companyId || r.company}`);
  }

  const Users = mongoose.connection.db.collection("users");
  const users = await Users.find({}).toArray();
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log(` - ID: ${u._id}, Email: ${u.email}, Role: ${u.role}, Company: ${u.companyId || u.company}`);
  }

  const Companies = mongoose.connection.db.collection("companies");
  const companies = await Companies.find({}).toArray();
  console.log(`Found ${companies.length} companies:`);
  for (const c of companies) {
    console.log(` - ID: ${c._id}, Name: ${c.name}`);
  }

  const Commits = mongoose.connection.db.collection("commitmemories");
  const commitCount = await Commits.countDocuments();
  console.log(`Found ${commitCount} commits in commitmemories`);

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error("Error inspecting DB:", err);
  process.exit(1);
});
