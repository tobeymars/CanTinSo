import { IsEmail, IsEnum, IsOptional, IsString, MinLength, MaxLength, IsUUID, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  schoolId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
