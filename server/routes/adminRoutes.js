import express from "express";
import {
  getAdminStats,
  getAllCompanies,
  updateCompanyPlan,
  deleteCompany,
  getAllUsers,
  getCompanyAdminDetails,
} from "../controllers/adminController.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(roleMiddleware("admin"));

router.get("/stats", getAdminStats);
router.get("/companies", getAllCompanies);
router.get("/companies/:companyId/details", getCompanyAdminDetails);
router.patch("/companies/:companyId/plan", updateCompanyPlan);
router.delete("/companies/:companyId", deleteCompany);
router.get("/users", getAllUsers);

export default router;
