import express from "express";
import {
  getCompanyEmployees,
  removeCompanyEmployee,
  getCompanyProfile,
  updateCompanyProfile,
  changeCompanyPassword,
  getCompanyStats
} from "../controllers/companyDashboardController.js";
import protect from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(roleMiddleware("company"));

router.get("/employees", getCompanyEmployees);
router.delete("/employees/:userId", removeCompanyEmployee);
router.get("/profile", getCompanyProfile);
router.patch("/profile", updateCompanyProfile);
router.patch("/change-password", changeCompanyPassword);
router.get("/stats", getCompanyStats);

export default router;
