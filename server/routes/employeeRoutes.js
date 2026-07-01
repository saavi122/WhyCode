import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Get all developers/employees
router.get("/", async (req, res) => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { organization: organizationId } : {};
    const employees = await User.find(filter).populate("organization").sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new developer/employee
router.post("/", async (req, res) => {
  try {
    const { name, email, role, githubStatus, githubUser, organizationId } = req.body;
    const employee = new User({
      name,
      email,
      role: role || "developer",
      githubId: githubUser ? `git-${githubUser}` : undefined,
      avatarUrl: githubUser ? `https://github.com/${githubUser}.png` : undefined,
      organization: organizationId || null
    });
    // For local simulation, githubStatus can map to githubUser existence
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update employee (github link state, role, etc.)
router.put("/:id", async (req, res) => {
  try {
    const { name, email, role, githubUser, githubStatus } = req.body;
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (name !== undefined) employee.name = name;
    if (email !== undefined) employee.email = email;
    if (role !== undefined) employee.role = role;
    if (githubUser !== undefined) {
      employee.githubId = `git-${githubUser}`;
      employee.avatarUrl = `https://github.com/${githubUser}.png`;
    }

    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete employee
router.delete("/:id", async (req, res) => {
  try {
    const employee = await User.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json({ message: "Employee removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
