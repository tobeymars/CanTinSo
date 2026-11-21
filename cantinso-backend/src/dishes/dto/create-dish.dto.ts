import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDishDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
