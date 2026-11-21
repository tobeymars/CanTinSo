import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { SupplierDocumentsService } from './supplier-documents.service';

@Controller('supply/:kitchenId/suppliers/:supplierId/documents')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN')
export class SupplierDocumentsController{
 constructor(private readonly service:SupplierDocumentsService){}
 @Get() list(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('supplierId') supplierId:string){
  return this.service.list(user,kitchenId,supplierId);
 }
 @Get(':documentId') get(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('supplierId') supplierId:string,@Param('documentId') documentId:string){
  return this.service.download(user,kitchenId,supplierId,documentId);
 }
 @Post()
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
 upload(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('supplierId') supplierId:string,@Body() body:unknown){
  return this.service.upload(user,kitchenId,supplierId,body);
 }
 @Delete(':documentId')
 @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
 archive(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('supplierId') supplierId:string,@Param('documentId') documentId:string){
  return this.service.archive(user,kitchenId,supplierId,documentId);
 }
}
