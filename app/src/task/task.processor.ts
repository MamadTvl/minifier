import { Process, Processor } from '@nestjs/bull';
import { TaskService } from './task.service';
import { spawn } from 'child_process';
import { Job } from 'bull';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as pidusage from 'pidusage';
import { memoryUsageCalculator } from 'src/utils';

export type MinifyJob = {
    taskId: string;
};

@Processor('minify')
export class MinifyConsumer {
    constructor(private readonly taskService: TaskService) {}

    private async minifier(cwd: string, filename: string) {
        return new Promise<string>((resolve, reject) => {
            let minifiedCode = '';
            let error = '';
            const child = spawn('minify', [filename], { cwd });
            const [ref, stats] = memoryUsageCalculator(child.pid);
            child.stdout.on('data', (data) => {
                minifiedCode += data.toString();
            });
            child.stderr.on('data', (data) => {
                error += data.toString();
            });
            child.on('exit', (code, signal) => {
                clearInterval(+ref);
                if (error.length > 0) {
                    reject(error);
                    return;
                }
                if (code === 0) {
                    resolve(minifiedCode);
                } else {
                    reject(error);
                }
            });
            console.log(child.pid);
        });
    }

    @Process({ concurrency: 100 })
    async minify(job: Job<MinifyJob>) {
        const { taskId } = job.data;
        const task = await this.taskService.findOne(taskId);
        try {
            const minifiedCode = await this.minifier(
                task.destinationPath,
                task.originalFilename,
            );
            await writeFile(
                join(task.destinationPath, 'minified.js'),
                minifiedCode,
            );
        } catch (err) {
            console.log(err);
        }
    }
}
