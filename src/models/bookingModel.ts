import { Schema, model } from "mongoose";

const bookingSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    qrCodeData: { type: String },
    quantity: { type: Number },
    price: { type: Number },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    paymentInfo: {
        paymentIntentId: { type: String },
        amount: { type: Number },
        currency: { type: String },
        paymentDate: { type: Date },
        paymentStatus: {
            type: String,
            enum: ['pending', 'succeeded', 'failed', 'refunded'],
        },
    },
    createdAt: { type: Date, default: Date.now, select: false },
    updatedAt: { type: Date, default: Date.now, select: false },
});

const Booking = model('Booking', bookingSchema);

export default Booking;