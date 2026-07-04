import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsNotEmpty()
    currentPassword!: string;

    @IsOptional()
    @IsString()
    @MinLength(4)
    newPassword?: string;

    @IsOptional()
    @IsEmail()
    @IsNotEmpty()
    newEmail?: string;
}
