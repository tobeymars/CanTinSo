import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';

type Outcome = 'follow_up_required' | 'no_follow_up';
@Injectable()
export class PublicInspectionService {
  constructor(private readonly prisma: PrismaService) {}

  private async scope(user: AuthUser, schoolId: string, date: string, mealType: string) {
    if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['BREAKFAST','LUNCH','SNACK'].includes(mealType))
      throw new BadRequestException('Trường, ngày hoặc bữa không hợp lệ.');
    const serviceDate = new Date(date + 'T00:00:00.000Z');
    if (Number.isNaN(serviceDate.getTime()) || serviceDate.toISOString().slice(0,10) !== date)
      throw new BadRequestException('Ngày phục vụ không hợp lệ.');
    const school = await this.prisma.school.findUnique({where:{id:schoolId},select:{wardId:true}});
    if (!school) throw new NotFoundException('Không tìm thấy trường.');
    if (user.role === 'UBND_ADMIN') {
      if (!user.wardId || school.wardId !== user.wardId) throw new ForbiddenException('Không thuộc địa bàn quản lý.');
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'SCHOOL_KITCHEN') {
      if (user.schoolId !== schoolId) throw new ForbiddenException('Không thuộc trường được phân công.');
    } else if (user.role === 'CENTRAL_KITCHEN') {
      if (!user.kitchenId) throw new ForbiddenException();
      const assignment = await this.prisma.kitchenSchoolAssignment.findFirst({
        where:{schoolId,kitchenId:user.kitchenId,isActive:true,startsAt:{lte:new Date(date+'T23:59:59.999Z')},OR:[{endsAt:null},{endsAt:{gte:serviceDate}}]},
        select:{id:true},
      });
      if (!assignment) throw new ForbiddenException('Bếp không được phân công phục vụ trường này.');
    } else {
      throw new ForbiddenException('Không được truy cập hồ sơ kiểm tra.');
    }
    return {schoolId,serviceDate,mealType};
  }

  async list(user:AuthUser,schoolId:string,date:string,mealType:string) {
    const scope=await this.scope(user,schoolId,date,mealType);
    return this.prisma.publicInspectionRecord.findMany({
      where:{...scope,...(user.role==='UBND_ADMIN'?{}:{status:'PUBLISHED'})},
      orderBy:[{publishedAt:'desc'},{createdAt:'desc'}],
    });
  }

  async create(user:AuthUser,schoolId:string,date:string,mealType:string,body:Record<string,unknown>) {
    const scope=await this.scope(user,schoolId,date,mealType);
    if (user.role!=='UBND_ADMIN') throw new ForbiddenException('Chỉ tài khoản UBND có quyền lập hồ sơ kiểm tra.');
    if (!body || typeof body!=='object' || Array.isArray(body)) throw new BadRequestException('Hồ sơ không hợp lệ.');
    const required=(field:string,max:number,min=2)=>{
      const value=body[field];
      if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)
        throw new BadRequestException(`Trường ${field} phải có từ ${min} đến ${max} ký tự.`);
      return value.trim();
    };
    const recordNumber=required('recordNumber',100,3);
    const title=required('title',200);
    const authority=required('authority',200,5);
    const inspectionScope=required('scope',1000,10);
    const summary=required('summary',4000,10);
    const evidenceReference=required('evidenceReference',300,3);
    const inspectedAtRaw=required('inspectedAt',10,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(inspectedAtRaw))throw new BadRequestException('Ngày kiểm tra không hợp lệ.');
    const inspectedAt=new Date(inspectedAtRaw+'T00:00:00.000Z');
    if(Number.isNaN(inspectedAt.getTime())||inspectedAt.toISOString().slice(0,10)!==inspectedAtRaw||inspectedAt.getTime()>Date.now())
      throw new BadRequestException('Ngày kiểm tra không hợp lệ hoặc nằm trong tương lai.');
    const findingCount=body.findingCount;
    if(!Number.isSafeInteger(findingCount)||Number(findingCount)<0||Number(findingCount)>10000)
      throw new BadRequestException('Số nội dung cần theo dõi không hợp lệ.');
    const outcome=body.outcome;
    if(outcome!=='follow_up_required'&&outcome!=='no_follow_up')throw new BadRequestException('Kết quả kiểm tra không hợp lệ.');
    if((outcome==='no_follow_up'&&findingCount!==0)||(outcome==='follow_up_required'&&findingCount===0))
      throw new BadRequestException('Kết quả và số nội dung cần theo dõi chưa thống nhất.');
    const exists=await this.prisma.publicInspectionRecord.findUnique({where:{recordNumber},select:{id:true}});
    if(exists)throw new ConflictException('Số biên bản đã tồn tại.');
    return this.prisma.publicInspectionRecord.create({data:{...scope,recordNumber,title,authority,inspectedAt,scope:inspectionScope,summary,evidenceReference,findingCount: Number(findingCount),outcome:outcome as Outcome,createdById:user.sub,status:'DRAFT'}});
  }

  async publish(user:AuthUser,schoolId:string,date:string,mealType:string,id:string) {
    const scope=await this.scope(user,schoolId,date,mealType);
    if(user.role!=='UBND_ADMIN')throw new ForbiddenException('Chỉ UBND được công khai hồ sơ đã nhập.');
    const updated=await this.prisma.publicInspectionRecord.updateMany({
      where:{id,...scope,status:'DRAFT'},
      data:{status:'PUBLISHED',publishedAt:new Date(),publishedById:user.sub},
    });
    if(!updated.count)throw new ConflictException('Hồ sơ không tồn tại trong phạm vi hoặc đã công khai.');
    return this.prisma.publicInspectionRecord.findUniqueOrThrow({where:{id}});
  }
}
