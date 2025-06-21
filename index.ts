const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
import { Request, Response } from "express";
const mongoose = require("mongoose");
const app = require("./app");


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB successfully"))
    .catch((err: any) => console.log(err));

app.get("/", async (req: Request, res: Response) => {
    res.send("Hello World");
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
})