import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task, TaskDetails, TaskStatus, TaskType } from './schema/task.schema';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MinifyJob } from './task.processor';
import { UserService } from 'src/user/user.service';
import { getTaskType } from 'src/utils';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TaskService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<Task>,
        @InjectQueue('minify') private queue: Queue<MinifyJob>,
        private userService: UserService,
    ) {}

    async findOne(id: string) {
        return this.taskModel.findById(id);
    }

    async updateTaskStatus(id: string, status: TaskStatus) {
        return this.taskModel.findByIdAndUpdate(id, { $set: { status } });
    }

    async updateTaskDetails(id: string, details: Partial<TaskDetails>) {
        return this.taskModel.findByIdAndUpdate(id, {
            $set: { details: details },
        });
    }

    async removeTaskFromQueue(taskIds: string[]) {
        return this.queue.removeJobs(taskIds.join('|'));
    }

    async updateBulkTaskStatus(
        userId: string,
        currentStatus: TaskStatus,
        status: TaskStatus,
    ) {
        return this.taskModel.updateMany(
            {
                owner: userId,
                status: currentStatus,
            },
            { $set: { status } },
        );
    }

    async findUserInQueueTasks(userId: string) {
        return this.taskModel.find({
            owner: userId,
            status: TaskStatus.IN_QUEUE,
        });
    }

    async findUserFileLatestVersion(
        userId: string | Types.ObjectId,
        type: TaskType,
    ) {
        return await this.taskModel.findOne(
            {
                owner: userId,
                type,
                status: TaskStatus.DONE,
            },
            {},
            { sort: { updatedAt: -1 } },
        );
    }

    private async storeFile(
        file: Express.Multer.File,
        username: string,
        taskType: TaskType,
    ) {
        const destinationPath = `storage/${username}/${taskType}`;

        await mkdir(destinationPath, { recursive: true });
        await writeFile(
            path.join(destinationPath, file.originalname),
            file.buffer,
        );
        return destinationPath;
    }

    private async preprocess(taskType: TaskType, userId: string) {
        const prvTaskId = await this.userService.findUserTaskId(
            userId,
            taskType,
        );
        const prvTask = await this.findOne(prvTaskId);
        if (!prvTask) {
            return true;
        }
        if (
            prvTask.status === TaskStatus.IN_QUEUE ||
            prvTask.status === TaskStatus.IN_PROGRESS
        ) {
            throw new BadRequestException(
                'please wait until the previous task completes',
            );
        }
        await this.userService.removeFile(userId, prvTaskId);
        return false;
    }

    private getMinifiedFilename(
        name: string,
        extension: string,
        type: TaskType,
    ) {
        if (type === TaskType.IMAGE) {
            return name.replace(extension, 'webp');
        }
        return name.replace(extension, 'min.' + extension);
    }

    async create(
        user: Express.User,
        file: Express.Multer.File,
        minify: boolean,
    ) {
        const extension = file.originalname.split('.').pop();
        const taskType = getTaskType(extension);
        const isNew = await this.preprocess(taskType, user._id.toString());
        const minifiedFilename = this.getMinifiedFilename(
            file.originalname,
            extension,
            taskType,
        );
        const destinationPath = await this.storeFile(
            file,
            user.username,
            taskType,
        );

        const newTask = new this.taskModel({
            owner: user._id,
            originalFilename: file.originalname,
            minifiedFilename,
            size: file.size,
            destinationPath,
            minified: minify,
            type: taskType,
            status: minify ? TaskStatus.IN_QUEUE : TaskStatus.DONE,
        });
        const task = await newTask.save();
        await this.userService.addFile(
            user._id.toString(),
            task._id.toString(),
        );
        if (!minify) {
            return {
                queue: false,
                isNew,
                task,
            };
        }
        await this.queue.add(
            {
                taskId: task._id.toString(),
            },
            { jobId: task._id.toString() },
        );
        return {
            queue: true,
            isNew,
            task,
        };
    }
}
