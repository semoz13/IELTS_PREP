import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { protect, requireRole } from "@/middleware/auth.middleware";
import { paths } from "@/routes/pathGenerator";
import { readingController } from "@/controllers/reading.controller";
import { userController } from "@/controllers/user.controller";
import { listeningController } from "@/controllers/listening.controller";
import { writingController } from "@/controllers/writing.controller";
import { speakingController } from "@/controllers/speaking.controller";
import { uploadAudio } from "@/middleware/upload.middleware";
import { actionLogController } from "@/controllers/actionLog.controller";
import { createActionLogger } from "@/middleware/actionLog.middleware";

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────
router.post(paths.auth.register(), authController.register);
router.post(
  paths.auth.login(),
  createActionLogger({
    action: "LOGIN",
    resourceType: "USER",
    description: "User login",
  }),
  authController.login,
);
router.post(
  paths.auth.logout(),
  protect,
  createActionLogger({
    action: "LOGOUT",
    resourceType: "USER",
    description: "User logout",
  }),
  authController.logout,
);
router.get(paths.auth.me(), protect, authController.getMe);

// ─── Users ────────────────────────────────────────────────────
router.get(paths.users.getAll(), protect, userController.getAll);
router.get(paths.users.getById(":id"), protect, userController.getById);
router.post(paths.users.create(), userController.create);
router.put(
  paths.users.update(":id"),
  protect,
  createActionLogger({
    action: "UPDATE_PROFILE",
    resourceType: "USER",
    description: "User profile updated",
  }),
  userController.update,
);
router.delete(
  paths.users.delete(":id"),
  protect,
  createActionLogger({
    action: "DELETE_ACCOUNT",
    resourceType: "USER",
    description: "User account deleted",
  }),
  userController.remove,
);

// -- Reading ----------------------
router.post(
  paths.reading.startTest(),
  protect,
  createActionLogger({
    action: "START_TEST",
    resourceType: "ATTEMPT",
    description: "Started reading test",
  }),
  readingController.startTest,
);
router.get(
  paths.reading.getAttemptState(":attemptId"),
  protect,
  readingController.getAttemptState,
);
router.post(
  paths.reading.saveAnswer(":attemptId"),
  protect,
  createActionLogger({
    action: "SAVE_ANSWER",
    resourceType: "ATTEMPT",
    description: "Saved reading answer",
  }),
  readingController.saveAnswer,
);
router.patch(
  paths.reading.updateTiming(":attemptId"),
  protect,
  readingController.updatePassageTiming,
);
router.post(
  paths.reading.submit(":attemptId"),
  protect,
  createActionLogger({
    action: "SUBMIT_TEST",
    resourceType: "ATTEMPT",
    description: "Submitted reading test",
  }),
  readingController.submitAttempt,
);

// ------- listening ----------
router.post(
  paths.listening.startTest(),
  protect,
  createActionLogger({
    action: "START_TEST",
    resourceType: "ATTEMPT",
    description: "Started listening test",
  }),
  listeningController.startTest,
);
router.get(
  paths.listening.getAttemptState(":attemptId"),
  protect,
  listeningController.getAttemptState,
);
router.post(
  paths.listening.registerPlay(":attemptId"),
  protect,
  listeningController.registerPlay,
);
router.patch(
  paths.listening.saveAnswer(":attemptId"),
  protect,
  createActionLogger({
    action: "SAVE_ANSWER",
    resourceType: "ATTEMPT",
    description: "Saved listening answer",
  }),
  listeningController.saveAnswer,
);
router.get(
  paths.listening.submit(":attemptId"),
  protect,
  createActionLogger({
    action: "SUBMIT_TEST",
    resourceType: "ATTEMPT",
    description: "Submitted listening test",
  }),
  listeningController.submitAttempt,
);

//-------- writing ------------
//student
router.post(paths.writing.startTest(),                          protect, writingController.startTest);
router.get(paths.writing.getAttemptState(":attemptId"),         protect, writingController.getAttemptState);
router.post(paths.writing.submitTask(":attemptId"),             protect, writingController.submitTask);

//teacher
router.patch(paths.writing.reviewSubmission(":submissionId"),   protect, requireRole("admin"), writingController.reviewSubmission);
router.get(paths.writing.getPendingReviews(),                   protect, requireRole("admin"), writingController.getPendingReviews);

//-------- speaking -----------
//student 
router.post(paths.speaking.startTest(),                         protect, speakingController.startTest);
router.get(paths.speaking.getAttemptState(":attemptId"),        protect, speakingController.getAttemptState);
router.post(paths.speaking.uploadAnswer(":attemptId"),          protect, uploadAudio, speakingController.uploadAnswer);
router.post(paths.speaking.submitAttempt(":attemptId"),         protect, speakingController.submitAttempt); 

//tracher 
router.get(paths.speaking.getPendingReviews(),                  protect, speakingController.getPendingReviews);
router.patch(paths.speaking.markUnderReview(":submissionId"),   protect, speakingController.markUnderReview);
router.post(paths.speaking.reviewSubmission(":submissionId"),   protect, speakingController.reviewSubmission);
router.post(
  paths.writing.startTest(),
  protect,
  createActionLogger({
    action: "START_TEST",
    resourceType: "ATTEMPT",
    description: "Started writing test",
  }),
  writingController.startTest,
);
router.get(
  paths.writing.getAttemptState(":attemptId"),
  protect,
  writingController.getAttemptState,
);
router.post(
  paths.writing.submitTask(":attemptId"),
  protect,
  createActionLogger({
    action: "SUBMIT_TEST",
    resourceType: "SUBMISSION",
    description: "Submitted writing task",
  }),
  writingController.submitTask,
);
router.patch(
  paths.writing.reviewSubmission(":submissionId"),
  protect,
  createActionLogger({
    action: "ADMIN_ACTION",
    resourceType: "SUBMISSION",
    description: "Reviewed writing submission",
  }),
  writingController.reviewSubmission,
);
router.get(
  paths.writing.getPendingReviews(),
  protect,
  writingController.getPendingReviews,
);

// ─── Action Logs ──────────────────────────────────────────────
router.get(paths.logs.getAll(), protect, actionLogController.getLogs);
router.get(paths.logs.getMe(), protect, actionLogController.getUserActivityLog);
router.get(
  paths.logs.getStatistics(),
  protect,
  actionLogController.getStatistics,
);
router.delete(paths.logs.clear(), protect, actionLogController.clearOldLogs);

export default router;
