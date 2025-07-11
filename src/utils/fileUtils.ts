import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to accept only image files
const fileFilter = (req: Request, file: any, cb: multer.FileFilterCallback) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'));
};

// Configure multer upload
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Convert buffer to base64 string
export const bufferToBase64 = (buffer: Buffer, mimeType: string): string => {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
};

// Validate image file
export const validateImageFile = (file: any): boolean => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedMimeTypes.includes(file.mimetype);
};

// Process uploaded image file
export const processImageFile = (file: any): string => {
    if (!file) throw new Error('No image file provided');

    if (!validateImageFile(file)) throw new Error('Invalid image file type. Only JPEG, PNG, GIF, and WebP are allowed.');

    return bufferToBase64(file.buffer, file.mimetype);
}; 