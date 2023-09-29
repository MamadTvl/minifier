import { Process, Processor } from '@nestjs/bull';
import { TaskService } from './task.service';
import { spawn } from 'child_process';
import { Job } from 'bull';
import { stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { ps } from 'src/utils';
import { TaskStatus, TaskType } from './schema/task.schema';
import * as pidusage from 'pidusage';
import { UserService } from 'src/user/user.service';

export type MinifyJob = {
    taskId: string;
};

type MinifierResult = {
    minifiedSize: number;
    memoryStat: {
        average: number;
        min: number;
        max: number;
    };
    duration: number;
};

@Processor('minify')
export class MinifyConsumer {
    constructor(
        private readonly taskService: TaskService,
        private userService: UserService,
    ) {}

    private getMemoryStat(stats: pidusage.Status[]) {
        const min = Math.min(...stats.map((s) => s.memory));
        const max = Math.max(...stats.map((s) => s.memory));
        const average =
            stats.reduce((prvValue, item) => prvValue + item.memory, 0) /
            stats.length;
        return { average, min, max };
    }

    private async saveFile(path: string, filename: string, content: string) {
        const filePath = join(path, filename);
        await writeFile(filePath, content);
        const { size } = await stat(filePath);
        return size;
    }

    private async fileCompressor(
        cwd: string,
        filename: string,
        minifiedFilename: string,
    ) {
        return new Promise<MinifierResult>((resolve, reject) => {
            let minifiedCode = '';
            let error = '';
            const startTime = new Date();
            const child = spawn('uglifyjs', [filename], { cwd });
            const [intervalRef, stats] = ps(child.pid);

            child.stdout.on('data', (data) => {
                minifiedCode += data.toString();
            });

            child.stderr.on('data', (data) => {
                error += data.toString();
            });

            child.on('exit', async (code) => {
                const endTime = new Date();
                clearInterval(intervalRef);
                if (error.length > 0) {
                    reject(error);
                    return;
                }

                if (code !== 0) {
                    reject(error);
                    return;
                }

                const duration = endTime.getTime() - startTime.getTime();
                const minifiedSize = await this.saveFile(
                    cwd,
                    minifiedFilename,
                    minifiedCode,
                );
                const memoryStat = this.getMemoryStat(stats);
                resolve({
                    minifiedSize,
                    duration,
                    memoryStat,
                });
            });
        });
    }

    private async imageCompressor(
        cwd: string,
        filename: string,
        minifiedFilename: string,
    ) {
        return new Promise<MinifierResult>((resolve, reject) => {
            let error = '';
            const startTime = new Date();
            const child = spawn(
                'sharp',
                ['-i', filename, '-o', minifiedFilename],
                {
                    cwd,
                },
            );
            const [intervalRef, stats] = ps(child.pid);

            child.stderr.on('data', (data) => {
                error += data.toString();
            });

            child.on('exit', async (code) => {
                const endTime = new Date();
                clearInterval(intervalRef);
                if (error.length > 0) {
                    reject(error);
                    return;
                }

                if (code !== 0) {
                    reject(error);
                    return;
                }

                const duration = endTime.getTime() - startTime.getTime();
                const memoryStat = this.getMemoryStat(stats);
                const filePath = join(cwd, minifiedFilename);
                const { size: minifiedSize } = await stat(filePath);
                resolve({
                    minifiedSize,
                    duration,
                    memoryStat,
                });
            });
        });
    }

    private async minifier(
        cwd: string,
        filename: string,
        minifiedFilename: string,
        type: TaskType,
    ) {
        if (type === TaskType.IMAGE) {
            return this.imageCompressor(cwd, filename, minifiedFilename);
        }
        return this.fileCompressor(cwd, filename, minifiedFilename);
    }

    @Process({ concurrency: 100 })
    async minify(job: Job<MinifyJob>) {
        const { taskId } = job.data;
        await this.taskService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
        const {
            destinationPath,
            originalFilename,
            minifiedFilename,
            owner,
            type,
        } = await this.taskService.findOne(taskId);
        try {
            const { duration, minifiedSize, memoryStat } = await this.minifier(
                destinationPath,
                originalFilename,
                minifiedFilename,
                type,
            );
            Promise.all([
                this.taskService.updateTaskDetails(taskId, {
                    minifiedSize,
                    duration,
                    memoryStat,
                }),
                this.taskService.updateTaskStatus(taskId, TaskStatus.DONE),
            ]);
        } catch (err) {
            Promise.all([
                this.taskService.updateTaskDetails(taskId, {
                    failedReason: err,
                }),
                this.taskService.updateTaskStatus(taskId, TaskStatus.FAILED),
                this.userService.removeFile(owner._id.toString(), taskId),
                this.taskService
                    .findUserFileLatestVersion(owner._id, type)
                    .then(
                        (task) =>
                            task &&
                            this.userService.addFile(
                                owner._id.toString(),
                                task._id.toString(),
                            ),
                    ),
            ]);
        }
    }
}
