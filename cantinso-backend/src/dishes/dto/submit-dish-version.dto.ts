import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class SubmitDishVersionDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  schoolIds: string[];
}
