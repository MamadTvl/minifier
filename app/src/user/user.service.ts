import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserType } from './schema/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async findOne(username: string): Promise<UserType | null> {
        return this.userModel.findOne({ username }).then((doc) => {
            if (!doc) {
                return null;
            }
            return {
                _id: doc._id,
                username: doc.username,
                password: doc.password,
            };
        });
    }

    async createOne(username: string, hashedPassword: string) {
        const newUser = new this.userModel({
            username,
            password: hashedPassword,
        });
        return newUser.save();
    }
}
