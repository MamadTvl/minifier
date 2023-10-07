import {
    Body,
    Controller,
    FileTypeValidator,
    Get,
    Header,
    MaxFileSizeValidator,
    NotFoundException,
    Param,
    ParseFilePipe,
    Post,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from 'src/auth/guard/auth-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { TaskDto } from './dto/task.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

@ApiTags('task')
@ApiBearerAuth('user-auth')
@Controller('task')
export class TaskController {
    constructor(private readonly taskService: TaskService) {}

    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    @Post('minify')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    nullable: false,
                },
                minify: {
                    type: 'boolean',
                    nullable: false,
                },
            },
        },
    })
    async postMinifyTask(
        @Body() body: TaskDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({
                        fileType: /(text\/(javascript|css)|image\/.*)$/,
                    }),
                    new MaxFileSizeValidator({ maxSize: Infinity }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Req() req: Request,
    ) {
        const user = req.user;
        const { queue, task } = await this.taskService.create(
            user,
            file,
            body.minify,
        );

        return {
            message: queue ? 'Task Queued' : 'File Saved',
            task,
        };
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getTasks(@Req() req: Request) {
        const user = req.user;
        const tasks = await this.taskService.findUserTasks(user._id);
        return {
            message: 'tasks found',
            tasks,
        };
    }

    @Get(':task_id')
    @UseGuards(JwtAuthGuard)
    async getOneTask(@Req() req: Request, @Param('task_id') taskId: string) {
        const user = req.user;
        const task = await this.taskService.findOneUserTask(user._id, taskId);
        if (!task) {
            throw new NotFoundException();
        }
        return {
            message: 'task found',
            task,
        };
    }

    @Get(':task_id/download')
    @Header('content-type', 'application/octet-stream')
    @Header('accept-ranges', 'bytes')
    @UseGuards(JwtAuthGuard)
    async download(
        @Req() req: Request,
        @Param('task_id') taskId: string,
        @Res() res: Response,
    ) {
        const user = req.user;
        const [buffer, filename] = await this.taskService.getFile(
            taskId,
            user._id,
        );
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        return res.end(buffer);
    }
}
