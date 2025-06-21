import { ObjectId } from 'mongoose';

interface IUser {
    _id?: ObjectId | string;
    name?: string;
    email?: string;
    password?: string;
    role?: "user" | "owner" | "admin";
    favorites?: {
        sports: string[];
        drivers: string[];
        teams: string[];
    } | null;
    // createdAt?: Date;
    // updatedAt?: Date;
}


interface IEvent {
    _id?: ObjectId | string;
    sportsCategory: "football" | "cricket" | "f1";
    football?: {
        homeTeam: string;
        awayTeam: string;
    };
    cricket?: {
        homeTeam: string;
        awayTeam: string;
    };
    f1?: {
        grandPrix: string;
        circuit: string;
    };
    venue?: string;
    price?: number;
    maxOccupancy?: number;
    date?: Date;
    time?: string;
    timeZone?: string;
}

export { IUser, IEvent };