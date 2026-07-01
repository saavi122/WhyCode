import Drift from "../models/Drift.js";
import Repository from "../models/Repository.js";

// GET /api/drift/:repoId
export const getDrifts = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    if (repo.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const drifts = await Drift.find({ repository: repoId });
    
    // Sort: high severity first
    const severityWeight = { high: 3, medium: 2, low: 1 };
    drifts.sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));

    res.json(drifts);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/drift/:driftId
export const updateDriftStatus = async (req, res, next) => {
  try {
    const { driftId } = req.params;
    const { action } = req.body; // "accepted" or "rejected"
    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ message: "Invalid action, must be accepted or rejected" });
    }

    const drift = await Drift.findById(driftId);
    if (!drift) {
      return res.status(404).json({ message: "Drift issue not found" });
    }

    drift.status = action;
    await drift.save();

    res.json(drift);
  } catch (err) {
    next(err);
  }
};
