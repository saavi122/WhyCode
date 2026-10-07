import { calibrateThresholds } from "../server/scripts/calibrateThresholds.js";

calibrateThresholds().catch((err) => {
  console.error("Calibration error:", err);
  process.exit(1);
});
