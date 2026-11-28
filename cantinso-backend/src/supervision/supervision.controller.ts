import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SupervisionService } from './supervision.service';
import { PublicInspectionService } from './public-inspection.service';
@Controller('supervision')
@UseGuards(JwtAuthGuard,RolesGuard)
export class SupervisionController {
 constructor(private readonly service:SupervisionService,private readonly inspections:PublicInspectionService){}
 @Get(':schoolId/:date/:mealType/inspections')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN')
 inspectionsList(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string){return this.inspections.list(user,schoolId,date,mealType)}
 @Post(':schoolId/:date/:mealType/inspections')
 @Roles('UBND_ADMIN')
 inspectionsCreate(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string,@Body() body:Record<string,unknown>){return this.inspections.create(user,schoolId,date,mealType,body)}
 @Post(':schoolId/:date/:mealType/inspections/:id/publish')
 @Roles('UBND_ADMIN')
 inspectionsPublish(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string,@Param('id') id:string){return this.inspections.publish(user,schoolId,date,mealType,id)}
 @Get(':schoolId/:date/:mealType/context')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN')
 context(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string){return this.service.context(user,schoolId,date,mealType)}
 @Get(':schoolId/:date/:mealType')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN')
 read(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string){return this.service.read(user,schoolId,date,mealType)}
 @Post(':schoolId/:date/:mealType/actions')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN')
 act(@CurrentUser() user:AuthUser,@Param('schoolId') schoolId:string,@Param('date') date:string,@Param('mealType') mealType:string,@Body() body:unknown){return this.service.act(user,schoolId,date,mealType,body)}
}
