import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcryptjs';
import { UserType } from 'src/user/schema/user.schema';
import { JwtPayload } from './strategy/jwt.strategy';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) {}

    async validateUser(username: string, password: string) {
        const user = await this.userService.findOne(username);
        if (!user) {
            return null;
        }

        const isPasswordMath = await bcrypt.compare(password, user.password);
        if (isPasswordMath) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: Express.User) {
        const payload: JwtPayload = {
            username: user.username,
            sub: user._id.toString(),
        };
        const accessToken = await this.jwtService.signAsync(payload);
        return {
            accessToken,
        };
    }

    async signup(username: string, password: string) {
        const user = await this.userService.findOne(username);
        if (user) {
            throw new BadRequestException('You already have an account');
        }
        const salt = await bcrypt.genSalt(8);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await this.userService.createOne(
            username,
            hashedPassword,
        );
        return this.login({ _id: newUser._id, username: newUser.username });
    }
}
