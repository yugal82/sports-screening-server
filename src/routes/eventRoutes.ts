import { Router } from "express";
import { createEvent, getAllEvents, deleteEvent } from '../controllers/eventController';
import { checkAuth } from "../controllers/authController";
import { upload } from "../utils/fileUtils";

const router = Router();

router.post("/create", checkAuth, upload.single('image'), createEvent);
router.get("/", checkAuth, getAllEvents);
router.delete("/:id", checkAuth, deleteEvent);

export default router;