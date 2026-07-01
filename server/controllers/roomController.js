import Room from "../models/Room.js";
import Company from "../models/Company.js";
import User from "../models/User.js";

// POST /api/rooms (company only)
export const createRoom = async (req, res, next) => {
  try {
    const { name, githubRepo, assignedEmployees } = req.body;

    if (!name || !githubRepo) {
      return res.status(400).json({ message: "Room name and GitHub repository are required" });
    }

    // Get Company and check plan limits
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const roomCount = await Room.countDocuments({ company: company._id });

    // Plan limits: free (2), growth (5), enterprise (unlimited)
    if (company.plan === "free" && roomCount >= 2) {
      return res.status(400).json({
        message: "Free plan limit reached (max 2 rooms). Upgrade your subscription to create more rooms.",
      });
    } else if (company.plan === "growth" && roomCount >= 5) {
      return res.status(400).json({
        message: "Growth plan limit reached (max 5 rooms). Upgrade to Enterprise for unlimited rooms.",
      });
    }

    // Create Room
    const room = await Room.create({
      name,
      githubRepo,
      company: company._id,
      assignedEmployees: assignedEmployees || [],
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

// GET /api/rooms (company or employee)
export const getRooms = async (req, res, next) => {
  try {
    let rooms;
    if (req.user.role === "company") {
      // List all rooms for their company
      rooms = await Room.find({ company: req.user.company }).populate("assignedEmployees", "name email");
    } else if (req.user.role === "employee") {
      // List only rooms assigned to this employee
      rooms = await Room.find({ assignedEmployees: req.user.id }).populate("assignedEmployees", "name email");
    } else if (req.user.role === "admin") {
      // Admin sees everything
      rooms = await Room.find().populate("company", "name").populate("assignedEmployees", "name email");
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

// POST /api/rooms/:roomId/assign (company only)
export const assignEmployeesToRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { employeeIds } = req.body; // Array of employee IDs

    if (!Array.isArray(employeeIds)) {
      return res.status(400).json({ message: "employeeIds must be an array" });
    }

    const room = await Room.findOne({ _id: roomId, company: req.user.company });
    if (!room) {
      return res.status(404).json({ message: "Room not found or unauthorized" });
    }

    // Verify all employee IDs belong to this company
    const validEmployees = await User.find({
      _id: { $in: employeeIds },
      company: req.user.company,
      role: "employee",
    });

    const validIds = validEmployees.map((emp) => emp._id);
    room.assignedEmployees = validIds;
    await room.save();

    const updatedRoom = await Room.findById(roomId).populate("assignedEmployees", "name email");
    res.json(updatedRoom);
  } catch (err) {
    next(err);
  }
};
