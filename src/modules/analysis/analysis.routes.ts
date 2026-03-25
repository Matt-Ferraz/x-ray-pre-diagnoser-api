import { Router } from "express";
import multer from "multer";
import * as analysisController from "./analysis.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { analysisLimiter } from "../../middleware/rateLimiter.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);

router.post("/", analysisLimiter, upload.single("image"), analysisController.analyze);
router.get("/history", analysisController.getHistory);
router.get("/:id", analysisController.getAnalysisById);
router.get("/:id/image", analysisController.getImage);

export default router;
