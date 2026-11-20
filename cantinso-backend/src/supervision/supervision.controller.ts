import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SupervisionService } from './supervision.service';
@Controller('supervision')
@UseGuards(JwtAuthGuard,RolesGuard)
export class SupervisionController {
 constructor(private readonly service:SupervisionService){}
 @Get(':schoolId/:date/:mealType')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN')
 read(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string){return this.service.read(user,schoolId,date,mealType)}
 @Post(':schoolId/:date/:mealType/actions')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN')
 act(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string,@Body() body:unknown){return this.service.act(user,schoolId,date,mealType,body)}
}
