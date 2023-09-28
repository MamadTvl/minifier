import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/auth-jwt.guard';
import { Request } from 'express';

@ApiTags('user')
@ApiBearerAuth('user-auth')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(JwtAuthGuard)
    @Get('files')
    getUserFile(@Req() req: Request) {
        const user = req.user;
        return this.userService.findFiles(user._id.toString());
    }
}
