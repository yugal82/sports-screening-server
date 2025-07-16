import express from 'express';
import { checkAuth } from "../controllers/authController";
import { getAllBookings, getBooking, createBooking, cancelBooking } from "../controllers/bookingController";
import { bookingRateLimiter } from '../middleware/rateLimitMiddleware';

const router = express.Router();

// All booking routes require authentication
router.use(checkAuth);

// Booking routes
router.get("/", getAllBookings);
router.get("/:id", getBooking);
router.post("/create", bookingRateLimiter, createBooking);
router.delete("/:id", bookingRateLimiter, cancelBooking);

export default router; 