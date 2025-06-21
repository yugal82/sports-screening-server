import { Document } from 'mongoose';

export const createUserResponse = (user: Document) => {
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse._id;
    delete userResponse.__v;
    delete userResponse.role;
    return userResponse;
}; 