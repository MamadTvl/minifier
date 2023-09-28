import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task, TaskStatus, TaskType } from './schema/task.schema';
import { Model } from 'mongoose';
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
                'please wait until previous task completed',
            );
        }
        await this.userService.removeFile(userId, prvTaskId);
        return false;
    }

    async create(
        user: Express.User,
        file: Express.Multer.File,
        minify: boolean,
    ) {
        const taskType = getTaskType(file.originalname.split('.').pop());
        const isNew = await this.preprocess(taskType, user._id.toString());
        const destinationPath = await this.storeFile(
            file,
            user.username,
            taskType,
        );

        const newTask = new this.taskModel({
            owner: user._id,
            originalFilename: file.originalname,
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
