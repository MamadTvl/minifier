import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User, UserDocument } from 'src/user/schema/user.schema';
import * as mongoose from 'mongoose';

export type TaskDocument = HydratedDocument<Task>;

export enum TaskType {
    CSS = 'CSS',
    JS = 'JS',
    IMAGE = 'IMAGE',
}

export enum TaskStatus {
    IN_QUEUE = 'IN_QUEUE',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE',
    FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class Task {
    @Prop({ enum: TaskStatus, default: TaskStatus.IN_QUEUE })
    status: TaskStatus;

    @Prop({ enum: TaskType })
    type: TaskType;

    @Prop()
    originalFilename: string;

    @Prop()
    size: number;

    @Prop()
    minified: boolean;

    @Prop()
    destinationPath: string;

    @Prop({
        type: raw({
            originalSize: { type: Number },
            minifiedSize: { type: Number },
            duration: { type: Number },
            memoryUsed: { type: Number },
            failedReason: { type: String },
        }),
        default: null,
    })
    details: Record<string, string> | null;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    owner: UserDocument;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
