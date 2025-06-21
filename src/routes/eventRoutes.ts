import { Router } from "express";
import { createEvent, getAllEvents } from '../controllers/eventController';
import { checkAuth } from "../controllers/authController";
const router = Router();

router.post("/create", checkAuth, createEvent);
router.get("/", checkAuth, getAllEvents);

export default router;