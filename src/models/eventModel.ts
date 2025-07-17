import mongoose, { Schema, Document } from "mongoose";

const eventSchema = new Schema({
    sportsCategory: {
        type: String,
        required: [true, "Sports category is required"],
        enum: ["football", 'cricket', 'f1']
    },
    football: {
        homeTeam: { type: String },
        awayTeam: { type: String },
    },
    cricket: {
        homeTeam: { type: String },
        awayTeam: { type: String },
    },
    f1: {
        grandPrix: { type: String },
        circuit: { type: String },
    },
    venue: { type: String, required: [true, "Venue is required for the event"] },
    coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
            validator: function (v: number[]) {
                return v.length === 2 &&
                    v[0] >= -180 && v[0] <= 180 && // longitude range
                    v[1] >= -90 && v[1] <= 90; // latitude range
            },
            message: 'Coordinates must be an array of two numbers: [longitude, latitude]'
        }
    },
    price: { type: Number, required: [true, "Price is required for the event"] },
    maxOccupancy: { type: Number, required: [true, "Max occupancy is required for the event"] },
    availableSeats: { type: Number, required: [true, "Available seats is required for the event"] },
    date: { type: Date, required: [true, "Date is required for the event"] },
    time: { type: String, required: [true, "Time is required for the event"] },
    timeZone: { type: String, required: [true, "Time zone is required for the event"] },
    image: { type: String }, // Base64 encoded image
    createdAt: { type: Date, default: Date.now, select: false },
    updatedAt: { type: Date, default: Date.now, select: false },
})

const Event = mongoose.model("Event", eventSchema);

export default Event;