import { Types } from 'mongoose';

declare global {
    namespace Express {
        export interface User {
            _id: Types.ObjectId;
            username: string;
        }
    }
}

export {};
