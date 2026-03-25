import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { updateUserSchema, changePasswordSchema } from "./user.schema.js";

const router = Router();

router.use(authenticate);

router.get("/me", userController.getProfile);
router.patch("/me", validate(updateUserSchema), userController.updateProfile);
router.put("/me/password", validate(changePasswordSchema), userController.changePassword);
router.delete("/me", userController.deleteAccount);

export default router;
