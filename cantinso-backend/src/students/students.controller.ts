import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateStudentDto } from './student.dto';
import { StudentsService } from './students.service';
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
 constructor(private students: StudentsService) {}
 @Get() list(@CurrentUser() user: AuthUser, @Query() query: any) { return this.students.list(user, query); }
 @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateStudentDto) { return this.students.create(user, dto); }
 @Put(':id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateStudentDto) { return this.students.update(user, id, dto); }
 @Delete(':id') remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.students.remove(user, id); }
}
