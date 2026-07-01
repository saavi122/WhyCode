import express from "express";
import { githubLogin, getMe, githubAuthorize, githubCallback, register, login, getMeProfile, employeeLogin } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Email Auth endpoints
router.post("/register", register);
router.post("/login", login);
router.post("/employee-login", employeeLogin); // no password — email + company name
router.get("/me", protect, getMeProfile);

// Mock / API Login method
router.post("/github", githubLogin);

// Real GitHub OAuth redirects (for linking company GitHub account)
router.get("/github", githubAuthorize);
router.get("/github/callback", githubCallback);

router.get("/me-legacy", protect, getMe);

export default router;
