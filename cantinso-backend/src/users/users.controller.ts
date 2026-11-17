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
@Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('central-kitchens')
  @Roles('SUPER_ADMIN')
  listCentralKitchens(@CurrentUser() user: AuthUser) {
    return this.users.listCentralKitchens(user);
  }

  @Post('central-kitchens')
  @Roles('SUPER_ADMIN')
  createCentralKitchen(@CurrentUser() user: AuthUser, @Body() dto: CreateCentralKitchenDto) {
    return this.users.createCentralKitchen(user, dto);
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
