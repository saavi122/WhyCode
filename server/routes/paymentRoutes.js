import express from "express";
import { createOrder, verifyPayment, linkSubscription, getOrder } from "../controllers/paymentController.js";
import optionalAuth from "../middleware/optionalAuth.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Optional auth so existing logged-in users get order linked immediately, but unauthenticated users can still checkout
router.post("/create-order", optionalAuth, createOrder);
router.post("/verify", optionalAuth, verifyPayment);
router.post("/link-subscription", optionalAuth, linkSubscription);
router.get("/order/:orderId", getOrder);

export default router;
