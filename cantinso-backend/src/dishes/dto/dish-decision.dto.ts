import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DishDecisionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string;
}
