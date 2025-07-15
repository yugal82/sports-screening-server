import express from "express";
import { Request, Response } from "express";
const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// import all routes here
import userRoutes from "./src/routes/userRoutes";
import eventRoutes from "./src/routes/eventRoutes";
import bookingRoutes from "./src/routes/bookingRoutes";


// define all the routes here
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);

module.exports = app;