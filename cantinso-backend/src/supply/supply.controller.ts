import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SupplyService } from './supply.service';

@Controller('supply')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN','SCHOOL_ADMIN','UBND_ADMIN')
export class SupplyController {
  constructor(private readonly service:SupplyService){}
  @Get('kitchens') kitchens(@CurrentUser() user:AuthUser){return this.service.kitchens(user);}
  @Get(':kitchenId/schools') schools(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string){return this.service.schools(user,kitchenId);}
  @Get(':kitchenId/ingredients') ingredients(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string){return this.service.ingredients(user,kitchenId);}
  @Get(':kitchenId/suppliers') suppliers(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string){return this.service.suppliers(user,kitchenId);}
  @Post(':kitchenId/suppliers')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  createSupplier(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Body() body:unknown){return this.service.saveSupplier(user,kitchenId,body);}
  @Post(':kitchenId/suppliers/import')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  bulkImport(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Body() body:unknown){
    return this.service.importSuppliers(user,kitchenId,body);
  }
  @Patch(':kitchenId/suppliers/:supplierId')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  updateSupplier(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('supplierId') supplierId:string,@Body() body:unknown){return this.service.saveSupplier(user,kitchenId,body,supplierId);}
  @Patch(':kitchenId/suppliers/:supplierId/status')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  supplierStatus(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('supplierId') supplierId:string,@Body() body:{status?:string}){
    return this.service.supplierStatus(user,kitchenId,supplierId,body?.status);
  }
  @Get(':kitchenId/minimums')
  minimums(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string){
    return this.service.minimums(user,kitchenId);
  }
  @Put(':kitchenId/minimums/:ingredientId')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  setMinimum(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('ingredientId') ingredientId:string,@Body() body:unknown){
    return this.service.setMinimum(user,kitchenId,ingredientId,body);
  }
  @Get(':kitchenId/lots') lots(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string){return this.service.lots(user,kitchenId);}
  @Post(':kitchenId/receipts')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  receipt(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Body() body:unknown){return this.service.receipt(user,kitchenId,body);}
  @Post(':kitchenId/lots/:lotId/issues')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  issue(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('lotId') lotId:string,@Body() body:unknown){return this.service.issue(user,kitchenId,lotId,body);}
  @Patch(':kitchenId/lots/:lotId/status')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  lotStatus(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('lotId') lotId:string,@Body() body:unknown){
    return this.service.lotStatus(user,kitchenId,lotId,body);
  }
  @Patch(':kitchenId/lots/:lotId/location')
  @Roles('CENTRAL_KITCHEN','SCHOOL_KITCHEN')
  moveLot(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string,@Param('lotId') lotId:string,@Body() body:unknown){
    return this.service.moveLot(user,kitchenId,lotId,body);
  }
  @Get(':kitchenId/movements')
  movements(@CurrentUser() user:AuthUser,@Param('kitchenId') kitchenId:string){return this.service.movements(user,kitchenId);}
}
