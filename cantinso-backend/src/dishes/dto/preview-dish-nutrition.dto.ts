import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PreviewDishIngredientInput {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ingredientId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  ingredientName: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(1000000)
  quantity: number;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  unitCode: string;
}

export class PreviewDishNutritionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreviewDishIngredientInput)
  ingredients: PreviewDishIngredientInput[];
}
