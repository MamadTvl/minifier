import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserType } from './schema/user.schema';
import { Model } from 'mongoose';
import { TaskType } from 'src/task/schema/task.schema';

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

    async findFiles(userId: string) {
        return this.userModel.findById(
            userId,
            { password: false },
            { populate: { path: 'files' } },
        );
    }

    async addFile(userId: string, taskId: string) {
        return this.userModel.findByIdAndUpdate(userId, {
            $push: { files: taskId },
        });
    }

    async removeOrphanFiles(userId: string) {
        const { files } = await this.findFiles(userId);
        const fileIds = files.map((file) => file._id.toString());
        return this.userModel.findByIdAndUpdate(userId, {
            $pull: { files: { $nin: fileIds } },
        });
    }

    async removeFile(userId: string, taskId: string) {
        this.removeOrphanFiles(userId);
        return this.userModel.findByIdAndUpdate(userId, {
            $pull: { files: taskId },
        });
    }

    async findUserTaskId(
        userId: string,
        type: TaskType,
    ): Promise<string | null> {
        const { files } = await this.findFiles(userId);
        return files.find((file) => file.type === type)?._id.toString() || null;
    }
}
