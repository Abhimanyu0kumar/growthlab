import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsNotEmpty()
    currentPassword!: string;

    @IsOptional()
    @IsString()
    @MinLength(4)
    newPassword?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    newUsername?: string;
}
