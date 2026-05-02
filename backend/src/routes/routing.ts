import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { protect } from "@/middleware/auth.middleware";
import { paths } from "@/routes/pathGenerator";
import { readingController } from "@/controllers/reading.controller";
import { userController } from "@/controllers/user.controller";
import { listeningController } from "@/controllers/listening.controller";
import { writingController } from "@/controllers/writing.controller";
import { speakingController } from "@/controllers/speaking.controller";

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────
router.post(paths.auth.register(), authController.register);
router.post(paths.auth.login(), authController.login);
router.post(paths.auth.logout(), protect, authController.logout);
router.get(paths.auth.me(), protect, authController.getMe);


// ─── Users ──────────────────────────────────────────────────── 
router.get(paths.users.getAll(), protect, userController.getAll);
router.get(paths.users.getById(":id"), protect, userController.getById);
router.post(paths.users.create(), userController.create);
router.put(paths.users.update(":id"), protect, userController.update);
router.delete(paths.users.delete(":id"), protect, userController.remove);



// -- Reading ----------------------
router.post(paths.reading.startTest(),                          protect, readingController.startTest);
router.get(paths.reading.getAttemptState(":attemptId"),         protect, readingController.getAttemptState);
router.post(paths.reading.saveAnswer(":attemptId"),             protect, readingController.saveAnswer);
router.patch(paths.reading.updateTiming(":attemptId"),          protect, readingController.updatePassageTiming);
router.post(paths.reading.submit(":attemptId"),                 protect, readingController.submitAttempt);



// ------- listening ----------
router.post(paths.listening.startTest(),                        protect, listeningController.startTest);
router.get(paths.listening.getAttemptState(":attemptId"),       protect, listeningController.getAttemptState);
router.post(paths.listening.registerPlay(":attemptId"),         protect, listeningController.registerPlay);
router.patch(paths.listening.saveAnswer(":attemptId"),          protect, listeningController.saveAnswer);
router.get(paths.listening.submit(":attemptId"),                protect, listeningController.submitAttempt);



//-------- writing ------------
router.post(paths.writing.startTest(),                          protect, writingController.startTest);
router.get(paths.writing.getAttemptState(":attemptId"),         protect, writingController.getAttemptState);
router.post(paths.writing.submitTask(":attemptId"),             protect, writingController.submitTask);
router.patch(paths.writing.reviewSubmission(":submissionId"),   protect, writingController.reviewSubmission);
router.get(paths.writing.getPendingReviews(),                   protect, writingController.getPendingReviews);

//-------- speaking -----------
router.post(paths.speaking.startTest(),                         protect, speakingController.startTest);
router.get(paths.speaking.getAttemptState(":attemptId"),        protect, speakingController.getAttemptState);
router.post(paths.speaking.uploadAnswer(":attemptId"),          protect, speakingController.uploadAnswer);
router.post(paths.speaking.submitAttempt(":attemptId"),         protect, speakingController.submitAttempt); 
router.get(paths.speaking.getPendingReviews(),                  protect, speakingController.getPendingReviews);
router.get
router.patch(paths.speaking.reviewSubmission(":submissionId"),  protect, speakingController.reviewSubmission);

export default router;
