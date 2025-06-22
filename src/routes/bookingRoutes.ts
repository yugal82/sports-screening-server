import express from 'express';
import { checkAuth } from "../controllers/authController";
import { getAllBookings, getBooking, createBooking } from "../controllers/bookingController";

const router = express.Router();

// All booking routes require authentication
router.use(checkAuth);

// Booking routes
router.get("/", getAllBookings);
router.get("/:id", getBooking);
router.post("/", createBooking);

export default router; 