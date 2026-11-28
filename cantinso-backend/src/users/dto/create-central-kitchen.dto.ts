import { ArrayMinSize, IsArray, IsEmail, IsInt, IsOptional, IsString, Min, MinLength, MaxLength, IsUUID } from "class-validator";

export class CreateCentralKitchenDto {
  @IsString() @MinLength(2) @MaxLength(30)
  code!: string;

  @IsString() @MinLength(2) @MaxLength(160)
  name!: string;

  @IsOptional() @IsString() @MaxLength(250)
  address?: string;

  @IsString() @MinLength(2) @MaxLength(120)
  contactName!: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsInt() @Min(1)
  capacity?: number;

  @IsEmail()
  adminEmail!: string;

  @IsString() @MinLength(2) @MaxLength(120)
  adminFullName!: string;

  @IsString() @MinLength(8) @MaxLength(100)
  password!: string;

  @IsArray() @ArrayMinSize(1) @IsUUID("4", { each: true })
  schoolIds!: string[];
}
