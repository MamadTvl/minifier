import { IsDefined, IsString, Length } from 'class-validator';

export class AuthDto {
    @IsString()
    @IsDefined()
    @Length(3)
    username: string;

    @IsString()
    @Length(6)
    @IsDefined()
    password: string;
}
