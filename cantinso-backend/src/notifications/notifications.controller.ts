import { Controller, Get, Param, Patch, Post, Query, Sse, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service:NotificationsService){}
  @Get()
  list(@CurrentUser() user:AuthUser,@Query('unread') unread?:string){
    return this.service.list(user,unread==='true');
  }
  @Patch('read-all')
  readAll(@CurrentUser() user:AuthUser){return this.service.readAll(user);}
  @Patch(':id/read')
  read(@CurrentUser() user:AuthUser,@Param('id') id:string){return this.service.read(user,id);}
  @Sse('stream')
  stream(@CurrentUser() user:AuthUser){return this.service.stream(user.sub);}
}
