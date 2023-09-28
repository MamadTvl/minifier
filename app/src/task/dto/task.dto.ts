import { Transform } from 'class-transformer';
import { IsBoolean, IsString, ValidateIf } from 'class-validator';

export class TaskDto {
    @ValidateIf((obj) => obj.minify === 'true' || obj.minify === 'false')
    @Transform(({ value }) => value === 'true')
    minify: boolean;
}
