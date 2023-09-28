import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schema/task.schema';
import { BullModule } from '@nestjs/bull';
import { UserModule } from 'src/user/user.module';
import { MinifyConsumer } from './task.processor';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
        BullModule.registerQueue({
            name: 'minify',
            settings: {
                maxStalledCount: 100,
            },
            defaultJobOptions: {
                removeOnComplete: true,
                attempts: 10,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            },
        }),
        UserModule,
    ],
    controllers: [TaskController],
    providers: [TaskService, MinifyConsumer],
})
export class TaskModule {}
