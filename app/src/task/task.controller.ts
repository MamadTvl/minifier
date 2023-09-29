import {
    Body,
    Controller,
    FileTypeValidator,
    MaxFileSizeValidator,
    ParseFilePipe,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from 'src/auth/guard/auth-jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { TaskDto } from './dto/task.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

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
}
