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
@Schema({ _id: false })
export class TaskDetails {
    @Prop({ default: null })
    minifiedSize: number;
    @Prop({ default: null })
    duration: number;
    @Prop({
        type: raw({
            average: { type: Number },
            min: { type: Number },
            max: { type: Number },
        }),
        _id: false,
        default: null,
    })
    memoryStat: {
        average: number;
        min: number;
        max: number;
    } | null;
    @Prop({ default: null })
    failedReason: string | null;
}

export const TaskDetailsSchema = SchemaFactory.createForClass(TaskDetails);

@Schema({ timestamps: true })
export class Task {
    @Prop({ enum: TaskStatus, default: TaskStatus.IN_QUEUE })
    status: TaskStatus;

    @Prop({ enum: TaskType })
    type: TaskType;

    @Prop()
    originalFilename: string;

    @Prop({ default: null })
    minifiedFilename: string | null;

    @Prop()
    size: number;

    @Prop()
    minified: boolean;

    @Prop()
    destinationPath: string;

    @Prop({
        type: TaskDetailsSchema,
        default: null,
    })
    details: TaskDetails;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    owner: UserDocument;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
