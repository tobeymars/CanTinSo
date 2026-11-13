import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateStudentDto {
 @IsString() @MinLength(1) @MaxLength(30) code!: string;
 @IsString() @MinLength(2) @MaxLength(160) name!: string;
 @IsString() @MinLength(1) @MaxLength(30) className!: string;
 @IsIn(['Nam','Nữ','Khác']) gender!: string;
 @IsOptional() @IsDateString() birthDate?: string;
 @IsOptional() @IsString() @MaxLength(160) guardian?: string;
 @IsOptional() @IsString() @MaxLength(30) phone?: string;
 @IsIn(['Đang học','Tạm nghỉ','Đã chuyển trường']) status!: string;
}
export class UpdateStudentDto extends CreateStudentDto {}
