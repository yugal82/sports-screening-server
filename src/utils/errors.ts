export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError. Please login or register.';
    }
} 