import Event from "../models/eventModel";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../controllers/authController";
import { IEvent } from "../utils/types";
import { AuthError } from "../utils/errors";

function convertMMDDYYYYToDate(dateString: string): Date {
    // Convert MM-DD-YYYY to YYYY-MM-DD format
    const [month, day, year] = dateString.split('-');
    const isoDateString = `${year}-${month}-${day}`;

    return new Date(isoDateString);
}

const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // first check if the user is authorized to create an event
        if (req?.user?.role !== "owner") {
            res.status(403).json({
                status: false,
                message: "You are not authorized to create an event"
            });
            return;
        }

        const { sportsCategory, venue, price, maxOccupancy, date, time, timeZone } = req.body;
        const convertedDate = convertMMDDYYYYToDate(date);
        const event: IEvent = { sportsCategory, venue, price, maxOccupancy, date: convertedDate, time, timeZone }
        if (sportsCategory === "football") {
            event.football = {
                homeTeam: req.body.football.homeTeam,
                awayTeam: req.body.football.awayTeam
            }
        } else if (sportsCategory === "cricket") {
            event.cricket = {
                homeTeam: req.body.cricket.homeTeam,
                awayTeam: req.body.cricket.awayTeam
            }
        } else {
            event.f1 = {
                grandPrix: req.body.f1.grandPrix,
                circuit: req.body.f1.circuit
            }
        }

        const newEvent = await Event.create(event);
        console.log("New event: \n", newEvent);
        res.status(200).json({
            status: true,
            message: "Event created successfully",
            event: newEvent
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Something went wrong. Please try again.",
            error: error
        });
    }
}

const getAllEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { sportsCategory } = req?.query;
        let query = {};
        if (sportsCategory) query = { sportsCategory: sportsCategory }

        // - can later add query for date, time, timeZone, etc.
        // - also check if the event is yet to happen or not. If the date is in the past, then it should not be shown.

        const events = await Event.find(query).select("-__v -createdAt -updatedAt");
        res.status(200).json({
            status: true,
            message: "All events fetched successfully",
            length: events?.length,
            events: events
        })
    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Something went wrong. Please try again.",
            error: error
        });
    }
}

const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Check if user is authorized to delete an event
        if (req?.user?.role !== "owner") {
            res.status(403).json({
                status: false,
                message: "You are not authorized to delete an event"
            });
            return;
        }

        const { id } = req.params;

        // Validation
        if (!id) {
            res.status(400).json({
                status: false,
                message: 'Event ID is required.'
            });
            return;
        }

        // Check if event exists
        const event = await Event.findById(id);
        if (!event) {
            res.status(404).json({
                status: false,
                message: 'Event not found.'
            });
            return;
        }

        // Delete event
        await Event.findByIdAndDelete(id);

        res.status(200).json({
            status: true,
            message: "Event deleted successfully.",
            deletedEvent: {
                id: event._id,
                sportsCategory: event.sportsCategory,
                venue: event.venue,
                date: event.date
            }
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not delete event. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export { createEvent, getAllEvents, deleteEvent }