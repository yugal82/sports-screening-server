import { Document } from 'mongoose';
import { Response as ExpressResponse } from 'express';

export const createUserResponse = (user: Document) => {
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.__v;
    delete userResponse.role;
    return userResponse;
};

export const sendSuccessResponse = (
    res: ExpressResponse,
    statusCode: number,
    message: string,
    data?: any
): void => {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const sendErrorResponse = (
    res: ExpressResponse,
    statusCode: number,
    message: string,
    error?: any
): void => {
    res.status(statusCode).json({
        success: false,
        message,
        error,
    });
}; 