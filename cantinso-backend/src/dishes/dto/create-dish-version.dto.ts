import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DishIngredientInput {
  @IsUUID()
  ingredientId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @IsString()
  @MaxLength(30)
  unitCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  preparationNote?: string;
}

export class CreateDishVersionDto {
  @IsObject()
  recipeSnapshot: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  nutritionSnapshot?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  allergenSnapshot?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DishIngredientInput)
  ingredients: DishIngredientInput[];
}
