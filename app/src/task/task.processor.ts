import { Process, Processor } from '@nestjs/bull';
import { TaskService } from './task.service';
import { spawn } from 'child_process';
import { Job } from 'bull';
import { stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { memoryUsageCalculator } from 'src/utils';
import { TaskStatus } from './schema/task.schema';

export type MinifyJob = {
    taskId: string;
};

type MinifierResult = {
    minifiedCode: string;
    memoryUsed: number;
    duration: number;
};

@Processor('minify')
export class MinifyConsumer {
    constructor(private readonly taskService: TaskService) {}

    private async minifier(cwd: string, filename: string) {
        return new Promise<MinifierResult>((resolve, reject) => {
            let minifiedCode = '';
            let error = '';
            const startTime = new Date();
            const child = spawn('minify', [filename], { cwd });
            const [ref, stats] = memoryUsageCalculator(child.pid);

            child.stdout.on('data', (data) => {
                minifiedCode += data.toString();
            });

            child.stderr.on('data', (data) => {
                error += data.toString();
            });

            child.on('exit', (code) => {
                const endTime = new Date();
                clearInterval(ref);
                if (error.length > 0) {
                    reject(error);
                    return;
                }
                if (code === 0) {
                    const memoryUsed = stats.at(-1).memory - stats.at(0).memory;
                    const duration = endTime.getTime() - startTime.getTime();
                    resolve({ minifiedCode, duration, memoryUsed });
                } else {
                    reject(error);
                }
            });
        });
    }

    @Process({ concurrency: 100 })
    async minify(job: Job<MinifyJob>) {
        const { taskId } = job.data;
        const { destinationPath, originalFilename } =
            await this.taskService.findOne(taskId);
        try {
            const result = await this.minifier(
                destinationPath,
                originalFilename,
            );
            const filePath = join(destinationPath, originalFilename);
            await writeFile(filePath, result.minifiedCode);
            const { size: fileSize } = await stat(filePath);
            await this.taskService.updateTaskDetails(taskId, {
                minifiedSize: fileSize,
                duration: result.duration,
                memoryUsed: result.memoryUsed,
            });

            await this.taskService.updateTaskStatus(taskId, TaskStatus.DONE);
        } catch (err) {
            await this.taskService.updateTaskDetails(taskId, {
                failedReason: err,
            });
            await this.taskService.updateTaskStatus(taskId, TaskStatus.FAILED);
        }
    }
}
