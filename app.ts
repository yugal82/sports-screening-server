import express from "express";
import { Request, Response } from "express";
const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(cookieParser());

// import all routes here
import userRoutes from "./src/routes/userRoutes";
import eventRoutes from "./src/routes/eventRoutes";


// define all the routes here
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);

module.exports = app;