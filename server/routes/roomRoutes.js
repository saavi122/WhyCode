import express from "express";
import { createRoom, getRooms, assignEmployeesToRoom } from "../controllers/roomController.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, roleMiddleware("company"), createRoom);
router.get("/", protect, getRooms);
router.post("/:roomId/assign", protect, roleMiddleware("company"), assignEmployeesToRoom);

export default router;
