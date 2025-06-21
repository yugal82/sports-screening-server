import { Router } from "express";
import { createEvent, getAllEvents, deleteEvent } from '../controllers/eventController';
import { checkAuth } from "../controllers/authController";
const router = Router();

router.post("/create", checkAuth, createEvent);
router.get("/", checkAuth, getAllEvents);
router.delete("/:id", checkAuth, deleteEvent);

export default router;