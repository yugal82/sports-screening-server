import Event from "../models/eventModel";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../controllers/authController";
import { IEvent } from "../utils/types";
import { AuthError } from "../utils/errors";
import { processImageFile } from "../utils/fileUtils";

function convertMMDDYYYYToDate(dateString: string): Date {
    // Convert MM-DD-YYYY to YYYY-MM-DD format
    const [month, day, year] = dateString.split('-');
    const isoDateString = `${year}-${month}-${day}`;

    return new Date(isoDateString);
}

// Event Service
const findEventById = async (id: string) => {
    const event = await Event.findById(id);
    if (!event) {
        throw new AuthError('Event not found.');
    }
    return event;
};


const getLongLat = async (address: string) => {
    try {
        const encoded = encodeURIComponent(address);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
            `?access_token=${process.env.MAPBOX_API_KEY}&limit=1`;
        const response = await fetch(url);
        const data: any = await response.json();
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        return { lng, lat };
    } catch (error) {
        console.log(error);
    }
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

        const event: IEvent = {
            sportsCategory,
            venue,
            price,
            maxOccupancy,
            availableSeats: maxOccupancy,
            date: convertedDate,
            time,
            timeZone
        };

        // Get coordinates from venue address
        if (venue) {
            try {
                const coords = await getLongLat(venue);
                if (coords && typeof coords.lng === 'number' && typeof coords.lat === 'number') {
                    event.coordinates = [coords.lng, coords.lat];
                }
            } catch (geoError) {
                // If geocoding fails, continue without coordinates
                console.log('Geocoding failed:', geoError);
            }
        }

        // Handle image file if uploaded
        if (req.file) {
            try {
                const base64Image = processImageFile(req.file);
                event.image = base64Image;
            } catch (error) {
                res.status(400).json({
                    status: false,
                    message: error instanceof Error ? error.message : "Invalid image file"
                });
                return;
            }
        }

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
        // Parse query params
        const { minPrice, maxPrice, date, startDate, endDate, sortBy, sortOrder } = req.query;
        let query: any = {};

        // Sports category filter (keep existing)
        // if (sportsCategory) query.sportsCategory = sportsCategory;

        // Price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Date range filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate as string);
            if (endDate) query.date.$lte = new Date(endDate as string);
        }

        // Specific date filter (overrides range if present)
        if (date) {
            // Match events on the same day (ignoring time)
            const day = new Date(date as string);
            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);
            query.date = { $gte: day, $lt: nextDay };
        }

        // Sorting
        let sort: any = {};
        if (sortBy === 'price' || sortBy === 'date') {
            sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
        } else {
            sort.date = 1; // Default sort by date ascending
        }

        // Query the database
        const events = await Event.find(query)
            .select("-__v -createdAt -updatedAt")
            .sort(sort);

        res.status(200).json({
            status: true,
            message: "All events fetched successfully",
            length: events?.length,
            events: events
        });
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
        const event = await findEventById(id);

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
        if (error instanceof AuthError) {
            res.status(404).json({
                status: false,
                message: error.message
            });
            return;
        }
        res.status(500).json({
            status: false,
            message: "Could not delete event. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export { createEvent, getAllEvents, deleteEvent }