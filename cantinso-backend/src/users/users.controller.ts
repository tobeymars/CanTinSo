import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from './users.service';
import { CreateCentralKitchenDto } from './dto/create-central-kitchen.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'UBND_ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('my-kitchen')
  @Roles('SCHOOL_ADMIN', 'CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  getMyKitchen(@CurrentUser() user: AuthUser) {
    return this.users.getMyKitchen(user);
  }

  @Get('kitchen-shift/:date/:role')
  @Roles('CENTRAL_KITCHEN')
  readKitchenShift(@CurrentUser() user:AuthUser,@Param('date') date:string,@Param('role') role:string) {
    return this.users.readKitchenShiftTasks(user,date,role);
  }

  @Patch('kitchen-shift/:date/:role/:taskId')
  @Roles('CENTRAL_KITCHEN')
  updateKitchenShift(@CurrentUser() user:AuthUser,@Param('date') date:string,@Param('role') role:string,@Param('taskId') taskId:string,@Body() body:{completed?:boolean}) {
    return this.users.updateKitchenShiftTask(user,date,role,taskId,body);
  }

  @Get('central-kitchens')
  @Roles('SUPER_ADMIN', 'UBND_ADMIN')
  listCentralKitchens(@CurrentUser() user: AuthUser) {
    return this.users.listCentralKitchens(user);
  }

  @Post('central-kitchens')
  @Roles('SUPER_ADMIN', 'UBND_ADMIN')
  createCentralKitchen(@CurrentUser() user: AuthUser, @Body() dto: CreateCentralKitchenDto) {
    return this.users.createCentralKitchen(user, dto);
  }

  @Post('central-kitchens/:id/assign-schools')
  @Roles('SUPER_ADMIN', 'UBND_ADMIN')
  assignCentralKitchenSchools(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: {schoolIds?:string[]}) {
    return this.users.assignCentralKitchenSchools(user,id,body?.schoolIds);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user, id, dto);
  }

  @Patch(':id/password')
  resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(user, id, dto.password);
  }
}
