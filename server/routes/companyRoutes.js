import express from "express";
import Organization from "../models/Organization.js";

const router = express.Router();

// Get all registered client companies
router.get("/", async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new client company workspace
router.post("/", async (req, res) => {
  try {
    const { name, plan, employees, apiRequests, status } = req.body;
    const org = new Organization({
      name,
      plan: plan || "SaaS Pro Trial",
      employees: employees || 0,
      apiRequests: apiRequests || "0/mo",
      status: status || "Active"
    });
    await org.save();
    res.status(201).json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update client company workspace (plan, status)
router.put("/:id", async (req, res) => {
  try {
    const { plan, status, employees, apiRequests } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    if (plan !== undefined) org.plan = plan;
    if (status !== undefined) org.status = status;
    if (employees !== undefined) org.employees = employees;
    if (apiRequests !== undefined) org.apiRequests = apiRequests;

    await org.save();
    res.json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete/Suspend company workspace
router.delete("/:id", async (req, res) => {
  try {
    const org = await Organization.findByIdAndDelete(req.params.id);
    if (!org) return res.status(404).json({ error: "Organization not found" });
    res.json({ message: "Organization deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
