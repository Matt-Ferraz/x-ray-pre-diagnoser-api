import { Router } from "express";
import multer from "multer";
import * as examController from "./exam.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { analysisLimiter } from "../../middleware/rateLimiter.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);

router.get("/dashboard", examController.dashboard);
router.post("/", upload.single("image"), examController.create);
router.get("/", examController.list);
router.get("/:id", examController.getById);
router.post("/:id/analyze", analysisLimiter, examController.analyze);
router.get("/:id/image", examController.getImage);
router.delete("/:id", examController.remove);

export default router;
