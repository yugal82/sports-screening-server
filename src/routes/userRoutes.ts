import express from 'express';
import { register, login, logout, checkAuth, AuthenticatedRequest } from "../controllers/authController";
import { getAllUsers, getMe, getCurrentUser, getUserById, deleteUser } from "../controllers/userController";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);

// Public route - checks JWT token from cookies
router.get("/me", getMe);

// Protected routes - require authentication
router.get("/", checkAuth, getAllUsers);
router.get("/profile", checkAuth, getCurrentUser);
router.get("/:id", checkAuth, getUserById);
router.delete("/:id", checkAuth, deleteUser);

export default router;