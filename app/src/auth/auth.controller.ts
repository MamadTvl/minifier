import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard/auth-local.guard';
import { Request } from 'express';
import { AuthDto } from './dto/auth.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                username: {
                    type: 'string',
                    nullable: false,
                },
                password: {
                    type: 'string',
                    nullable: false,
                },
            },
        },
    })
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Req() req: Request) {
        return this.authService.login(req.user);
    }
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                username: {
                    type: 'string',
                    nullable: false,
                },
                password: {
                    type: 'string',
                    nullable: false,
                },
            },
        },
    })
    @Post('signup')
    async signup(@Body() authDto: AuthDto) {
        const { username, password } = authDto;
        return this.authService.signup(username, password);
    }
}
