import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { Task, TaskDocument } from 'src/task/schema/task.schema';

export type UserDocument = HydratedDocument<User>;

export type UserType = User & { _id: mongoose.Types.ObjectId };

@Schema({ timestamps: true })
export class User {
    @Prop({ unique: true, required: true })
    username: string;

    @Prop({ required: true })
    password: string;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }] })
    files?: TaskDocument[];
}

export const UserSchema = SchemaFactory.createForClass(User);
