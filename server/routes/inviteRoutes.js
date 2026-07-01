import express from "express";
import { sendInvite, verifyInvite, acceptInvite, listInvites, resendInvite, revokeInvite } from "../controllers/inviteController.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Company only endpoints
router.post("/send", protect, roleMiddleware("company"), sendInvite);
router.get("/list", protect, roleMiddleware("company"), listInvites);
router.post("/resend/:inviteId", protect, roleMiddleware("company"), resendInvite);
router.delete("/:inviteId", protect, roleMiddleware("company"), revokeInvite);

// Public invitation links check & completion
router.get("/verify/:token", verifyInvite);
router.post("/accept", acceptInvite);

export default router;
