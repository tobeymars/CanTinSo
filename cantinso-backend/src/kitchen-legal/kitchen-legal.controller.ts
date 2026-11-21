import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { KitchenLegalService } from './kitchen-legal.service';

@Controller('kitchen-legal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenLegalController {
  constructor(private readonly service: KitchenLegalService) {}
  @Get()
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN', 'SCHOOL_ADMIN', 'UBND_ADMIN')
  list(@CurrentUser() user: AuthUser) { return this.service.list(user); }
  @Get(':id')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN', 'SCHOOL_ADMIN', 'UBND_ADMIN')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user, id); }
  @Post()
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) { return this.service.create(user, body); }
  @Patch(':id')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) { return this.service.update(user, id, body); }
  @Delete(':id')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.remove(user, id); }
  @Post(':id/attachments')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  addFile(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) { return this.service.addFile(user, id, body); }
  @Get(':id/attachments/:fileId')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN', 'SCHOOL_ADMIN', 'UBND_ADMIN')
  file(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('fileId') fileId: string) { return this.service.file(user, id, fileId); }
  @Delete(':id/attachments/:fileId')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  removeFile(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('fileId') fileId: string) { return this.service.removeFile(user, id, fileId); }
}
