import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { protect } from "@/middleware/auth.middleware";
import { paths } from "@/routes/pathGenerator";

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────
router.post(paths.auth.register(), authController.register);
router.post(paths.auth.login(), authController.login);
router.post(paths.auth.logout(), protect, authController.logout);
router.get(paths.auth.me(), protect, authController.getMe);

import { userController } from "@/controllers/user.controller";

// ─── Users ────────────────────────────────────────────────────
router.get(paths.users.getAll(), protect, userController.getAll);
router.get(paths.users.getById(":id"), protect, userController.getById);
router.post(paths.users.create(), protect, userController.create);
router.put(paths.users.update(":id"), protect, userController.update);
router.delete(paths.users.delete(":id"), protect, userController.remove);

export default router;
