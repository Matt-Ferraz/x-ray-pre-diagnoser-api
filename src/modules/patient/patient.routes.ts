import { Router } from "express";
import * as patientController from "./patient.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createPatientSchema, updatePatientSchema } from "./patient.schema.js";

const router = Router();

router.use(authenticate);

router.post("/", validate(createPatientSchema), patientController.create);
router.get("/", patientController.list);
router.get("/:id", patientController.getById);
router.patch("/:id", validate(updatePatientSchema), patientController.update);
router.delete("/:id", patientController.remove);

export default router;
