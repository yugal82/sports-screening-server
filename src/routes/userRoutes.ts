import express from 'express';
import { register, login, logout, checkAuth, AuthenticatedRequest } from "../controllers/authController";
import { getCurrentUser, getUserById, deleteUser } from "../controllers/userController";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);

// Protected routes - require authentication
router.get("/profile", checkAuth, getCurrentUser);
router.get("/:id", checkAuth, getUserById);
router.delete("/:id", checkAuth, deleteUser);

export default router;