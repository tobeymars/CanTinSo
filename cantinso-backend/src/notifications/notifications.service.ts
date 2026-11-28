import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { Observable, Subject, filter, interval, map, merge } from 'rxjs';

type NewNotice={recipientId:string;eventKey:string;kind:string;title:string;body:string;targetPath:string;schoolId?:string;kitchenId?:string};
@Injectable()
export class NotificationsService {
  private readonly logger=new Logger(NotificationsService.name);
  private readonly signal=new Subject<string>();
  constructor(private readonly prisma:PrismaService){}

  stream(recipientId:string):Observable<{data:{type:string}}> {
    return merge(
      this.signal.pipe(filter(id=>id===recipientId),map(()=>({data:{type:'changed'}}))),
      interval(25000).pipe(map(()=>({data:{type:'heartbeat'}}))),
    );
  }
  async list(user:AuthUser,unreadOnly:boolean=false){
    const rows=await this.prisma.userNotification.findMany({
      where:{recipientId:user.sub,...(unreadOnly?{readAt:null}:{})},
      orderBy:{createdAt:'desc'},take:100,
      select:{id:true,kind:true,title:true,body:true,targetPath:true,schoolId:true,
        kitchenId:true,readAt:true,createdAt:true},
    });
    const unread=await this.prisma.userNotification.count({where:{recipientId:user.sub,readAt:null}});
    return {items:rows,unread};
  }
  async read(user:AuthUser,id:string){
    const changed=await this.prisma.userNotification.updateMany({
      where:{id,recipientId:user.sub,readAt:null},data:{readAt:new Date()},
    });
    if(!changed.count){
      const existing=await this.prisma.userNotification.findFirst({where:{id,recipientId:user.sub},select:{id:true}});
      if(!existing)throw new NotFoundException('Không tìm thấy thông báo.');
    }
    this.signal.next(user.sub);
    return {ok:true};
  }
  async readAll(user:AuthUser){
    await this.prisma.userNotification.updateMany({where:{recipientId:user.sub,readAt:null},data:{readAt:new Date()}});
    this.signal.next(user.sub);return {ok:true};
  }
  /** A failed notification must not roll back a successfully recorded business action. */
  async send(notices:NewNotice[]){
    if(!notices.length)return;
    const unique=[...new Map(notices.map(n=>[n.eventKey,n])).values()];
    try{
      await this.prisma.userNotification.createMany({data:unique,skipDuplicates:true});
      for(const id of new Set(unique.map(n=>n.recipientId)))this.signal.next(id);
    }catch(e){this.logger.error('Unable to record business notifications',e);}
  }
  async forSchool(eventKey:string,schoolId:string,kind:string,title:string,body:string,targetPath:string,excludeId:string,recipientRole:'SCHOOL_ADMIN'|'CENTRAL_KITCHEN'|'SCHOOL_KITCHEN'='SCHOOL_ADMIN'){
    try {
    const school=await this.prisma.school.findUnique({where:{id:schoolId},select:{id:true,name:true}});
    if(!school)return;
    let ids:string[]=[];
    if(recipientRole==='SCHOOL_ADMIN'){
      const rows=await this.prisma.user.findMany({where:{schoolId,role:'SCHOOL_ADMIN',isActive:true,id:{not:excludeId}},select:{id:true}});
      ids=rows.map(x=>x.id);
    }else{
      const kitchenIds=await this.prisma.kitchenSchoolAssignment.findMany({
        where:{schoolId,isActive:true,startsAt:{lte:new Date()},OR:[{endsAt:null},{endsAt:{gte:new Date()}}]},
        select:{kitchenId:true},
      });
      const onsite=await this.prisma.kitchen.findFirst({where:{schoolId,type:'SCHOOL',isActive:true},select:{id:true}});
      const kitchens=[...new Set([...kitchenIds.map(x=>x.kitchenId),...(onsite?[onsite.id]:[])])];
      const rows=await this.prisma.user.findMany({
        where:{kitchenId:{in:kitchens},role:{in:['CENTRAL_KITCHEN','SCHOOL_KITCHEN']},isActive:true,id:{not:excludeId}},
        select:{id:true},
      });
      ids=rows.map(x=>x.id);
    }
    await this.send(ids.map(recipientId=>({recipientId,eventKey:eventKey+':'+recipientId,
      kind,title,body:body+' · '+school.name,targetPath,schoolId})));
    } catch(error) {
      this.logger.error('Could not determine notification recipients',error);
    }
  }
}
