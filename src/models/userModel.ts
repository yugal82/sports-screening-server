import mongoose, { Document, Schema } from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Name is required"] },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "owner", "admin"],
    },
    favorites: {
        sports: { type: [String], default: [] },
        drivers: { type: [String], default: [] },
        teams: { type: [String], default: [] }
    },
    createdAt: { type: Date, default: Date.now, select: false },
    updatedAt: { type: Date, default: Date.now, select: false }
})

const User = mongoose.model("User", userSchema);


export default User;